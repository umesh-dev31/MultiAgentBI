import json
import os
import requests

BACKEND_URL = "http://localhost:8000"
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEST_CSV_PATH = os.path.join(ROOT_DIR, "test-data", "brutal_data_cleaning_test.csv")

def test_pipeline_e2e():
    print("=== Testing POST /api/pipeline/run ===")
    assert os.path.exists(TEST_CSV_PATH), f"File {TEST_CSV_PATH} not found"

    with open(TEST_CSV_PATH, "rb") as f:
        files = {"file": ("brutal_data_cleaning_test.csv", f, "text/csv")}
        resp = requests.post(f"{BACKEND_URL}/api/pipeline/run", files=files)

    print(f"Status Code: {resp.status_code}")
    assert resp.status_code == 200, f"Failed: {resp.text}"
    data = resp.json()

    # 1. Check top-level response keys
    expected_keys = [
        "status",
        "filename",
        "dataset_summary",
        "data_quality_report",
        "eda_result",
        "ml_result",
        "visualization_result",
        "insight_result",
        "suggested_questions",
        "execution_logs",
    ]
    for k in expected_keys:
        assert k in data, f"Missing key '{k}' in response"
        print(f"  [OK] Key '{k}' present")

    # 2. Check execution logs
    logs = data["execution_logs"]
    assert len(logs) == 6, f"Expected 6 execution logs, got {len(logs)}"
    print("\nExecution Telemetry:")
    for log in logs:
        print(f"  * {log['step_name']}: {log['duration_seconds']:.2f}s [{log['status']}] - {log.get('details')}")

    # 3. Check EDA results & consistency
    eda = data["eda_result"]
    stats_comp = eda.get("stats_computed_on", {})
    assert stats_comp.get("validated_rows_used") == 42, f"Expected 42 validated rows, got {stats_comp.get('validated_rows_used')}"
    print(f"\n  [OK] Validated rows used for EDA: {stats_comp.get('validated_rows_used')}")

    cat_sum = eda.get("categorical_summary", {})
    if "product" in cat_sum:
        laptop_entry = next((item for item in cat_sum["product"] if str(item["value"]).lower() == "laptop"), None)
        assert laptop_entry is not None, "Laptop product not found in categorical summary"
        assert laptop_entry["count"] == 13, f"Expected 13 laptops, got {laptop_entry['count']}"
        assert laptop_entry["percentage"] == 31.0, f"Expected 31.0% laptops, got {laptop_entry['percentage']}%"
        print(f"  [OK] Categorical check: Laptop count={laptop_entry['count']}, pct={laptop_entry['percentage']}%")

    # 4. Check ML results
    ml = data["ml_result"]
    anomalies = ml.get("anomalies", {}).get("anomalies", [])
    assert len(anomalies) > 0, "No anomalies detected by ML agent"
    isha_anomaly = next((a for a in anomalies if "isha gupta" in str(a.get("record", {})).lower()), None)
    assert isha_anomaly is not None, "Isha Gupta anomaly not flagged"
    print(f"  [OK] ML Anomaly check: Isha Gupta anomaly detected (score: {isha_anomaly.get('anomaly_score')})")

    # 5. Check Visualizations
    viz = data["visualization_result"]
    charts = viz.get("charts", [])
    assert len(charts) >= 2, f"Expected >= 2 chart specs, got {len(charts)}"
    print(f"  [OK] Visualization check: {len(charts)} chart specs generated: {[c['title'] for c in charts]}")

    # 6. Check Business Summary
    insights = data["insight_result"]
    assert len(insights.get("summary", "")) > 50, "Summary is empty or too short"
    assert len(insights.get("key_finding", "")) > 10, "Key finding is missing"
    assert len(insights.get("recommendation", "")) > 10, "Recommendation is missing"
    print(f"  [OK] Insight Summary check: Key finding: {insights.get('key_finding')[:60]}...")

    # 7. Test on-demand SQL query using the pipeline session
    print("\n=== Testing POST /api/query on session ===")
    sql_resp = requests.post(f"{BACKEND_URL}/api/query", json={"question": "What is the total revenue by product?"})
    assert sql_resp.status_code == 200, f"SQL query failed: {sql_resp.text}"
    sql_data = sql_resp.json()
    assert "generated_sql" in sql_data and "result" in sql_data, f"Invalid SQL response: {sql_data}"
    print(f"  [OK] SQL query executed successfully: {sql_data.get('row_count')} rows returned")
    print(f"  SQL Query: {sql_data.get('generated_sql')}")

    print("\n*** ALL E2E PIPELINE TESTS PASSED! ***")

if __name__ == "__main__":
    test_pipeline_e2e()
