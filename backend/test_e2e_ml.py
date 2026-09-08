import os
import sys
import json
import pandas as pd
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from main import app
from agents.ml_agent import MLAgent

client = TestClient(app)

def test_ml_pipeline():
    print("==================================================")
    print("1. Testing MLAgent with Multi-Month Synthetic Dataset")
    print("==================================================")
    dates = [
        "2025-10-05", "2025-10-18",
        "2025-11-02", "2025-11-20",
        "2025-12-05", "2025-12-25",
        "2026-01-08", "2026-01-22",
        "2026-02-05", "2026-02-18",
        "2026-03-02", "2026-03-15",
    ]
    df_multi = pd.DataFrame({
        "order_id": range(1, 13),
        "order_date": dates,
        "product": ["Laptop", "Mouse"] * 6,
        "quantity": [2, 1, 3, 2, 4, 1, 3, 2, 5, 2, 4, 3],
        "unit_price": [1200.0, 50.0, 1200.0, 50.0, 1200.0, 50.0, 1200.0, 50.0, 1200.0, 50.0, 1200.0, 50.0],
    })

    agent = MLAgent()
    multi_res = agent.analyze(df_multi)
    print("Historical Periods:", len(multi_res["forecast"]["historical"]))
    print("Forecast Periods:", [f["period"] for f in multi_res["forecast"]["forecast"]])
    print("Confidence Level:", multi_res["forecast"]["confidence_level"])
    print("Confidence Note:", multi_res["forecast"]["confidence_note"])
    assert len(multi_res["forecast"]["forecast"]) == 3
    assert multi_res["forecast"]["confidence_level"] == "moderate"

    print("\n==================================================")
    print("2. Testing /api/upload and /api/ml-insights with brutal_data_cleaning_test.csv")
    print("==================================================")
    csv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "brutal_data_cleaning_test.csv")
    with open(csv_path, "rb") as f:
        up_res = client.post("/api/upload", files={"file": ("brutal_data_cleaning_test.csv", f, "text/csv")})
    assert up_res.status_code == 200

    ml_res = client.post("/api/ml-insights")
    assert ml_res.status_code == 200
    ml_data = ml_res.json()

    print("Anomalies Count:", ml_data["anomalies"]["anomaly_count"])
    print("Features Used:", ml_data["anomalies"]["features_used"])
    print("\nTop Flagged Anomalies:")
    for a in ml_data["anomalies"]["anomalies"][:3]:
        print(f" - Row #{a['row_index']} ({a['severity']} - {a['anomaly_score']}%): {a['reason']}")

    print("\nForecast Details:")
    print(" - Confidence Level:", ml_data["forecast"]["confidence_level"])
    print(" - Confidence Note:", ml_data["forecast"]["confidence_note"])

    print("\n==================================================")
    print("ML PIPELINE & API VERIFIED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    test_ml_pipeline()
