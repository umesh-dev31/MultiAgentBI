"""Supervised tabular model selection and held-out evaluation."""
import math
import re

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier, DummyRegressor
from sklearn.ensemble import ExtraTreesClassifier, ExtraTreesRegressor, RandomForestClassifier, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.metrics import accuracy_score, balanced_accuracy_score, confusion_matrix, mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from threadpoolctl import threadpool_limits

MIN_ROWS = 30
WORKSPACE_MAX_ROWS = 20_000
WORKSPACE_MAX_FEATURES = 30
WORKSPACE_MAX_ENCODED = 1_000
MAX_CATEGORIES_PER_FEATURE = 64
MAX_CLASSES = 30
MAX_NUMERIC_MAGNITUDE = 1e30
RANDOM_STATE = 42

TREE_OPTIONS = [
    {'id': 'random_forest', 'label': 'Random forest', 'description': 'Captures nonlinear patterns and interactions.'},
    {'id': 'extra_trees', 'label': 'Extra trees', 'description': 'Uses randomized trees for a nonlinear comparison.'},
]
OPTIONS = {
    'regression': [
        {'id': 'ridge', 'label': 'Ridge regression', 'description': 'A regularized model for predicting numeric values.'},
        *TREE_OPTIONS,
    ],
    'classification': [
        {'id': 'logistic', 'label': 'Logistic regression', 'description': 'A regularized model for predicting outcome categories.'},
        *TREE_OPTIONS,
    ],
}


def _numeric(series):
    return pd.to_numeric(series, errors='coerce').astype('float64').replace([np.inf, -np.inf], np.nan)


def _categorical(series):
    strings = series.astype('string')
    strings = strings.mask(strings.str.strip().eq(''))
    return strings.to_numpy(dtype=object, na_value=np.nan)


def _numeric_input(series):
    return pd.api.types.is_numeric_dtype(series) and not pd.api.types.is_bool_dtype(series)


def prepare_model_data(frame, target, features, task):
    """Select only model columns and normalize values without fitting any transforms."""
    source = frame.loc[:, [*features, target]]
    prepared = pd.DataFrame(index=source.index)
    for feature in features:
        values = source[feature]
        prepared[feature] = _numeric(values) if _numeric_input(values) else _categorical(values)
    prepared[target] = _numeric(source[target]) if task == 'regression' else _categorical(source[target])
    return prepared.dropna(subset=[target]).reset_index(drop=True)


def _infer_task(outcomes):
    if not _numeric_input(outcomes):
        return 'classification'
    numeric = _numeric(outcomes).dropna()
    if 1 < numeric.nunique() <= 10 and numeric.mod(1).eq(0).all():
        return 'classification'
    return 'regression'


def inspect_model(frame, target, features, task='auto'):
    result = {
        'eligible': False, 'workspace_eligible': False, 'reasons': [], 'workspace_reasons': [],
        'warnings': [], 'task': task, 'rows': 0, 'algorithms': [],
        'recommended_algorithm': None, 'recommendation_reason': '',
    }
    reasons = result['reasons']
    if task not in {'auto', 'classification', 'regression'}:
        reasons.append('Choose automatic detection, numeric prediction, or category prediction.')
    if target not in frame.columns:
        reasons.append('Select an outcome column from this dataset.')
    if not features:
        reasons.append('Select at least one input column.')
    if target in features:
        reasons.append('The outcome column cannot also be an input.')
    if len(set(features)) != len(features) or any(feature not in frame.columns for feature in features):
        reasons.append('Each input must be a distinct column from this dataset.')
    if reasons:
        return result

    if task == 'auto':
        task = _infer_task(frame[target])
    result['task'] = task
    prepared = prepare_model_data(frame, target, features, task)
    row_count = len(prepared)
    result['rows'] = row_count
    if row_count < MIN_ROWS:
        reasons.append(f'At least {MIN_ROWS} rows with usable outcomes are required.')
    outcome = prepared[target]
    counts = outcome.value_counts()
    if len(counts) < 2:
        reasons.append('The outcome needs at least two distinct values.')
    if task == 'regression' and frame[target].notna().sum() > row_count:
        reasons.append('Numeric prediction requires numeric outcomes. Choose category prediction or clean the values.')
    if task == 'regression' and outcome.abs().gt(MAX_NUMERIC_MAGNITUDE).any():
        reasons.append('Rescale the outcome before training. Its values are too large for this model builder.')
    if task == 'classification':
        if len(counts) > MAX_CLASSES:
            reasons.append(f'Category prediction supports up to {MAX_CLASSES} outcome classes.')
        if len(counts) and counts.min() < 5:
            reasons.append('Each outcome class needs at least 5 usable rows.')
    if len(frame) > row_count:
        result['warnings'].append(f'{len(frame) - row_count} rows with unusable outcomes were excluded.')

    encoded_features = 0
    numeric_count = 0
    usable_features = 0
    for feature in features:
        series = prepared[feature]
        distinct = series.nunique()
        if distinct <= 1:
            result['warnings'].append(f'{feature} has no variation and may contribute little.')
        else:
            usable_features += 1
        if len(series) and series.astype('string').equals(outcome.astype('string')):
            result['warnings'].append(f'{feature} repeats the selected outcome. Remove it to avoid leaking the answer.')
        if _numeric_input(series):
            if series.abs().gt(MAX_NUMERIC_MAGNITUDE).any():
                reasons.append(f'Rescale {feature} before training. Its numeric values are too large.')
            encoded_features += 1
            numeric_count += 1
        else:
            encoded_features += min(distinct + int(series.isna().any()), MAX_CATEGORIES_PER_FEATURE)
            if distinct > MAX_CATEGORIES_PER_FEATURE:
                result['warnings'].append(f'{feature} has many categories. Rare categories are grouped during training.')
        id_like = re.search(r'(?:^|[\s_-])(?:id|uuid|guid|identifier)(?:$|[\s_-])', feature, re.I)
        if id_like or (not _numeric_input(series) and row_count and distinct >= 0.9 * row_count):
            result['warnings'].append(f'{feature} looks like an identifier. Consider excluding it.')
    if not usable_features:
        reasons.append('At least one input column must vary across the usable rows.')
    result['warnings'].append('Use only fields available when making a prediction. This evaluation assumes independent rows.')
    workspace_reasons = result['workspace_reasons']
    if row_count > WORKSPACE_MAX_ROWS:
        workspace_reasons.append(f'Workspace training supports up to {WORKSPACE_MAX_ROWS:,} usable rows.')
    if len(features) > WORKSPACE_MAX_FEATURES:
        workspace_reasons.append(f'Workspace training supports up to {WORKSPACE_MAX_FEATURES} input columns.')
    if encoded_features > WORKSPACE_MAX_ENCODED:
        workspace_reasons.append(f'Workspace training supports up to {WORKSPACE_MAX_ENCODED:,} estimated encoded inputs.')
    result['eligible'] = not reasons
    result['workspace_eligible'] = not reasons and not workspace_reasons
    result['algorithms'] = OPTIONS[task]
    linear = 'ridge' if task == 'regression' else 'logistic'
    if row_count >= 1000 and numeric_count >= 2 and numeric_count >= len(features) / 2:
        result['recommended_algorithm'] = 'random_forest'
        result['recommendation_reason'] = 'This dataset has enough rows and numeric inputs to try a model that captures interactions.'
    else:
        result['recommended_algorithm'] = linear
        result['recommendation_reason'] = 'A regularized linear model is a useful starting point for smaller or category-heavy datasets.'
    return result


def _pipeline(frame, task, algorithm):
    numeric = [column for column in frame if _numeric_input(frame[column])]
    categorical = [column for column in frame if column not in numeric]
    numeric_steps = [('impute', SimpleImputer(strategy='median', keep_empty_features=True))]
    if algorithm in {'ridge', 'logistic'}:
        numeric_steps.append(('scale', StandardScaler()))
    categorical_steps = [
        ('encode', OneHotEncoder(handle_unknown='infrequent_if_exist', max_categories=MAX_CATEGORIES_PER_FEATURE)),
    ]
    preprocessing = ColumnTransformer([
        ('numeric', Pipeline(numeric_steps), numeric),
        ('categorical', Pipeline(categorical_steps), categorical),
    ])
    if algorithm == 'ridge':
        estimator = Ridge(solver='lsqr')
    elif algorithm == 'logistic':
        estimator = LogisticRegression(max_iter=500, class_weight='balanced')
    else:
        tree_class = {
            ('regression', 'random_forest'): RandomForestRegressor,
            ('classification', 'random_forest'): RandomForestClassifier,
            ('regression', 'extra_trees'): ExtraTreesRegressor,
            ('classification', 'extra_trees'): ExtraTreesClassifier,
        }[task, algorithm]
        options = {'class_weight': 'balanced'} if task == 'classification' else {}
        estimator = tree_class(n_estimators=64, max_depth=12, min_samples_leaf=2, random_state=RANDOM_STATE, n_jobs=1, **options)
    return Pipeline([('preprocessing', preprocessing), ('model', estimator)])


def _metrics(task, actual, predicted):
    if task == 'classification':
        return {
            'accuracy': float(accuracy_score(actual, predicted)),
            'balanced_accuracy': float(balanced_accuracy_score(actual, predicted)),
        }
    return {
        'mae': float(mean_absolute_error(actual, predicted)),
        'rmse': float(math.sqrt(mean_squared_error(actual, predicted))),
        'r2': float(r2_score(actual, predicted)),
    }


def fit_model(frame, target, features, task='auto', algorithm=None, *, workspace=True):
    """Train the chosen pipeline and baseline and score on the same holdout."""
    inspection = inspect_model(frame, target, features, task)
    if not inspection['eligible']:
        raise ValueError(' '.join(inspection['reasons']))
    if workspace and not inspection['workspace_eligible']:
        raise ValueError(' '.join(inspection['workspace_reasons']))
    task = inspection['task']
    algorithm = algorithm or inspection['recommended_algorithm']
    if algorithm not in {choice['id'] for choice in inspection['algorithms']}:
        raise ValueError('Choose an algorithm available for this prediction task.')

    prepared = prepare_model_data(frame, target, features, task)
    inputs, outcomes = prepared[features], prepared[target]
    class_count = outcomes.nunique() if task == 'classification' else 0
    train_x, test_x, train_y, test_y = train_test_split(
        inputs, outcomes, test_size=max(math.ceil(len(inputs) * .25), class_count),
        random_state=RANDOM_STATE, stratify=outcomes if class_count else None,
    )
    pipeline = _pipeline(inputs, task, algorithm)
    baseline = DummyClassifier(strategy='most_frequent') if class_count else DummyRegressor(strategy='median')
    with threadpool_limits(limits=1):
        pipeline.fit(train_x, train_y)
        baseline.fit(train_x, train_y)
        predictions = pipeline.predict(test_x)
        comparison = baseline.predict(test_x)
        importance_indices = np.random.default_rng(RANDOM_STATE).choice(len(test_x), size=min(300, len(test_x)), replace=False)
        importances = permutation_importance(
            pipeline, test_x.iloc[importance_indices], test_y.iloc[importance_indices],
            scoring='accuracy' if class_count else 'neg_mean_absolute_error', n_repeats=2,
            random_state=RANDOM_STATE, n_jobs=1,
        ).importances_mean

    report = {
        'task': task, 'algorithm': algorithm,
        'metrics': _metrics(task, test_y, predictions),
        'baseline': _metrics(task, test_y, comparison),
        'train_rows': len(train_x), 'test_rows': len(test_x),
        'feature_importance': [
            {'feature': feature, 'importance': float(importance)}
            for feature, importance in sorted(zip(features, importances), key=lambda item: item[1], reverse=True)
        ],
    }
    if class_count:
        classes = sorted(outcomes.unique())
        report['classes'] = classes
        report['confusion_matrix'] = confusion_matrix(test_y, predictions, labels=classes).tolist()
    else:
        report['predictions'] = [
            {'actual': float(test_y.iloc[index]), 'predicted': float(predictions[index])}
            for index in importance_indices
        ]
    numeric_results = [
        *report['metrics'].values(), *report['baseline'].values(), *importances, *(predictions if not class_count else ()),
    ]
    if not all(math.isfinite(value) for value in numeric_results):
        raise ValueError('Training did not yield finite results. Rescale numeric columns or try another algorithm.')
    return report, pipeline


def train_model(frame, target, features, task='auto', algorithm=None, *, workspace=True):
    return fit_model(frame, target, features, task, algorithm, workspace=workspace)[0]
