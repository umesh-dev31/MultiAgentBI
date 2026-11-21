"""Detect unusual records with Isolation Forest and forecast revenue and orders with a linear trend."""
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from agents.validation import eligible_subset, numeric_columns, temporal_inputs, validated_subset
from contracts import records, finite_result

class MLAgent:
    def _filter_validated_subset(self, df, quality_report=None):
        """Return a safe copy of the dataset."""
        return validated_subset(df)

    def detect_anomalies(self, df, quality_report=None):
        """Flag outliers without removing rows. Use category-relative scaling when categories are available."""
        features = numeric_columns(df)
        values, population = eligible_subset(df, features)
        output = {
            'total_evaluated': len(values),
            'anomaly_count': 0,
            'features_used': features,
            'anomalies': [],
            'population': population
        }

        # Require at least five observations and one numeric feature.
        if not features or len(values) < 5:
            return dict(output, note='At least five eligible observations and one numeric feature are required.', status='unavailable')

        matrix = values[features].copy()
        category = next((c for c in values if c.lower() in {'product', 'category', 'item'}), None)

        # Use the category median when available, otherwise use the global median.
        if category:
            baselines = matrix.groupby(values[category], dropna=False).transform('median')
        else:
            baselines = matrix.median()

        # Scale by the interquartile range to reduce the influence of outliers.
        scale = matrix.quantile(0.75) - matrix.quantile(0.25)
        matrix = (matrix - baselines) / scale.replace(0, 1)

        # Fit an Isolation Forest for unsupervised anomaly detection.
        # Adjust the contamination rate between 4% and 12% based on dataset size.
        model = IsolationForest(
            n_estimators=100,
            contamination=min(0.12, max(0.04, 3 / len(values))),
            random_state=42,
            n_jobs=1
        )
        labels = model.fit_predict(matrix)
        scores = -model.decision_function(matrix)

        # Normalize scores to a 0 to 100 scale.
        normalized = (scores - scores.min()) / max(float(np.ptp(scores)), 1e-9) * 100
        data = records(values)

        # Collect rows labeled as anomalies (label == -1).
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
        # Display the 12 highest-severity anomalies.
        output['anomalies'] = sorted(output['anomalies'], key=lambda a: -a['anomaly_score'])[:12]
        return dict(output, status='completed', note='Observations are flagged, never deleted as statistical outliers.')

    def forecast_trend(self, df, quality_report=None):
        """Fit a line to historical monthly data and project the next three months."""
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

        # Format month keys as YYYY-MM and calculate monthly totals.
        values['_month'] = pd.to_datetime(values[date], format='mixed', utc=True).dt.strftime('%Y-%m')
        values['_revenue'] = values[metrics[0]] * values[metrics[1]] if len(metrics) == 2 else values[metrics[0]]
        historical = [
            {'period': str(month), 'revenue': float(g['_revenue'].sum()), 'orders': len(g)}
            for month, g in values.groupby('_month')
        ]
        result.update(historical=historical, data_points_count=len(historical))

        # Require at least two months of data for forecasting.
        if len(historical) < 2:
            return result

        periods = pd.PeriodIndex([h['period'] for h in historical], freq='M')
        x = np.array([p.ordinal - periods[0].ordinal for p in periods], dtype=float)

        # Calculate the slope and intercept of the linear fit.
        m, b = np.polyfit(x, [h['revenue'] for h in historical], 1)
        mo, bo = np.polyfit(x, [h['orders'] for h in historical], 1)

        note = 'Unvalidated linear projection; no prediction interval, seasonality adjustment, or measured forecast confidence.'
        # Project values for the next three months.
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
        """Run anomaly detection and forecasting and combine their results."""
        output = {}
        for key, method in [('anomalies', self.detect_anomalies), ('forecast', self.forecast_trend)]:
            try:
                output[key] = method(df, quality_report)
            except Exception:
                output[key] = {'status': 'failed', 'error': {'code': 'ANALYSIS_FAILED', 'message': 'Optional analysis failed.'}}
        return output
