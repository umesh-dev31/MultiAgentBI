import os
import sys
import unittest
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.ml_agent import MLAgent


class TestMLAgent(unittest.TestCase):
    def setUp(self):
        self.agent = MLAgent()
        self.df = pd.DataFrame({
            "order_id": list(range(101, 116)),
            "order_date": [
                "2026-01-05", "2026-01-12", "2026-01-18", "2026-01-25",
                "2026-02-02", "2026-02-10", "2026-02-16", "2026-02-22",
                "2026-03-01", "2026-03-08", "2026-03-15", "2026-03-22",
                "2026-03-28", "2026-03-29", "2026-03-30",
            ],
            "customer": ["Customer_" + str(i) for i in range(15)],
            "product": ["Keyboard", "Mouse", "Keyboard", "Laptop", "Mouse"] * 3,
            "quantity": [2, 1, 2, 1, 3, 2, 1, 2, 1, 2, 1, 2, 1, 25, 2],  # row 13 has 25 (spike)
            "unit_price": [150.0, 50.0, 150.0, 1200.0, 50.0] * 3,
        })

    def test_detect_anomalies(self):
        result = self.agent.detect_anomalies(self.df)
        self.assertIn("anomalies", result)
        self.assertIn("anomaly_count", result)
        self.assertGreater(result["total_evaluated"], 0)
        # Check that anomalies have score, severity, and plain-English reason
        if result["anomaly_count"] > 0:
            first_anom = result["anomalies"][0]
            self.assertIn("anomaly_score", first_anom)
            self.assertIn("severity", first_anom)
            self.assertIn("reason", first_anom)
            self.assertIn("record", first_anom)
            self.assertTrue(len(first_anom["reason"]) > 5)

    def test_forecast_trend(self):
        result = self.agent.forecast_trend(self.df)
        self.assertIn("historical", result)
        self.assertIn("forecast", result)
        self.assertIn("confidence_note", result)
        self.assertEqual(len(result["historical"]), 3)  # Jan, Feb, Mar 2026
        # Forecast should have projected 3 future periods
        self.assertEqual(len(result["forecast"]), 3)
        self.assertEqual(result["forecast"][0]["period"], "2026-04")
        self.assertEqual(result["forecast"][1]["period"], "2026-05")
        self.assertEqual(result["forecast"][2]["period"], "2026-06")
        # Under 6 months should honestly state low confidence
        self.assertEqual(result["confidence_level"], "low")
        self.assertIn("limited historical data", result["confidence_note"].lower())

    def test_forecast_insufficient_data(self):
        single_month_df = self.df.iloc[:3].copy()
        result = self.agent.forecast_trend(single_month_df)
        self.assertEqual(result["confidence_level"], "insufficient")
        self.assertEqual(len(result["forecast"]), 0)


if __name__ == "__main__":
    unittest.main()
