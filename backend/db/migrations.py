"""Versioned, transactional schema upgrades with a SQLite backup before changes."""
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy import inspect, select
from sqlalchemy.schema import CreateColumn
from db.database import Base

LATEST = 1

def migrate(engine):
    from db.models import SchemaRevision
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    if 'schema_revisions' in tables:
        with engine.connect() as connection:
            versions = list(connection.execute(select(SchemaRevision.version)).scalars())
        if versions and max(versions) > LATEST:
            raise RuntimeError('Database schema is newer than this backend')
        if LATEST in versions:
            return
    if tables and engine.dialect.name == 'sqlite' and engine.url.database != ':memory:':
        path = Path(engine.url.database)
        backup = str(path) + '.backup-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f')
        with sqlite3.connect(str(path)) as src, sqlite3.connect(backup) as dst:
            src.backup(dst)
    # Revision 1: adopt old schemas and add explicitly declared backend repair columns.
    with engine.begin() as connection:
        if engine.dialect.name=='sqlite':
            # Python's SQLite legacy mode otherwise autocommits DDL before any DML.
            connection.exec_driver_sql('BEGIN')
        for name in ('datasets','pipeline_runs'):
            if name not in tables:
                continue
            existing = {c['name'] for c in inspect(connection).get_columns(name)}
            for column in Base.metadata.tables[name].columns:
                if column.name in existing:
                    continue
                # Legacy rows must be readable even for newly introduced metadata.
                ddl = str(CreateColumn(column).compile(dialect=engine.dialect))
                if column.name == 'policy_version':
                    ddl = 'policy_version VARCHAR(40) NOT NULL DEFAULT \'legacy-v0\''
                connection.exec_driver_sql(f'ALTER TABLE {name} ADD COLUMN {ddl}')
        Base.metadata.create_all(connection)
        connection.execute(SchemaRevision.__table__.insert().values(version=LATEST))
