# AgentInsight AI — Autonomous Multi-Agent Business Intelligence Platform

<div align="center">

![AgentInsight AI](https://img.shields.io/badge/AgentInsight-AI-6366f1?style=for-the-badge&logo=robot&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![LangGraph](https://img.shields.io/badge/LangGraph-Orchestrated-FF6F00?style=for-the-badge&logo=diagram-next&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-PostgreSQL%20Compatible-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white)
![React](https://img.shields.io/badge/React-19+-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-ML%20%26%20RAG-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)

**Upload a messy CSV and get instant AI-powered data cleaning, statistical analysis, interactive visualizations, executive recommendations, natural-language SQL queries, ML anomaly detection, persistent history, and RAG-powered knowledge retrieval.**

</div>

---

## Overview

AgentInsight AI is an autonomous, full-stack multi-agent platform that transforms raw, messy business datasets into clean, actionable intelligence. Orchestrated by **LangGraph**, each agent is a specialized Python module executing bounded tasks with strict validation guarantees.

The platform includes **SQLAlchemy-backed persistent storage** (PostgreSQL-compatible, SQLite local demo) for historical runs and a **RAG Knowledge Agent** that indexes audit logs and analytical summaries for instant, grounded natural-language answers with source citations.

The frontend is built as a **flat zinc analyst workstation** — a sidebar-driven, terminal-style interface with modular result cards that presents each agent's output as a structured, inspectable feed.

---

## Multi-Agent Architecture

```
                               +-------------------------+
                               |     Raw CSV Upload      |
                               +------------+------------+
                                            |
                                            v
                               +-------------------------+
                               |      Data Agent         |
                               |  Cleaning & Auto-Fixes  |
                               +------------+------------+
                                            |
                                            v
                               +-------------------------+
                               |    Validation Agent     |
                               | Flags Bad Rows & Errors |
                               +------------+------------+
                                            |
                        +-------------------+-------------------+
                        |                                       |
                        v                                       v
             +---------------------+                 +---------------------+
             |      EDA Agent      |                 |      ML Agent       |
             | Stats, Trends, Corr |                 | Anomaly Detection   |
             +----------+----------+                 | Linear Forecasting  |
                        |                            +----------+----------+
                        |                                       |
                        +-------------------+-------------------+
                                            |
                                            v
                               +-------------------------+
                               |   Visualization Agent   |
                               |   Smart Chart Schemas   |
                               +------------+------------+
                                            |
                                            v
                               +-------------------------+
                               |      Insight Agent      |
                               | Executive Recommendations|
                               +------------+------------+
                                            |
                                            v
                               +-------------------------+
                               |   Persistence & RAG     |
                               |  SQLAlchemy + TF-IDF    |
                               +-------------------------+
```

---

## Features and Agents

### 1. Data Agent — Autonomous Data Cleaning and Normalization
- Detects and strips currency symbols (`$`, `€`, `£`, `₹`), thousands commas, and whitespace.
- Normalizes casing on low-cardinality categorical columns while preserving customer names and free text.
- Parses complex and ambiguous date formats (DD/MM/YYYY, ISO-8601, regional strings).
- Performs intelligent imputation (median for numeric, mode for categorical) exclusively on genuine nulls.

### 2. Validation Agent — Strict Quality Assurance and Isolation
- Evaluates data against strict business rules (flags negative prices/quantities, zero values, and calendar impossibilities like Feb 30).
- Isolates problem rows into a pristine `AuditReport` while ensuring downstream agents only compute on certified, uncontaminated data.
- Generates detailed issue logs: row index, column name, raw value, and human-readable reason.

### 3. EDA Agent — Exploratory Data Analysis
- Computes comprehensive descriptive statistics on validated subsets (mean, median, standard deviation, quartiles, min/max).
- Calculates categorical distributions with top-value breakdowns.
- Computes a Pearson correlation matrix across numeric features.
- Aggregates monthly revenue and volume trends for temporal analysis.

### 4. ML Agent — Machine Learning Anomaly Detection and Forecasting
- **Per-Category Normalized Isolation Forest**: Detects statistical anomalies relative to category peers rather than global distributions, avoiding false positives on inherently high-value items.
- Provides plain-English explanations for every flagged anomaly with percentage deviations.
- **Trend Forecasting**: Linear regression modeling on historical monthly periods with dynamic confidence levels (`high`, `medium`, `insufficient`).

### 5. Visualization Agent — Autonomous Chart Generation
- Translates statistical distributions into recommended charts (bar, line, scatter, pie, heatmap).
- Emits schema-compliant chart configurations rendered natively with responsive SVG.

### 6. Insight Agent — Executive Synthesis and Strategic Recommendations
- Synthesizes findings across EDA, ML, and Validation into an Executive Summary.
- Delivers prioritized business recommendations, operational risks, and growth opportunities.

### 7. SQL Agent — Text-to-SQL with In-Memory Execution
- Translates natural-language questions (e.g., "What is the total sales amount per month?") into safe, read-only SQLite `SELECT` queries.
- Powered by the **Groq LLM API** with automatic self-correction retries.
- Enforces strict security: blocks `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, and `CREATE`.

### 8. RAG Knowledge Agent — Semantic Question Answering over Analyses
- Indexes flagged audit issues and analytical summaries into a structured knowledge base.
- Uses **scikit-learn TF-IDF vectorization + cosine similarity** with exact row-number match boosting.
- Answers questions like "Why was row 13 flagged?" or "What data quality issues were found?".
- Dual retrieval scope: query within the **Current Dataset** or across **All Historical Uploads**.
- Displays expandable evidence drawer with similarity scores, chunk types, and citations.

### 9. Persistent Storage and History
- Built with **SQLAlchemy ORM** connected to a SQLite database (`backend/data/agentinsight.db`), fully architected for drop-in PostgreSQL migration.
- Persists datasets, complete pipeline runs (EDA, ML, Insights, Visualizations, Cleaned and Validated Data), audit issues, and RAG knowledge chunks.
- Dedicated **History** section allows users to review past uploads and restore any historical session into the live analytical workspace with one click.

---

## Workstation Interface

The frontend has been redesigned as a flat zinc analyst workstation — a minimal, terminal-style environment built for focused analytical work.

**Layout**

- **Sidebar** — Collapsible navigation panel. Lists all available analysis modules (Overview, Data Quality, Exploratory Analysis, Insights, SQL, Knowledge, History). Highlights the active section and shows run metadata.
- **Agent Terminal** — A live log feed that streams each pipeline step as it executes. Each entry shows the agent name, status, and a human-readable message. Errors surface inline with red highlights.
- **Result Cards** — Each agent's output is rendered as an independent, inspectable card. Cards are typed (stats, chart, anomaly, recommendation, sql-result, rag-answer) and appear sequentially in the result feed as the pipeline completes.
- **Query Input** — A dual-mode input bar at the bottom of the workstation that handles both natural-language SQL questions and RAG knowledge queries. The active mode is toggled with a keyboard shortcut or the mode selector.
- **Onboarding** — An empty-state screen rendered when no dataset is loaded, prompting the user to upload a CSV to begin.
- **Header** — Displays the platform name, current dataset filename, run status badge, and the theme toggle.

**Theme**

The workstation supports a seamless Dark and Light mode bridge controlled by a single CSS custom property. All surface colors, borders, and text tokens respond to the theme toggle without page reload.

---

## Tech Stack

| Layer | Technology | Description |
|-------|-----------|-------------|
| **Pipeline Orchestration** | LangGraph | State-machine workflow directing data and agent handoffs |
| **Backend Framework** | FastAPI + Uvicorn | High-performance asynchronous REST API |
| **Data Processing** | pandas, NumPy | High-speed data manipulation and cleaning |
| **Machine Learning and RAG** | scikit-learn | IsolationForest, LinearRegression, TfidfVectorizer, cosine_similarity |
| **Database and ORM** | SQLAlchemy | ORM layer with SQLite (PostgreSQL compatible) |
| **LLM and Text-to-SQL** | Groq API | Ultra-low-latency LLM inference |
| **Frontend Framework** | React 19 + TypeScript + Vite | Type-safe, reactive single-page analyst workstation |
| **Styling and Theme** | Vanilla CSS + Tailwind v4 | Flat zinc design system, CSS tokens, Dark and Light mode bridge |
| **Deployment** | Vercel | Multi-service deployment with frontend and backend services |

---

## Project Structure

```
insight/
+-- backend/
|   +-- agents/
|   |   +-- data_agent.py           # Ingestion, cleaning and quality analysis
|   |   +-- eda_agent.py            # Statistical analysis and correlation
|   |   +-- sql_agent.py            # Natural language to SQLite query execution
|   |   +-- ml_agent.py             # IsolationForest and trend regression
|   |   +-- visualization_agent.py  # Autonomous chart configuration
|   |   +-- insight_agent.py        # Executive summaries and recommendations
|   |   +-- knowledge_agent.py      # TF-IDF RAG agent over audit and insights
|   +-- db/
|   |   +-- database.py             # SQLAlchemy session and SQLite engine setup
|   |   +-- models.py               # Dataset, PipelineRun, AuditIssue, KnowledgeChunk
|   +-- orchestrator/
|   |   +-- graph.py                # LangGraph pipeline state graph and persistence
|   |   +-- state.py                # TypedDict state definitions
|   +-- data/
|   |   +-- .gitkeep                # Preserves database directory (DB ignored in git)
|   +-- tests/                      # Pytest unit and regression tests
|   +-- main.py                     # FastAPI routes, CORS, session state and lifecycle
|   +-- requirements.txt
|
+-- frontend/
|   +-- src/
|   |   +-- workstation/
|   |   |   +-- WorkstationApp.tsx          # Top-level workstation state and layout
|   |   |   +-- types.ts                    # TypeScript data contracts for workstation
|   |   |   +-- components/
|   |   |       +-- Header.tsx              # Platform header, run status, theme toggle
|   |   |       +-- Sidebar.tsx             # Collapsible section navigation
|   |   |       +-- AgentTerminal.tsx       # Live pipeline log feed
|   |   |       +-- ResultFeed.tsx          # Sequential result card renderer
|   |   |       +-- ResultCards.tsx         # Typed card components (stats, chart, anomaly)
|   |   |       +-- QueryInput.tsx          # Dual-mode SQL and RAG query bar
|   |   |       +-- Onboarding.tsx          # Empty-state upload prompt
|   |   |       +-- Card.tsx                # Base card shell and layout primitive
|   |   +-- components/
|   |   |   +-- ArchitectureWorkflow.tsx    # Agent pipeline diagram
|   |   |   +-- DataQualityView.tsx         # Audit report and issue inspection
|   |   |   +-- ExploratoryAnalysisView.tsx # Stats, charts and correlation
|   |   |   +-- FileUpload.tsx              # File dropzone and upload pipeline
|   |   |   +-- DataPreviewTable.tsx        # Cleaned data table preview
|   |   |   +-- SchemaTable.tsx             # Column schema inspector
|   |   |   +-- DatasetSummary.tsx          # Dataset metadata card
|   |   |   +-- DataHealthScoreGauge.tsx    # Visual quality score gauge
|   |   |   +-- ThemeToggle.tsx             # Dark and light mode switcher
|   |   +-- context/
|   |   |   +-- ThemeContext.tsx            # Theme provider and hook
|   |   +-- types/                          # Shared TypeScript API interfaces
|   |   +-- App.tsx                         # Root app entry
|   |   +-- index.css                       # Design tokens and utility styles
|   +-- package.json
|   +-- vite.config.ts
|
+-- vercel.json                      # Vercel multi-service deployment config
+-- dev.bat                          # Launches frontend and backend concurrently
+-- README.md
```

---

## Getting Started

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** and **npm**
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

## Deployment

This project is configured for deployment on **Vercel** using `vercel.json` at the project root. The configuration defines two services:

- **frontend** — Vite-based React app served from the `frontend/` directory.
- **backend** — FastAPI application served from the `backend/` directory.

All requests to `/api/*` are rewritten to the backend service. All other routes fall through to the frontend.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check and system status |
| `POST` | `/api/upload` | Ingests CSV, runs full LangGraph pipeline, persists run, returns analysis |
| `POST` | `/api/query` | Body: `{"question": "..."}` — NL-to-SQL execution against SQLite |
| `POST` | `/api/knowledge/ask` | Body: `{"question": "...", "scope": "current" or "all_history", "dataset_id": 1}` — RAG response with retrieved chunks |
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

## Security and Data Integrity

- **Read-Only SQL Execution**: SQL Agent generates and executes `SELECT` statements only. All mutating DDL and DML statements (`DROP`, `DELETE`, `INSERT`, `UPDATE`, `ALTER`, `TRUNCATE`) are blocked by parser-level validation.
- **Outlier Isolation**: Statistical outliers (greater than 3x IQR) and business-invalid rows (negative or zero prices) are segregated into audit reports so statistical models and SQL queries run on uncontaminated data.
- **Credential Protection**: API keys are strictly parsed from local `.env` files and excluded from version control.
- **Database Decoupling**: Persistent storage utilizes SQLAlchemy's ORM abstraction, allowing seamless transition from local SQLite to enterprise PostgreSQL with a connection string change.

---

## Author

**Umesh** — [@umesh-dev31](https://github.com/umesh-dev31)

---

## License

MIT License — see the [LICENSE](LICENSE) file for details.
