# Backend operation and API contracts

This backend supports one persistent local server and one supervised analysis worker. Keep the data directory on durable storage. Do not use serverless hosting or multiple Uvicorn workers. The Windows launch scripts bind to localhost.

## Setup and checks

Use Python 3.11 or newer. From `backend`, create a virtual environment and install `requirements.txt` plus `requirements-dev.txt`. On Windows, the existing `setup_backend.bat` creates `backend/venv-review` using Python 3.12; `run.bat` selects that environment.

Run `python -m pytest` from `backend`. Default tests use temporary storage, no server, and no AI keys. They include real spawned-worker tests. `python -m pytest -m "not process"` runs only in-process checks. Live checks require configured services and `python -m pytest --run-integration -m integration`.

The older top-level `test_*.py` files are pre-repair manual examples, outside default collection. The maintained acceptance tests are in `tests/`.

## Durable datasets and cleaning

Original uploaded bytes remain under `INSIGHT_DATA_DIR/uploads`; the default directory is `backend/data`. Keep these files together with the history database when backing up the application. Retention and deleting user datasets are intentionally not automatic. Rejected submissions remove their temporary upload; failed processing retains its source for diagnosis/reupload.

The `preserve-v1` policy retains duplicate rows, missing values, signed metrics, and statistical outliers. IDs and leading-zero text remain strings. Numeric representation and unambiguous dates are parsed; the raw file and change audit preserve original values. Unknown text such as `NA` is not silently treated as null. Failed conversions are flagged and are not imputed.

Both upload APIs accept an optional multipart `options` JSON field:

```json
{
  "impute": false,
  "deduplicate": false,
  "date_order": "unresolved",
  "column_roles": {"order_id": "identifier", "reading": "numeric"},
  "numeric_constraints": {"reading": {"minimum": 0, "maximum": 100}}
}
```

Roles: `identifier`, `text`, `numeric`, `date`. Date order: `unresolved`, `dayfirst`, `monthfirst`. Unknown columns/options and contradictory numeric limits are rejected. Explicit imputation fills genuine missing values only, never failed conversions or identifiers. Deduplication retains original source-row references and audits removed rows.

Eligibility is per numeric statistic, correlation, temporal metric, and anomaly model. A missing date does not delete a row from non-temporal statistics. Forecasts are labeled unvalidated linear projections; there is no month-count-based confidence claim. Output `populations` contains counts, reason counts, and up to 100 source-row/reason details with explicit truncation flags. `eligible_mask_base64` preserves complete eligibility compactly: decode and unpack bits in little-endian bit order, take `total_rows` bits, and map them to the dataset's complete source-row list. Legacy `validated_rows_used` is the number of retained observations, not a promise that every field is eligible. SQL retains all rows while exposing invalid/constrained numeric cells as NULL; its response reports per-column eligibility.

## Jobs and compatibility

| Operation | Contract |
|---|---|
| `POST /api/jobs` | Multipart upload and optional options; HTTP 202 with job ID and status URL |
| `GET /api/jobs/{id}` | Durable state, stage statuses, timestamps, error, dataset ID, and result after completion |
| `POST /api/datasets/{id}/query` | JSON `question`; explicit request-local dataset |
| `POST /api/datasets/{id}/analysis/{kind}` | Recompute `eda`, `ml-insights`, or `insights` for that ID |
| `GET /api/history` | Historical dataset metadata |
| `GET /api/history/{id}` | Saved report; no active dataset switch |
| `GET /api/export/{id}?format=json\|csv\|html` | Saved report or full cleaned CSV |
| `POST /api/knowledge/ask` | `question`, `scope`, `dataset_id`; current scope requires an identified dataset |

States: `queued`, `running`, `completed`, `completed_with_warnings`, `failed`. One processing slot and eight waiting slots are available. Required ingestion/validation/EDA failure fails a full job; optional ML/forecast/chart/summary/indexing failures preserve successful core analysis. Storage failure never reports success. A saved dataset ID remains available even if optional indexing or subsequent job completion fails.

Jobs continue after clients disconnect. The supervisor kills a worker exceeding `JOB_TIMEOUT_SECONDS`, marks that job failed, and starts the next job in a fresh process. Restart marks interrupted running jobs failed and retains queued jobs. Retry by submitting a new upload. A graceful stop terminates the active job. Do not launch a second backend against the same database.

Existing `/api/pipeline/run` and `/api/upload` routes remain synchronous adapters; upload-only now persists its dataset and includes its ID. Existing polling routes read durable stage status. SSE emits persisted job-status snapshots without duplicating full result data. Original result fields remain, with policy, populations, warnings, and stage status added.

Legacy analysis/query routes accept `dataset_id`. Without it, an opaque HttpOnly cookie can resolve exactly one dataset associated with that browser. Visiting/uploading another dataset makes implicit requests ambiguous and returns HTTP 409. No request silently picks a global/latest dataset. The unchanged frontend works through the same-origin Vite proxy. Cross-origin clients must supply IDs if they do not send cookies. The later UI phase should send dataset IDs everywhere and use asynchronous jobs.

Errors include a human-readable `detail` and `{code,message}` under `error`. Statuses include 404 for unknown identity, 409 for ambiguity/incomplete legacy data, 413 for byte limits, 422 for invalid input, 429 for queue saturation, and 503 for unavailable storage. AI/provider details and credentials are not exposed in errors or logs.

## Storage, SQL and source limits

Startup applies versioned migrations. Before adopting an old SQLite schema, it creates a SQLite-consistent `.backup-<UTC timestamp>` file. Existing history keeps its saved reports and `legacy-v0` policy. Preview-only history can be viewed as a report but cannot be used for full-data recomputation or CSV export. Stop the backend before restoring a backup; restore the database and associated upload directory together.

Defaults: 20 MiB upload, 100,000 rows, 200 columns, 100 MiB expanded XLSX contents. SQL is parsed and executed under SQLite read-only authorization with a two-second budget, 10,000 result rows and a 5 MiB result-data budget. Truncated output is explicitly labeled. Unsupported natural-language questions require a configured provider; simple count, preview and supported grouping questions work offline.

Database imports retain the separate operator-configured `ANALYTICS_DATABASE_URL`. Use read-only accounts; connection/read/query timeouts are bounded. SQLite source import is covered offline. PostgreSQL and MySQL require opt-in live verification.

Configuration variables are documented in `.env.example`. Standard logs contain job/dataset IDs, stage transitions, and error codes. User accounts, public hosting, multiworker coordination, and automatic retention are outside this local-backend release.
