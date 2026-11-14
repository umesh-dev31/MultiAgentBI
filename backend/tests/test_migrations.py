import json
import sqlite3
from pathlib import Path
import pytest
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker
from db.database import make_engine,init_db
from repository import DatasetRepository,DomainError

def test_legacy_schema_backup_and_preview_safety(tmp_path):
    path=tmp_path/'old.db'
    with sqlite3.connect(path) as conn:
        conn.execute('CREATE TABLE datasets(id INTEGER PRIMARY KEY,filename TEXT NOT NULL,uploaded_at DATETIME NOT NULL,row_count INTEGER NOT NULL,validated_row_count INTEGER NOT NULL,flagged_count INTEGER NOT NULL)')
        conn.execute('CREATE TABLE pipeline_runs(id INTEGER PRIMARY KEY,dataset_id INTEGER NOT NULL,dataset_summary JSON,eda_result JSON,ml_result JSON,insight_result JSON,visualization_result JSON,audit_report JSON,data_health_score JSON,suggested_questions JSON,execution_logs JSON,created_at DATETIME NOT NULL)')
        conn.execute("INSERT INTO datasets VALUES(1,'old.csv','2026-01-01',100,90,10)")
        conn.execute('INSERT INTO pipeline_runs(id,dataset_id,dataset_summary,eda_result,created_at) VALUES(1,1,?,?,?)',(json.dumps({'cleaned_preview':[{'revenue':10}]}),json.dumps({'saved':True}),'2026-01-01'))
    engine=make_engine('sqlite:///'+str(path))
    init_db(engine)
    backups=list(tmp_path.glob('old.db.backup-*'))
    assert len(backups)==1
    with sqlite3.connect(backups[0]) as connection:
        assert 'policy_version' not in {r[1] for r in connection.execute('PRAGMA table_info(pipeline_runs)')}
    repo=DatasetRepository(sessionmaker(bind=engine))
    assert repo.snapshot(1)['eda_result']=={'saved':True}
    assert repo.snapshot(1)['policy_version']=='legacy-v0'
    with pytest.raises(DomainError) as error: repo.context(1)
    assert error.value.code=='INCOMPLETE_LEGACY_DATA'
    init_db(engine)
    assert len(list(tmp_path.glob('old.db.backup-*')))==1
    engine.dispose()

def test_startup_rejects_serverless_default(tmp_path,monkeypatch):
    from config import Settings
    monkeypatch.setenv('VERCEL','1')
    with pytest.raises(RuntimeError,match='Serverless'):
        Settings(data_dir=tmp_path).prepare()

def test_failed_migration_rolls_back_ddl(tmp_path,monkeypatch):
    from db.database import Base
    path=tmp_path/'interrupted.db'
    with sqlite3.connect(path) as connection:
        connection.execute('CREATE TABLE datasets(id INTEGER PRIMARY KEY,filename TEXT NOT NULL,uploaded_at DATETIME NOT NULL,row_count INTEGER NOT NULL,validated_row_count INTEGER NOT NULL,flagged_count INTEGER NOT NULL)')
    engine=make_engine('sqlite:///'+str(path))
    def fail(*a,**k): raise RuntimeError('migration interrupted')
    monkeypatch.setattr(Base.metadata,'create_all',fail)
    with pytest.raises(RuntimeError): init_db(engine)
    with sqlite3.connect(path) as connection:
        assert 'source_path' not in {row[1] for row in connection.execute('PRAGMA table_info(datasets)')}
    engine.dispose()
