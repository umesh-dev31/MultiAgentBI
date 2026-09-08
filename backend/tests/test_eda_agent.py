import os
import sys
import unittest
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.eda_agent import EDAAgent


class TestEDAAgent(unittest.TestCase):
    def setUp(self):
        self.agent = EDAAgent()
        self.df = pd.DataFrame({
            "order_id": [101, 102, 103, 104, 105],
            "order_date": ["2026-01-05", "2026-01-15", "2026-01-20", "2026-02-05", "2026-02-12"],
            "region": ["North", "North", "South", "West", "North"],
            "product": ["Laptop", "Phone", "Laptop", "Tablet", "Laptop"],
            "quantity": [2, 1, 3, 2, 4],
            "unit_price": [1200.0, 800.0, 1200.0, 400.0, 1200.0],
        })

    def test_numeric_summary(self):
        res = self.agent.analyze(self.df)
        num_summary = res["numeric_summary"]

        self.assertIn("quantity", num_summary)
        self.assertIn("unit_price", num_summary)

        qty_stats = num_summary["quantity"]
        self.assertEqual(qty_stats["count"], 5)
        self.assertEqual(qty_stats["min"], 1)
        self.assertEqual(qty_stats["max"], 4)
        self.assertEqual(qty_stats["median"], 2)

        price_stats = num_summary["unit_price"]
        self.assertEqual(price_stats["min"], 400.0)
        self.assertEqual(price_stats["max"], 1200.0)

    def test_categorical_summary(self):
        res = self.agent.analyze(self.df)
        cat_summary = res["categorical_summary"]

        self.assertIn("region", cat_summary)
        self.assertIn("product", cat_summary)

        # Region top value is North (3/5 = 60%)
        north = cat_summary["region"][0]
        self.assertEqual(north["value"], "North")
        self.assertEqual(north["count"], 3)
        self.assertEqual(north["percentage"], 60.0)

        # Product top value is Laptop (3/5 = 60%)
        laptop = cat_summary["product"][0]
        self.assertEqual(laptop["value"], "Laptop")
        self.assertEqual(laptop["count"], 3)

    def test_correlation_matrix(self):
        res = self.agent.analyze(self.df)
        corr = res["correlation_matrix"]
        self.assertIn("columns", corr)
        self.assertIn("matrix", corr)
        self.assertIn("quantity", corr["columns"])
        self.assertIn("unit_price", corr["columns"])

        # Diagonal values should be 1.0
        cols = corr["columns"]
        qty_idx = cols.index("quantity")
        self.assertEqual(corr["matrix"][qty_idx][qty_idx], 1.0)

    def test_monthly_trend(self):
        res = self.agent.analyze(self.df)
        trend = res["monthly_trend"]
        self.assertEqual(len(trend), 2)

        jan = next(t for t in trend if t["month"] == "2026-01")
        feb = next(t for t in trend if t["month"] == "2026-02")

        # Jan has 3 orders, Feb has 2 orders
        self.assertEqual(jan["total_orders"], 3)
        self.assertEqual(feb["total_orders"], 2)

        # Jan revenue: (2*1200) + (1*800) + (3*1200) = 2400 + 800 + 3600 = 6800.0
        self.assertEqual(jan["total_revenue"], 6800.0)

        # Feb revenue: (2*400) + (4*1200) = 800 + 4800 = 5600.0
        self.assertEqual(feb["total_revenue"], 5600.0)

    def test_notable_patterns(self):
        res = self.agent.analyze(self.df)
        patterns = res["notable_patterns"]
        self.assertIsInstance(patterns, list)
        self.assertGreater(len(patterns), 0)

        # Should note North as leading region
        self.assertTrue(any("North" in p for p in patterns))

    def test_empty_dataframe(self):
        res = self.agent.analyze(pd.DataFrame())
        self.assertEqual(res["monthly_trend"], [])
        self.assertEqual(res["notable_patterns"], ["Dataset is empty."])
        self.assertEqual(res["stats_computed_on"]["total_rows"], 0)

    def test_validated_subset_excludes_negatives_outliers_nulls(self):
        # Create dataset with negatives, outliers, and nulls
        dirty_df = pd.DataFrame({
            "order_id": [1, 2, 3, 4, 5, 6],
            "order_date": ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04", "2026-01-05", "2026-01-06"],
            "quantity": [2, -5, 3, 999999, None, 4],
            "unit_price": [100.0, 100.0, -50.0, 100.0, 100.0, 100.0],
        })
        mock_quality_report = {
            "flagged_for_review": [
                {"row_index": 4, "column": "quantity", "reason": "possible outlier, review before including in analysis"}
            ]
        }
        res = self.agent.analyze(dirty_df, quality_report=mock_quality_report)
        stats_on = res["stats_computed_on"]

        # Expected:
        # row 1: [2, 100] -> VALID
        # row 2: quantity -5 -> EXCLUDED (negative)
        # row 3: unit_price -50 -> EXCLUDED (negative)
        # row 4: quantity 999999 -> EXCLUDED (outlier)
        # row 5: quantity None -> EXCLUDED (null)
        # row 6: [4, 100] -> VALID
        # Total: 6, Validated: 2, Excluded: 4
        self.assertEqual(stats_on["total_rows"], 6)
        self.assertEqual(stats_on["validated_rows_used"], 2)
        self.assertEqual(stats_on["excluded_rows"], 4)

        qty_stats = res["numeric_summary"]["quantity"]
        self.assertEqual(qty_stats["min"], 2)
        self.assertEqual(qty_stats["max"], 4)
        self.assertEqual(qty_stats["count"], 2)

        # Total revenue on valid rows: (2*100) + (4*100) = 600.0 (no absurd millions)
        jan = res["monthly_trend"][0]
        self.assertEqual(jan["total_revenue"], 600.0)


if __name__ == "__main__":
    unittest.main()
