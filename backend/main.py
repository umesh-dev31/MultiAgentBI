"""HTTP contracts and compatibility adapters for a persistent personal backend."""
import asyncio
import html
import json
import re
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal
from fastapi import FastAPI,File,Form,UploadFile,Request,Response,Query
from fastapi.responses import JSONResponse,StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel,Field,ValidationError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker
from config import Settings
from contracts import ImportOptions
from db.database import make_engine,init_db
from db.models import BrowserDataset
from repository import DatasetRepository,DomainError
from jobs import JobManager,TERMINAL
from agents.eda_agent import EDAAgent
from agents.ml_agent import MLAgent
from agents.sql_agent import SQLAgent
from agents.insight_agent import InsightAgent
from agents.visualization_agent import VisualizationAgent
from agents.knowledge_agent import KnowledgeAgent

COOKIE = 'insight_session'

class QueryRequest(BaseModel):
    question: str = Field(min_length=1,max_length=4000)
    dataset_id: int | None = Field(default=None,gt=0)

class KnowledgeRequest(QueryRequest):
    scope: Literal['current','all_history'] = 'current'

class DatabaseImportRequest(BaseModel):
    table: str = Field(min_length=1,max_length=255)

def create_app(settings=None,start_worker=True):
    settings = settings or Settings()
    @asynccontextmanager
    async def lifespan(app):
        settings.prepare()
        engine = make_engine(settings.database_url)
        try:
            init_db(engine)
            sessions = sessionmaker(bind=engine,expire_on_commit=False)
            app.state.sessions = sessions
            app.state.repository = DatasetRepository(sessions)
            app.state.jobs = JobManager(settings,sessions)
            if start_worker:
                app.state.jobs.start()
            yield
        finally:
            if hasattr(app.state,'jobs'):
                app.state.jobs.close()
            engine.dispose()
    app = FastAPI(title='AgentInsight AI Backend',version='0.2.0',lifespan=lifespan)
    app.add_middleware(CORSMiddleware,allow_origin_regex=r'https?://(localhost|127\.0\.0\.1)(:\d+)?',allow_credentials=True,allow_methods=['GET','POST'],allow_headers=['Content-Type'])

    @app.exception_handler(DomainError)
    async def domain_error(request,error):
        return JSONResponse(status_code=error.status,content={'detail':error.message,'error':{'code':error.code,'message':error.message}})

    @app.exception_handler(SQLAlchemyError)
    async def storage_error(request,error):
        return JSONResponse(status_code=503,content={'detail':'Storage is unavailable.','error':{'code':'STORAGE_UNAVAILABLE','message':'Storage is unavailable.'}})

    @app.exception_handler(RequestValidationError)
    async def validation_error(request,error):
        return JSONResponse(status_code=422,content={'detail':'Request fields are invalid.','error':{'code':'INVALID_INPUT','message':'Request fields are invalid.'}})

    @app.exception_handler(ValueError)
    async def analysis_value_error(request,error):
        return JSONResponse(status_code=422,content={'detail':'The requested analysis cannot produce a valid result.','error':{'code':'ANALYSIS_INVALID','message':'The requested analysis cannot produce a valid result.'}})

    def browser(request,response):
        session_id = request.cookies.get(COOKIE)
        if not session_id or not re.fullmatch(r'[a-f0-9]{32}',session_id):
            session_id = uuid.uuid4().hex
        response.set_cookie(COOKIE,session_id,httponly=True,samesite='strict',max_age=30*24*3600)
        return session_id

    def resolve(request,dataset_id):
        return app.state.repository.resolve(dataset_id,request.cookies.get(COOKIE))

    async def submit(file,options,request,response,mode='full',run_id=None):
        try:
            policy = ImportOptions.model_validate_json(options)
        except (ValidationError,ValueError):
            raise DomainError(422,'INVALID_OPTIONS','Import options must be a valid JSON object.')
        name = Path((file.filename or '').replace('\\','/')).name
        suffix = Path(name).suffix.lower()
        if suffix not in {'.csv','.xlsx','.xls'}:
            raise DomainError(422,'INVALID_FORMAT','Select a CSV, XLSX or XLS file.')
        if run_id and not re.fullmatch(r'[A-Za-z0-9_-]{1,100}',run_id):
            raise DomainError(422,'INVALID_RUN_ID','Invalid run ID.')
        path = settings.data_dir / 'uploads' / (uuid.uuid4().hex+suffix)
        try:
            size = 0
            with path.open('xb') as output:
                while chunk := await file.read(65536):
                    size += len(chunk)
                    if size > settings.max_upload_bytes:
                        raise DomainError(413,'UPLOAD_TOO_LARGE','Upload exceeds configured byte limit.')
                    output.write(chunk)
            if size==0:
                raise DomainError(422,'EMPTY_UPLOAD','The uploaded file is empty.')
            return app.state.jobs.submit(path,name,policy,browser(request,response),mode,run_id)
        except BaseException:
            path.unlink(missing_ok=True)
            raise
        finally:
            await file.close()

    async def wait_for_result(job_id):
        # Compatibility wait only: disconnecting this request never cancels the persisted job.
        while True:
            status = app.state.jobs.status(job_id)
            if status['state']=='failed':
                error = status['error'] or {'code':'PIPELINE_FAILED','message':'Processing failed.'}
                code = 422 if error['code']=='INVALID_INPUT' else 503
                raise DomainError(code,error['code'],error['message'])
            if status['state'] in TERMINAL:
                return app.state.repository.snapshot(status['dataset_id'])
            await asyncio.sleep(.1)

    @app.get('/health')
    def health():
        from sqlalchemy import text
        with app.state.sessions() as session:
            session.execute(text('SELECT 1'))
        return {'status':'ok'}

    @app.post('/api/jobs',status_code=202)
    async def create_job(request:Request,response:Response,file:UploadFile=File(...),options:str=Form('{}')):
        job_id = await submit(file,options,request,response)
        return {'job_id':job_id,'status':'queued','status_url':'/api/jobs/'+job_id}

    @app.get('/api/jobs/{job_id}')
    def get_job(job_id:str):
        status = app.state.jobs.status(job_id)
        if status['state'] in {'completed','completed_with_warnings'}:
            status['result'] = app.state.repository.snapshot(status['dataset_id'])
        return status

    @app.post('/api/pipeline/run')
    async def pipeline(request:Request,response:Response,file:UploadFile=File(...),options:str=Form('{}'),run_id:str|None=None,session_id:str|None=None):
        job_id = await submit(file,options,request,response,run_id=run_id or session_id)
        return await wait_for_result(job_id)

    @app.post('/api/upload')
    async def upload(request:Request,response:Response,file:UploadFile=File(...),options:str=Form('{}')):
        job_id = await submit(file,options,request,response,mode='clean')
        result = await wait_for_result(job_id)
        return dict(result['dataset_summary'],dataset_id=result['dataset_id'],warnings=result['warnings'])

    @app.get('/api/pipeline/status/{run_id}')
    def old_status(run_id:str):
        return app.state.jobs.status(run_id)

    @app.get('/api/pipeline/status')
    def old_status_query(run_id:str|None=None,session_id:str|None=None):
        if not (run_id or session_id):
            raise DomainError(422,'JOB_ID_REQUIRED','Supply a run ID.')
        return app.state.jobs.status(run_id or session_id)

    @app.get('/api/pipeline/stream')
    async def stream(session_id:str,request:Request):
        app.state.jobs.status(session_id)
        async def events():
            previous = None
            while not await request.is_disconnected():
                status = app.state.jobs.status(session_id)
                encoded = json.dumps(status)
                if encoded!=previous:
                    yield 'data: '+encoded+'\n\n'
                    previous = encoded
                else:
                    yield ': ping\n\n'
                if status['state'] in TERMINAL:
                    break
                await asyncio.sleep(.5)
        return StreamingResponse(events(),media_type='text/event-stream',headers={'Cache-Control':'no-cache'})

    @app.get('/api/history')
    def history():
        return app.state.repository.history()

    @app.get('/api/history/{dataset_id}')
    def history_run(dataset_id:int,request:Request,response:Response):
        result = app.state.repository.snapshot(dataset_id)
        session_id = browser(request,response)
        # Record only membership for ambiguity detection; no active-dataset pointer exists.
        with app.state.sessions.begin() as session:
            if session.get(BrowserDataset,(session_id,dataset_id)) is None:
                session.add(BrowserDataset(session_id=session_id,dataset_id=dataset_id))
        return result

    @app.post('/api/datasets/{dataset_id}/query')
    def dataset_query(dataset_id:int,body:QueryRequest):
        context = app.state.repository.context(dataset_id)
        return dict(SQLAgent().generate_and_run(body.question,context.frame),dataset_id=dataset_id)

    @app.post('/api/query')
    def legacy_query(body:QueryRequest,request:Request):
        return dataset_query(resolve(request,body.dataset_id),body)

    def analyze(dataset_id,kind):
        context = app.state.repository.context(dataset_id)
        if kind=='eda':
            result = EDAAgent().analyze(context.frame)
        elif kind=='ml-insights':
            result = MLAgent().analyze(context.frame)
        else:
            eda = EDAAgent().analyze(context.frame)
            ml = MLAgent().analyze(context.frame)
            result = dict(InsightAgent().generate_summary(eda,ml),**VisualizationAgent().suggest_charts(context.frame,eda))
        return dict(result,dataset_id=dataset_id)

    @app.post('/api/datasets/{dataset_id}/analysis/{kind}')
    def dataset_analysis(dataset_id:int,kind:Literal['eda','ml-insights','insights']):
        return analyze(dataset_id,kind)

    @app.post('/api/eda')
    def eda(request:Request,dataset_id:int|None=None):
        return analyze(resolve(request,dataset_id),'eda')

    @app.post('/api/ml-insights')
    def ml(request:Request,dataset_id:int|None=None):
        return analyze(resolve(request,dataset_id),'ml-insights')

    @app.post('/api/insights')
    def insights(request:Request,dataset_id:int|None=None):
        return analyze(resolve(request,dataset_id),'insights')

    @app.get('/api/suggested-questions')
    def questions(request:Request,dataset_id:int|None=None,refresh:bool=False):
        dataset_id = resolve(request,dataset_id)
        snapshot = app.state.repository.snapshot(dataset_id)
        result = snapshot['suggested_questions']
        if not result or refresh:
            result = SQLAgent().generate_suggested_questions(app.state.repository.context(dataset_id).frame)
        return {'questions':result,'dataset_id':dataset_id}

    @app.post('/api/knowledge/ask')
    def knowledge(body:KnowledgeRequest,request:Request):
        dataset_id = resolve(request,body.dataset_id) if body.scope=='current' else body.dataset_id
        if dataset_id is not None:
            app.state.repository.snapshot(dataset_id)
        with app.state.sessions() as session:
            return KnowledgeAgent().answer_question(body.question,current_dataset_id=dataset_id,scope=body.scope,db_session=session)

    @app.get('/api/knowledge/suggested-questions')
    def knowledge_questions(request:Request,scope:Literal['current','all_history']='current',dataset_id:int|None=None):
        dataset_id = resolve(request,dataset_id) if scope=='current' else dataset_id
        if dataset_id is not None:
            app.state.repository.snapshot(dataset_id)
        with app.state.sessions() as session:
            return {'questions':KnowledgeAgent().get_suggested_questions(current_dataset_id=dataset_id,scope=scope,db_session=session)}

    @app.get('/api/export/{dataset_id}')
    def export(dataset_id:int,format:Literal['json','csv','html']='json'):
        result = app.state.repository.snapshot(dataset_id)
        if format=='csv':
            data = app.state.repository.context(dataset_id).frame
            for col in data:
                data[col] = data[col].map(lambda v:"'"+v if isinstance(v,str) and v.lstrip().startswith(('=','+','-','@')) else v)
            content,media = '\ufeff'+data.to_csv(index=False),'text/csv'
        elif format=='html':
            content = '<!doctype html><html><meta charset="utf-8"><title>AgentInsight report</title><style>body{font:15px system-ui;max-width:1000px;margin:40px auto}pre{white-space:pre-wrap;overflow-wrap:anywhere}@media print{button{display:none}}</style><h1>'+html.escape(result['filename'])+'</h1><button onclick="window.print()">Print / Save as PDF</button><pre>'+html.escape(json.dumps(result,indent=2,ensure_ascii=False))+'</pre></html>'
            media = 'text/html'
        else:
            content,media = json.dumps(result,ensure_ascii=False),'application/json'
        return Response(content,media_type=media,headers={'Content-Disposition':f'attachment; filename="agentinsight-{dataset_id}.{format}"'})

    @app.get('/api/database/tables')
    def source_tables():
        import os
        from db.source import source_tables
        if not os.getenv('ANALYTICS_DATABASE_URL'):
            return {'configured':False,'tables':[]}
        try:
            return {'configured':True,'tables':source_tables()}
        except Exception:
            raise DomainError(503,'SOURCE_UNAVAILABLE','Configured analytics source is unavailable.')

    @app.post('/api/database/extract')
    def extract(body:DatabaseImportRequest):
        from db.source import extract_table
        try:
            return Response(extract_table(body.table).to_csv(index=False),media_type='text/csv')
        except KeyError:
            raise DomainError(404,'TABLE_NOT_FOUND','Source table not found.')
        except ValueError:
            raise DomainError(422,'INVALID_SOURCE','Source is empty, unconfigured, or exceeds import limits.')
        except Exception:
            raise DomainError(503,'SOURCE_UNAVAILABLE','Configured analytics source is unavailable.')
    return app

app = create_app()
