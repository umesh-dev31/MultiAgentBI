"""Persistence adapters return independent snapshots, never an active server dataset."""
import pandas as pd
from sqlalchemy import select
from contracts import DatasetContext,POLICY_VERSION,records
from db.models import Dataset,PipelineRun,AuditIssue,BrowserDataset,Job

class DomainError(Exception):
    def __init__(self,status,code,message):
        self.status,self.code,self.message = status,code,message
        super().__init__(message)

class DatasetRepository:
    def __init__(self,sessions):
        self.sessions = sessions

    def resolve(self,dataset_id,browser_session):
        if dataset_id is not None:
            return dataset_id
        with self.sessions() as session:
            ids = list(session.scalars(select(BrowserDataset.dataset_id).where(BrowserDataset.session_id==browser_session))) if browser_session else []
        if len(ids)!=1:
            raise DomainError(409,'DATASET_ID_REQUIRED','Supply a dataset ID; the browser session does not identify exactly one dataset.')
        return ids[0]

    def get_run(self,session,dataset_id):
        dataset = session.get(Dataset,dataset_id)
        run = session.scalars(select(PipelineRun).where(PipelineRun.dataset_id==dataset_id).order_by(PipelineRun.id.desc())).first()
        if dataset is None or run is None:
            raise DomainError(404,'DATASET_NOT_FOUND','Dataset not found.')
        return dataset,run

    def context(self,dataset_id):
        with self.sessions() as session:
            _,run = self.get_run(session,dataset_id)
            full = run.cleaned_data if run.cleaned_data is not None else run.validated_data
            if full is None:
                raise DomainError(409,'INCOMPLETE_LEGACY_DATA','This historical run has only a preview. Reupload its original file for full-data operations.')
            frame = pd.DataFrame(full)
            schema = run.schema_info or (run.dataset_summary or {}).get('columns',[])
            legacy_key = 'cleaned_source_rows' if run.cleaned_data is not None else 'validated_source_rows'
            source = run.source_rows or (run.dataset_summary or {}).get(legacy_key) or list(range(2,len(frame)+2))
            if len(source)!=len(frame):
                raise DomainError(409,'INCOMPLETE_LEGACY_DATA','Historical source-row references do not match the stored records. Reupload the original file.')
            policy = run.cleaning_policy or {}
            # Restore numeric columns explicitly; identifiers remain strings.
            for col in schema:
                if col.get('role')=='numeric' and col['name'] in frame:
                    frame[col['name']] = pd.to_numeric(frame[col['name']],errors='coerce')
            frame.attrs = {'schema':schema if all('role' in c for c in schema) else [],'source_rows':source,'numeric_constraints':policy.get('numeric_constraints',{}),'policy_version':run.policy_version}
            return DatasetContext(dataset_id,frame,schema,source,policy,run.eligibility or {},run.audit_report or {})

    def snapshot(self,dataset_id):
        with self.sessions() as session:
            dataset,run = self.get_run(session,dataset_id)
            return {'status':'completed_with_warnings' if run.warnings else 'success','dataset_id':dataset.id,'dataset':dataset.to_dict(),'filename':dataset.filename,'dataset_summary':run.dataset_summary,'data_quality_report':run.audit_report,'data_health_score':run.data_health_score,'eda_result':run.eda_result,'ml_result':run.ml_result,'visualization_result':run.visualization_result,'insight_result':run.insight_result,'suggested_questions':run.suggested_questions or [],'execution_logs':run.execution_logs or [],'stage_statuses':run.stage_statuses or {},'warnings':run.warnings or [],'policy_version':run.policy_version,'populations':run.eligibility or {},'source_rows':run.source_rows or [],'schema':run.schema_info or [],'cleaning_policy':run.cleaning_policy or {}}

    def require_owned(self, dataset_id, workspace_id):
        with self.sessions() as session:
            if session.get(BrowserDataset, (workspace_id, dataset_id)) is None:
                raise DomainError(404, 'DATASET_NOT_FOUND', 'Dataset not found.')

    def history(self, workspace_id=None):
        with self.sessions() as session:
            query = select(Dataset).order_by(Dataset.id.desc())
            if workspace_id is not None:
                dataset_ids = select(BrowserDataset.dataset_id).where(BrowserDataset.session_id == workspace_id)
                query = query.where(Dataset.id.in_(dataset_ids))
            return [dataset.to_dict() for dataset in session.scalars(query)]

    def save(self,job_id,state):
        """One transaction contains the complete required analysis and dataset identity."""
        frame = state['cleaned_df']
        summary = state['dataset_summary']
        populations = (state.get('eda_result') or {}).get('populations',{})
        ml = state.get('ml_result') or {}
        for name in ('anomalies','forecast'):
            if ml.get(name,{}).get('population'):
                populations[name] = ml[name]['population']
        with self.sessions.begin() as session:
            job = session.get(Job,job_id)
            dataset = Dataset(filename=job.filename,source_path=job.source_path,row_count=summary['summary']['original_rows'],validated_row_count=len(frame),flagged_count=len({i['row_index'] for i in state['data_quality_report']['flagged_for_review']}))
            session.add(dataset)
            session.flush()
            run = PipelineRun(dataset_id=dataset.id,dataset_summary=summary,cleaned_data=records(frame),validated_data=None,policy_version=POLICY_VERSION,schema_info=frame.attrs['schema'],source_rows=frame.attrs['source_rows'],cleaning_policy=summary['cleaning_policy'],eligibility=populations,stage_statuses=job.stages,warnings=state.get('warnings',[]),audit_report=state['data_quality_report'],data_health_score=state['data_health_score'],execution_logs=state['execution_logs'],**{key:state.get(key) for key in ['eda_result','ml_result','visualization_result','insight_result','suggested_questions']})
            session.add(run)
            for issue in state['data_quality_report']['flagged_for_review']+state['data_quality_report'].get('changes',[]):
                session.add(AuditIssue(dataset_id=dataset.id,row_index=issue['row_index'],column_name=issue['column'],original_value=str(issue['original_value']) if issue['original_value'] is not None else None,reason=issue['reason']))
            session.add(BrowserDataset(session_id=job.browser_session,dataset_id=dataset.id))
            job.dataset_id = dataset.id
            return dataset.id

    def update_optional(self,dataset_id,stages,warnings):
        with self.sessions.begin() as session:
            _,run = self.get_run(session,dataset_id)
            run.stage_statuses,run.warnings = stages,warnings
