# 🤖 AgentInsight AI — Autonomous Multi-Agent Business Intelligence Platform

<div align="center">

![AgentInsight AI](https://img.shields.io/badge/AgentInsight-AI-6366f1?style=for-the-badge&logo=robot&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-ML-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)

**Upload a messy CSV → get instant AI-powered data cleaning, statistical analysis, natural-language SQL queries, and machine learning anomaly detection — all in one platform.**

</div>

---

## 📸 Overview

AgentInsight AI is a full-stack, modular multi-agent platform that transforms raw business datasets into actionable intelligence. Each agent is a **standalone, independently-testable Python module** responsible for a specific analytical domain. The React/TypeScript frontend provides a clean tabbed interface that guides the user from upload through to predictive ML insights.

### Agent Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AgentInsight AI                      │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Data Agent  │  │  EDA Agent  │  │  SQL Agent  │     │
│  │             │  │             │  │             │     │
│  │ Cleans &    │  │ Statistical │  │ NL → SQL    │     │
│  │ validates   │  │ analysis &  │  │ via Groq    │     │
│  │ raw CSV     │  │ trend charts│  │ LLM + SQLite│     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                         │
│                   ┌─────────────┐                       │
│                   │  ML Agent   │                       │
│                   │             │                       │
│                   │ IsoForest   │                       │
│                   │ anomaly det │                       │
│                   │ + Lin. Reg  │                       │
│                   │ forecasting │                       │
│                   └─────────────┘                       │
└─────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### 🧹 Data Agent — Intelligent Data Cleaning
- Detects and strips currency symbols (`$`, `€`, `£`), thousands separators, whitespace
- Normalizes casing for low-cardinality categorical columns (region, product) while **preserving** customer names and free-text fields
- Parses ambiguous date formats (DD/MM/YYYY, ISO, regional) with day-first enforcement
- Flags **negative values**, **zero values** (business-invalid: quantity=0 or price=0), non-numeric text, and calendar impossibilities (Feb 30, Month 13)
- Performs **intelligent imputation**: median for numeric, mode for categorical — only on true nulls, never on flagged problem cells
- Drops exact duplicate rows
- Returns a comprehensive `DataQualityReport` with flagged row details, auto-fix counts, and column schemas

### 📊 EDA Agent — Exploratory Data Analysis
- Computes validated-subset descriptive statistics (mean, median, std, min/max, quartiles) excluding flagged/outlier rows
- Detects categorical column distributions with Top-5 value breakdowns
- Builds Pearson correlation matrix across numeric features
- Groups monthly revenue/order trends for time-series visualization
- Surfaces notable patterns (top revenue-driving categories, regional skews, price range analysis)

### 🗣️ SQL Agent — Natural Language → SQL
- Accepts plain-English business questions (e.g. *"What is the total revenue by region?"*)
- Loads the validated DataFrame into an **in-memory SQLite** database as `orders`
- Calls the **Groq LLM API** (configurable model) to generate a single valid `SELECT` query
- Validates SQL safety: **blocks INSERT, UPDATE, DELETE, DROP, ALTER** — SELECT-only
- Auto-retries up to 3 times with refined prompts if validation or execution fails
- Returns column headers + rows + the raw SQL used for full transparency

### 🤖 ML Agent — Machine Learning Insights
- **Anomaly Detection** via scikit-learn `IsolationForest`:
  - Builds **per-category normalized features** — Laptop prices are compared to *Laptop* medians, not the global median, so $60,000 Laptops aren't falsely flagged
  - Returns top-12 anomalies sorted by severity score with plain-English explanations
  - Each explanation is always category-relative: *"Unit price $7,975 is 739% above the 'Keyboard' category median of $950"*
- **Trend Forecasting** via linear regression:
  - Groups historical data monthly (identical logic to EDA)
  - Projects next 3 months with honest confidence labelling
  - Reports `"insufficient"` confidence when fewer than 2 historical periods are available — no fake numbers

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend API** | FastAPI + Uvicorn |
| **Data Processing** | pandas, NumPy |
| **Machine Learning** | scikit-learn (IsolationForest, LinearRegression) |
| **SQL Engine** | SQLite (in-memory) via Python `sqlite3` |
| **LLM (SQL Agent)** | Groq API (openai-compatible, configurable model) |
| **Frontend** | React 18 + TypeScript + Vite |
| **Styling** | Vanilla CSS (no framework) |
| **Charts** | Custom SVG (no chart library dependency) |
| **Dev Environment** | Python venv, npm |

---

## 📁 Project Structure

```
insight/
├── backend/
│   ├── agents/
│   │   ├── data_agent.py       # Data ingestion, cleaning & quality report
│   │   ├── eda_agent.py        # Statistical EDA & trend analysis
│   │   ├── sql_agent.py        # NL→SQL via Groq LLM + SQLite executor
│   │   └── ml_agent.py         # IsolationForest anomaly + linear regression forecast
│   ├── tests/
│   │   ├── test_data_agent.py
│   │   ├── test_eda_agent.py
│   │   └── test_ml_agent.py
│   ├── main.py                 # FastAPI app + CORS + session state
│   ├── requirements.txt
│   ├── .env                    # API keys (not committed)
│   └── run.bat                 # One-command dev server start
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── upload/         # File upload drag-and-drop
│   │   │   ├── dataQuality/    # Data quality report viewer
│   │   │   ├── preview/        # Schema + cleaned data table
│   │   │   ├── eda/            # EDA charts & statistical summaries
│   │   │   ├── sql/            # NL query input + results table
│   │   │   └── ml/             # Anomaly cards + forecast SVG chart
│   │   ├── types/              # TypeScript interfaces
│   │   ├── App.tsx             # Tab navigation + session state
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── brutal_data_cleaning_test.csv   # Sample dataset for testing
├── dev.bat                         # Launches both frontend + backend
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- A [Groq API key](https://console.groq.com/) (free tier available)

### 1. Clone the repo
```bash
git clone https://github.com/umesh-dev31/MultiAgentBI.git
cd MultiAgentBI
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
copy .env.example .env
# Then edit .env and add your GROQ_API_KEY
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

### 4. Run the App

**Option A — Single command (recommended):**
```bash
# From project root
.\dev.bat
```

**Option B — Separately:**
```bash
# Terminal 1: Backend
cd backend && .\run.bat

# Terminal 2: Frontend
cd frontend && npm run dev
```

Open **http://localhost:5173** in your browser.

---

## ⚙️ Configuration

Create `backend/.env`:
```env
# Required: Groq API key for SQL Agent NL→SQL generation
GROQ_API_KEY=your_groq_api_key_here

# Optional: Groq model to use (default: openai/gpt-oss-120b)
GROQ_MODEL=openai/gpt-oss-120b
```

Get a free Groq key at [console.groq.com](https://console.groq.com/).

---

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Backend health check |
| `POST` | `/api/upload` | Upload CSV/Excel, returns cleaned data + quality report |
| `POST` | `/api/eda` | Run EDA on the current session's cleaned dataset |
| `POST` | `/api/query` | Body: `{"question": "..."}` → NL to SQL query + results |
| `POST` | `/api/ml-insights` | Anomaly detection + trend forecasting on validated data |

All endpoints except `/health` require a dataset to have been uploaded first in the same server session.

---

## 🧪 Data Quality Rules

The Data Agent and all downstream agents enforce these validation rules consistently:

| Rule | Handling |
|------|----------|
| Duplicate rows | Auto-removed |
| Whitespace in strings | Auto-stripped |
| Currency symbols (`$`, `€`) | Auto-parsed to float |
| Thousands separators (`,`) | Auto-parsed |
| Mixed case categories | Auto-normalized to Title Case |
| Ambiguous dates (DD/MM/YYYY) | Auto-parsed with day-first |
| Unparseable dates | Flagged, set to null |
| Non-numeric text in numeric cols | Flagged, set to null |
| **Negative quantity/price** | Flagged, excluded from analysis |
| **Zero quantity/price** | Flagged, excluded (business-invalid) |
| Statistical outliers (>3× IQR) | Flagged, excluded from analysis |
| Missing values (true nulls) | Imputed (median/mode) |

---

## 🔒 Security

- SQL Agent only executes `SELECT` statements — all write operations (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`) are blocked before execution
- LLM output is validated before any database call
- API keys are loaded from `.env` files, never hard-coded
- In-memory SQLite — no data is persisted to disk

---

## 📝 Sample Dataset

The repo includes `brutal_data_cleaning_test.csv` — a synthetic sales dataset specifically designed to test the Data Agent's cleaning robustness. It contains:

- Mixed currency formats (`$1,200.00`, `1200`, `£800`)
- Inconsistent casing (`NORTH`, `north`, `North`)
- Invalid dates (`2026-02-30`, ambiguous `05/01/2026`)
- Non-numeric values in numeric columns (`"six"`, `"15O00"`)
- Negative quantities and prices
- Zero quantity and zero price rows
- Duplicate records
- Statistical outliers

---

## 🛣️ Roadmap

- [ ] LangGraph orchestration to chain agents into a full pipeline
- [ ] Chart export (PNG/PDF)
- [ ] Multi-file session support
- [ ] Excel export of query results
- [ ] Authentication + persistent sessions
- [ ] Streaming LLM responses for SQL generation

---

## 👤 Author

**Umesh** — [@umesh-dev31](https://github.com/umesh-dev31)

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
