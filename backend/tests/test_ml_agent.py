import pandas as pd
import pytest
from agents.ml_agent import MLAgent

def test_anomaly_detection_sees_outliers_and_preserves_source_rows():
    frame = pd.DataFrame({'revenue':[10,11,12,13,14,15,1000]})
    frame.attrs['source_rows']=[2,3,5,6,8,9,12]
    result = MLAgent().detect_anomalies(frame)
    assert result['total_evaluated']==7
    assert any(a['row_index']==12 for a in result['anomalies'])

def test_projection_uses_calendar_gaps_and_has_no_claimed_confidence():
    frame = pd.DataFrame({'order_date':['2026-01-01','2026-03-01'],'revenue':[100,300]})
    result = MLAgent().forecast_trend(frame)
    assert result['forecast'][0]['period']=='2026-04'
    assert result['forecast'][0]['predicted_value']==pytest.approx(400)
    assert result['confidence_level']=='unvalidated'

def test_projection_insufficient_and_signed_values():
    assert MLAgent().forecast_trend(pd.DataFrame({'revenue':[10,20]}))['status']=='unavailable'
    frame = pd.DataFrame({'order_date':['2026-01-01','2026-02-01'],'revenue':[-100,-200]})
    assert MLAgent().forecast_trend(frame)['forecast'][0]['predicted_value']==pytest.approx(-300)

def test_optional_ml_failure_does_not_destroy_other_result(monkeypatch):
    agent = MLAgent()
    monkeypatch.setattr(agent,'detect_anomalies',lambda *a,**k: (_ for _ in ()).throw(RuntimeError()))
    result = agent.analyze(pd.DataFrame({'order_date':['2026-01-01','2026-02-01'],'revenue':[100,200]}))
    assert result['anomalies']['status']=='failed'
    assert result['forecast']['status']=='completed'
