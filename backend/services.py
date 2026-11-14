"""Application services: analysis first, transactional saving, then optional indexing."""
import json
import logging
import zipfile
import threading
from datetime import datetime
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from config import Settings
from contracts import ImportOptions
from db.database import make_engine
from db.models import Job
from repository import DatasetRepository
from orchestrator.graph import Orchestrator
from agents.knowledge_agent import KnowledgeAgent

logger = logging.getLogger('agentinsight')

def log_event(event,job_id,dataset_id=None,**fields):
    logger.info(json.dumps(dict(event=event,job_id=job_id,dataset_id=dataset_id,**fields)))

def execute_job(settings,job_id):
    """Process entry point: opens its own engine and never inherits request sessions."""
    logging.basicConfig(level=logging.INFO,format='%(message)s')
    engine = make_engine(settings.database_url)
    sessions = sessionmaker(bind=engine,expire_on_commit=False)
    repository = DatasetRepository(sessions)
    try:
        with sessions() as session:
            job = session.get(Job,job_id)
            source,options,mode = job.source_path,job.options,job.mode
        progress_lock = threading.RLock()
        def progress(node,status,**details):
            # LangGraph's parallel branches must not overwrite each other's JSON stage map.
            with progress_lock,sessions.begin() as session:
                job = session.get(Job,job_id)
                job.stages = dict(job.stages or {},**{node:dict(status=status,**details)})
            log_event('stage',job_id,node=node,status=status)
        log_event('job_started',job_id)
        state = Orchestrator().run_pipeline(source,event_callback=progress,options=ImportOptions(**options),settings=settings,mode=mode)
        warnings = list(state.get('warnings',[]))
        for stage,result in (state.get('ml_result') or {}).items():
            if result.get('status') in {'unavailable','failed'}:
                warnings.append({'stage':stage,'code':'OPTIONAL_ANALYSIS_UNAVAILABLE','message':'Optional analysis is unavailable; inspect its status and eligibility.'})
        if (state.get('insight_result') or {}).get('generation_mode')=='deterministic_fallback':
            warnings.append({'stage':'insight_node','code':'DETERMINISTIC_FALLBACK','message':'Summary generated without a language provider.'})
        state['warnings'] = warnings
        dataset_id = repository.save(job_id,state)
        log_event('dataset_saved',job_id,dataset_id)
        try:
            progress('knowledge_indexing','started')
            with sessions() as session:
                KnowledgeAgent().index_pipeline_run(dataset_id=dataset_id,audit_report=state['data_quality_report'],insight_result=state.get('insight_result'),filename=state['dataset_summary'].get('filename'),db_session=session)
            progress('knowledge_indexing','completed')
        except Exception:
            warnings.append({'stage':'knowledge_indexing','code':'INDEXING_FAILED','message':'Dataset saved, but knowledge indexing failed.'})
            progress('knowledge_indexing','failed')
        with sessions.begin() as session:
            job = session.get(Job,job_id)
            job.state = 'completed_with_warnings' if warnings else 'completed'
            job.finished_at = datetime.utcnow()
            stages = job.stages
            _,run = repository.get_run(session,dataset_id)
            run.warnings,run.stage_statuses = warnings,stages
        log_event('job_completed',job_id,dataset_id)
    except Exception as error:
        code = 'STORAGE_UNAVAILABLE' if isinstance(error,SQLAlchemyError) else 'INVALID_INPUT' if isinstance(error,(ValueError,zipfile.BadZipFile)) else 'PIPELINE_FAILED'
        with sessions.begin() as session:
            job = session.get(Job,job_id)
            job.state,job.finished_at = 'failed',datetime.utcnow()
            job.error = {'code':code,'message':'Storage unavailable.' if code=='STORAGE_UNAVAILABLE' else 'Dataset cannot be processed with these import options.' if code=='INVALID_INPUT' else 'Required pipeline stage failed.'}
        log_event('job_failed',job_id,code=code)
    finally:
        engine.dispose()
