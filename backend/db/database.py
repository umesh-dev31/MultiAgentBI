from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from config import Settings

Base = declarative_base()

def make_engine(url):
    engine = create_engine(url,connect_args={'check_same_thread':False,'timeout':15} if url.startswith('sqlite') else {},pool_pre_ping=True)
    if url.startswith('sqlite'):
        @event.listens_for(engine,'connect')
        def configure(connection,_):
            connection.execute('PRAGMA foreign_keys=ON')
            connection.execute('PRAGMA busy_timeout=15000')
    return engine

# Compatibility for scripts; the application factory creates its own configured engine.
_settings = Settings()
DATABASE_URL = _settings.database_url or 'sqlite:///' + str(_settings.data_dir / 'agentinsight.db')
engine = make_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine,expire_on_commit=False)

def init_db(target_engine=None):
    from db.migrations import migrate
    migrate(target_engine or engine)

def get_db():
    with SessionLocal() as session:
        yield session
