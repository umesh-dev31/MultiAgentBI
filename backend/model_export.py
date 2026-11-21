"""Generate a self-contained Colab notebook and its selected training data."""
from io import BytesIO
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from pandas.api.types import is_numeric_dtype

import model_builder


DATA_FILE = 'training-data.csv'
NOTEBOOK_FILE = 'model-builder.ipynb'
INTRO = """# Train your MultiAgentBI model

1. Extract the ZIP and open **model-builder.ipynb** in Google Colab.
2. Select **Runtime → Run all** and upload **training-data.csv** when prompted.
3. Review the held-out metrics and charts. The last cell saves the fitted pipeline to `trained-model.joblib`.

The CSV contains your selected columns and rows with a usable recorded outcome.
The notebook holds out test rows before fitting imputers, encoders, scalers, or the model.
Colab training uses its own runtime. Runtime memory and session limits still apply.
Review the CSV before uploading it outside your workspace.
"""
READ_DATA = """from io import BytesIO
from pathlib import Path
import pandas as pd

data_path = Path('training-data.csv')
if data_path.is_file():
    data_source = data_path
else:
    try:
        from google.colab import files
    except ImportError as exc:
        raise FileNotFoundError('Place training-data.csv next to the notebook.') from exc
    uploaded = files.upload()
    if data_path.name not in uploaded:
        raise FileNotFoundError('Upload the training-data.csv file from your export.')
    data_source = BytesIO(uploaded[data_path.name])

data = pd.read_csv(
    data_source, dtype=column_types, keep_default_na=False,
    na_values=[''], float_precision='round_trip',
)
if list(data.columns) != expected_columns:
    raise ValueError('CSV columns do not match this notebook. Use the CSV from the same export.')
print(f'{len(data):,} rows loaded')
"""
TRAIN = """report, fitted_model = fit_model(
    data, target, features, task, algorithm, workspace=False,
)
"""
SAVE_MODEL = """import joblib
import sklearn

joblib.dump(fitted_model, 'trained-model.joblib')
print(f'Saved trained-model.joblib with scikit-learn {sklearn.__version__}.')
print('Download it from the Colab Files panel if you want to keep it.')
"""


def _code(cell_id, source):
    return {
        'cell_type': 'code', 'id': cell_id, 'execution_count': None,
        'metadata': {}, 'outputs': [], 'source': source.splitlines(keepends=True),
    }


def _markdown(cell_id, source):
    return {
        'cell_type': 'markdown', 'id': cell_id, 'metadata': {},
        'source': source.splitlines(keepends=True),
    }


def _notebook(prepared, target, features, task, algorithm):
    config_items = {
        'target': target,
        'features': list(features),
        'task': task,
        'algorithm': algorithm,
        'expected_columns': list(prepared.columns),
        'column_types': {
            name: 'float64' if is_numeric_dtype(prepared[name]) else 'string'
            for name in prepared.columns
        },
    }
    config = '\n'.join(f'{key} = {value!r}' for key, value in config_items.items())
    core_source = Path(model_builder.__file__).read_text(encoding='utf-8-sig')
    return {
        'nbformat': 4, 'nbformat_minor': 5,
        'metadata': {
            'kernelspec': {'display_name': 'Python 3', 'language': 'python', 'name': 'python3'},
            'language_info': {'name': 'python'},
        },
        'cells': [
            _markdown('instructions', INTRO),
            _code('configuration', config),
            _code('load-training-data', READ_DATA),
            _code('model-builder', core_source),
            _code('train-and-evaluate', TRAIN),
            _code('evaluation-report', REPORT),
            _code('save-trained-model', SAVE_MODEL),
        ],
    }
REPORT = """import matplotlib.pyplot as plt
from IPython.display import display
from sklearn.metrics import ConfusionMatrixDisplay

print(f"Trained {report['algorithm']} on {report['train_rows']:,} rows.")
print(f"Held-out test rows: {report['test_rows']:,}")
display(pd.DataFrame({'Model': report['metrics'], 'Baseline': report['baseline']}).round(4))

if task == 'classification':
    from numpy import array
    figure, axis = plt.subplots(figsize=(9, 7))
    ConfusionMatrixDisplay(
        confusion_matrix=array(report['confusion_matrix']), display_labels=report['classes'],
    ).plot(ax=axis, cmap='Blues', include_values=len(report['classes']) <= 15, xticks_rotation=45)
    axis.set_title('Confusion matrix on held-out data')
else:
    predictions = pd.DataFrame(report['predictions'])
    low, high = predictions.min().min(), predictions.max().max()
    figure, axis = plt.subplots(figsize=(7, 5))
    axis.scatter(predictions['actual'], predictions['predicted'], alpha=0.65)
    axis.plot([low, high], [low, high], '--', color='gray', label='Perfect prediction')
    axis.set(xlabel='Actual value', ylabel='Predicted value', title='Actual vs. predicted values')
    axis.legend()
figure.tight_layout()
plt.show()

importance = pd.DataFrame(report['feature_importance'])
display(importance.round(4))
figure, axis = plt.subplots(figsize=(8, 5))
importance.head(12).iloc[::-1].plot.barh(x='feature', y='importance', legend=False, ax=axis)
axis.set(xlabel='Decrease in score when shuffled', ylabel='', title='Input importance on held-out data')
figure.tight_layout()
plt.show()
"""


def build_model_export(frame, target, features, task='auto', algorithm=None):
    """Return a ZIP with prepared rows and a notebook using the workspace model pipeline."""
    inspection = model_builder.inspect_model(frame, target, features, task)
    if not inspection['eligible']:
        raise ValueError(' '.join(inspection['reasons']))
    task = inspection['task']
    algorithm = algorithm or inspection['recommended_algorithm']
    if algorithm not in {choice['id'] for choice in inspection['algorithms']}:
        raise ValueError('Choose an algorithm available for this prediction task.')

    prepared = model_builder.prepare_model_data(frame, target, features, task)
    notebook = _notebook(prepared, target, features, task, algorithm)
    bundle = BytesIO()
    with ZipFile(bundle, 'w', compression=ZIP_DEFLATED) as archive:
        archive.writestr(NOTEBOOK_FILE, json.dumps(notebook, ensure_ascii=False))
        archive.writestr(DATA_FILE, prepared.to_csv(index=False, float_format='%.17g'))
    return bundle.getvalue()
