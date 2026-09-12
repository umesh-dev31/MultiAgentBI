import operator
import os
import sys
import time
from typing import Annotated, Any, Dict, List, Optional, TypedDict
import pandas as pd
from langgraph.graph import StateGraph, START, END

# Import existing agents (zero logic changes)
from agents.data_agent import DataAgent
from agents.eda_agent import EDAAgent
from agents.sql_agent import SQLAgent
from agents.ml_agent import MLAgent
from agents.visualization_agent import VisualizationAgent
from agents.insight_agent import InsightAgent


class PipelineState(TypedDict):
    """Unified state schema passed through the LangGraph multi-agent pipeline."""
    file_path: Optional[str]
    raw_df: Optional[Any]
    cleaned_df: Optional[Any]
    validated_df: Optional[Any]
    dataset_summary: Optional[Dict[str, Any]]
    data_quality_report: Optional[Dict[str, Any]]
    data_health_score: Optional[Dict[str, Any]]
    eda_result: Optional[Dict[str, Any]]
    ml_result: Optional[Dict[str, Any]]
    sql_result: Optional[Dict[str, Any]]
    visualization_result: Optional[Dict[str, Any]]
    insight_result: Optional[Dict[str, Any]]
    suggested_questions: Optional[List[Dict[str, Any]]]
    current_step: Optional[str]
    errors: Annotated[List[str], operator.add]
    execution_logs: Annotated[List[Dict[str, Any]], operator.add]


class Orchestrator:
    """LangGraph-driven multi-agent pipeline orchestrator for AgentInsight AI."""

    def __init__(
        self,
        data_agent: Optional[DataAgent] = None,
        eda_agent: Optional[EDAAgent] = None,
        sql_agent: Optional[SQLAgent] = None,
        ml_agent: Optional[MLAgent] = None,
        visualization_agent: Optional[VisualizationAgent] = None,
        insight_agent: Optional[InsightAgent] = None,
    ):
        self.data_agent = data_agent or DataAgent()
        self.eda_agent = eda_agent or EDAAgent()
        self.sql_agent = sql_agent or SQLAgent()
        self.ml_agent = ml_agent or MLAgent()
        self.visualization_agent = visualization_agent or VisualizationAgent()
        self.insight_agent = insight_agent or InsightAgent()

        self.event_callback = None
        self.graph = self._build_graph()

    def _notify(
        self,
        node: str,
        status: str,
        duration_ms: float = 0.0,
        details: str = "",
        witty_label: str = "",
    ):
        """Dispatches real-time stage updates to the registered event callback."""
        if hasattr(self, "event_callback") and self.event_callback:
            try:
                self.event_callback(
                    node=node,
                    status=status,
                    duration_ms=duration_ms,
                    details=details,
                    witty_label=witty_label,
                )
            except Exception:
                pass

    def _create_log(
        self, step_name: str, duration_sec: float, status: str, details: str
    ) -> List[Dict[str, Any]]:
        """Creates a structured telemetry log entry."""
        rounded_duration = round(duration_sec, 3)
        return [{
            "step": step_name,
            "step_name": step_name,
            "duration_sec": rounded_duration,
            "duration_seconds": rounded_duration,
            "status": status,
            "details": details,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        }]

    # =========================================================================
    # Node 1: Data Cleaning & Preprocessing (DataAgent)
    # =========================================================================
    def data_cleaning_node(self, state: PipelineState) -> Dict[str, Any]:
        file_path = state.get("file_path")
        print(f"\n\033[94m[LangGraph Orchestrator] --- Step 1/6: Data Cleaning Node (DataAgent) ---\033[0m")
        approx_rows = None
        if file_path and os.path.exists(file_path):
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    approx_rows = max(0, sum(1 for _ in f) - 1)
            except Exception:
                pass
        start_witty = f"Scrubbing {approx_rows} rows & normalizing types..." if approx_rows is not None else "Scrubbing raw rows & normalizing data types..."
        self._notify(
            node="data_cleaning_node",
            status="started",
            witty_label=start_witty,
        )
        t0 = time.time()

        if not file_path or not os.path.exists(file_path):
            elapsed = time.time() - t0
            err_msg = f"File not found or invalid path: {file_path}"
            print(f"\033[91m[LangGraph Orchestrator] ❌ {err_msg}\033[0m")
            self._notify(
                node="data_cleaning_node",
                status="failed",
                duration_ms=round(elapsed * 1000, 1),
                details=err_msg,
            )
            return {
                "errors": [err_msg],
                "current_step": "data_cleaning",
                "execution_logs": self._create_log("Data Cleaning", elapsed, "failed", err_msg),
            }

        try:
            result = self.data_agent.process(file_path)
            cleaned_df = self.data_agent.last_cleaned_df
            quality_report = result.get("data_quality_report")
            elapsed = time.time() - t0

            rows_in = result.get("summary", {}).get("total_rows", "N/A")
            rows_out = result.get("summary", {}).get("cleaned_rows", "N/A")
            flagged = len(quality_report.get("flagged_for_review", [])) if quality_report else 0
            details = f"Cleaned {rows_in} rows -> {rows_out} rows. {flagged} items flagged for review."
            print(f"\033[92m[LangGraph Orchestrator] ✓ Data Cleaning completed in {elapsed:.2f}s ({details})\033[0m")

            self._notify(
                node="data_cleaning_node",
                status="completed",
                duration_ms=round(elapsed * 1000, 1),
                details=details,
                witty_label=f"Cleaned {rows_out} rows, zero schema casualties",
            )

            return {
                "cleaned_df": cleaned_df,
                "dataset_summary": result,
                "data_quality_report": quality_report,
                "data_health_score": result.get("data_health_score"),
                "current_step": "data_cleaning",
                "execution_logs": self._create_log("Data Cleaning", elapsed, "success", details),
            }
        except Exception as exc:
            elapsed = time.time() - t0
            err_msg = f"Data cleaning failed: {str(exc)}"
            print(f"\033[91m[LangGraph Orchestrator] ❌ {err_msg}\033[0m")
            self._notify(
                node="data_cleaning_node",
                status="failed",
                duration_ms=round(elapsed * 1000, 1),
                details=err_msg,
            )
            return {
                "errors": [err_msg],
                "current_step": "data_cleaning",
                "execution_logs": self._create_log("Data Cleaning", elapsed, "failed", err_msg),
            }

    # =========================================================================
    # Node 2: Validation Gate (Gating check)
    # =========================================================================
    def validation_node(self, state: PipelineState) -> Dict[str, Any]:
        print(f"\033[94m[LangGraph Orchestrator] --- Step 2/6: Validation Gate (Quality Audit) ---\033[0m")
        self._notify(
            node="validation_node",
            status="started",
            witty_label="Auditing quality thresholds & screening outliers...",
        )
        t0 = time.time()
        cleaned_df = state.get("cleaned_df")
        quality_report = state.get("data_quality_report")

        if cleaned_df is None or (isinstance(cleaned_df, pd.DataFrame) and cleaned_df.empty):
            elapsed = time.time() - t0
            err_msg = "Validation failed: Dataset is empty after cleaning."
            print(f"\033[91m[LangGraph Orchestrator] ❌ {err_msg}\033[0m")
            self._notify(
                node="validation_node",
                status="failed",
                duration_ms=round(elapsed * 1000, 1),
                details=err_msg,
            )
            return {
                "errors": [err_msg],
                "current_step": "validation",
                "execution_logs": self._create_log("Validation Gate", elapsed, "failed", err_msg),
            }

        # Check critical threshold: minimum viable rows
        if len(cleaned_df) < 3:
            elapsed = time.time() - t0
            err_msg = f"Validation failed: Insufficient data points ({len(cleaned_df)} rows). At least 3 rows required."
            print(f"\033[91m[LangGraph Orchestrator] ❌ {err_msg}\033[0m")
            self._notify(
                node="validation_node",
                status="failed",
                duration_ms=round(elapsed * 1000, 1),
                details=err_msg,
            )
            return {
                "errors": [err_msg],
                "current_step": "validation",
                "execution_logs": self._create_log("Validation Gate", elapsed, "failed", err_msg),
            }

        # Construct validated subset using unified filtering rules (matching EDAAgent)
        data = cleaned_df.copy().reset_index(drop=True)
        numeric_cols = [c for c in data.columns if pd.to_numeric(data[c], errors="coerce").notna().sum() / len(data) > 0.6]

        excluded_indices = set()
        if quality_report and "flagged_for_review" in quality_report:
            for item in quality_report["flagged_for_review"]:
                if "outlier" in str(item.get("reason", "")).lower():
                    r_idx = item.get("row_index")
                    if isinstance(r_idx, int) and (r_idx - 1) in data.index:
                        excluded_indices.add(r_idx - 1)

        metric_cols = [
            c for c in numeric_cols
            if any(k in str(c).lower() for k in ["qty", "quantity", "price", "unit_price", "amount", "revenue", "sales", "total"])
        ]
        if not metric_cols:
            metric_cols = [c for c in numeric_cols if not str(c).lower().endswith("_id")]

        for c in metric_cols:
            neg_mask = data[c] < 0
            for idx in data[neg_mask].index:
                excluded_indices.add(idx)

            clean_s = data[c].dropna()
            if len(clean_s) >= 4:
                q25 = float(clean_s.quantile(0.25))
                q75 = float(clean_s.quantile(0.75))
                iqr = q75 - q25
                med = float(clean_s.median())
                if iqr > 0:
                    outlier_mask = (clean_s < med - 3.0 * iqr) | (clean_s > med + 3.0 * iqr)
                    for idx in clean_s[outlier_mask].index:
                        excluded_indices.add(idx)

            null_mask = data[c].isna()
            for idx in data[null_mask].index:
                excluded_indices.add(idx)

        validated_df = data[~data.index.isin(excluded_indices)].copy().reset_index(drop=True)

        if len(validated_df) == 0:
            elapsed = time.time() - t0
            err_msg = "Validation failed: 100% of rows flagged as critical outliers or invalid numbers."
            print(f"\033[91m[LangGraph Orchestrator] ❌ {err_msg}\033[0m")
            self._notify(
                node="validation_node",
                status="failed",
                duration_ms=round(elapsed * 1000, 1),
                details=err_msg,
            )
            return {
                "errors": [err_msg],
                "current_step": "validation",
                "execution_logs": self._create_log("Validation Gate", elapsed, "failed", err_msg),
            }

        elapsed = time.time() - t0
        details = f"Validation passed! Validated subset: {len(validated_df)} rows ({len(excluded_indices)} excluded)."
        print(f"\033[92m[LangGraph Orchestrator] ✓ {details} in {elapsed:.2f}s\033[0m")

        self._notify(
            node="validation_node",
            status="completed",
            duration_ms=round(elapsed * 1000, 1),
            details=details,
            witty_label="Integrity checks passed, clean analytical subset ready",
        )

        return {
            "validated_df": validated_df,
            "current_step": "validation",
            "execution_logs": self._create_log("Validation Gate", elapsed, "success", details),
        }

    # =========================================================================
    # Error Node
    # =========================================================================
    def error_node(self, state: PipelineState) -> Dict[str, Any]:
        errors = state.get("errors", ["Unknown pipeline error occurred."])
        print(f"\033[91m[LangGraph Orchestrator] 🛑 Error Node: Pipeline halted. Errors: {errors}\033[0m")
        return {"current_step": "error"}

    # =========================================================================
    # Node 3: Exploratory Data Analysis (EDAAgent) - Runs in parallel with ML
    # =========================================================================
    def eda_node(self, state: PipelineState) -> Dict[str, Any]:
        print(f"\033[94m[LangGraph Orchestrator] --- Step 3/6: EDA Node (EDAAgent) ---\033[0m")
        self._notify(
            node="eda_node",
            status="started",
            witty_label="Unearthing correlations, trends & statistical signatures...",
        )
        t0 = time.time()
        try:
            target_df = state.get("validated_df") if state.get("validated_df") is not None else state.get("cleaned_df")
            eda_result = self.eda_agent.analyze(
                target_df, quality_report=state.get("data_quality_report") if state.get("validated_df") is None else None
            )
            elapsed = time.time() - t0
            patterns_cnt = len(eda_result.get("notable_patterns", []))
            details = f"EDA generated: {patterns_cnt} notable patterns, {len(eda_result.get('monthly_trend', []))} monthly trend points."
            print(f"\033[92m[LangGraph Orchestrator] ✓ EDA Node completed in {elapsed:.2f}s ({details})\033[0m")

            self._notify(
                node="eda_node",
                status="completed",
                duration_ms=round(elapsed * 1000, 1),
                details=details,
                witty_label="Descriptive statistics & notable patterns uncovered",
            )

            return {
                "eda_result": eda_result,
                "execution_logs": self._create_log("EDA Agent", elapsed, "success", details),
            }
        except Exception as exc:
            elapsed = time.time() - t0
            err_msg = f"EDA Agent error: {str(exc)}"
            print(f"\033[91m[LangGraph Orchestrator] ❌ {err_msg}\033[0m")
            self._notify(
                node="eda_node",
                status="failed",
                duration_ms=round(elapsed * 1000, 1),
                details=err_msg,
            )
            return {
                "errors": [err_msg],
                "execution_logs": self._create_log("EDA Agent", elapsed, "failed", err_msg),
            }

    # =========================================================================
    # Node 4: Machine Learning & Predictive Analytics (MLAgent) - Runs in parallel with EDA
    # =========================================================================
    def ml_node(self, state: PipelineState) -> Dict[str, Any]:
        print(f"\033[94m[LangGraph Orchestrator] --- Step 4/6: ML Node (MLAgent) ---\033[0m")
        self._notify(
            node="ml_node",
            status="started",
            witty_label="Teaching the model what's normal & catching anomalies...",
        )
        t0 = time.time()
        try:
            target_df = state.get("validated_df") if state.get("validated_df") is not None else state.get("cleaned_df")
            ml_result = self.ml_agent.analyze(
                target_df, quality_report=state.get("data_quality_report") if state.get("validated_df") is None else None
            )
            elapsed = time.time() - t0
            anom_cnt = ml_result.get("anomalies", {}).get("anomaly_count", 0)
            trend_dir = ml_result.get("forecast", {}).get("trend_direction", "N/A")
            details = f"ML completed: {anom_cnt} anomalies detected via IsolationForest; Trend direction: {trend_dir}."
            print(f"\033[92m[LangGraph Orchestrator] ✓ ML Node completed in {elapsed:.2f}s ({details})\033[0m")

            self._notify(
                node="ml_node",
                status="completed",
                duration_ms=round(elapsed * 1000, 1),
                details=details,
                witty_label="IsolationForest outliers isolated & forecast computed",
            )

            return {
                "ml_result": ml_result,
                "execution_logs": self._create_log("ML Agent", elapsed, "success", details),
            }
        except Exception as exc:
            elapsed = time.time() - t0
            err_msg = f"ML Agent error: {str(exc)}"
            print(f"\033[91m[LangGraph Orchestrator] ❌ {err_msg}\033[0m")
            self._notify(
                node="ml_node",
                status="failed",
                duration_ms=round(elapsed * 1000, 1),
                details=err_msg,
            )
            return {
                "errors": [err_msg],
                "execution_logs": self._create_log("ML Agent", elapsed, "failed", err_msg),
            }

    # =========================================================================
    # Node 5: Visualization Recommendations (VisualizationAgent)
    # =========================================================================
    def visualization_node(self, state: PipelineState) -> Dict[str, Any]:
        print(f"\033[94m[LangGraph Orchestrator] --- Step 5/6: Visualization Node (VisualizationAgent) ---\033[0m")
        self._notify(
            node="visualization_node",
            status="started",
            witty_label="Composing optimal chart blueprints & color palettes...",
        )
        t0 = time.time()
        try:
            target_df = state.get("validated_df") if state.get("validated_df") is not None else state.get("cleaned_df")
            viz_res = self.visualization_agent.suggest_charts(
                target_df,
                eda_result=state.get("eda_result"),
                quality_report=state.get("data_quality_report") if state.get("validated_df") is None else None,
            )
            elapsed = time.time() - t0
            charts_cnt = len(viz_res.get("charts", []))
            details = f"Visualization generated {charts_cnt} chart specs."
            print(f"\033[92m[LangGraph Orchestrator] ✓ Visualization Node completed in {elapsed:.2f}s ({details})\033[0m")

            self._notify(
                node="visualization_node",
                status="completed",
                duration_ms=round(elapsed * 1000, 1),
                details=details,
                witty_label="Curated dynamic chart specifications generated",
            )

            return {
                "visualization_result": viz_res,
                "current_step": "visualization",
                "execution_logs": self._create_log("Visualization Agent", elapsed, "success", details),
            }
        except Exception as exc:
            elapsed = time.time() - t0
            err_msg = f"Visualization Agent error: {str(exc)}"
            print(f"\033[91m[LangGraph Orchestrator] ❌ {err_msg}\033[0m")
            self._notify(
                node="visualization_node",
                status="failed",
                duration_ms=round(elapsed * 1000, 1),
                details=err_msg,
            )
            return {
                "errors": [err_msg],
                "current_step": "visualization",
                "execution_logs": self._create_log("Visualization Agent", elapsed, "failed", err_msg),
            }

    # =========================================================================
    # Node 6: Insight Synthesis & Suggested Questions (InsightAgent + SQLAgent)
    # =========================================================================
    def insight_node(self, state: PipelineState) -> Dict[str, Any]:
        print(f"\033[94m[LangGraph Orchestrator] --- Step 6/6: Insight Node (InsightAgent & SQLAgent) ---\033[0m")
        self._notify(
            node="insight_node",
            status="started",
            witty_label="Writing the executive briefing & business takeaways...",
        )
        t0 = time.time()
        try:
            insight_res = self.insight_agent.generate_summary(
                eda_result=state.get("eda_result"), ml_result=state.get("ml_result")
            )
            # Generate schema-tailored suggested business questions
            questions = self.sql_agent.generate_suggested_questions(
                state.get("cleaned_df"), quality_report=state.get("data_quality_report")
            )

            elapsed = time.time() - t0
            details = f"Executive briefing synthesized with LLM; {len(questions)} dynamic questions created."
            print(f"\033[92m[LangGraph Orchestrator] ✓ Insight Node completed in {elapsed:.2f}s ({details})\033[0m")

            self._notify(
                node="insight_node",
                status="completed",
                duration_ms=round(elapsed * 1000, 1),
                details=details,
                witty_label="Strategic briefing synthesized with LLM",
            )

            return {
                "insight_result": insight_res,
                "suggested_questions": questions,
                "current_step": "insight",
                "execution_logs": self._create_log("Insight Agent", elapsed, "success", details),
            }
        except Exception as exc:
            elapsed = time.time() - t0
            err_msg = f"Insight Agent error: {str(exc)}"
            print(f"\033[91m[LangGraph Orchestrator] ❌ {err_msg}\033[0m")
            self._notify(
                node="insight_node",
                status="failed",
                duration_ms=round(elapsed * 1000, 1),
                details=err_msg,
            )
            return {
                "errors": [err_msg],
                "current_step": "insight",
                "execution_logs": self._create_log("Insight Agent", elapsed, "failed", err_msg),
            }

    # =========================================================================
    # Standalone Node: SQL Query Node (Triggered on-demand by /api/query)
    # =========================================================================
    def sql_node(self, question: str, state: PipelineState) -> Dict[str, Any]:
        """Executes natural language SQL query on the validated subset from state."""
        df = state.get("validated_df") if state.get("validated_df") is not None else state.get("cleaned_df")
        return self.sql_agent.generate_and_run(
            question=question,
            df=df,
            quality_report=state.get("data_quality_report"),
        )

    # =========================================================================
    # Graph Wiring
    # =========================================================================
    def _build_graph(self):
        builder = StateGraph(PipelineState)

        # Add Nodes
        builder.add_node("data_cleaning_node", self.data_cleaning_node)
        builder.add_node("validation_node", self.validation_node)
        builder.add_node("error_node", self.error_node)
        builder.add_node("eda_node", self.eda_node)
        builder.add_node("ml_node", self.ml_node)
        builder.add_node("visualization_node", self.visualization_node)
        builder.add_node("insight_node", self.insight_node)

        # START -> data_cleaning_node -> validation_node
        builder.add_edge(START, "data_cleaning_node")
        builder.add_edge("data_cleaning_node", "validation_node")

        # Conditional route after validation
        def validation_router(state: PipelineState):
            if state.get("errors") and len(state["errors"]) > 0:
                return "error_node"
            return ["eda_node", "ml_node"]

        builder.add_conditional_edges(
            "validation_node",
            validation_router,
            {
                "error_node": "error_node",
                "eda_node": "eda_node",
                "ml_node": "ml_node",
            }
        )

        # Error node halts to END
        builder.add_edge("error_node", END)

        # Parallel fan-out join: eda_node and ml_node both feed into visualization_node
        builder.add_edge("eda_node", "visualization_node")
        builder.add_edge("ml_node", "visualization_node")

        # visualization_node -> insight_node -> END
        builder.add_edge("visualization_node", "insight_node")
        builder.add_edge("insight_node", END)

        return builder.compile()

    def run_pipeline(
        self, file_path: str, event_callback: Optional[Any] = None
    ) -> PipelineState:
        """Runs the entire multi-agent LangGraph pipeline from start to finish."""
        start_time = time.time()
        self.event_callback = event_callback
        print("\n" + "=" * 70)
        print(f"\033[1m🚀 STARTING MULTI-AGENT BI PIPELINE (LANGGRAPH)\033[0m")
        print(f"Dataset File: {file_path}")
        print("=" * 70)

        initial_state: PipelineState = {
            "file_path": file_path,
            "raw_df": None,
            "cleaned_df": None,
            "validated_df": None,
            "dataset_summary": None,
            "data_quality_report": None,
            "data_health_score": None,
            "eda_result": None,
            "ml_result": None,
            "sql_result": None,
            "visualization_result": None,
            "insight_result": None,
            "suggested_questions": None,
            "current_step": "init",
            "errors": [],
            "execution_logs": [],
        }

        try:
            final_state = self.graph.invoke(initial_state)
        finally:
            self.event_callback = None

        total_sec = time.time() - start_time
        print("\n" + "=" * 70)
        if final_state.get("errors"):
            print(f"\033[91m❌ PIPELINE HALTED WITH ERRORS in {total_sec:.2f}s total:\033[0m")
            for err in final_state["errors"]:
                print(f"   - {err}")
        else:
            print(f"\033[92m🎉 PIPELINE COMPLETED SUCCESSFULLY IN {total_sec:.2f}s TOTAL!\033[0m")
            print("Execution Telemetry:")
            for log in final_state.get("execution_logs", []):
                print(f"   • {log['step']:<20}: {log['duration_sec']}s [{log['status']}] - {log['details']}")
        print("=" * 70 + "\n")
        return final_state

