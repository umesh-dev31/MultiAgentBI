"""Read-only import from an operator-configured analytics database."""
import os
import pandas as pd
from sqlalchemy import create_engine, inspect, MetaData, Table, select, text

MAX_IMPORT_ROWS = 100000

def source_engine():
    url = os.getenv("ANALYTICS_DATABASE_URL")
    if not url:
        raise ValueError("No analytics database configured.")
    engine = create_engine(url)
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
            frame = pd.read_sql(select(table).limit(MAX_IMPORT_ROWS + 1), connection)
        if len(frame) > MAX_IMPORT_ROWS:
            raise ValueError(f"Table exceeds {MAX_IMPORT_ROWS:,} rows. Import a smaller table or export a filtered CSV.")
        if frame.empty:
            raise ValueError("Selected table is empty.")
        return frame
    finally:
        engine.dispose()
