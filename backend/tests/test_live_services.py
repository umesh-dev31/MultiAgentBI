"""Opt-in checks use configured services; never run as offline unit tests."""
import os
import pytest

@pytest.mark.integration
def test_live_language_provider():
    if not (os.getenv('GROQ_API_KEY') or os.getenv('ANTHROPIC_API_KEY')):
        pytest.skip('Configure a language provider')
    from agents.sql_agent import SQLAgent
    assert SQLAgent()._call_llm('Return SELECT 1','Return SQL only')

@pytest.mark.integration
def test_external_database_connection():
    if not os.getenv('ANALYTICS_DATABASE_URL','').startswith(('postgresql','mysql')):
        pytest.skip('Configure a PostgreSQL or MySQL source')
    from db.source import source_tables
    assert isinstance(source_tables(),list)
