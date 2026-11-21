import json

import numpy as np
import pandas as pd
import pytest
from sklearn.model_selection import train_test_split

from model_builder import RANDOM_STATE, WORKSPACE_MAX_ROWS, fit_model, inspect_model, train_model


def test_regression_uses_training_only_preprocessing_and_scores_holdout():
    rows = 60
    data = pd.DataFrame({
        'quantity': np.arange(rows, dtype=float),
        'region': ['north', 'south'] * (rows // 2),
        'revenue': np.arange(rows, dtype=float) * 3 + 10,
    })
    _, held_out = train_test_split(np.arange(rows), test_size=15, random_state=RANDOM_STATE)
    data.loc[held_out[0], 'region'] = 'test-only category'
    report, model = fit_model(data, 'revenue', ['quantity', 'region'])
    encoder = model.named_steps['preprocessing'].named_transformers_['categorical'].named_steps['encode']
    assert 'test-only category' not in encoder.categories_[0]
    assert report['algorithm'] == 'ridge'
    assert report['test_rows'] == 15
    assert report['metrics']['mae'] < report['baseline']['mae']
    json.dumps(report, allow_nan=False)


def test_classification_algorithm_override_and_eligibility():
    data = pd.DataFrame({'visits': np.arange(100), 'converted': ['yes', 'no'] * 50})
    assessment = inspect_model(data, 'converted', ['visits'])
    assert assessment['task'] == 'classification'
    assert assessment['recommended_algorithm'] == 'logistic'
    assert 'logistic' in {option['id'] for option in assessment['algorithms']}
    report = train_model(data, 'converted', ['visits'], algorithm='extra_trees')
    assert report['algorithm'] == 'extra_trees'
    assert sum(map(sum, report['confusion_matrix'])) == report['test_rows']
    with pytest.raises(ValueError, match='available for this prediction task'):
        train_model(data, 'converted', ['visits'], algorithm='ridge')
    data['converted'] = ['yes'] * 98 + ['no'] * 2
    assert not inspect_model(data, 'converted', ['visits'])['eligible']


def test_workspace_row_limit_keeps_colab_available():
    rows = WORKSPACE_MAX_ROWS + 1
    data = pd.DataFrame({'x': np.arange(rows), 'outcome': np.arange(rows) / 3})
    assessment = inspect_model(data, 'outcome', ['x'])
    assert assessment['eligible']
    assert not assessment['workspace_eligible']
    with pytest.raises(ValueError, match='usable rows'):
        train_model(data, 'outcome', ['x'])
