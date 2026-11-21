"""Recommend charts based on dataset types and EDA results, including trends and category comparisons."""
from agents.validation import eligible_subset, temporal_inputs, validated_subset

class VisualizationAgent:
    def _get_validated_df(self, df, quality_report=None):
        """Return a safe copy of the DataFrame."""
        return validated_subset(df)

    def suggest_charts(self, df, eda_result=None, quality_report=None):
        """Suggest up to three charts based on the data types and EDA results."""
        eda = eda_result or {}
        charts, populations = [], {}

        # -------------------------------------------------------------
        # 1. Line Chart (Monthly Trend)
        # Suggest a time-series line chart when the dataset has dates.
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

        # Identify categorical columns and skip identifiers.
        schema = df.attrs.get('schema', [])
        categories = (
            [c['name'] for c in schema if c['role'] == 'text']
            if schema
            else [c for c in eda.get('categorical_summary', {}) if c.lower() != 'id' and not c.lower().endswith('_id')]
        )
        _, metrics = temporal_inputs(df)

        # -------------------------------------------------------------
        # 2. Bar Chart (Category vs Revenue/Metric)
        # Compare the eight most frequent categories in a bar chart.
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
        # Show category distribution or percentage share.
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

        # Return up to three chart suggestions.
        return {'charts': charts[:3], 'populations': populations}
