import sys
from pathlib import Path
import pytest

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))

def pytest_addoption(parser):
    parser.addoption('--run-integration',action='store_true',help='Enable explicitly configured live service checks')

def pytest_collection_modifyitems(config,items):
    if not config.getoption('--run-integration'):
        for item in items:
            if 'integration' in item.keywords:
                item.add_marker(pytest.mark.skip(reason='Pass --run-integration with configured services'))

@pytest.fixture(autouse=True)
def offline(monkeypatch,request):
    if 'integration' in request.keywords:
        return
    monkeypatch.setenv('PYTHON_DOTENV_DISABLED','1')
    monkeypatch.delenv('GROQ_API_KEY',raising=False)
    monkeypatch.delenv('ANTHROPIC_API_KEY',raising=False)
    monkeypatch.delenv('LANGSMITH_API_KEY',raising=False)
    monkeypatch.setenv('LANGCHAIN_TRACING_V2','false')

@pytest.fixture
def configured(tmp_path):
    from config import Settings
    return Settings(data_dir=tmp_path,database_url='sqlite:///'+str(tmp_path/'test.db'))

@pytest.fixture
def client(configured):
    from main import create_app
    from fastapi.testclient import TestClient
    with TestClient(create_app(configured,start_worker=False)) as client:
        yield client

@pytest.fixture
def complete_job(client,configured):
    from services import execute_job
    def complete(csv='id,revenue\n001,10\n002,20\n003,30\n',options=None):
        import json
        response = client.post('/api/jobs',files={'file':('data.csv',csv.encode('utf-8'),'text/csv')},data={'options':json.dumps(options or {})})
        assert response.status_code==202,response.text
        job_id = response.json()['job_id']
        execute_job(configured,job_id)
        result = client.get('/api/jobs/'+job_id).json()
        assert result['state'] in {'completed','completed_with_warnings'},result
        return result
    return complete
