"""
Visualization Agent
-------------------
Ye agent dataset aur EDA results ke hisaab se sabse useful charts recommend karta hai:
1. Line Chart: Monthly revenue / order trends dikhane ke liye.
2. Bar Chart: Category vs Metric (e.g. Sales by Product Category, top 8).
3. Pie Chart: Categorical proportions (e.g. Payment Method breakdown).
"""
from agents.validation import eligible_subset, temporal_inputs, validated_subset

class VisualizationAgent:
    def _get_validated_df(self, df, quality_report=None):
        """Safe DataFrame copy return karta hai."""
        return validated_subset(df)

    def suggest_charts(self, df, eda_result=None, quality_report=None):
        """
        Dataset ke data types aur EDA results ko dekh kar top 3 best charts suggest karta hai.
        """
        eda = eda_result or {}
        charts, populations = [], {}

        # -------------------------------------------------------------
        # 1. Line Chart (Monthly Trend)
        # Agar dataset me dates hain, to time-series line chart sabse best hota hai
        # -------------------------------------------------------------
        if eda.get('monthly_trend'):
            charts.append({
                'chart_type': 'line',
                'title': 'Monthly observed metric',
                'x_field': 'month',
                'y_field': 'total_revenue',
                'secondary_y_field': 'total_orders',
                'data': eda['monthly_trend']
            })
            populations['temporal'] = eda.get('populations', {}).get('temporal', {})

        # Categorical columns pehchano (IDs ko skip karte hain)
        schema = df.attrs.get('schema', [])
        categories = (
            [c['name'] for c in schema if c['role'] == 'text']
            if schema
            else [c for c in eda.get('categorical_summary', {}) if c.lower() != 'id' and not c.lower().endswith('_id')]
        )
        _, metrics = temporal_inputs(df)

        # -------------------------------------------------------------
        # 2. Bar Chart (Category vs Revenue/Metric)
        # Top 8 categories ka comparison bar chart me dikhate hain
        # -------------------------------------------------------------
        if categories and metrics:
            values, populations['category_metric'] = eligible_subset(df, metrics)
            category = categories[0]
            values['_metric'] = (
                values[metrics[0]] * values[metrics[1]]
                if len(metrics) == 2
                else values[metrics[0]]
            )
            sums = values.groupby(category)['_metric'].sum().sort_values(ascending=False).head(8)
            charts.append({
                'chart_type': 'bar',
                'title': 'Observed metric by ' + category,
                'x_field': category,
                'y_field': 'revenue',
                'data': [{category: str(k), 'revenue': float(v)} for k, v in sums.items()]
            })

        # -------------------------------------------------------------
        # 3. Pie/Doughnut Chart (Categorical Distribution)
        # Category ki distribution / percentage share dikhane ke liye
        # -------------------------------------------------------------
        if categories:
            category = categories[0]
            data = eda.get('categorical_summary', {}).get(category, [])
            if data:
                charts.append({
                    'chart_type': 'pie',
                    'title': category + ' distribution',
                    'x_field': 'value',
                    'y_field': 'count',
                    'data': data
                })

        # UI ko max 3 best charts return karo
        return {'charts': charts[:3], 'populations': populations}
