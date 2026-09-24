import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# On Vercel the filesystem is read-only except for /tmp.
# Vercel automatically sets VERCEL=1 in all serverless functions.
_is_serverless = bool(os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"))

if _is_serverless:
    DB_PATH = "/tmp/agentinsight.db"
else:
    BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DATA_DIR = os.path.join(BACKEND_DIR, "data")
    os.makedirs(DATA_DIR, exist_ok=True)
    DB_PATH = os.path.join(DATA_DIR, "agentinsight.db")

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")

# check_same_thread is needed only for SQLite
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency for obtaining a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initializes database tables and performs schema migrations for SQLite."""
    import db.models  # noqa: F401
    Base.metadata.create_all(bind=engine)

    # Automatically add new columns if SQLite database already exists
    from sqlalchemy import text
    with engine.connect() as conn:
        for col in ["validated_data", "cleaned_data"]:
            try:
                conn.execute(text(f"ALTER TABLE pipeline_runs ADD COLUMN {col} JSON"))
                conn.commit()
            except Exception:
                pass
