import pandas as pd
from agents.eda_agent import EDAAgent

def test_signed_and_extreme_observations_retained():
    result = EDAAgent().analyze(pd.DataFrame({'revenue':[-10,11,12,13,14,15,1000]}))
    stats = result['numeric_summary']['revenue']
    assert stats['count']==7 and stats['max']==1000 and stats['min']==-10

def test_independent_numeric_populations():
    result = EDAAgent().analyze(pd.DataFrame({'a':[1,None,3],'b':[None,20,30]}))
    assert result['numeric_summary']['a']['mean']==2
    assert result['numeric_summary']['b']['mean']==25
    assert result['populations']['correlation']['included_rows']==1

def test_temporal_population_has_reasons_and_lineage():
    frame = pd.DataFrame({'order_date':['2026-01-01',None,'2026-02-01'],'revenue':[10,20,None]})
    frame.attrs['source_rows']=[2,4,7]
    result = EDAAgent().analyze(frame)
    population = result['populations']['temporal']
    assert population['included_rows']==1
    assert {r['row_index'] for r in population['reasons']}=={4,7}
    assert result['monthly_trend'][0]['total_revenue']==10

def test_numeric_identifiers_are_not_metrics():
    frame = pd.DataFrame({'id':['001','002'],'revenue':[10,20]})
    result = EDAAgent().analyze(frame)
    assert 'id' not in result['numeric_summary']

def test_empty_analysis():
    assert EDAAgent().analyze(pd.DataFrame())['numeric_summary']=={}

def test_large_eligibility_is_exact_but_diagnostics_are_bounded():
    import base64
    import numpy as np
    result=EDAAgent().analyze(pd.DataFrame({'revenue':[None]*150+[1]*150}))
    population=result['populations']['revenue']
    assert population['included_rows']==150 and population['excluded_rows']==150
    assert population['reasons_truncated'] and len(population['reasons'])==100
    bits=np.unpackbits(np.frombuffer(base64.b64decode(population['eligible_mask_base64']),dtype='uint8'),bitorder='little')[:300]
    assert bits.tolist()==[0]*150+[1]*150

def test_numeric_overflow_cannot_produce_invalid_json():
    import pytest
    with pytest.raises(ValueError):
        EDAAgent().analyze(pd.DataFrame({'revenue':[1e308,1e308]}))
