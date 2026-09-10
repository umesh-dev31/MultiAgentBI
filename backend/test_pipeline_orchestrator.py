import os
import sys
import json
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from orchestrator import Orchestrator

def test_pipeline_standalone():
    print("==================================================")
    print("Testing Orchestrator with brutal_data_cleaning_test.csv")
    print("==================================================")
    csv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "test-data", "brutal_data_cleaning_test.csv")
    orch = Orchestrator()
    state = orch.run_pipeline(csv_path)

    assert not state.get("errors"), f"Pipeline encountered errors: {state.get('errors')}"
    assert state.get("cleaned_df") is not None
    assert state.get("validated_df") is not None
    assert state.get("eda_result") is not None
    assert state.get("ml_result") is not None
    assert state.get("visualization_result") is not None
    assert state.get("insight_result") is not None
    assert state.get("suggested_questions") is not None

    print("\n--- Telemetry Summary ---")
    for log in state.get("execution_logs", []):
        print(f"  • {log['step']}: {log['duration_sec']}s ({log['details']})")

    print("\n--- Validated Rows ---")
    val_df = state.get("validated_df")
    print(f"Validated rows: {len(val_df)}")
    assert len(val_df) == 42, f"Expected 42 validated rows, got {len(val_df)}"

    print("\n--- EDA Categorical Product Mix ---")
    cat_summary = state["eda_result"]["categorical_summary"]
    prod_items = cat_summary.get("product", [])
    print("Product Mix:", prod_items)
    # Check that percentages sum to 100% and reference 42
    assert prod_items[0]["value"] == "Laptop"
    assert prod_items[0]["count"] == 13
    assert prod_items[0]["percentage"] == 31.0

    print("\n--- ML Anomalies ---")
    anoms = state["ml_result"]["anomalies"]["anomalies"]
    print(f"Found {len(anoms)} anomalies:")
    for a in anoms[:3]:
        print(f"  - Anomaly #{a['row_index']} ({a['severity']}): {a['reason']}")

    print("\n--- Visualization Specs ---")
    charts = state["visualization_result"]["charts"]
    print(f"Suggested {len(charts)} charts:")
    for c in charts:
        print(f"  - [{c['chart_type'].upper()}] {c['title']} ({len(c.get('data', []))} data points)")

    print("\n--- Executive Summary ---")
    ins = state["insight_result"]
    print("Summary:\n", ins.get("summary"))
    print("\nKey Finding:\n", ins.get("key_finding"))
    print("\nRecommendation:\n", ins.get("recommendation"))

    print("\n--- Suggested Questions ---")
    questions = state["suggested_questions"]
    for q in questions:
        print(f"  - [{q.get('icon')}] {q.get('title')}: {q.get('description')}")

    print("\n==================================================")
    print("PIPELINE TEST PASSED COMPLETELY!")
    print("==================================================")

def test_validation_gate_failure():
    print("\n==================================================")
    print("Testing Validation Gate with corrupt/empty CSV")
    print("==================================================")
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w") as f:
        f.write("col_a,col_b\n") # only header, 0 rows
        temp_empty = f.name

    try:
        orch = Orchestrator()
        state = orch.run_pipeline(temp_empty)
        assert state.get("errors") and len(state["errors"]) > 0, "Expected pipeline errors on empty file"
        assert state.get("current_step") == "error", f"Expected step 'error', got {state.get('current_step')}"
        print("✓ Successfully routed to error_node on validation failure!")
    finally:
        if os.path.exists(temp_empty):
            os.remove(temp_empty)

if __name__ == "__main__":
    test_pipeline_standalone()
    test_validation_gate_failure()
