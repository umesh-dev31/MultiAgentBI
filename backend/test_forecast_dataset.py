import os
import requests

BACKEND_URL = "http://localhost:8000"
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEST_CSV_PATH = os.path.join(ROOT_DIR, "test-data", "forecast_ready_monthly_dataset.csv")

def test_forecast_dataset():
    print("=== Testing Pipeline on forecast_ready_monthly_dataset.csv ===")
    assert os.path.exists(TEST_CSV_PATH), f"File {TEST_CSV_PATH} not found"
    with open(TEST_CSV_PATH, "rb") as f:
        files = {"file": ("forecast_ready_monthly_dataset.csv", f, "text/csv")}
        resp = requests.post(f"{BACKEND_URL}/api/pipeline/run", files=files)

    assert resp.status_code == 200, f"Failed: {resp.text}"
    data = resp.json()

    print("Execution Telemetry:")
    for log in data["execution_logs"]:
        print(f"  * {log['step_name']}: {log['duration_seconds']:.2f}s [{log['status']}] - {log.get('details')}")

    ml = data["ml_result"]
    forecast = ml.get("forecast", {})
    trend = forecast.get("trend_direction", "N/A")
    print(f"Forecast trend direction: {trend}")

    insights = data["insight_result"]
    print(f"Insight summary length: {len(insights.get('summary', ''))}")
    print(f"Suggested questions: {len(data['suggested_questions'])}")
    for q in data["suggested_questions"]:
        title = q.get("title") if isinstance(q, dict) else str(q)
        print(f"  ? {title}")

    print("\n*** FORECAST DATASET PIPELINE PASSED! ***")

if __name__ == "__main__":
    test_forecast_dataset()
