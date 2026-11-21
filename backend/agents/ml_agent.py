"""
ML (Machine Learning) Agent
---------------------------
Ye agent 2 important kaam karta hai:
1. Anomaly Detection: Isolation Forest algorithm se unusual/outlier records detect karta hai.
2. Trend Forecasting: Polynomial regression se aage aane wale 3 mahino ka revenue/orders predict karta hai.
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from agents.validation import eligible_subset, numeric_columns, temporal_inputs, validated_subset
from contracts import records, finite_result

class MLAgent:
    def _filter_validated_subset(self, df, quality_report=None):
        """Dataset ki safe copy return karta hai."""
        return validated_subset(df)

    def detect_anomalies(self, df, quality_report=None):
        """
        Anomaly Detection using Isolation Forest:
        - Outliers ko data se delete NAHI karta, sirf FLAG karta hai.
        - Category-relative scaling use hoti hai (jaise electronics vs groceries ka price alag scale pe hota hai).
        """
        features = numeric_columns(df)
        values, population = eligible_subset(df, features)
        output = {
            'total_evaluated': len(values),
            'anomaly_count': 0,
            'features_used': features,
            'anomalies': [],
            'population': population
        }

        # Kam se kam 5 observations aur 1 numeric feature hona zaroori hai
        if not features or len(values) < 5:
            return dict(output, note='At least five eligible observations and one numeric feature are required.', status='unavailable')

        matrix = values[features].copy()
        category = next((c for c in values if c.lower() in {'product', 'category', 'item'}), None)

        # Baseline nikaalo: Category-wise median agar category column mile, nahi to global median
        if category:
            baselines = matrix.groupby(values[category], dropna=False).transform('median')
        else:
            baselines = matrix.median()

        # Robust scaling (IQR scale) taaki outliers normal data scale ko kharab na karein
        scale = matrix.quantile(0.75) - matrix.quantile(0.25)
        matrix = (matrix - baselines) / scale.replace(0, 1)

        # Isolation Forest train karo (unsupervised outlier detection)
        # Contamination rate dataset ke size ke mutabiq 4% se 12% ke beech dynamically set hoti hai
        model = IsolationForest(
            n_estimators=100,
            contamination=min(0.12, max(0.04, 3 / len(values))),
            random_state=42,
            n_jobs=1
        )
        labels = model.fit_predict(matrix)
        scores = -model.decision_function(matrix)

        # Scores ko 0 se 100 ke scale me normalize karo
        normalized = (scores - scores.min()) / max(float(np.ptp(scores)), 1e-9) * 100
        data = records(values)

        # Jo rows anomaly mark hui hain (label == -1), unhe collect karo
        for i in np.flatnonzero(labels == -1):
            score = round(float(normalized[i]), 1)
            output['anomalies'].append({
                'row_index': values.attrs['source_rows'][i],
                'anomaly_score': score,
                'severity': 'High' if score >= 70 else 'Medium',
                'reason': (
                    'Unusual combination of numeric measurements relative to category peers.'
                    if category
                    else 'Unusual combination of numeric measurements.'
                ),
                'record': data[i]
            })

        output['anomaly_count'] = len(output['anomalies'])
        # Top 12 highest severity anomalies display karo
        output['anomalies'] = sorted(output['anomalies'], key=lambda a: -a['anomaly_score'])[:12]
        return dict(output, status='completed', note='Observations are flagged, never deleted as statistical outliers.')

    def forecast_trend(self, df, quality_report=None):
        """
        Time-Series Forecasting (Linear Projection):
        - Past monthly data par line fit karta hai (np.polyfit).
        - Aage aane wale 3 mahino ka forecast generate karta hai.
        """
        date, metrics = temporal_inputs(df)
        result = {
            'historical': [],
            'forecast': [],
            'confidence_level': 'insufficient',
            'confidence_note': 'A linear projection requires valid dates, a numeric metric and two distinct months.',
            'data_points_count': 0,
            'model': 'linear_projection',
            'status': 'unavailable'
        }

        if not date or not metrics:
            return result

        values, population = eligible_subset(df, metrics, date)
        result['population'] = population
        if values.empty:
            return result

        # Month string banao (%Y-%m) aur monthly total calculate karo
        values['_month'] = pd.to_datetime(values[date], format='mixed', utc=True).dt.strftime('%Y-%m')
        values['_revenue'] = values[metrics[0]] * values[metrics[1]] if len(metrics) == 2 else values[metrics[0]]
        historical = [
            {'period': str(month), 'revenue': float(g['_revenue'].sum()), 'orders': len(g)}
            for month, g in values.groupby('_month')
        ]
        result.update(historical=historical, data_points_count=len(historical))

        # Forecasting ke liye kam se kam 2 months ka data chahiye
        if len(historical) < 2:
            return result

        periods = pd.PeriodIndex([h['period'] for h in historical], freq='M')
        x = np.array([p.ordinal - periods[0].ordinal for p in periods], dtype=float)

        # Linear regression: slope (m) aur intercept (b) calculate karo
        m, b = np.polyfit(x, [h['revenue'] for h in historical], 1)
        mo, bo = np.polyfit(x, [h['orders'] for h in historical], 1)

        note = 'Unvalidated linear projection; no prediction interval, seasonality adjustment, or measured forecast confidence.'
        # Agle 3 mahino ke projected points banao
        forecast = [
            {
                'period': str(periods[-1] + i),
                'predicted_value': float(m * (x[-1] + i) + b),
                'predicted_orders': max(0, int(round(mo * (x[-1] + i) + bo))),
                'confidence_note': note
            }
            for i in range(1, 4)
        ]

        return finite_result(dict(
            result,
            forecast=forecast,
            status='completed',
            confidence_level='unvalidated',
            confidence_note=note,
            trend_direction='Upward Growth' if m > 0 else 'Declining Trajectory' if m < 0 else 'Stable / Flat',
            monthly_growth_rate=float(m)
        ))

    def analyze(self, df, quality_report=None):
        """Dono methods (anomalies aur forecast) ko safely execute karke combine karta hai."""
        output = {}
        for key, method in [('anomalies', self.detect_anomalies), ('forecast', self.forecast_trend)]:
            try:
                output[key] = method(df, quality_report)
            except Exception:
                output[key] = {'status': 'failed', 'error': {'code': 'ANALYSIS_FAILED', 'message': 'Optional analysis failed.'}}
        return output
