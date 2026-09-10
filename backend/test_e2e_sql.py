import os
import sys
import json
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app

client = TestClient(app)

def run_e2e_tests():
    print("==================================================")
    print("1. Testing Health Endpoint")
    print("==================================================")
    res = client.get("/health")
    print("Health Status:", res.status_code, res.json())
    assert res.status_code == 200

    print("\n==================================================")
    print("2. Uploading Test Dataset")
    print("==================================================")
    csv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "test-data", "brutal_data_cleaning_test.csv")
    with open(csv_path, "rb") as f:
        res = client.post("/api/upload", files={"file": ("brutal_data_cleaning_test.csv", f, "text/csv")})
    print("Upload Status:", res.status_code)
    upload_data = res.json()
    print("Cleaned rows:", upload_data["summary"]["cleaned_rows"])
    assert res.status_code == 200

    print("\n==================================================")
    print("3. Query 1: Total revenue by region")
    print("==================================================")
    res1 = client.post("/api/query", json={"question": "What is the total revenue by region?"})
    print("Status:", res1.status_code)
    data1 = res1.json()
    print("Question:", data1["question"])
    print("Generated SQL:", data1["generated_sql"])
    print("Row Count:", data1["row_count"])
    print("Result Rows:", json.dumps(data1["result"], indent=2))
    assert res1.status_code == 200
    assert data1["error"] is None
    assert data1["row_count"] > 0

    print("\n==================================================")
    print("4. Query 2: Top 5 customers by order count")
    print("==================================================")
    res2 = client.post("/api/query", json={"question": "Top 5 customers by order count"})
    print("Status:", res2.status_code)
    data2 = res2.json()
    print("Question:", data2["question"])
    print("Generated SQL:", data2["generated_sql"])
    print("Row Count:", data2["row_count"])
    print("Result Rows:", json.dumps(data2["result"], indent=2))
    assert res2.status_code == 200
    assert data2["error"] is None
    assert data2["row_count"] > 0

    print("\n==================================================")
    print("5. Query 3: Average unit price and total quantity by product")
    print("==================================================")
    res3 = client.post("/api/query", json={"question": "Average unit price and total quantity by product"})
    print("Status:", res3.status_code)
    data3 = res3.json()
    print("Question:", data3["question"])
    print("Generated SQL:", data3["generated_sql"])
    print("Row Count:", data3["row_count"])
    print("Result Rows:", json.dumps(data3["result"], indent=2))
    assert res3.status_code == 200
    assert data3["error"] is None
    assert data3["row_count"] > 0

    print("\n==================================================")
    print("ALL 3 SQL AGENT QUERIES EXECUTED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_e2e_tests()
