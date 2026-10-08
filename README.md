# AgentInsight AI — Autonomous Multi-Agent Business Intelligence Platform

**Upload a messy CSV → get instant AI-powered data cleaning, statistical analysis, interactive visualizations, executive recommendations, natural-language SQL queries, ML anomaly detection, persistent history, and RAG-powered knowledge retrieval.**

</div>

---

## Overview

AgentInsight AI is an autonomous, full-stack multi-agent platform that transforms raw, messy business datasets into clean, actionable intelligence. Orchestrated by **LangGraph**, each agent is a specialized Python module executing bounded tasks with strict validation guarantees.

The platform includes **SQLAlchemy-backed persistent storage** (PostgreSQL-compatible, SQLite local demo) for historical runs and a **RAG Knowledge Agent** that indexes audit logs and analytical summaries for instant, grounded natural-language answers with source citations.

### Multi-Agent Architecture

```
                               ┌─────────────────────────┐
                               │     Raw CSV Upload      │
                               └────────────┬────────────┘
                                            │
                                            ▼
                               ┌─────────────────────────┐
                               │      Data Agent         │
                               │  Cleaning & Auto-Fixes  │
                               └────────────┬────────────┘
                                            │
                                            ▼
                               ┌─────────────────────────┐
                               │    Validation Agent     │
                               │ Flags Bad Rows & Errors │
                               └────────────┬────────────┘
                                            │
                        ┌───────────────────┴───────────────────┐
                        │                                       │
                        ▼                                       ▼
             ┌─────────────────────┐                 ┌─────────────────────┐
             │      EDA Agent      │                 │      ML Agent       │
             │ Stats, Trends, Corr │                 │ Anomaly Detection   │
             └──────────┬──────────┘                 │ Linear Forecasting  │
                        │                            └──────────┬──────────┘
                        │                                       │
                        └───────────────────┬───────────────────┘
                                            │
                                            ▼
                               ┌─────────────────────────┐
                               │   Visualization Agent   │
                               │   Smart Chart Schemas   │
                               └────────────┬────────────┘
                                            │
                                            ▼
                               ┌─────────────────────────┐
                               │      Insight Agent      │
                               │ Executive Recommendations│
                               └────────────┬────────────┘
                                            │
                                            ▼
                               ┌─────────────────────────┐
                               │   Persistence & RAG     │
                               │  SQLAlchemy + TF-IDF    │
                               └─────────────────────────┘
```

---

## Features & Agents

### 1. Data Agent — Autonomous Data Cleaning & Normalization
- Detects and strips currency symbols (`$`, `€`, `£`, `₹`), thousands commas, and whitespace.
- Normalizes casing on low-cardinality categorical columns while preserving customer names and free text.
- Parses complex/ambiguous date formats (DD/MM/YYYY, ISO-8601, regional strings).
- Performs intelligent imputation (median for numeric, mode for categorical) exclusively on genuine nulls.

### 2. Validation Agent — Strict Quality Assurance & Isolation
- Evaluates data against strict business rules (flags negative prices/quantities, zero values, and calendar impossibilities like Feb 30).
- Isolates problem rows into a pristine `AuditReport` while ensuring downstream agents only compute on certified, uncontaminated data.
- Generates detailed issue logs: row index, column name, raw value, and human-readable reason.

### 3. EDA Agent — Exploratory Data Analysis
- Computes comprehensive descriptive statistics on validated subsets (mean, median, standard deviation, quartiles, min/max).
- Calculates categorical distributions with top-value breakdowns.
- Computes a Pearson correlation matrix across numeric features.
- Aggregates monthly revenue and volume trends for temporal analysis.

### 4. ML Agent — Machine Learning Anomaly Detection & Forecasting
- **Per-Category Normalized Isolation Forest**: Detects statistical anomalies relative to category peers rather than global distributions, avoiding false positives on inherently high-value items.
- Provides plain-English explanations for every flagged anomaly with percentage deviations.
- **Trend Forecasting**: Linear regression modeling on historical monthly periods with dynamic confidence levels (`high`, `medium`, `insufficient`).

### 5. Visualization Agent — Autonomous Chart Generation
- Translates statistical distributions into recommended charts (bar, line, scatter, pie, heatmap).
- Emits schema-compliant chart configurations rendered natively with responsive SVG.

### 6. Insight Agent — Executive Synthesis & Strategic Recommendations
- Synthesizes findings across EDA, ML, and Validation into an Executive Summary.
- Delivers prioritized business recommendations, operational risks, and growth opportunities.

### 7. SQL Agent — Text-to-SQL with In-Memory Execution
- Translates natural-language questions (e.g., *"What is the total sales amount per month?"*) into safe, read-only SQLite `SELECT` queries.
- Powered by the **Groq LLM API** with automatic self-correction retries.
- Enforces strict security: blocks `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, and `CREATE`.

### 8. RAG Knowledge Agent — Semantic Question Answering over Analyses
- Indexes flagged audit issues and analytical summaries into a structured knowledge base.
- Uses **scikit-learn TF-IDF vectorization + cosine similarity** with exact row-number match boosting.
- Answers questions like *"Why was row 13 flagged?"* or *"What data quality issues were found?"*.
- Dual retrieval scope: query within the **Current Dataset** or across **All Historical Uploads**.
- Displays expandable evidence drawer with similarity scores, chunk types, and citations.

### 9. Persistent Storage & History
- Built with **SQLAlchemy ORM** connected to a SQLite database (`backend/data/agentinsight.db`), fully architected for drop-in PostgreSQL migration.
- Persists datasets, complete pipeline runs (EDA, ML, Insights, Visualizations, Cleaned & Validated Data), audit issues, and RAG knowledge chunks.
- Dedicated **History Tab** allows users to review past uploads and restore any historical session into the live analytical workspace with 1 click.

---

## Tech Stack

| Layer | Technology | Description |
|-------|-----------|-------------|
| **Pipeline Orchestration** | LangGraph | State-machine workflow directing data and agent handoffs |
| **Backend Framework** | FastAPI + Uvicorn | High-performance asynchronous REST API |
| **Data Processing** | pandas, NumPy | High-speed data manipulation and cleaning |
| **Machine Learning & RAG** | scikit-learn | IsolationForest, LinearRegression, TfidfVectorizer, cosine_similarity |
| **Database & ORM** | SQLAlchemy | ORM layer with SQLite (PostgreSQL compatible) |
| **LLM & Text-to-SQL** | Groq API | Ultra-low-latency LLM inference |
| **Frontend Framework** | React 19 + TypeScript + Vite | Type-safe, reactive single-page dashboard |
| **Styling & Theme** | Vanilla CSS + Tailwind v4 | Glassmorphism, CSS design tokens, seamless Dark & Light mode |

---

## Project Structure

```
insight/
├── backend/
│   ├── agents/
│   │   ├── data_agent.py           # Ingestion, cleaning & quality analysis
│   │   ├── eda_agent.py            # Statistical analysis & correlation
│   │   ├── sql_agent.py            # Natural language to SQLite query execution
│   │   ├── ml_agent.py             # IsolationForest & trend regression
│   │   ├── visualization_agent.py  # Autonomous chart configuration
│   │   ├── insight_agent.py        # Executive summaries & recommendations
│   │   └── knowledge_agent.py      # TF-IDF RAG agent over audit & insights
│   ├── db/
│   │   ├── database.py             # SQLAlchemy session & SQLite engine setup
│   │   └── models.py               # Dataset, PipelineRun, AuditIssue, KnowledgeChunk
│   ├── orchestrator/
│   │   ├── graph.py                # LangGraph pipeline state graph & persistence
│   │   └── state.py                # TypedDict state definitions
│   ├── data/
│   │   └── .gitkeep                # Preserves database directory (DB ignored in git)
│   ├── tests/                      # Pytest unit & regression tests
│   ├── main.py                     # FastAPI routes, CORS, session state & lifecycle
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/          # Canvas, header, sidebar & layout
│   │   │   ├── upload/             # File dropzone & upload pipeline
│   │   │   ├── dataQuality/        # Audit report & issue inspection
│   │   │   ├── preview/            # Cleaned data table preview
│   │   │   ├── eda/                # Summary stats, charts & correlation
│   │   │   ├── ml/                 # Anomaly cards & regression trends
│   │   │   ├── sql/                # SQL Query & RAG Question dual-mode views
│   │   │   ├── history/            # Historical dataset viewer & 1-click restore
│   │   │   └── landing/            # Silk canvas visual presentation
│   │   ├── context/                # ThemeContext (Dark / Light switcher)
│   │   ├── types/                  # TypeScript data contracts & API interfaces
│   │   ├── App.tsx                 # Routing, global workspace state
│   │   └── index.css               # Design tokens, dark mode bridge & utilities
│   ├── package.json
│   └── vite.config.ts
│
├── brutal_data_cleaning_test.csv   # Comprehensive test dataset with edge cases
├── dev.bat                         # Launches frontend + backend concurrently
└── README.md
```

---

## Getting Started

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** & **npm**
- A free **[Groq API Key](https://console.groq.com/)**

### 1. Clone the Repository
```bash
git clone https://github.com/umesh-dev31/MultiAgentBI.git
cd MultiAgentBI
```

### 2. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows
.\venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
copy .env.example .env   # On Windows
cp .env.example .env     # On macOS/Linux
```

Edit `backend/.env`:
```env
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

### 4. Launch the Platform

**Option A — Unified Windows Script:**
```bash
# From project root
.\dev.bat
```

**Option B — Independent Terminals:**
```bash
# Terminal 1: Backend
cd backend
.\run.bat    # or: uvicorn main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev  # Vite starts on http://localhost:5173
```

Navigate to **http://localhost:5173** in your browser.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check & system status |
| `POST` | `/api/upload` | Ingests CSV, runs full LangGraph pipeline, persists run, returns analysis |
| `POST` | `/api/query` | Body: `{"question": "..."}` → NL-to-SQL execution against SQLite |
| `POST` | `/api/knowledge/ask` | Body: `{"question": "...", "scope": "current"\|"all_history", "dataset_id": 1}` → RAG response with retrieved chunks |
| `GET` | `/api/history` | Fetches list of all historical pipeline runs |
| `GET` | `/api/history/{dataset_id}` | Restores full pipeline run, state, and in-memory SQLite table |
| `GET` | `/api/suggested-questions` | Generates schema-tailored business questions |

---

## Testing

Run backend unit and integration tests:
```bash
cd backend
pytest tests/
```

Run frontend production build verification:
```bash
cd frontend
npm run build
```

---

## Security & Data Integrity

- **Read-Only SQL Execution**: SQL Agent generates and executes `SELECT` statements only. All mutating DDL and DML statements (`DROP`, `DELETE`, `INSERT`, `UPDATE`, `ALTER`, `TRUNCATE`) are blocked by parser-level validation.
- **Outlier Isolation**: Statistical outliers (>3× IQR) and business-invalid rows (negative/zero prices) are segregated into audit reports so statistical models and SQL queries run on uncontaminated data.
- **Credential Protection**: API keys are strictly parsed from local `.env` files and excluded from version control.
- **Database Decoupling**: Persistent storage utilizes SQLAlchemy's ORM abstraction, allowing seamless transition from local SQLite to enterprise PostgreSQL with a connection string change.

---

## Author

**Umesh** — [@umesh-dev31](https://github.com/umesh-dev31)

---

## License

MIT License — see the [LICENSE](LICENSE) file for details.


## Review fixes and additional inputs / exports

- All analysis agents now use the same idempotent validation function. Zero-value metrics remain included, negative/null metrics and extreme outliers are excluded consistently. Original spreadsheet row numbers survive duplicate removal and history restoration.
- Forecast fitting uses actual calendar-month distances, including gaps in uploaded history.
- SQL execution also enables SQLite read-only mode. Simple revenue-by-category and top-customer questions work offline; other natural-language queries still use the configured LLM.
- A fresh `/api/upload` clears previous pipeline state. Unknown dataset IDs return 404 instead of silently querying a different dataset.
- The dashboard includes **Export results** for a full cleaned CSV, full analysis JSON, and a printable HTML report (use the browser's Save as PDF option). This uses persisted full records, not the preview.
- **Import from a database** reads tables from an operator-configured `ANALYTICS_DATABASE_URL` in `backend/.env`. Supported URL schemes: `postgresql+psycopg2://`, `mysql+pymysql://`, and `sqlite:///`. Use a read-only database account. The selected table is passed through the same upload pipeline; imports over 100,000 rows are rejected rather than silently truncated. Database credentials are never sent to the frontend.
- Dashboard panels adapt to narrow windows; history timestamps stored as UTC display in the browser's local timezone. Landing-page components were not changed.

### Windows startup and verification

A separate `backend/venv-review` environment is preferred by the launch scripts; existing environments are retained. On a new machine with Python 3.12, run `setup_backend.bat`, then `dev.bat`. `backend/run.bat` also works from any working directory and sets UTF-8 console encoding so telemetry cannot break uploads on Windows.

```powershell
cd backend
$env:PYTHON_DOTENV_DISABLED = '1'
.\venv-review\Scripts\python.exe -m pytest tests -q
```

Tests use temporary databases and disable LLM calls in regression fixtures. SQLite source import is tested; live PostgreSQL/MySQL connections and provider-backed LLM responses require configured services. The PPT's XGBoost, Transformers, Matplotlib/Seaborn references remain proposed alternatives; the current implementation uses IsolationForest, NumPy linear fitting, TF-IDF retrieval, and frontend chart rendering.
