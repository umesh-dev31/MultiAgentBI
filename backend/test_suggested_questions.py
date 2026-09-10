import os
import sys
import json
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from main import app

client = TestClient(app)

def test_suggested_questions():
    print("==================================================")
    print("1. Testing GET /api/suggested-questions before upload")
    print("==================================================")
    init_res = client.get("/api/suggested-questions")
    assert init_res.status_code == 200
    init_data = init_res.json()
    print("Default questions returned:", len(init_data.get("questions", [])))
    for q in init_data.get("questions", []):
        print(f"  - [{q.get('icon')}] {q.get('title')}: {q.get('description')}")
    assert len(init_data.get("questions", [])) >= 3

    print("\n==================================================")
    print("2. Uploading forecast_ready_monthly_dataset.csv")
    print("==================================================")
    csv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "forecast_ready_monthly_dataset.csv")
    with open(csv_path, "rb") as f:
        up_res = client.post("/api/upload", files={"file": ("forecast_ready_monthly_dataset.csv", f, "text/csv")})
    assert up_res.status_code == 200, f"Upload failed: {up_res.text}"
    up_data = up_res.json()
    print(f"Uploaded successfully! Columns in dataset: {[c['name'] for c in up_data['columns']]}")

    print("\n==================================================")
    print("3. Calling GET /api/suggested-questions for forecast_ready_monthly_dataset.csv")
    print("==================================================")
    sugg_res = client.get("/api/suggested-questions")
    assert sugg_res.status_code == 200
    sugg_data = sugg_res.json()
    questions = sugg_data.get("questions", [])

    print(f"\nGenerated {len(questions)} dynamic questions:")
    for i, q in enumerate(questions):
        print(f"Question #{i+1}: [{q.get('icon')}] {q.get('title')}")
        print(f"   Description: {q.get('description')}")

    # Verify that NONE of the old hardcoded columns (region, product) are falsely assumed,
    # and that questions reference actual columns: Revenue, Expenses, Customers, Month, Date
    all_text = " ".join([q["title"].lower() + " " + q["description"].lower() for q in questions])
    print(f"\nVerifying actual column matching...")
    actual_cols_matched = [col for col in ["revenue", "expenses", "customers", "month", "date"] if col in all_text]
    print(f"Columns found in suggested questions: {actual_cols_matched}")

    assert "region" not in all_text, "Error: 'region' was mentioned in questions but does not exist in dataset!"
    assert len(actual_cols_matched) >= 2, "Expected at least 2 actual columns to be referenced in suggested questions"

    print("\n==================================================")
    print("4. Testing SQL query execution with first suggested question")
    print("==================================================")
    first_q = questions[0]["title"]
    print(f"Testing Question: '{first_q}'")
    query_res = client.post("/api/query", json={"question": first_q})
    assert query_res.status_code == 200
    query_data = query_res.json()
    print(f"Generated SQL: {query_data.get('generated_sql')}")
    print(f"Rows returned: {query_data.get('row_count')}")
    if query_data.get("result"):
        print(f"Sample row: {query_data['result'][0]}")

    print("\n==================================================")
    print("ALL DYNAMIC SUGGESTED QUESTIONS TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    test_suggested_questions()
