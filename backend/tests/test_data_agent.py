import pandas as pd
import pytest
from agents.data_agent import DataAgent
from agents.validation import eligible_subset

def ingest(tmp_path,csv,options=None):
    path = tmp_path/'source.csv'
    path.write_text(csv,encoding='utf-8')
    agent = DataAgent()
    result = agent.process(path,options)
    return agent.last_cleaned_df,result

def test_preserve_ids_signed_values_and_duplicates(tmp_path):
    frame,result = ingest(tmp_path,'order_id,postal_code,profit\nORD-001,00123,-10\nORD-001,00123,-10\nORD-002,00500,1000\n')
    assert frame.order_id.tolist()==['ORD-001','ORD-001','ORD-002']
    assert frame.postal_code.tolist()==['00123','00123','00500']
    assert frame.profit.tolist()==[-10,-10,1000]
    assert result['summary']['duplicate_rows_dropped']==0
    assert frame.attrs['source_rows']==[2,3,4]

def test_rupee_and_completely_failed_metric_keep_schema(tmp_path):
    frame,result = ingest(tmp_path,'id,price,amount\n001,₹100,bad\n002,₹200,worse\n003,₹300,invalid\n')
    assert frame.price.tolist()==[100,200,300]
    assert frame.amount.isna().all()
    assert next(c for c in result['columns'] if c['name']=='amount')['role']=='numeric'
    values,population = eligible_subset(frame,['amount'])
    assert values.empty and population['excluded_rows']==3

def test_ambiguous_and_impossible_dates(tmp_path):
    csv = 'id,order_date\n001,03/04/2026\n002,2026-02-30\n003,2026-04-03\n'
    frame,result = ingest(tmp_path,csv)
    assert pd.isna(frame.order_date[0]) and pd.isna(frame.order_date[1])
    assert len(result['data_quality_report']['flagged_for_review'])==2
    frame,_ = ingest(tmp_path,csv,{'date_order':'dayfirst'})
    assert frame.order_date[0].startswith('2026-04-03')
    frame,_ = ingest(tmp_path,csv,{'date_order':'monthfirst'})
    assert frame.order_date[0].startswith('2026-03-04')

def test_explicit_imputation_and_deduplication_audit(tmp_path):
    frame,result = ingest(tmp_path,'id,amount\n001,10\n001,10\n002,\n003,30\n',{'impute':True,'deduplicate':True})
    assert frame.attrs['source_rows']==[2,4,5]
    assert frame.amount.notna().all()
    changes = result['data_quality_report']['changes']
    assert any(c['row_index']==3 and 'Duplicate' in c['reason'] for c in changes)
    assert any(c['row_index']==4 and 'imputation' in c['reason'] for c in changes)

def test_failed_conversion_is_not_imputed(tmp_path):
    frame,_ = ingest(tmp_path,'price\n10\nbad\n30\n',{'impute':True})
    assert pd.isna(frame.price[1])

def test_missing_values_preserved(tmp_path):
    frame,result = ingest(tmp_path,'id,amount,category\n001,10,A\n002,,\n003,30,B\n')
    assert pd.isna(frame.amount[1]) and pd.isna(frame.category[1])
    assert result['summary']['total_missing_values_filled']==0

def test_explicit_constraints_and_column_role(tmp_path):
    frame,_ = ingest(tmp_path,'reading\n-5\n0\n10\n',{'column_roles':{'reading':'numeric'},'numeric_constraints':{'reading':{'minimum':0}}})
    values,population = eligible_subset(frame,['reading'])
    assert values.reading.tolist()==[0,10]
    assert population['reasons'][0]['row_index']==2

def test_excel_identifiers(tmp_path):
    path = tmp_path/'data.xlsx'
    pd.DataFrame({'order_id':['001','ORD-002'],'price':[10,20]}).to_excel(path,index=False)
    agent = DataAgent(); agent.process(path)
    assert agent.last_cleaned_df.order_id.tolist()==['001','ORD-002']

def test_limits_and_invalid_options(tmp_path):
    from config import Settings
    path = tmp_path/'data.csv'; path.write_text('id\n1\n2\n3\n')
    with pytest.raises(ValueError,match='limit'):
        DataAgent().process(path,settings=Settings(max_rows=2))
    with pytest.raises(ValueError,match='unknown'):
        DataAgent().process(path,{'column_roles':{'missing':'numeric'}})

def test_text_na_and_leading_zero_inference(tmp_path):
    frame,_ = ingest(tmp_path,'reference,note\n001,NA\n002,NULL\n')
    assert frame.reference.tolist()==['001','002']
    assert frame.note.tolist()==['NA','NULL']

def test_dedup_does_not_merge_different_parse_failures(tmp_path):
    frame,result = ingest(tmp_path,'price\nbad\nworse\n',{'deduplicate':True})
    assert len(frame)==2 and result['summary']['duplicate_rows_dropped']==0

def test_blank_rows_preserve_source_row_numbers(tmp_path):
    frame,_ = ingest(tmp_path,'id,price\n001,10\n\n002,20\n')
    assert frame.attrs['source_rows']==[2,3,4]
    assert frame.id[2]=='002'
