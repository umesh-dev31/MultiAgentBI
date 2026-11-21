import io
import json
from concurrent.futures import ThreadPoolExecutor
import pandas as pd
import pytest
from sqlalchemy import select
from db.models import Job,PipelineRun,KnowledgeChunk

def test_persistence_restore_and_full_exports(client,complete_job):
    job = complete_job('id,order_date,revenue\n001,2026-01-01,10\n002,2026-02-01,20\n003,2026-03-01,30\n')
    dataset_id = job['dataset_id']
    restored = client.get(f'/api/history/{dataset_id}').json()
    assert restored['eda_result']==job['result']['eda_result']
    assert restored['policy_version']=='preserve-v1'
    assert restored['source_rows']==[2,3,4]
    csv = client.get(f'/api/export/{dataset_id}?format=csv')
    values = pd.read_csv(io.StringIO(csv.text),dtype={'id':str})
    assert values.id.tolist()==['001','002','003']
    assert client.get(f'/api/export/{dataset_id}?format=json').json()['dataset_id']==dataset_id
    assert 'Print / Save as PDF' in client.get(f'/api/export/{dataset_id}?format=html').text
    with client.app.state.sessions() as session:
        run = session.scalars(select(PipelineRun)).one()
        assert run.validated_data is None
        assert run.source_rows==[2,3,4]

def test_explicit_dataset_isolation_and_legacy_ambiguity(client,complete_job):
    first = complete_job('id,revenue\n001,10\n002,20\n')
    query = client.post('/api/query',json={'question':'how many rows'})
    assert query.status_code==200 and query.json()['row_count']==1
    second = complete_job('id,revenue\n003,100\n004,200\n005,300\n')
    assert client.post('/api/query',json={'question':'how many rows'}).status_code==409
    assert client.post('/api/ml-insights').status_code==409
    def fetch(dataset_id):
        return client.post(f'/api/datasets/{dataset_id}/query',json={'question':'how many rows'}).json()['result'][0]['total_records']
    with ThreadPoolExecutor(max_workers=4) as pool:
        counts = list(pool.map(fetch,[first['dataset_id'],second['dataset_id']]*5))
    assert counts==[2,3]*5
    client.get('/api/history/'+str(first['dataset_id']))
    assert fetch(second['dataset_id'])==3
    assert client.post('/api/query',json={'question':'how many rows','dataset_id':999999}).status_code==404

def test_workspace_isolates_history_jobs_and_dataset_operations(client, complete_job):
    job = complete_job()
    dataset_id = job['dataset_id']
    job_id = job['job_id']
    client.cookies.clear()
    assert client.get('/api/history').status_code == 401
    assert client.post('/api/auth/signup', json={
        'username': 'second', 'email': 'second@example.com', 'password': 'test-password',
    }).status_code in (200, 201)
    assert client.get('/api/history').json() == []
    assert client.post('/api/query', json={'question': 'how many rows'}).status_code == 409
    for url in (
        f'/api/history/{dataset_id}', f'/api/export/{dataset_id}',
        f'/api/jobs/{job_id}', f'/api/pipeline/status/{job_id}',
        f'/api/pipeline/stream?session_id={job_id}',
        f'/api/knowledge/suggested-questions?scope=all_history&dataset_id={dataset_id}',
    ):
        assert client.get(url).status_code == 404, url
    assert client.post(f'/api/datasets/{dataset_id}/query', json={'question': 'how many rows'}).status_code == 404
    assert client.post('/api/auth/logout').status_code == 204
    assert client.post('/api/auth/login', json={
        'identifier': 'tester', 'password': 'test-password',
    }).status_code == 200
    assert client.get(f'/api/history/{dataset_id}').status_code == 200
    assert client.get(f'/api/jobs/{job_id}').status_code == 200

def test_history_population_and_context_are_independent_copies(client,complete_job):
    job = complete_job()
    repo = client.app.state.repository
    first,second = repo.context(job['dataset_id']),repo.context(job['dataset_id'])
    first.frame.iloc[0,1] = 999
    assert second.frame.iloc[0,1]==10
    assert repo.context(job['dataset_id']).frame.iloc[0,1]==10

def test_persisted_numeric_values_are_not_rounded(client,complete_job):
    job=complete_job('id,revenue\n001,1.2345678901234567\n002,2.345678901234567\n')
    frame=client.app.state.repository.context(job['dataset_id']).frame
    assert frame.revenue[0]==float('1.2345678901234567')
    assert frame.revenue[1]==float('2.345678901234567')

def test_optional_indexing_failure_keeps_saved_identity(client,configured,monkeypatch):
    from services import execute_job
    from agents.knowledge_agent import KnowledgeAgent
    monkeypatch.setattr(KnowledgeAgent,'index_pipeline_run',lambda *a,**k:(_ for _ in ()).throw(RuntimeError('secret')))
    response = client.post('/api/jobs',files={'file':('data.csv',b'id,revenue\n001,10\n002,20\n')})
    execute_job(configured,response.json()['job_id'])
    status = client.get(response.json()['status_url']).json()
    assert status['state']=='completed_with_warnings'
    assert status['dataset_id']
    assert any(w['code']=='INDEXING_FAILED' for w in status['result']['warnings'])
    assert client.get('/api/export/'+str(status['dataset_id'])).status_code==200
    assert 'secret' not in json.dumps(status)

def test_failed_save_is_not_success(client,configured,monkeypatch):
    from services import execute_job
    from repository import DatasetRepository
    from sqlalchemy.exc import OperationalError
    def fail(*a,**k):
        raise OperationalError('private connection',{},Exception('password'))
    monkeypatch.setattr(DatasetRepository,'save',fail)
    response = client.post('/api/jobs',files={'file':('data.csv',b'revenue\n10\n20\n')})
    execute_job(configured,response.json()['job_id'])
    status = client.get(response.json()['status_url']).json()
    assert status['state']=='failed' and status['error']['code']=='STORAGE_UNAVAILABLE'
    assert client.get('/api/history').json()==[]
    assert 'password' not in json.dumps(status)

def test_invalid_input_and_job_identity(client,configured):
    from services import execute_job
    response = client.post('/api/jobs',files={'file':('empty.csv',b'id,revenue\n')})
    execute_job(configured,response.json()['job_id'])
    assert client.get(response.json()['status_url']).json()['error']['code']=='INVALID_INPUT'
    assert client.get('/api/jobs/unknown').status_code==404
    assert client.get('/api/pipeline/status/unknown').status_code==404
    assert client.post('/api/jobs',files={'file':('bad.txt',b'hello')}).status_code==422
    assert client.post('/api/jobs',files={'file':('data.csv',b'id\n001')},data={'options':'invalid'}).status_code==422

def test_bounded_upload_and_safe_original_storage(client,configured):
    configured.max_upload_bytes=20
    assert client.post('/api/jobs',files={'file':('large.csv',b'x'*21)}).status_code==413
    assert list((configured.data_dir/'uploads').iterdir())==[]
    response = client.post('/api/jobs',files={'file':('../../escape.csv',b'id\n001\n')})
    assert response.status_code==202
    files = list((configured.data_dir/'uploads').iterdir())
    assert len(files)==1 and files[0].parent==configured.data_dir/'uploads'
    assert files[0].read_bytes()==b'id\n001\n'

def test_knowledge_scope_and_cache_invalidation(client,complete_job):
    from retrieval_cache import index
    first = complete_job('id,price\n001,bad\n002,20\n')
    second = complete_job('id,price\n003,30\n')
    response = client.post('/api/knowledge/ask',json={'question':'Why was row 2 flagged?','dataset_id':first['dataset_id']})
    assert response.status_code==200
    assert response.json()['sources']
    assert {s['dataset_id'] for s in response.json()['sources']}=={first['dataset_id']}
    assert client.post('/api/knowledge/ask',json={'question':'hello','scope':'invalid'}).status_code==422
    assert client.post('/api/knowledge/ask',json={'question':'hello','dataset_id':9999}).status_code==404
    with client.app.state.sessions() as session:
        chunks = list(session.scalars(select(KnowledgeChunk).where(KnowledgeChunk.dataset_id==first['dataset_id'])))
        a = index(chunks); b = index(chunks)
        assert a[0] is b[0]
        chunks[0].chunk_text += ' revision'
        assert index(chunks)[0] is not a[0]

def test_source_import_is_read_only_and_rejects_unknown_table(client,tmp_path,monkeypatch):
    import sqlite3
    source = tmp_path/'source.db'
    with sqlite3.connect(source) as conn:
        conn.execute('CREATE TABLE sales (revenue INTEGER)')
        conn.execute('INSERT INTO sales VALUES (123)')
    monkeypatch.setenv('ANALYTICS_DATABASE_URL','sqlite:///'+str(source))
    assert client.get('/api/database/tables').json()['tables']==['sales']
    response = client.post('/api/database/extract',json={'table':'sales'})
    assert response.status_code==200 and '123' in response.text
    assert client.post('/api/database/extract',json={'table':'sales; DROP TABLE sales'}).status_code==404

def test_row_number_retrieval_does_not_confuse_prefixes():
    from agents.knowledge_agent import KnowledgeAgent
    chunks=[KnowledgeChunk(id=1,dataset_id=1,chunk_type='audit_issue',chunk_text="Row 13, column 'price': invalid"),KnowledgeChunk(id=2,dataset_id=1,chunk_type='audit_issue',chunk_text="Row 130, column 'price': invalid")]
    sources=KnowledgeAgent()._retrieve_relevant_chunks('why row 13?',chunks)
    assert sources[0]['text'].startswith('Row 13,')
    assert sources[0]['score']>sources[1]['score']
