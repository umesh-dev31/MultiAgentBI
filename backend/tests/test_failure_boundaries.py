import pytest
from sqlalchemy import event,select,func
from db.models import Dataset,PipelineRun,KnowledgeChunk
from services import execute_job

def submitted(client):
    return client.post('/api/jobs',files={'file':('data.csv',b'id,revenue\n001,10\n002,20\n')}).json()

def test_dataset_and_required_results_roll_back_together(client,configured):
    def fail(*a):
        raise RuntimeError('simulated private failure')
    event.listen(PipelineRun,'before_insert',fail)
    try:
        job=submitted(client)
        execute_job(configured,job['job_id'])
    finally:
        event.remove(PipelineRun,'before_insert',fail)
    assert client.get(job['status_url']).json()['state']=='failed'
    assert client.get('/api/history').json()==[]
    with client.app.state.sessions() as session:
        assert session.scalar(select(func.count()).select_from(PipelineRun))==0

def test_required_eda_failure_fails_job(client,configured,monkeypatch):
    from agents.eda_agent import EDAAgent
    monkeypatch.setattr(EDAAgent,'analyze',lambda *a,**k:(_ for _ in ()).throw(RuntimeError('private')))
    job=submitted(client); execute_job(configured,job['job_id'])
    status=client.get(job['status_url']).json()
    assert status['state']=='failed' and status['dataset_id'] is None
    assert 'private' not in str(status)

def test_optional_chart_failure_preserves_required_results(client,configured,monkeypatch):
    from agents.visualization_agent import VisualizationAgent
    monkeypatch.setattr(VisualizationAgent,'suggest_charts',lambda *a,**k:(_ for _ in ()).throw(RuntimeError('private')))
    job=submitted(client); execute_job(configured,job['job_id'])
    status=client.get(job['status_url']).json()
    assert status['state']=='completed_with_warnings'
    assert status['result']['eda_result']
    assert status['stages']['visualization_node']['status']=='failed'
    assert any(w['stage']=='visualization_node' for w in status['result']['warnings'])

def test_reindex_is_idempotent(client,complete_job):
    from agents.knowledge_agent import KnowledgeAgent
    job=complete_job('id,price\n001,bad\n002,20\n')
    dataset_id=job['dataset_id']
    with client.app.state.sessions() as session:
        before=session.scalar(select(func.count()).select_from(KnowledgeChunk).where(KnowledgeChunk.dataset_id==dataset_id))
        KnowledgeAgent().index_pipeline_run(dataset_id,job['result']['data_quality_report'],job['result']['insight_result'],db_session=session)
        after=session.scalar(select(func.count()).select_from(KnowledgeChunk).where(KnowledgeChunk.dataset_id==dataset_id))
    assert before==after and before>0

def test_provider_timeout_and_retry_configuration(monkeypatch):
    import sys
    from types import SimpleNamespace
    from providers import complete
    options={}
    class Client:
        def __init__(self,**kwargs):
            options.update(kwargs)
            self.chat=SimpleNamespace(completions=SimpleNamespace(create=lambda **k:SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content='SELECT 1'))])))
    monkeypatch.setitem(sys.modules,'groq',SimpleNamespace(Groq=Client))
    owner=SimpleNamespace(groq_api_key='test-key',groq_model='test-model')
    assert complete(owner,'prompt','system')=='SELECT 1'
    assert options['timeout']==20 and options['max_retries']==1
