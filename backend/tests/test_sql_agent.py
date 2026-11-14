import sqlite3
import pandas as pd
import pytest
from agents.sql_agent import SQLAgent

@pytest.fixture
def frame():
    return pd.DataFrame({'id':['001','002','003'],'revenue':[10,20,1000],'status':['UPDATE','OK','OK']})

def test_filtered_count_and_unfiltered_count(frame):
    agent = SQLAgent()
    assert agent.generate_and_run('how many rows have revenue > 15',frame)['result']==[{'total_records':2}]
    assert agent.generate_and_run('how many rows',frame)['result']==[{'total_records':3}]

def test_shortcuts_do_not_ignore_order_or_extra_filters(frame):
    agent = SQLAgent()
    assert agent._match_deterministic_query('first 2 rows ordered by revenue descending',frame) is None
    assert agent._match_deterministic_query('how many rows where revenue > 15 and status is OK',frame) is None
    assert agent._match_deterministic_query('average revenue by status',frame) is None

@pytest.mark.parametrize('sql',["SELECT * FROM orders WHERE status='UPDATE'","SELECT 'DROP; -- literal' AS label FROM orders",'WITH x AS (SELECT revenue FROM orders) SELECT * FROM x'])
def test_sql_literal_and_cte_allowed(sql,frame):
    with sqlite3.connect(':memory:') as conn:
        frame.to_sql('orders',conn,index=False)
        records,error = SQLAgent()._execute_sql(conn,sql)
        assert error is None

@pytest.mark.parametrize('sql',['UPDATE orders SET revenue=0','DELETE FROM orders','DROP TABLE orders','SELECT * FROM orders; DELETE FROM orders',"SELECT load_extension('x')",'SELECT * FROM sqlite_master'])
def test_sql_modifications_and_system_access_blocked(sql,frame):
    with sqlite3.connect(':memory:') as conn:
        frame.to_sql('orders',conn,index=False)
        _,error = SQLAgent()._execute_sql(conn,sql)
        assert error
        assert conn.execute('SELECT SUM(revenue) FROM orders').fetchone()[0]==1030

def test_sql_row_and_byte_truncation(frame,monkeypatch):
    monkeypatch.setenv('SQL_MAX_ROWS','2')
    agent = SQLAgent()
    result = agent.generate_and_run('first 3 rows',frame)
    assert result['truncated'] and result['row_count']==2
    monkeypatch.setenv('SQL_MAX_BYTES','10')
    assert agent.generate_and_run('first 3 rows',frame)['truncated']

def test_sql_execution_deadline(frame,monkeypatch):
    monkeypatch.setenv('SQL_TIMEOUT_SECONDS','.001')
    with sqlite3.connect(':memory:') as conn:
        frame.to_sql('orders',conn,index=False)
        _,error = SQLAgent()._execute_sql(conn,'WITH RECURSIVE x(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM x WHERE n<100000000) SELECT SUM(n) FROM x')
        assert error

def test_provider_translation_and_retry_are_offline(frame,monkeypatch):
    agent = SQLAgent()
    responses = iter(['SELECT missing FROM orders','SELECT AVG(revenue) AS average FROM orders'])
    monkeypatch.setattr(agent,'_call_llm',lambda *a,**k:next(responses))
    result = agent.generate_and_run('average revenue',frame)
    assert result['error'] is None and result['result'][0]['average']==pytest.approx(1030/3)

def test_explicit_numeric_constraints_produce_null_not_row_deletion(monkeypatch):
    frame = pd.DataFrame({'revenue':[-10,20]})
    frame.attrs['numeric_constraints']={'revenue':{'minimum':0}}
    agent = SQLAgent()
    monkeypatch.setattr(agent,'_call_llm',lambda *a,**k:'SELECT SUM(revenue) AS total, COUNT(*) AS rows FROM orders')
    result = agent.generate_and_run('total and count',frame)
    assert result['result']==[{'total':20,'rows':2}]
    assert result['column_populations']['revenue']['excluded_rows']==1

def test_sql_large_scalar_allocation_is_limited(frame):
    with sqlite3.connect(':memory:') as conn:
        frame.to_sql('orders',conn,index=False)
        _,error=SQLAgent()._execute_sql(conn,'SELECT randomblob(100000000) FROM orders')
        assert error
