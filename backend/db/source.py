"""Read-only import from an operator-configured analytics database."""
import os
import time
from sqlalchemy.engine import make_url
from sqlalchemy import event
import pandas as pd
from sqlalchemy import create_engine, inspect, MetaData, Table, select, text

MAX_IMPORT_ROWS = 100000

def source_engine():
    url = os.getenv("ANALYTICS_DATABASE_URL")
    if not url:
        raise ValueError("No analytics database configured.")
    dialect = make_url(url).get_backend_name()
    timeout = int(os.getenv('SOURCE_TIMEOUT_SECONDS','15'))
    if dialect=='postgresql':
        arguments = {'connect_timeout':timeout,'options':f'-c statement_timeout={timeout*1000}'}
    elif dialect=='mysql':
        arguments = {'connect_timeout':timeout,'read_timeout':timeout,'write_timeout':timeout}
    else:
        arguments = {'timeout':timeout}
    engine = create_engine(url,connect_args=arguments)
    if dialect=='sqlite':
        @event.listens_for(engine,'connect')
        def limit(connection,_):
            connection.set_progress_handler(lambda: int(time.monotonic()>getattr(connection_limit,'deadline',float('inf'))),1000)
        import threading
        connection_limit = threading.local()
        connection_limit.deadline = time.monotonic()+timeout
    if engine.dialect.name not in {"sqlite", "postgresql", "mysql"}:
        engine.dispose()
        raise ValueError("Supported sources are SQLite, PostgreSQL and MySQL.")
    return engine

def source_tables():
    engine = source_engine()
    try:
        return inspect(engine).get_table_names()
    finally:
        engine.dispose()

def extract_table(name):
    engine = source_engine()
    try:
        if name not in inspect(engine).get_table_names():
            raise KeyError("Table not found in the configured database.")
        table = Table(name, MetaData(), autoload_with=engine)
        with engine.connect() as connection:
            if engine.dialect.name == "sqlite":
                connection.execute(text("PRAGMA query_only = ON"))
            else:
                connection.execute(text("SET TRANSACTION READ ONLY"))
            if engine.dialect.name=='mysql':
                connection.execute(text('SET SESSION MAX_EXECUTION_TIME = '+str(int(os.getenv('SOURCE_TIMEOUT_SECONDS','15'))*1000)))
            frame = pd.read_sql(select(table).limit(MAX_IMPORT_ROWS + 1), connection)
        if len(frame) > MAX_IMPORT_ROWS:
            raise ValueError(f"Table exceeds {MAX_IMPORT_ROWS:,} rows. Import a smaller table or export a filtered CSV.")
        if frame.empty:
            raise ValueError("Selected table is empty.")
        return frame
    finally:
        engine.dispose()
