import os
import sys
import json
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from main import app
from agents.visualization_agent import VisualizationAgent
from agents.insight_agent import InsightAgent
from agents.eda_agent import EDAAgent
from agents.ml_agent import MLAgent

client = TestClient(app)

def test_insights():
    print("==================================================")
    print("1. Uploading brutal_data_cleaning_test.csv")
    print("==================================================")
    csv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "test-data", "brutal_data_cleaning_test.csv")
    with open(csv_path, "rb") as f:
        up_res = client.post("/api/upload", files={"file": ("brutal_data_cleaning_test.csv", f, "text/csv")})
    assert up_res.status_code == 200, f"Upload failed: {up_res.text}"
    print("Upload successful!")

    print("\n==================================================")
    print("2. Calling POST /api/insights")
    print("==================================================")
    res = client.post("/api/insights")
    assert res.status_code == 200, f"Insights failed: {res.text}"
    data = res.json()

    print("\n--- SUGGESTED CHARTS (" + str(len(data.get("charts", []))) + ") ---")
    for i, chart in enumerate(data.get("charts", [])):
        print(f"Chart #{i+1}: [{chart.get('chart_type').upper()}] {chart.get('title')}")
        print(f"  x_field: {chart.get('x_field')}, y_field: {chart.get('y_field')}")
        print(f"  data points: {len(chart.get('data', []))}")
        if chart.get('data'):
            print(f"  sample item: {chart['data'][0]}")

    print("\n--- EXECUTIVE SUMMARY ---")
    print(data.get("summary"))

    print("\n--- KEY FINDING ---")
    print(data.get("key_finding"))

    print("\n--- ACTIONABLE RECOMMENDATION ---")
    print(data.get("recommendation"))

    # Assertions
    assert "summary" in data and len(data["summary"]) > 20
    assert "key_finding" in data and len(data["key_finding"]) > 10
    assert "recommendation" in data and len(data["recommendation"]) > 10
    assert len(data.get("charts", [])) >= 2

    print("\n==================================================")
    print("ALL INSIGHTS END-TO-END TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    test_insights()
