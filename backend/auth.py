"""SQLite accounts and revocable sessions for the personal workspaces."""
from contextlib import closing, contextmanager
import hashlib
import hmac
import os
from pathlib import Path
import re
import secrets
import sqlite3
from threading import Lock
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel

COOKIE = 'agentinsight_auth'
SESSION_SECONDS = 7 * 24 * 60 * 60
ATTEMPT_WINDOW = 15 * 60
SCHEMA = """
CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL COLLATE NOCASE UNIQUE,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    salt BLOB NOT NULL,
    password_hash BLOB NOT NULL
);
CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    owner_id INTEGER NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS sessions (
    token_hash BLOB PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_attempts (
    key TEXT PRIMARY KEY,
    attempts INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);
"""
ACCOUNT_QUERY = """
SELECT accounts.*, workspaces.id AS workspace_id FROM accounts
JOIN workspaces ON workspaces.owner_id = accounts.id
"""


class Signup(BaseModel):
    username: str
    email: str
    password: str


class Login(BaseModel):
    identifier: str
    password: str


@contextmanager
def database(path: Path):
    with closing(sqlite3.connect(path, timeout=10)) as db, db:
        db.row_factory = sqlite3.Row
        db.execute('PRAGMA foreign_keys = ON')
        yield db


def derive_password(password, salt):
    return hashlib.scrypt(password.encode(), salt=salt, n=2**15, r=8, p=3, maxmem=64 * 1024**2)


def token_digest(token):
    return hashlib.sha256(token.encode()).digest()


def current_account(request):
    token = request.cookies.get(COOKIE, '')
    if not re.fullmatch(r'[A-Za-z0-9_-]{43}', token):
        return None
    request.app.state.ensure_auth_schema()
    with database(request.app.state.auth_db) as db:
        return db.execute(
            ACCOUNT_QUERY + '''
            JOIN sessions ON sessions.account_id = accounts.id
            WHERE sessions.token_hash = ? AND sessions.expires_at > ?
            ''', (token_digest(token), int(time.time())),
        ).fetchone()


def get_workspace(request: Request) -> str | None:
    account = current_account(request)
    return account['workspace_id'] if account else None


def error(status, detail, field=None):
    body = {'detail': detail}
    if field:
        body['field'] = field
    return JSONResponse(body, status_code=status, headers={'Cache-Control': 'no-store'})


def account_response(account, status=200):
    return JSONResponse(
        {key: account[key] for key in ('username', 'email', 'workspace_id')},
        status_code=status,
        headers={'Cache-Control': 'no-store'},
    )


def create_session(db, request, account, status=200):
    now = int(time.time())
    previous = request.cookies.get(COOKIE)
    if previous:
        db.execute('DELETE FROM sessions WHERE token_hash = ?', (token_digest(previous),))
    db.execute('DELETE FROM sessions WHERE expires_at <= ?', (now,))
    token = secrets.token_urlsafe(32)
    db.execute(
        'INSERT INTO sessions VALUES (?, ?, ?)',
        (token_digest(token), account['id'], now + SESSION_SECONDS),
    )
    response = account_response(account, status)
    response.set_cookie(
        COOKIE, token, max_age=SESSION_SECONDS, httponly=True, samesite='strict',
        secure=request.url.scheme == 'https' or os.getenv('INSIGHT_SECURE_COOKIE') == '1',
    )
    return response


def rate_limited(path, action, request, identifier=None):
    ip = request.client.host if request.client else 'unknown'
    limits = [(f'{action}:ip:{ip}', 30)]
    if identifier:
        limits.append((f'{action}:account:{token_digest(identifier.lower()).hex()}', 10))
    now = int(time.time())
    with database(path) as db:
        db.execute('DELETE FROM auth_attempts WHERE expires_at <= ?', (now,))
        for key, limit in limits:
            row = db.execute('SELECT attempts FROM auth_attempts WHERE key = ?', (key,)).fetchone()
            if row and row['attempts'] >= limit:
                return True
        for key, _ in limits:
            db.execute('''
                INSERT INTO auth_attempts VALUES (?, 1, ?)
                ON CONFLICT(key) DO UPDATE SET attempts = attempts + 1
            ''', (key, now + ATTEMPT_WINDOW))
    return False


def install_auth(app: FastAPI, path: Path):
    app.state.auth_db = path

    schema_lock = Lock()
    initialized = False

    def ensure_schema():
        nonlocal initialized
        if initialized and path.exists():
            return
        with schema_lock:
            if initialized and path.exists():
                return
            path.parent.mkdir(parents=True, exist_ok=True)
            with database(path) as db:
                db.executescript(SCHEMA)
            initialized = True

    app.state.ensure_auth_schema = ensure_schema

    @app.post('/api/auth/signup', status_code=201)
    def signup(payload: Signup, request: Request):
        username = payload.username.strip()
        email = payload.email.strip().lower()
        if not re.fullmatch(r'[A-Za-z][A-Za-z0-9_]{2,29}', username):
            return error(422, 'Use 3–30 letters, numbers, or underscores. Start with a letter.', 'username')
        domain = email.partition('@')[2]
        local = email.partition('@')[0]
        if (
            len(email) > 254 or not 1 <= len(local) <= 64
            or not re.fullmatch(r"[a-z0-9.!#$%&'*+/=?^_`{|}~-]+", local)
            or local.startswith('.') or local.endswith('.') or '..' in local
            or '.' not in domain
            or not all(re.fullmatch(r'[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?', label) for label in domain.split('.'))
        ):
            return error(422, 'Enter a valid email address.', 'email')
        if not 8 <= len(payload.password) <= 128:
            return error(422, 'Use 8–128 characters for your password.', 'password')
        ensure_schema()
        if rate_limited(path, 'signup', request):
            return error(429, 'Too many attempts. Try again in 15 minutes.')
        salt = secrets.token_bytes(16)
        password_hash = derive_password(payload.password, salt)
        try:
            with database(path) as db:
                account_id = db.execute(
                    'INSERT INTO accounts(username, email, salt, password_hash) VALUES (?, ?, ?, ?)',
                    (username, email, salt, password_hash),
                ).lastrowid
                db.execute('INSERT INTO workspaces VALUES (?, ?)', (uuid.uuid4().hex, account_id))
                account = db.execute(ACCOUNT_QUERY + ' WHERE accounts.id = ?', (account_id,)).fetchone()
                return create_session(db, request, account, 201)
        except sqlite3.IntegrityError as exc:
            field = {
                'UNIQUE constraint failed: accounts.username': 'username',
                'UNIQUE constraint failed: accounts.email': 'email',
            }.get(str(exc))
            if not field:
                raise
            return error(409, f'That {field} is already in use.', field)

    @app.post('/api/auth/login')
    def login(payload: Login, request: Request):
        identifier = payload.identifier.strip()
        if not identifier or len(identifier) > 254 or not 1 <= len(payload.password) <= 128:
            return error(401, 'Incorrect username, email, or password.')
        ensure_schema()
        if rate_limited(path, 'login', request, identifier):
            return error(429, 'Too many attempts. Try again in 15 minutes.')
        field = 'email' if '@' in identifier else 'username'
        with database(path) as db:
            account = db.execute(ACCOUNT_QUERY + f' WHERE accounts.{field} = ?', (identifier,)).fetchone()
        salt = account['salt'] if account else bytes(16)
        candidate = derive_password(payload.password, salt)
        if not account or not hmac.compare_digest(candidate, account['password_hash']):
            return error(401, 'Incorrect username, email, or password.')
        with database(path) as db:
            db.execute(
                'DELETE FROM auth_attempts WHERE key = ?',
                (f'login:account:{token_digest(identifier.lower()).hex()}',),
            )
            return create_session(db, request, account)

    @app.get('/api/auth/session')
    def session(request: Request):
        account = current_account(request)
        if not account:
            return error(401, 'Log in to continue.')
        return account_response(account)

    @app.post('/api/auth/logout', status_code=204)
    def logout(request: Request):
        if request.headers.get('sec-fetch-site') in {'cross-site', 'same-site'}:
            return error(403, 'Log out from the application.')
        token = request.cookies.get(COOKIE)
        if token and path.exists():
            with database(path) as db:
                db.execute('DELETE FROM sessions WHERE token_hash = ?', (token_digest(token),))
        response = Response(status_code=204, headers={'Cache-Control': 'no-store'})
        response.delete_cookie(COOKIE, httponly=True, samesite='strict')
        return response
