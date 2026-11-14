import time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
import pytest
from sqlalchemy import select
from db.models import Job

def test_queue_admission_is_bounded_under_concurrency(client,configured):
    configured.queue_size=2
    def submit(_):
        return client.post('/api/jobs',files={'file':('data.csv',b'id\n001\n')}).status_code
    with ThreadPoolExecutor(max_workers=8) as pool:
        statuses=list(pool.map(submit,range(8)))
    assert statuses.count(202)==3 and statuses.count(429)==5
    assert len(list((configured.data_dir/'uploads').iterdir()))==3

def test_restart_marks_running_failed_and_retains_queued(client,configured,monkeypatch):
    from jobs import JobManager
    a=client.post('/api/jobs',files={'file':('a.csv',b'id\n001\n')}).json()['job_id']
    b=client.post('/api/jobs',files={'file':('b.csv',b'id\n002\n')}).json()['job_id']
    with client.app.state.sessions.begin() as session:
        job=session.get(Job,a); job.state='running'; job.started_at=datetime.utcnow()
    manager=JobManager(configured,client.app.state.sessions)
    monkeypatch.setattr(manager,'_loop',lambda:None)
    manager.start(); manager.close()
    assert manager.status(a)['error']['code']=='JOB_INTERRUPTED'
    assert manager.status(b)['state']=='queued'

def test_deadline_terminates_worker_and_starts_next_job(client,configured,monkeypatch):
    from jobs import JobManager
    ids=[client.post('/api/jobs',files={'file':('a.csv',b'id\n001\n')}).json()['job_id'] for _ in range(2)]
    class Process:
        def __init__(self,**kwargs): self.alive=False; self.terminated=False
        def start(self): self.alive=True
        def is_alive(self): return self.alive
        def terminate(self): self.alive=False; self.terminated=True
        def join(self,*a): pass
        def close(self): pass
    from types import SimpleNamespace
    monkeypatch.setattr('jobs.multiprocessing.get_context',lambda _:SimpleNamespace(Process=Process))
    manager=JobManager(configured,client.app.state.sessions)
    manager.tick(); first=manager.process
    manager.started=time.monotonic()-configured.job_timeout-1
    manager.tick()
    assert first.terminated
    assert manager.status(ids[0])['error']['code']=='JOB_TIMEOUT'
    assert manager.status(ids[1])['state']=='running'
    manager.close()

@pytest.mark.process
def test_real_worker_and_synchronous_compatibility(configured):
    from main import create_app
    from fastapi.testclient import TestClient
    with TestClient(create_app(configured)) as client:
        response=client.post('/api/upload',files={'file':('a.csv',b'id,revenue\n001,10\n002,20\n')})
        assert response.status_code==200,response.text
        assert response.json()['dataset_id']
        assert client.post('/api/query',json={'question':'how many rows'}).json()['result'][0]['total_records']==2
        response=client.post('/api/pipeline/run?run_id=compat_test',files={'file':('b.csv',b'id,revenue\n003,30\n004,40\n')})
        assert response.status_code==200,response.text
        assert response.json()['eda_result']
        status=client.get('/api/pipeline/status/compat_test').json()
        assert status['state']=='completed_with_warnings'
        assert 'data_cleaning_node' in status['stages']
        assert {'data_cleaning_node','validation_node','eda_node','ml_node','visualization_node','insight_node'} <= status['stages'].keys()
        assert client.post('/api/query',json={'question':'how many rows'}).status_code==409

@pytest.mark.process
def test_async_job_completes_after_submission(configured):
    from main import create_app
    from fastapi.testclient import TestClient
    with TestClient(create_app(configured)) as client:
        response=client.post('/api/jobs',files={'file':('a.csv',b'id,revenue\n001,10\n002,20\n')})
        assert response.status_code==202
        status=response.json()
        deadline=time.monotonic()+60
        while time.monotonic()<deadline:
            status=client.get(response.json()['status_url']).json()
            if status['state'] in {'completed','completed_with_warnings','failed'}: break
            time.sleep(.1)
        assert status['state'] in {'completed','completed_with_warnings'},status
        assert status['result']['dataset_id']
