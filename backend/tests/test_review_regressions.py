"""Offline regression coverage for review fixes and PPT deliverables."""
import io
import sqlite3
from pathlib import Path
from unittest.mock import patch
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from agents.data_agent import DataAgent
from agents.eda_agent import EDAAgent
from agents.ml_agent import MLAgent
from agents.sql_agent import SQLAgent
from agents.visualization_agent import VisualizationAgent
from agents.insight_agent import InsightAgent
from agents.knowledge_agent import KnowledgeAgent
from agents.validation import validated_subset


def test_source_rows_survive_duplicate_removal(tmp_path):
    file = tmp_path / "duplicates.csv"
    file.write_text("id,quantity,unit_price\n1,1,10\n1,1,10\n2,2,10\n3,3,10\n4,4,10\n5,5,10\n", encoding="utf-8")
    agent = DataAgent()
    agent.process(str(file))
    frame = agent.last_cleaned_df
    assert frame.attrs["source_rows"] == [2, 4, 5, 6, 7]
    report = {"flagged_for_review": [{"row_index": 5, "reason": "outlier"}]}
    filtered = validated_subset(frame, report)
    assert 3 not in filtered.quantity.tolist()
    assert filtered.attrs["source_rows"] == [2, 4, 6, 7]


def test_every_agent_uses_same_rows_and_keeps_zero():
    frame = pd.DataFrame({"quantity": [0, 1, 2, 3, 4, -1], "unit_price": [10] * 6})
    expected = validated_subset(frame)
    for agent in [SQLAgent(), MLAgent()]:
        assert agent._filter_validated_subset(frame).equals(expected)
    assert VisualizationAgent()._get_validated_df(frame).equals(expected)
    assert EDAAgent().analyze(frame)["stats_computed_on"]["validated_rows_used"] == len(expected)
    assert expected.quantity.tolist() == [0, 1, 2, 3, 4]
    assert validated_subset(expected).equals(expected)


def test_forecast_accounts_for_missing_month():
    frame = pd.DataFrame({"order_date": ["2026-01-01", "2026-03-01"], "revenue": [100, 300]})
    forecast = MLAgent().forecast_trend(frame)["forecast"]
    assert forecast[0]["period"] == "2026-04"
    assert forecast[0]["predicted_value"] == pytest.approx(400)


def test_sql_execution_blocks_writes_even_without_text_guard():
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE orders (quantity INTEGER)")
    conn.execute("INSERT INTO orders VALUES (2)")
    records, error = SQLAgent()._execute_sql(conn, "UPDATE orders SET quantity=99")
    assert error and not records
    assert conn.execute("SELECT quantity FROM orders").fetchone()[0] == 2
    conn.close()


@pytest.fixture
def client(tmp_path, monkeypatch):
    import main
    import db.database
    engine = create_engine("sqlite:///" + str(tmp_path / "history.db"), connect_args={"check_same_thread": False})
    db.database.Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine)
    monkeypatch.setattr(main, "SessionLocal", sessions)
    monkeypatch.setattr(db.database, "SessionLocal", sessions)
    monkeypatch.setattr(main, "init_db", lambda: None)
    for name in ["current_cleaned_df", "current_validated_df", "current_quality_report", "current_dataset_id", "current_pipeline_result", "current_suggested_questions"]:
        monkeypatch.setattr(main, name, None)
    def offline(*args, **kwargs):
        raise RuntimeError("LLM disabled in offline regression test")
    for cls in [SQLAgent, InsightAgent, KnowledgeAgent]:
        monkeypatch.setattr(cls, "_call_llm", offline)
    with TestClient(main.app) as api:
        yield api
    engine.dispose()


def test_pipeline_history_exports_and_fresh_upload(client):
    sample = Path(__file__).resolve().parents[2] / "test-data" / "forecast_ready_monthly_dataset.csv"
    response = client.post("/api/pipeline/run?run_id=review_test", files={"file": (sample.name, sample.read_bytes(), "text/csv")})
    assert response.status_code == 200, response.text
    data = response.json()
    dataset_id = data["dataset_id"]
    assert dataset_id
    assert len(data["execution_logs"]) == 6
    assert data["ml_result"]["forecast"]["forecast"]
    assert client.get("/api/history").status_code == 200
    restored = client.get(f"/api/history/{dataset_id}").json()
    assert restored["eda_result"] == data["eda_result"]
    exported = client.get(f"/api/export/{dataset_id}?format=csv")
    assert exported.status_code == 200
    rows = pd.read_csv(io.StringIO(exported.text))
    assert len(rows) == data["dataset_summary"]["summary"]["cleaned_rows"]
    assert len(rows) > 10  # full data rather than preview
    assert client.get(f"/api/export/{dataset_id}?format=json").json()["eda_result"] == data["eda_result"]
    html = client.get(f"/api/export/{dataset_id}?format=html")
    assert html.status_code == 200 and "Print / Save as PDF" in html.text
    assert client.get(f"/api/export/{dataset_id}?format=bad").status_code == 422
    assert client.post("/api/query", json={"question": "how many rows", "dataset_id": 999999}).status_code == 404
    fresh = client.post("/api/upload", files={"file": ("new.csv", b"quantity,unit_price\n1,10\n2,10\n3,10\n", "text/csv")})
    assert fresh.status_code == 200
    result = client.post("/api/query", json={"question": "how many rows"}).json()
    assert result["result"][0]["total_records"] == 3


def test_import_database_and_unknown_table(client, tmp_path, monkeypatch):
    source = tmp_path / "source.db"
    with sqlite3.connect(source) as conn:
        conn.execute('CREATE TABLE "sales records" (quantity INTEGER, price INTEGER)')
        conn.executemany('INSERT INTO "sales records" VALUES (?,?)', [(1, 10), (2, 10), (3, 10)])
    monkeypatch.setenv("ANALYTICS_DATABASE_URL", "sqlite:///" + str(source))
    assert client.get("/api/database/tables").json()["tables"] == ["sales records"]
    imported = client.post("/api/database/extract", json={"table": "sales records"})
    assert imported.status_code == 200 and len(pd.read_csv(io.StringIO(imported.text))) == 3
    assert client.post("/api/database/extract", json={"table": "sales records; DROP TABLE sales records"}).status_code == 404
    response = client.post("/api/pipeline/run", files={"file": ("source.csv", imported.content, "text/csv")})
    assert response.status_code == 200, response.text
    monkeypatch.delenv("ANALYTICS_DATABASE_URL")
    assert client.get("/api/database/tables").json() == {"configured": False, "tables": []}


def test_upload_filename_cannot_escape_temp_folder(client):
    result = client.post("/api/upload", files={"file": ("../../escape.csv", b"quantity,price\n1,10\n2,10\n3,10\n", "text/csv")})
    assert result.status_code == 200, result.text


def test_sql_shortcuts_do_not_ignore_aggregations_or_filters():
    frame = pd.DataFrame({"product": ["A", "B"], "revenue": [10, 20]})
    agent = SQLAgent()
    assert agent._match_deterministic_query("average revenue by product", frame) is None
    assert agent._match_deterministic_query("total revenue by product where revenue > 15", frame) is None
    assert agent._match_deterministic_query("total revenue by product", frame)
