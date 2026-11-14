"""Durable single-worker jobs with a supervised process and bounded admission."""
import multiprocessing
import threading
import time
import uuid
from datetime import datetime
from sqlalchemy import select,func
from db.models import Job
from repository import DomainError
from services import execute_job,log_event

TERMINAL = {'completed','completed_with_warnings','failed'}

class JobManager:
    def __init__(self,settings,sessions):
        self.settings,self.sessions = settings,sessions
        self.lock = threading.RLock()
        self.stop = threading.Event()
        self.process = None
        self.current = None
        self.started = 0
        self.thread = None

    def start(self):
        with self.sessions.begin() as session:
            for job in session.scalars(select(Job).where(Job.state=='running')):
                job.state,job.finished_at = 'failed',datetime.utcnow()
                job.error = {'code':'JOB_INTERRUPTED','message':'Backend restarted while this job was running. Submit a new job to retry.'}
        self.thread = threading.Thread(target=self._loop,daemon=True,name='job-supervisor')
        self.thread.start()

    def submit(self,path,filename,options,browser_session,mode='full',run_id=None):
        with self.lock,self.sessions.begin() as session:
            count = session.scalar(select(func.count()).select_from(Job).where(Job.state.in_(['queued','running'])))
            if count >= self.settings.queue_size+1:
                raise DomainError(429,'QUEUE_FULL','One job is active and the waiting queue is full.')
            job_id = run_id or uuid.uuid4().hex
            if session.get(Job,job_id):
                raise DomainError(409,'JOB_EXISTS','This run ID already exists.')
            session.add(Job(id=job_id,source_path=str(path),filename=filename,options=options.model_dump(),browser_session=browser_session,mode=mode,state='queued',stages={}))
            return job_id

    def status(self,job_id):
        with self.sessions() as session:
            job = session.get(Job,job_id)
            if job is None:
                raise DomainError(404,'JOB_NOT_FOUND','Job not found.')
            return {'job_id':job.id,'run_id':job.id,'session_id':job.id,'status':job.state,'state':job.state,'dataset_id':job.dataset_id,'stages':job.stages,'error':job.error,'created_at':job.created_at.isoformat()+'Z','started_at':job.started_at.isoformat()+'Z' if job.started_at else None,'finished_at':job.finished_at.isoformat()+'Z' if job.finished_at else None,'status_url':'/api/jobs/'+job.id}

    def _fail(self,code,message):
        changed = False
        with self.sessions.begin() as session:
            job = session.get(Job,self.current)
            if job.state not in TERMINAL:
                job.state,job.finished_at = 'failed',datetime.utcnow()
                job.error = {'code':code,'message':message}
                changed = True
        if changed:
            log_event('worker_failed',self.current,code=code)

    def tick(self):
        with self.lock:
            if self.process:
                expired = time.monotonic()-self.started > self.settings.job_timeout
                if expired and self.process.is_alive():
                    self.process.terminate()
                    self.process.join(5)
                    if self.process.is_alive():
                        self.process.kill()
                        self.process.join()
                if self.process.is_alive():
                    return
                self.process.join()
                self._fail('JOB_TIMEOUT' if expired else 'WORKER_EXITED','Processing deadline exceeded.' if expired else 'Worker exited before recording completion.')
                self.process.close()
                self.process,self.current = None,None
            with self.sessions.begin() as session:
                job = session.scalars(select(Job).where(Job.state=='queued').order_by(Job.created_at,Job.id)).first()
                if not job:
                    return
                job.state,job.started_at = 'running',datetime.utcnow()
                self.current = job.id
            self.started = time.monotonic()
            self.process = multiprocessing.get_context('spawn').Process(target=execute_job,args=(self.settings,self.current),daemon=True)
            self.process.start()

    def _loop(self):
        while not self.stop.is_set():
            try:
                self.tick()
            except Exception:
                # A storage outage must not turn into a successful job. Retain state and retry.
                log_event('supervisor_unavailable',self.current,code='SUPERVISOR_UNAVAILABLE')
            self.stop.wait(.15)

    def close(self):
        self.stop.set()
        if self.thread:
            self.thread.join(5)
        with self.lock:
            if self.process:
                if self.process.is_alive():
                    self.process.terminate()
                self.process.join(5)
                if self.process.is_alive():
                    self.process.kill()
                    self.process.join()
                self._fail('JOB_INTERRUPTED','Backend stopped before job completion.')
                self.process.close()
                self.process = None
