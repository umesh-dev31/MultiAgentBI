import os
import sys
import tempfile
import unittest
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.data_agent import DataAgent


class TestDataAgent(unittest.TestCase):
    def setUp(self):
        self.agent = DataAgent()
        self.temp_dir = tempfile.mkdtemp()

    def tearDown(self):
        for f in os.listdir(self.temp_dir):
            os.remove(os.path.join(self.temp_dir, f))
        os.rmdir(self.temp_dir)

    def test_process_csv_with_missing_and_duplicates(self):
        # 5 rows, with 1 duplicate (Alice) and missing values (Bob salary is missing, Charlie dept is missing)
        csv_path = os.path.join(self.temp_dir, "employees.csv")
        csv_content = """id,name,department,salary
1,Alice,Engineering,80000
1,Alice,Engineering,80000
2,Bob,Marketing,
3,Charlie,,90000
4,Diana,Engineering,100000
"""
        with open(csv_path, "w", encoding="utf-8") as f:
            f.write(csv_content)

        result = self.agent.process(csv_path)

        # Verify summary
        self.assertEqual(result["summary"]["original_rows"], 5)
        self.assertEqual(result["summary"]["duplicate_rows_dropped"], 1)
        self.assertEqual(result["summary"]["cleaned_rows"], 4)
        self.assertEqual(result["summary"]["columns_count"], 4)
        self.assertEqual(result["shape"], [4, 4])

        # Verify column metadata
        cols = {c["name"]: c for c in result["columns"]}
        self.assertIn("department", cols)
        self.assertIn("salary", cols)
        self.assertEqual(cols["department"]["missing_pct"], 25.0)
        self.assertEqual(cols["salary"]["missing_pct"], 25.0)

        # Verify cleaned preview values
        preview = result["cleaned_preview"]
        self.assertEqual(len(preview), 4)

        # Bob's salary should be imputed with median of [80000, 90000, 100000] = 90000
        bob_row = next(r for r in preview if r["name"] == "Bob")
        self.assertEqual(bob_row["salary"], 90000.0)

        # Charlie's department should be imputed with mode ("Engineering" occurs twice, Marketing once)
        charlie_row = next(r for r in preview if r["name"] == "Charlie")
        self.assertEqual(charlie_row["department"], "Engineering")

    def test_imputation_high_cardinality_vs_repeating_category(self):
        # customer_name has high cardinality / unique names -> fill with "Unknown"
        # region and product are clear repeating categories -> fill with mode
        csv_path = os.path.join(self.temp_dir, "orders.csv")
        csv_content = """order_id,customer_name,region,product,amount
1001,Acme Corp,North,Widget A,150
1002,Wayne Enterprises,South,Widget B,200
1003,Stark Industries,North,,250
1004,,North,Widget A,300
1005,Oscorp,South,Widget A,
"""
        with open(csv_path, "w", encoding="utf-8") as f:
            f.write(csv_content)

        result = self.agent.process(csv_path)
        preview = result["cleaned_preview"]

        # Row 1004 had missing customer_name -> should be filled with "Unknown", NOT mode!
        row_1004 = next(r for r in preview if r["order_id"] == 1004)
        self.assertEqual(row_1004["customer_name"], "Unknown")

        # Row 1003 had missing product -> repeating category, mode is "Widget A"
        row_1003 = next(r for r in preview if r["order_id"] == 1003)
        self.assertEqual(row_1003["product"], "Widget A")

        # Row 1005 had missing amount -> numeric median [150, 200, 250, 300] = 225.0
        row_1005 = next(r for r in preview if r["order_id"] == 1005)
        self.assertEqual(row_1005["amount"], 225.0)

        # Check imputation strategies recorded
        cols = {c["name"]: c for c in result["columns"]}
        self.assertEqual(cols["customer_name"]["imputation_strategy"], "constant ('Unknown')")
        self.assertEqual(cols["product"]["imputation_strategy"], "mode")
        self.assertEqual(cols["amount"]["imputation_strategy"], "median")

    def test_numeric_median_integer_rounding_vs_continuous(self):
        # quantity: [2, 3, 4, 7, None] -> median is 3.5 -> should be rounded to 4
        # unit_price: [10.5, 15.25, 20.0, 30.75, None] -> median is 17.625 -> stays decimal
        csv_path = os.path.join(self.temp_dir, "inventory.csv")
        csv_content = """item_id,quantity,unit_price
1,2,10.50
2,3,15.25
3,4,20.00
4,7,30.75
5,,
"""
        with open(csv_path, "w", encoding="utf-8") as f:
            f.write(csv_content)

        result = self.agent.process(csv_path)
        preview = result["cleaned_preview"]
        item_5 = next(r for r in preview if r["item_id"] == 5)

        # quantity median was 3.5 -> rounded to nearest whole number 4
        self.assertEqual(item_5["quantity"], 4)
        self.assertIsInstance(item_5["quantity"], int)

        # unit_price median was 17.625 -> kept continuous decimal
        self.assertEqual(item_5["unit_price"], 17.625)
        self.assertIsInstance(item_5["unit_price"], float)

        # Check inferred column dtypes
        cols = {c["name"]: c for c in result["columns"]}
        self.assertEqual(cols["quantity"]["dtype"], "int64")
        self.assertEqual(cols["unit_price"]["dtype"], "float64")

    def test_process_excel_file(self):
        xlsx_path = os.path.join(self.temp_dir, "sales.xlsx")
        df = pd.DataFrame({
            "region": ["North", "South", "North", "North"],
            "sales": [100.0, None, 300.0, 100.0]
        })
        df.to_excel(xlsx_path, index=False)

        result = self.agent.process(xlsx_path)
        # Row 0 and Row 3: ("North", 100.0) are duplicate rows
        self.assertEqual(result["summary"]["original_rows"], 4)
        self.assertEqual(result["summary"]["duplicate_rows_dropped"], 1)
        self.assertEqual(result["summary"]["cleaned_rows"], 3)
        self.assertEqual(result["shape"], [3, 2])

    def test_unsupported_file_extension(self):
        invalid_path = os.path.join(self.temp_dir, "data.txt")
        with open(invalid_path, "w") as f:
            f.write("test")
        with self.assertRaises(ValueError):
            self.agent.process(invalid_path)

    def test_messy_data_quality_report(self):
        csv_path = os.path.join(self.temp_dir, "messy_orders.csv")
        csv_content = '''order_id,order_date,customer_name,city,region,payment_method,quantity,unit_price
1001,2026-01-07,  Alice Smith  ,  new york  ,  north  ,credit card,2,"$60,000"
1002,07/01/2026,Bob Jones,san francisco,NORTH,CREDIT CARD,3,"15,000"
1003,Jan 7 2026,Charlie Brown,los angeles,south,cash,six,"$ 1,250.50"
1004,2026-02-30,David Miller,chicago,South,Cash,-5,25.00
1005,2026-13-01,  ,houston,west,paypal,15O00,Infinity
1006,2026-01-10,Frank Wright,phoenix,West,PayPal,100,-10.00
1007,2026-01-11,Grace Hopper,philadelphia,NaN,none,4,50.00
1007,2026-01-11,Grace Hopper,philadelphia,NaN,none,4,50.00
'''
        with open(csv_path, "w", encoding="utf-8") as f:
            f.write(csv_content)

        result = self.agent.process(csv_path)

        # Quality report structure exists
        self.assertIn("data_quality_report", result)
        report = result["data_quality_report"]
        auto_fixed = report["auto_fixed"]
        flagged = report["flagged_for_review"]

        # Safe auto-fixes verified
        self.assertGreater(auto_fixed["whitespace_trimmed"], 0)
        self.assertGreater(auto_fixed["casing_normalized"], 0)
        self.assertGreater(auto_fixed["currency_or_thousands_parsed"], 0)
        self.assertGreater(auto_fixed["null_literals_converted"], 0)
        self.assertEqual(auto_fixed["duplicate_rows_dropped"], 1)
        self.assertGreater(auto_fixed["missing_values_imputed"], 0)

        # Flagged issues verification
        flagged_reasons = [f["reason"] for f in flagged]
        flagged_cols = [f["column"] for f in flagged]

        # Check impossible dates flagged
        self.assertTrue(any("impossible calendar date" in r.lower() or "unparseable" in r.lower() for r in flagged_reasons))

        # Check non-numeric text 'six' and '15O00' flagged in quantity
        self.assertTrue(any("six" in str(f["original_value"]) for f in flagged))
        self.assertTrue(any("15O00" in str(f["original_value"]) for f in flagged))

        # Check negative value (-5, -10.00) flagged in quantity / unit_price
        self.assertTrue(any("negative value" in r.lower() for r in flagged_reasons))

        # Check outlier (100) flagged in quantity
        self.assertTrue(any("outlier" in r.lower() for r in flagged_reasons))

        # Check that flagged unparseable cells remain None in cleaned_preview (NOT imputed)
        preview = result["cleaned_preview"]
        # Row 1003 had quantity 'six' -> should be None
        row_1003 = next(r for r in preview if r["order_id"] == 1003)
        self.assertIsNone(row_1003["quantity"])

        # Row 1005 had customer_name empty -> imputed as 'Unknown'
        row_1005 = next(r for r in preview if r["order_id"] == 1005)
        self.assertEqual(row_1005["customer_name"], "Unknown")

        # Casing check: customer_name and city preserved, region and payment_method normalized
        row_1001 = next(r for r in preview if r["order_id"] == 1001)
        self.assertEqual(row_1001["customer_name"], "Alice Smith")
        self.assertEqual(row_1001["city"], "new york")  # city casing preserved!
        self.assertEqual(row_1001["region"], "North")   # region normalized to Title Case!
        self.assertEqual(row_1001["payment_method"], "Credit Card")  # payment_method normalized!

    def test_day_first_date_parsing(self):
        csv_path = os.path.join(self.temp_dir, "dates.csv")
        csv_content = """order_id,order_date
1,05/01/2026
2,15/01/2026
3,11-01-2026
4,2026-01-07
5,Jan 7 2026
6,2026-02-30
"""
        with open(csv_path, "w", encoding="utf-8") as f:
            f.write(csv_content)

        result = self.agent.process(csv_path)
        preview = {r["order_id"]: r["order_date"] for r in result["cleaned_preview"]}

        # 05/01/2026 must be January 5, 2026 (not May 1)
        self.assertEqual(preview[1], "2026-01-05")

        # 15/01/2026 must be January 15, 2026
        self.assertEqual(preview[2], "2026-01-15")

        # 11-01-2026 must be January 11, 2026 (not November 1)
        self.assertEqual(preview[3], "2026-01-11")

        # ISO 2026-01-07 preserved as January 7, 2026
        self.assertEqual(preview[4], "2026-01-07")

        # Named month Jan 7 2026 resolved to January 7, 2026
        self.assertEqual(preview[5], "2026-01-07")

        # Impossible calendar date 2026-02-30 must be None and flagged
        self.assertIsNone(preview[6])
        flagged = result["data_quality_report"]["flagged_for_review"]
        self.assertTrue(any(f["column"] == "order_date" and "2026-02-30" in str(f["original_value"]) for f in flagged))

    def test_data_health_score_calculation(self):
        # 1. Clean dataset: 0 flagged, 2 auto-fixes -> 100 - (0 + 1) = 99 (Excellent)
        clean_health = self.agent._calculate_data_health_score(
            auto_fixed_counts={"whitespace_trimmed": 2},
            flagged_for_review=[],
        )
        self.assertEqual(clean_health["score"], 99)
        self.assertEqual(clean_health["label"], "Excellent")
        self.assertEqual(clean_health["color"], "green")

        # 2. Messy dataset: 61 auto fixes (capped at 20), 17 flagged rows (17 points) -> 100 - 37 = 63 (Good)
        messy_flagged = [{"row_index": i, "column": "col", "reason": "err"} for i in range(17)]
        messy_health = self.agent._calculate_data_health_score(
            auto_fixed_counts={"whitespace_trimmed": 50, "null_literals_converted": 11},
            flagged_for_review=messy_flagged,
        )
        self.assertEqual(messy_health["score"], 63)
        self.assertEqual(messy_health["label"], "Good")
        self.assertEqual(messy_health["color"], "amber")
        self.assertEqual(messy_health["penalties"]["auto_fixed_penalty"], 20.0)
        self.assertEqual(messy_health["penalties"]["flagged_penalty"], 17.0)

        # 3. Very degraded dataset: 50 flagged rows (capped at 40), 60 auto-fixes (capped at 20) -> 100 - 60 = 40 (Needs Review)
        degraded_flagged = [{"row_index": i, "column": "col", "reason": "err"} for i in range(50)]
        degraded_health = self.agent._calculate_data_health_score(
            auto_fixed_counts={"whitespace_trimmed": 60},
            flagged_for_review=degraded_flagged,
        )
        self.assertEqual(degraded_health["score"], 40)
        self.assertEqual(degraded_health["label"], "Needs Review")
        self.assertEqual(degraded_health["color"], "red")


if __name__ == "__main__":
    unittest.main()
