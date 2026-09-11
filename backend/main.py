import os
import shutil
import tempfile
from typing import Optional
import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from dotenv import load_dotenv
from pydantic import BaseModel

from agents.data_agent import DataAgent
from agents.eda_agent import EDAAgent
from agents.sql_agent import SQLAgent
from agents.ml_agent import MLAgent
from agents.visualization_agent import VisualizationAgent
from agents.insight_agent import InsightAgent

load_dotenv()

app = FastAPI(
    title="AgentInsight AI Backend",
    description="Multi-agent AI Business Intelligence Platform - Data Ingestion & Preprocessing",
    version="0.1.0",
)

# Configure CORS to permit requests from Vite default dev server
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

data_agent = DataAgent()
eda_agent = EDAAgent()
sql_agent = SQLAgent()
ml_agent = MLAgent()
visualization_agent = VisualizationAgent()
insight_agent = InsightAgent()

from orchestrator import Orchestrator
orchestrator = Orchestrator(
    data_agent=data_agent,
    eda_agent=eda_agent,
    sql_agent=sql_agent,
    ml_agent=ml_agent,
    visualization_agent=visualization_agent,
    insight_agent=insight_agent,
)

# In-memory session store for cleaned DataFrame, quality report, and pipeline state
current_cleaned_df: Optional[pd.DataFrame] = None
current_validated_df: Optional[pd.DataFrame] = None
current_quality_report: Optional[dict] = None
current_suggested_questions: Optional[list] = None
current_pipeline_result: Optional[dict] = None


class QueryRequest(BaseModel):
    question: str


@app.get("/health")
def health_check():
    """Health check endpoint to verify backend connectivity."""
    return {"status": "ok"}


@app.post("/api/pipeline/run")
def run_full_pipeline(file: UploadFile = File(...)):
    """Accepts an uploaded dataset file, executes the full LangGraph multi-agent
    orchestrated pipeline, stores session state, and returns all agent outputs.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected for upload.")

    _, ext = os.path.splitext(file.filename.lower())
    if ext not in [".csv", ".xlsx", ".xls"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Only .csv, .xlsx, or .xls files are accepted.",
        )

    temp_dir = tempfile.mkdtemp(prefix="agentinsight_pipeline_")
    temp_file_path = os.path.join(temp_dir, file.filename)

    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Execute the LangGraph pipeline
        state = orchestrator.run_pipeline(temp_file_path)

        if state.get("errors"):
            raise HTTPException(
                status_code=400,
                detail="; ".join(state["errors"]),
            )

        # Update global session store
        global current_cleaned_df, current_quality_report, current_suggested_questions, current_validated_df, current_pipeline_result
        current_cleaned_df = state.get("cleaned_df")
        current_validated_df = state.get("validated_df")
        current_quality_report = state.get("data_quality_report")
        current_suggested_questions = state.get("suggested_questions")

        result = {
            "status": "success",
            "filename": file.filename,
            "dataset_summary": state.get("dataset_summary"),
            "data_quality_report": state.get("data_quality_report"),
            "eda_result": state.get("eda_result"),
            "ml_result": state.get("ml_result"),
            "visualization_result": state.get("visualization_result"),
            "insight_result": state.get("insight_result"),
            "suggested_questions": state.get("suggested_questions"),
            "execution_logs": state.get("execution_logs"),
        }
        current_pipeline_result = result
        return result

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Pipeline execution failed for '{file.filename}': {str(exc)}",
        )
    finally:
        try:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass


@app.post("/api/query")
def run_sql_query(request: QueryRequest):
    """Executes a natural language business question by translating it to a safe SQLite query,
    running it on the validated subset of current dataset, and returning results with retry handling.
    """
    global current_cleaned_df, current_quality_report, current_validated_df
    target_df = current_validated_df if current_validated_df is not None else current_cleaned_df
    if target_df is None or target_df.empty:
        raise HTTPException(
            status_code=400,
            detail="No cleaned dataset found in session. Please upload a dataset first.",
        )
    try:
        return sql_agent.generate_and_run(
            question=request.question,
            df=target_df,
            quality_report=current_quality_report,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to process natural language query: {str(exc)}",
        )


@app.get("/api/suggested-questions")
def get_suggested_questions(refresh: bool = False):
    """Returns 3-4 schema-relevant business questions for the currently loaded dataset,
    dynamically generated by SQLAgent based on actual column names and data types.
    """
    global current_cleaned_df, current_quality_report, current_suggested_questions
    if current_cleaned_df is None or current_cleaned_df.empty:
        return {"questions": sql_agent.get_default_fallback_questions()}

    if current_suggested_questions is None or refresh:
        try:
            current_suggested_questions = sql_agent.generate_suggested_questions(
                current_cleaned_df, quality_report=current_quality_report
            )
        except Exception:
            return {"questions": sql_agent.get_default_fallback_questions()}

    return {"questions": current_suggested_questions}


@app.post("/api/eda")
def run_exploratory_analysis():
    """Runs the EDAAgent on the already-cleaned dataset from the previous upload."""
    global current_cleaned_df, current_quality_report, current_validated_df
    target_df = current_validated_df if current_validated_df is not None else current_cleaned_df
    if target_df is None or target_df.empty:
        raise HTTPException(
            status_code=400,
            detail="No cleaned dataset found in session. Please upload a dataset first.",
        )
    try:
        return eda_agent.analyze(
            target_df, quality_report=current_quality_report if current_validated_df is None else None
        )
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to generate exploratory analysis: {str(exc)}",
        )


@app.post("/api/ml-insights")
def run_ml_insights():
    """Runs the MLAgent to perform unsupervised anomaly detection (IsolationForest)
    and trend forecasting with honest data-sufficiency confidence evaluations.
    """
    global current_cleaned_df, current_quality_report, current_validated_df
    target_df = current_validated_df if current_validated_df is not None else current_cleaned_df
    if target_df is None or target_df.empty:
        raise HTTPException(
            status_code=400,
            detail="No cleaned dataset found in session. Please upload a dataset first.",
        )
    try:
        return ml_agent.analyze(
            target_df, quality_report=current_quality_report if current_validated_df is None else None
        )
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to generate machine learning insights: {str(exc)}",
        )


@app.post("/api/insights")
def run_business_insights():
    """Runs the VisualizationAgent and InsightAgent to produce:
    1. 2-3 recommended chart specifications with aggregated data.
    2. An LLM-generated executive summary with key finding and actionable recommendation
       strictly grounded in real dataset numbers and anomalies.
    """
    global current_cleaned_df, current_quality_report, current_validated_df
    target_df = current_validated_df if current_validated_df is not None else current_cleaned_df
    if target_df is None or target_df.empty:
        raise HTTPException(
            status_code=400,
            detail="No cleaned dataset found in session. Please upload a dataset first.",
        )
    try:
        qr = current_quality_report if current_validated_df is None else None
        # Run EDA & ML agents to obtain full analytical context
        eda_result = eda_agent.analyze(target_df, quality_report=qr)
        ml_result = ml_agent.analyze(target_df, quality_report=qr)

        # Generate chart recommendations
        chart_specs = visualization_agent.suggest_charts(
            target_df, eda_result=eda_result, quality_report=qr
        )

        # Generate LLM-powered executive summary
        summary_res = insight_agent.generate_summary(eda_result=eda_result, ml_result=ml_result)

        return {
            "summary": summary_res.get("summary", ""),
            "key_finding": summary_res.get("key_finding", ""),
            "recommendation": summary_res.get("recommendation", ""),
            "charts": chart_specs.get("charts", []),
        }
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to generate business insights: {str(exc)}",
        )


@app.post("/api/upload")
def upload_dataset(file: UploadFile = File(...)):
    """Accepts a CSV or Excel dataset, validates and cleans the data using DataAgent,
    and returns a summary, column details, and preview.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected for upload.")

    _, ext = os.path.splitext(file.filename.lower())
    if ext not in [".csv", ".xlsx", ".xls"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Only .csv, .xlsx, or .xls files are accepted.",
        )

    # Save to a temporary file safely
    temp_dir = tempfile.mkdtemp(prefix="agentinsight_")
    temp_file_path = os.path.join(temp_dir, file.filename)

    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Process through the Data Agent
        result = data_agent.process(temp_file_path)

        # Store cleaned DataFrame and quality report in session memory for EDA
        global current_cleaned_df, current_quality_report, current_suggested_questions
        current_cleaned_df = data_agent.last_cleaned_df
        current_quality_report = result.get("data_quality_report")
        current_suggested_questions = None  # Reset cached questions for new schema

        return result

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to process dataset '{file.filename}': {str(exc)}",
        )
    finally:
        # Clean up temporary storage
        try:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass
