"""Verify model endpoints share workspace ownership and the durable job queue."""
from io import BytesIO
from zipfile import ZipFile

import pytest
from starlette.requests import Request

from sqlalchemy.orm import sessionmaker

from contracts import ImportOptions
from db.database import init_db, make_engine
from db.models import Job
from jobs import JobManager
from main import ModelRequest, create_app
from repository import DatasetRepository, DomainError
from services import execute_job


@pytest.fixture
def model_app(configured):
    app = create_app(configured, start_worker=False)
    configured.prepare()
    engine = make_engine(configured.database_url)
    try:
        init_db(engine)
        app.state.sessions = sessionmaker(bind=engine)
        app.state.repository = DatasetRepository(app.state.sessions)
        app.state.jobs = JobManager(configured, app.state.sessions)
        yield app
    finally:
        engine.dispose()


def test_model_endpoints_train_and_export(model_app, configured):
    app = model_app
    workspace_id = 'first-workspace'
    rows = ''.join(f'{i},{3*i + (i % 3)}\n' for i in range(1, 101))
    csv_path = configured.data_dir / 'uploads' / 'sales.csv'
    csv_path.write_text('quantity,revenue\n' + rows)
    upload_id = app.state.jobs.submit(csv_path, 'sales.csv', ImportOptions(), workspace_id, mode='clean')
    execute_job(configured, upload_id)
    dataset_id = app.state.jobs.status(upload_id, workspace_id)['dataset_id']
    request = Request({'type': 'http', 'app': app, 'state': {'workspace_id': workspace_id}})
    other = Request({'type': 'http', 'app': app, 'state': {'workspace_id': 'another-workspace'}})
    routes = {route.path: route.endpoint for route in app.routes if hasattr(route, 'endpoint')}
    prefix = '/api/datasets/{dataset_id}/model/'
    body = ModelRequest(target='revenue', features=['quantity'], task='regression')
    inspected = routes[prefix + 'inspect'](dataset_id, body, request)
    assert inspected['workspace_eligible']
    assert inspected['recommended_algorithm'] in {option['id'] for option in inspected['algorithms']}
    for operation in ('inspect', 'train', 'export'):
        with pytest.raises(DomainError) as denied:
            routes[prefix + operation](dataset_id, body, other)
        assert denied.value.status == 404

    bundle = routes[prefix + 'export'](dataset_id, body, request)
    with ZipFile(BytesIO(bundle.body)) as archive:
        assert any(name.endswith('.ipynb') for name in archive.namelist())
        assert any(name.endswith('.csv') for name in archive.namelist())

    job_id = routes[prefix + 'train'](dataset_id, body, request)['job_id']
    with app.state.sessions() as session:
        assert session.get(Job, job_id).state == 'queued'
    execute_job(configured, job_id)
    result = routes['/api/jobs/{job_id}'](job_id, request)
    assert result['state'] == 'completed', result
    assert result['model_report']['task'] == 'regression'
    with pytest.raises(DomainError) as denied:
        routes['/api/jobs/{job_id}'](job_id, other)
    assert denied.value.status == 404
