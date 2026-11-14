# MultiAgentBI project review

Reviewed 5 November 2026. This records the project **before** the backend repair. Scope: the active MultiAgentBI app only; the deleted parent project is intentionally excluded. Current backend behavior, configuration, and verification commands are documented in [backend/README.md](backend/README.md). Frontend work remains a separate phase.

## Main conclusion

Correctness of the dataset is the first priority. The app can alter identifiers, discard legitimate observations, answer a different SQL question, and report success when storage fails. Adding more agents will not resolve these problems.

## Findings, ordered by priority

### 1. P1 — Cleaning destroys text identifiers

Location: `backend/agents/data_agent.py:111`, `:187`, `:325`.

The numeric-column heuristic includes the substring `id`. An `order_id` containing `ORD-001`, `ORD-002`, and `ORD-003` is treated as numeric; all three IDs become NaN. Default CSV type inference can also remove leading zeros before cleaning starts. Missing identifiers break grouping, joins, traceability, and exported records.

Verified: processing a three-row CSV with those IDs produced three missing order IDs while retaining all three rows for analysis.

Fix: preserve identifier columns as strings during import; infer types from values and explicit schema choices. Do not use substring matches to force numeric conversion.

### 2. P1 — Validation removes valid business observations

Location: `backend/agents/validation.py:24–39`.

Every detected metric must be nonnegative. When there are no recognized business metrics, that restriction applies to almost all numeric columns. All metric columns also receive median ± 3 IQR filtering. These rules remove valid negative temperatures, refunds, losses, and large sales. Filtering also happens before anomaly detection, removing the observations that anomaly detection should examine.

Verified: temperatures `[-10,-5,0,5,10]` became `[0,5,10]`; revenues `[10,11,12,13,14,15,1000]` lost the 1000 sale. This changes the revenue total from 1075 to 75 without a user decision.

Fix: distinguish invalid input from unusual observations. Keep unusual values by default and flag them. Apply sign constraints only through an explicit column policy. Record every excluded row and its reason.

### 3. P1 — Deterministic SQL shortcuts ignore conditions

Location: `backend/agents/sql_agent.py:173–183`.

The row-count and sample shortcuts match phrases anywhere in a question and bypass the LLM. They ignore filters and ordering attached to those phrases.

Verified: `how many rows have revenue > 15` becomes `SELECT COUNT(*) AS total_records FROM orders`. The example dataset has seven rows but only one matching the question.

Fix: match only complete, supported question forms. Route questions with conditions or unsupported clauses through validated translation. Add tests that assert the meaning of results, including filters and ordering.

### 4. P1 — There is one active dataset for the entire server

Location: `backend/main.py:68–78`, `:391–440`, `:491–545`, `:599–658`.

Uploads and history reads mutate process-global DataFrames and metadata. EDA, ML, and summary endpoints use that active dataset without requiring an ID. Two browser tabs can overwrite each other's active dataset; refreshing an analysis can return another tab's results. Dataset restoration assigns several globals separately, allowing inconsistent state during concurrent requests. Multiple backend workers each have different state.

History, exports, knowledge queries, and database extraction also have no authentication or dataset ownership checks. This is a deployment blocker if the app is exposed to multiple users.

Fix: make dataset IDs required for analysis, load immutable request-local dataset contexts, and return history without changing server state. Add ownership checks if the product is shared. A personal local-only version can stay simpler, but should still use explicit IDs.

### 5. P1 — Saving can fail while the API says success

Location: `backend/orchestrator/graph.py:685–704`; `backend/main.py:315–339`.

Persistence exceptions are printed and swallowed. The API then returns `status: success` and emits completion, potentially with no dataset ID. History and export depend on that ID. The dataset transaction commits before knowledge indexing, but `dataset_id` is assigned afterward: an indexing exception can leave a saved run that the response does not identify.

Fix: treat successful analysis, successful saving, and optional knowledge indexing as separate outcomes. Return the saved dataset ID immediately after commit. Report storage failure explicitly; let optional indexing fail without losing access to the saved run.

### 6. P2 — Rupee prices fail cleaning and still pass validation

Location: `backend/agents/data_agent.py:332`; `backend/agents/validation.py:19–25`.

The currency stripping expression handles dollar, euro, pound, and yen symbols but omits the rupee symbol, despite README support claims. When every price becomes missing, its object column is not recognized as numeric by validation, so the required-price check disappears.

Verified with Unicode-escaped input: prices `₹100`, `₹200`, `₹300` all became missing, yet all three rows passed validation.

Fix: support declared currency formats and validate required columns using schema metadata, including columns with no parseable values. Do not infer away a failed metric column.

### 7. P2 — Invalid dates pass the supposedly validated dataset

Location: `backend/agents/validation.py:16–17`, `:28–30`.

Date columns are skipped. Of the audit flags, validation excludes only reasons containing `outlier`; an impossible date flag does not exclude a row or create an explicit analysis-specific policy. Monthly analyses later drop invalid dates, while other metrics count those rows. Therefore reports can use different populations while claiming a common validated subset.

Verified: a row dated `2026-02-30` remained in the three-row validated subset, with its date changed to missing.

Fix: declare eligibility per analysis and expose the corresponding row counts and reasons. Require valid dates for temporal analysis without calling every retained row universally valid.

### 8. P2 — Progress tracking grows without a bound

Location: `backend/main.py:76–78`, `:223–255`, `:335–339`; `frontend/src/components/upload/PipelineProgress.tsx:83–112`.

Each run creates an event queue and status entry. The current frontend polls rather than opening the SSE stream. Queue cleanup exists only in the SSE generator, and status entries have no expiry. Completed results are retained in status and completion events. Repeated uploads accumulate results and unconsumed events for the server process's lifetime. Polling state is also unavailable across worker processes.

Fix: choose one progress mechanism. For the small version, use slower polling with bounded status records and expiry; remove unused SSE support. Store completed results once by dataset ID.

### 9. P2 — Read-only SQL has no execution or result budget

Location: `backend/agents/sql_agent.py:207–228`.

`query_only` blocks writes, but SELECT queries can still create expensive cross joins or recursive CTEs. Execution has no progress-handler deadline and `fetchall()` has no row limit. Generated SQL can exhaust CPU or memory without modifying data. The text guard also treats keywords inside string values as commands; a harmless comparison to `'UPDATE'` is rejected.

Fix: cap execution work, time, rows, and response size. Use SQLite authorization and SQL-aware validation instead of keyword matches over quoted values.

### 10. P2 — Default serverless storage is temporary

Location: `backend/db/database.py:6–12`; `vercel.json`.

Serverless mode defaults SQLite storage to `/tmp/agentinsight.db`. History then depends on a particular temporary instance. Independent instances also lack the in-memory status and active dataset of the instance that accepted an upload. This conflicts with persistent history and progress behavior unless durable services are configured.

Fix: for the current small app, run one persistent backend with durable storage. If serverless deployment is retained, remove instance-local assumptions and configure durable database and job state explicitly.

## Features to reduce or defer

Keep a clear core flow: **upload → inspect quality → analysis → ask questions → export**. Show quality and analysis together where practical.

- Defer forecasting and a separate ML tab. Forecast confidence currently depends on the number of months, without held-out accuracy checks or prediction intervals. Retain descriptive trends and flag unusual observations first.
- Defer historical RAG. Direct audit lookup answers row-specific cleaning questions more simply. The existing retrieval path loads all matching chunks and refits TF-IDF per question (`backend/agents/knowledge_agent.py:313–323`, `:431–447`).
- Defer database connectors until file import is reliable. They expand credentials, permissions, drivers, and failure modes.
- Replace agent choreography with one compact progress indicator. Remove artificial RAG delays (`frontend/src/components/sql/AskQuestionView.jsx:300–304`) and avoid displaying implementation details as product features.
- Use one import/pipeline path and one analysis result contract. Separate `/api/upload`, `/api/pipeline/run`, and recomputation endpoints currently maintain overlapping state and behavior.
- Consider replacing LangGraph with an ordinary service pipeline. The current graph is a fixed dependency flow; it has no autonomous planning or checkpoint-backed job recovery. Keep domain functions, explicit validation, and error handling.
- Keep one configured LLM provider initially; consolidate repeated provider/fallback code. Use fixed chart templates and an optional plain summary rather than separate agent identities for each stage.
- Defer the 3D landing animation and confetti if load speed and maintenance matter. These add frontend dependencies without improving dataset correctness.

## Suggested repair order

1. Preserve source values and identifiers; make validation policies explicit.
2. Fix SQL question matching and cover the reproduced wrong answers.
3. Remove shared active-dataset state and require dataset IDs.
4. Make persistence outcomes truthful and bound run/SQL resource usage.
5. Simplify navigation and remove deferred paths once the intended core is agreed.

## Verification

- Inspected backend routes, orchestration, cleaning, validation, SQL, ML, knowledge retrieval, storage, and frontend upload/history/query flows.
- Ran direct local reproductions for identifier loss, signed-value filtering, large-sale filtering, rupee parsing, invalid-date retention, SQL shortcut conditions, and keyword false positives.
- Focused backend checks: `python -m pytest tests/test_data_agent.py tests/test_eda_agent.py tests/test_sql_agent.py -q -p no:cacheprovider` with external AI keys disabled: **20 passed, 2 failed**. Excel test failed because `openpyxl` is missing in the available Python environment; one SQL test requires a live LLM key and is not isolated as an offline unit test. Neither failure establishes a new application logic defect.
- The broader `tests/` run was interrupted after it stopped producing progress; no full-suite pass is claimed. ML and pipeline integration coverage remains unverified in this review.
- Frontend build could not run: dependencies are not installed in this checkout (`tsc` is unavailable). This is a verification limitation, not evidence of a source build defect.
- Live provider responses, production deployment, and PostgreSQL/MySQL connections were not exercised.
