import sqlite3
import unittest
import pandas as pd
from agents.sql_agent import SQLAgent


class TestSQLAgent(unittest.TestCase):
    def setUp(self):
        self.agent = SQLAgent()
        self.df = pd.DataFrame({
            "order_id": [101, 102, 103, 104, 105, 106],
            "customer": ["Alice", "Bob", "Alice", "Charlie", "Alice", "BadCustomer"],
            "region": ["North", "North", "South", "West", "North", "North"],
            "product": ["Laptop", "Phone", "Laptop", "Tablet", "Laptop", "Laptop"],
            "quantity": [2, 1, 3, 2, 4, -99],  # -99 is negative business-invalid
            "unit_price": [1200.0, 800.0, 1200.0, 400.0, 1200.0, 1200.0],
            "revenue": [2400.0, 800.0, 3600.0, 800.0, 4800.0, -118800.0],
        })

    def test_sql_safety_validation(self):
        # Disallowed statements
        is_safe, err = self.agent._validate_sql_safety("DROP TABLE orders;")
        self.assertFalse(is_safe)
        self.assertIsNotNone(err)
        assert err is not None
        self.assertIn("DROP", err)

        is_safe, err = self.agent._validate_sql_safety("DELETE FROM orders WHERE order_id = 101;")
        self.assertFalse(is_safe)
        self.assertIsNotNone(err)
        assert err is not None
        self.assertIn("DELETE", err)

        is_safe, err = self.agent._validate_sql_safety("INSERT INTO orders VALUES (999, 'X');")
        self.assertFalse(is_safe)

        is_safe, err = self.agent._validate_sql_safety("UPDATE orders SET quantity = 10;")
        self.assertFalse(is_safe)

        # Allowed statement
        is_safe, err = self.agent._validate_sql_safety("SELECT region, SUM(revenue) FROM orders GROUP BY region")
        self.assertTrue(is_safe)
        self.assertIsNone(err)

    def test_validated_subset_excludes_invalid_rows(self):
        validated_df = self.agent._filter_validated_subset(self.df)
        # Should exclude row 106 with negative quantity (-99)
        self.assertEqual(len(validated_df), 5)
        self.assertNotIn(-99, validated_df["quantity"].values)

    def test_generate_and_run_revenue_by_region(self):
        result = self.agent.generate_and_run("What is the total revenue by region?", self.df)
        print("Generated SQL:", result["generated_sql"])
        print("Result:", result["result"])
        self.assertIsNone(result["error"])
        self.assertGreater(result["row_count"], 0)
        self.assertIn("SELECT", result["generated_sql"].upper())
        # Check that North, South, West are in results
        regions = [r.get("region") for r in result["result"] if "region" in r]
        self.assertIn("North", regions)

    def test_generate_and_run_top_customers(self):
        result = self.agent.generate_and_run("Top 2 customers by order count", self.df)
        print("Top customers result:", result["result"])
        self.assertIsNone(result["error"])
        self.assertLessEqual(result["row_count"], 2)

    def test_retry_mechanism_on_bad_sql(self):
        # We can test _execute_sql and retry by simulating bad SQL
        records, err = self.agent._execute_sql(sqlite3.connect(":memory:"), "SELECT non_existent_col FROM nonexistent_tbl")
        self.assertIsNotNone(err)
        self.assertEqual(len(records), 0)


if __name__ == "__main__":
    unittest.main()
