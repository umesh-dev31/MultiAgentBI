from http.cookies import SimpleCookie
import json
import sqlite3

from fastapi import FastAPI, Request

from auth import COOKIE, Login, Signup, get_workspace, install_auth


def test_signup_validation_sessions_and_workspace_ownership(tmp_path):
    db_path = tmp_path / 'auth.db'
    app = FastAPI()
    install_auth(app, db_path)
    routes = {route.path: route.endpoint for route in app.routes}

    def request(token=None):
        headers = [(b'cookie', f'{COOKIE}={token}'.encode())] if token else []
        return Request({
            'type': 'http', 'app': app, 'headers': headers, 'scheme': 'http',
            'server': ('localhost', 80), 'path': '/', 'client': ('127.0.0.1', 1234),
        })

    def signup(**value):
        return routes['/api/auth/signup'](Signup(**value), request())

    def login(identifier, password):
        return routes['/api/auth/login'](Login(identifier=identifier, password=password), request())

    def session(token=None):
        return routes['/api/auth/session'](request(token))

    def token(response):
        return SimpleCookie(response.headers['set-cookie'])[COOKIE].value

    account = {'username': 'Alice', 'email': 'Alice@example.com', 'password': 'password-1'}
    for field, value in [('username', '_a'), ('email', 'bad@-example.com'), ('password', 'short')]:
        rejected = signup(**{**account, field: value})
        assert rejected.status_code == 422
        assert json.loads(rejected.body)['field'] == field

    created = signup(**account)
    assert created.status_code == 201
    assert 'HttpOnly' in created.headers['set-cookie']
    assert 'SameSite=strict' in created.headers['set-cookie']
    expected = json.loads(created.body)
    alice = token(created)
    assert expected['email'] == 'alice@example.com'
    assert json.loads(session(alice).body) == expected
    assert session().status_code == 401
    assert get_workspace(request(alice)) == expected['workspace_id']

    for duplicate, field in [
        ({**account, 'username': 'aLiCe', 'email': 'other@example.com'}, 'username'),
        ({**account, 'username': 'Bob', 'email': 'ALICE@EXAMPLE.COM'}, 'email'),
    ]:
        conflict = signup(**duplicate)
        assert conflict.status_code == 409
        assert json.loads(conflict.body)['field'] == field

    other = signup(**{**account, 'username': 'Bob', 'email': 'bob@example.com'})
    assert other.status_code == 201
    assert get_workspace(request(token(other))) != get_workspace(request(alice))

    assert routes['/api/auth/logout'](request(alice)).status_code == 204
    assert session(alice).status_code == 401
    assert login('alice', 'wrong').status_code == 401
    for identifier in ['alice', 'ALICE@EXAMPLE.COM']:
        logged_in = login(identifier, account['password'])
        assert json.loads(logged_in.body) == expected

    with sqlite3.connect(db_path) as db:
        stored_password = db.execute('SELECT password_hash FROM accounts WHERE username = ?', ('Alice',)).fetchone()[0]
        assert stored_password != account['password'].encode()
        db.execute('UPDATE sessions SET expires_at = 0')
    assert session(token(logged_in)).status_code == 401

    app = FastAPI()
    install_auth(app, db_path)
    routes = {route.path: route.endpoint for route in app.routes}
    assert json.loads(login('Alice', account['password']).body) == expected
