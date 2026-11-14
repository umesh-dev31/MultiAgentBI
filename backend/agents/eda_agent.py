import pandas as pd
from contracts import finite_result
from agents.validation import eligible_subset,numeric_columns,temporal_inputs

class EDAAgent:
    def analyze(self,df,quality_report=None):
        numeric = numeric_columns(df)
        stats,populations = {},{}
        for col in numeric:
            values,populations[col] = eligible_subset(df,[col])
            s = values[col]
            if not s.empty:
                stats[col] = {'count':len(s),'mean':float(s.mean()),'std':float(s.std()) if len(s)>1 else 0.,'median':float(s.median()),'min':float(s.min()),'max':float(s.max()),'q25':float(s.quantile(.25)),'q50':float(s.median()),'q75':float(s.quantile(.75))}
        categories = {}
        date,metrics = temporal_inputs(df)
        for col in df.columns:
            if col in numeric or col==date:
                continue
            s = df[col].dropna().astype(str)
            categories[col] = [{'value':v,'count':int(n),'percentage':round(n/len(s)*100,1),'total_distinct':int(s.nunique())} for v,n in s.value_counts().head(5).items()]
        corr = {'columns':[],'matrix':[]}
        if len(numeric)>1:
            values,populations['correlation'] = eligible_subset(df,numeric)
            if len(values)>1:
                matrix = values[numeric].corr().fillna(0)
                corr = {'columns':numeric,'matrix':matrix.values.tolist()}
        trends = []
        if date:
            values,populations['temporal'] = eligible_subset(df,metrics,date)
            if len(values):
                values['_month'] = pd.to_datetime(values[date],format='mixed',utc=True).dt.strftime('%Y-%m')
                values['_metric'] = values[metrics[0]]*values[metrics[1]] if len(metrics)==2 else values[metrics[0]] if metrics else 1.
                trends = [{'month':str(month),'total_orders':len(group),'total_revenue':float(group['_metric'].sum())} for month,group in values.groupby('_month')]
        patterns = [f'{len(df)} source observations retained; numeric and temporal populations are reported separately.']
        if trends:
            peak = max(trends,key=lambda t:t['total_revenue'])
            patterns.append(f"Peak observed monthly metric: {peak['month']} ({peak['total_revenue']:,.2f}).")
        return finite_result({'stats_computed_on':{'total_rows':len(df),'validated_rows_used':len(df),'excluded_rows':0},'numeric_summary':stats,'categorical_summary':categories,'correlation_matrix':corr,'monthly_trend':trends,'notable_patterns':patterns,'populations':populations})
