"""Pure LangGraph workflow. Storage, jobs and HTTP live outside this module."""
import operator
import time
from typing import Annotated,Any,TypedDict
from langgraph.graph import StateGraph,START,END
from agents.data_agent import DataAgent
from agents.eda_agent import EDAAgent
from agents.ml_agent import MLAgent
from agents.visualization_agent import VisualizationAgent
from agents.insight_agent import InsightAgent
from agents.sql_agent import SQLAgent

class PipelineState(TypedDict,total=False):
    file_path: str
    options: dict
    settings: Any
    cleaned_df: Any
    dataset_summary: dict
    data_quality_report: dict
    data_health_score: dict
    eda_result: dict
    ml_result: dict
    visualization_result: dict
    insight_result: dict
    suggested_questions: list
    execution_logs: Annotated[list,operator.add]
    warnings: Annotated[list,operator.add]

class Orchestrator:
    def __init__(self,**agents):
        self.data_agent = agents.get('data_agent') or DataAgent()
        self.eda_agent = agents.get('eda_agent') or EDAAgent()
        self.ml_agent = agents.get('ml_agent') or MLAgent()
        self.visualization_agent = agents.get('visualization_agent') or VisualizationAgent()
        self.insight_agent = agents.get('insight_agent') or InsightAgent()
        self.sql_agent = agents.get('sql_agent') or SQLAgent()

    def run_pipeline(self,file_path,event_callback=None,options=None,settings=None,mode='full'):
        labels = {'data_cleaning_node':'Data Cleaning','validation_node':'Validation Gate','eda_node':'EDA Analysis','ml_node':'ML Analytics','visualization_node':'Visualization Selection','insight_node':'Insight Generation'}
        def node(name,action,required=True):
            def execute(state):
                start = time.monotonic()
                if event_callback:
                    event_callback(node=name,status='started')
                try:
                    result = action(state)
                    status = 'completed'
                except Exception:
                    if event_callback:
                        event_callback(node=name,status='failed')
                    if required:
                        raise
                    result = {'warnings':[{'stage':name,'code':'OPTIONAL_STAGE_FAILED','message':'Optional stage failed.'}]}
                    status = 'failed'
                duration = time.monotonic()-start
                result['execution_logs'] = [{'step':labels[name],'step_name':labels[name],'node':name,'duration_sec':duration,'duration_seconds':duration,'status':'success' if status=='completed' else 'failed'}]
                if event_callback:
                    event_callback(node=name,status=status,duration_ms=duration*1000)
                return result
            return execute
        def ingest(state):
            summary = self.data_agent.process(file_path,options,settings)
            return {'cleaned_df':self.data_agent.last_cleaned_df,'dataset_summary':summary,'data_quality_report':summary['data_quality_report'],'data_health_score':summary['data_health_score']}
        def validate(state):
            if state['cleaned_df'].empty:
                raise ValueError('Dataset is empty')
            return {}
        def insight(state):
            return {'insight_result':self.insight_agent.generate_summary(state['eda_result'],state.get('ml_result')),'suggested_questions':self.sql_agent.generate_suggested_questions(state['cleaned_df'])}
        graph = StateGraph(PipelineState)
        graph.add_node('data_cleaning_node',node('data_cleaning_node',ingest))
        graph.add_node('validation_node',node('validation_node',validate))
        graph.add_edge(START,'data_cleaning_node')
        graph.add_edge('data_cleaning_node','validation_node')
        if mode=='clean':
            graph.add_edge('validation_node',END)
        else:
            graph.add_node('eda_node',node('eda_node',lambda s:{'eda_result':self.eda_agent.analyze(s['cleaned_df'])}))
            graph.add_node('ml_node',node('ml_node',lambda s:{'ml_result':self.ml_agent.analyze(s['cleaned_df'])},False))
            graph.add_node('visualization_node',node('visualization_node',lambda s:{'visualization_result':self.visualization_agent.suggest_charts(s['cleaned_df'],s['eda_result'])},False))
            graph.add_node('insight_node',node('insight_node',insight,False))
            graph.add_edge('validation_node','eda_node')
            graph.add_edge('validation_node','ml_node')
            graph.add_edge(['eda_node','ml_node'],'visualization_node')
            graph.add_edge('visualization_node','insight_node')
            graph.add_edge('insight_node',END)
        return graph.compile().invoke({'file_path':file_path,'execution_logs':[],'warnings':[]})
