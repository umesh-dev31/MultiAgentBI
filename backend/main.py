import asyncio
import json
import os
import shutil
import tempfile
import uuid
from typing import Dict, Optional
import pandas as pd
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

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

# ── Multi-Agent LangGraph Orchestration & Session Store ───────────────────────
from orchestrator.graph import Orchestrator

orchestrator = Orchestrator()

# Session memory stores
current_cleaned_df: Optional[pd.DataFrame] = None
current_validated_df: Optional[pd.DataFrame] = None
current_quality_report: Optional[dict] = None
current_suggested_questions: Optional[list] = None
current_pipeline_result: Optional[dict] = None

# Registry for SSE real-time event queues keyed by session_id
pipeline_event_queues: Dict[str, asyncio.Queue] = {}
pipeline_status_store: Dict[str, Dict[str, Any]] = {}
main_loop: Optional[asyncio.AbstractEventLoop] = None


@app.on_event("startup")
async def startup_event():
    global main_loop
    try:
        main_loop = asyncio.get_running_loop()
    except RuntimeError:
        main_loop = None


class QueryRequest(BaseModel):
    question: str


@app.get("/health")
def health_check():
    """Health check endpoint to verify backend connectivity."""
    return {"status": "ok"}


@app.get("/api/pipeline/status/{run_id}")
def get_pipeline_run_status(run_id: str):
    """Status polling endpoint keyed by run ID, returning real LangGraph execution state."""
    session_data = pipeline_status_store.get(run_id)
    if not session_data:
        return {"status": "pending", "events": [], "run_id": run_id, "stages": {}}
    return session_data


@app.get("/api/pipeline/status")
def get_pipeline_status(
    run_id: Optional[str] = Query(None),
    session_id: Optional[str] = Query(None),
):
    """Status polling fallback returning all recorded execution events for a session or run ID."""
    rid = run_id or session_id
    if not rid:
        return {"status": "pending", "events": [], "stages": {}}
    session_data = pipeline_status_store.get(rid)
    if not session_data:
        return {"status": "pending", "events": [], "run_id": rid, "stages": {}}
    return session_data


@app.get("/api/pipeline/stream")
async def stream_pipeline_events(session_id: str = Query(...)):
    """Server-Sent Events endpoint streaming real-time stage execution updates
    for a given pipeline session as each LangGraph node starts and completes.
    """
    global main_loop
    if main_loop is None:
        try:
            main_loop = asyncio.get_running_loop()
        except RuntimeError:
            pass

    if session_id not in pipeline_event_queues:
        pipeline_event_queues[session_id] = asyncio.Queue()

    if session_id not in pipeline_status_store:
        pipeline_status_store[session_id] = {
            "session_id": session_id,
            "status": "running",
            "events": [],
            "current_node": None,
            "error": None,
        }

    queue = pipeline_event_queues[session_id]

    async def event_generator():
        # Emit initial connection handshake
        yield f"data: {json.dumps({'status': 'connected', 'session_id': session_id})}\n\n"
        
        # If there are already buffered events in pipeline_status_store, emit them so late-connecting clients catch up
        if session_id in pipeline_status_store:
            for past_event in pipeline_status_store[session_id].get("events", []):
                yield f"data: {json.dumps(past_event)}\n\n"
                if past_event.get("node") == "pipeline" and past_event.get("status") in ("completed", "failed"):
                    return

        try:
            while True:
                try:
                    # Wait for next event with a 15s timeout for heartbeat keep-alive
                    event = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"data: {json.dumps(event)}\n\n"
                    # If pipeline reached terminal state, finish stream
                    if event.get("node") == "pipeline" and event.get("status") in ("completed", "failed"):
                        break
                except asyncio.TimeoutError:
                    # Heartbeat ping to keep SSE connection alive
                    yield ": ping\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            pipeline_event_queues.pop(session_id, None)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        },
    )


@app.post("/api/pipeline/run")
def run_full_pipeline(
    file: UploadFile = File(...),
    session_id: Optional[str] = Query(None),
    run_id: Optional[str] = Query(None),
):
    """Accepts an uploaded dataset file, executes the full LangGraph multi-agent
    orchestrated pipeline, streams live node events if run_id or session_id is provided,
    stores session state, and returns all agent outputs.
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

    actual_id = run_id or session_id

    if actual_id:
        if actual_id not in pipeline_event_queues:
            pipeline_event_queues[actual_id] = asyncio.Queue()
        if actual_id not in pipeline_status_store:
            pipeline_status_store[actual_id] = {
                "run_id": actual_id,
                "session_id": actual_id,
                "status": "running",
                "events": [],
                "stages": {},
                "current_node": None,
                "error": None,
            }

    def dispatch_event(event_dict: dict):
        global main_loop
        if actual_id:
            if actual_id in pipeline_status_store:
                pipeline_status_store[actual_id]["events"].append(event_dict)
                node_name = event_dict.get("node")
                if node_name and node_name != "pipeline":
                    pipeline_status_store[actual_id]["stages"][node_name] = {
                        "node": node_name,
                        "status": event_dict.get("status"),
                        "duration_ms": event_dict.get("duration_ms", 0.0),
                        "details": event_dict.get("details", ""),
                        "witty_label": event_dict.get("witty_label", ""),
                    }
                    pipeline_status_store[actual_id]["current_node"] = node_name
                if "status" in event_dict:
                    pipeline_status_store[actual_id]["current_status"] = event_dict.get("status")

            if actual_id in pipeline_event_queues:
                loop = main_loop
                if loop is None:
                    try:
                        loop = asyncio.get_event_loop()
                    except RuntimeError:
                        loop = None
                if loop and loop.is_running():
                    try:
                        loop.call_soon_threadsafe(pipeline_event_queues[actual_id].put_nowait, event_dict)
                    except Exception:
                        pass

    def event_callback(
        node: str,
        status: str,
        duration_ms: float = 0.0,
        details: str = "",
        witty_label: str = "",
    ):
        data = {
            "node": node,
            "status": status,
            "duration_ms": duration_ms,
            "details": details,
            "witty_label": witty_label,
        }
        dispatch_event(data)

    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Execute the LangGraph pipeline with live event callback
        state = orchestrator.run_pipeline(temp_file_path, event_callback=event_callback)

        if state.get("errors"):
            err_msg = "; ".join(state["errors"])
            err_event = {
                "node": "pipeline",
                "status": "failed",
                "error": err_msg,
            }
            if actual_id in pipeline_status_store:
                pipeline_status_store[actual_id]["status"] = "failed"
                pipeline_status_store[actual_id]["error"] = err_msg
            dispatch_event(err_event)
            raise HTTPException(
                status_code=400,
                detail=err_msg,
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
            "data_health_score": state.get("data_health_score") or (state.get("data_quality_report") or {}).get("data_health_score"),
            "eda_result": state.get("eda_result"),
            "ml_result": state.get("ml_result"),
            "visualization_result": state.get("visualization_result"),
            "insight_result": state.get("insight_result"),
            "suggested_questions": state.get("suggested_questions"),
            "execution_logs": state.get("execution_logs"),
        }
        current_pipeline_result = result

        comp_event = {
            "node": "pipeline",
            "status": "completed",
            "result": result,
        }
        if actual_id in pipeline_status_store:
            pipeline_status_store[actual_id]["status"] = "completed"
            pipeline_status_store[actual_id]["result"] = result
        dispatch_event(comp_event)

        return result

    except HTTPException:
        raise
    except Exception as exc:
        err_event = {
            "node": "pipeline",
            "status": "failed",
            "error": str(exc),
        }
        if actual_id in pipeline_status_store:
            pipeline_status_store[actual_id]["status"] = "failed"
            pipeline_status_store[actual_id]["error"] = str(exc)
        dispatch_event(err_event)
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
