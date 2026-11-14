from agents.validation import eligible_subset,temporal_inputs,validated_subset

class VisualizationAgent:
    def _get_validated_df(self,df,quality_report=None):
        return validated_subset(df)

    def suggest_charts(self,df,eda_result=None,quality_report=None):
        eda = eda_result or {}
        charts,populations = [],{}
        if eda.get('monthly_trend'):
            charts.append({'chart_type':'line','title':'Monthly observed metric','x_field':'month','y_field':'total_revenue','secondary_y_field':'total_orders','data':eda['monthly_trend']})
            populations['temporal'] = eda.get('populations',{}).get('temporal',{})
        schema = df.attrs.get('schema',[])
        categories = [c['name'] for c in schema if c['role']=='text'] if schema else [c for c in eda.get('categorical_summary',{}) if c.lower()!='id' and not c.lower().endswith('_id')]
        _,metrics = temporal_inputs(df)
        if categories and metrics:
            values,populations['category_metric'] = eligible_subset(df,metrics)
            category = categories[0]
            values['_metric'] = values[metrics[0]]*values[metrics[1]] if len(metrics)==2 else values[metrics[0]]
            sums = values.groupby(category)['_metric'].sum().sort_values(ascending=False).head(8)
            charts.append({'chart_type':'bar','title':'Observed metric by '+category,'x_field':category,'y_field':'revenue','data':[{category:str(k),'revenue':float(v)} for k,v in sums.items()]})
        if categories:
            category = categories[0]
            data = eda.get('categorical_summary',{}).get(category,[])
            if data:
                charts.append({'chart_type':'pie','title':category+' distribution','x_field':'value','y_field':'count','data':data})
        return {'charts':charts[:3],'populations':populations}
