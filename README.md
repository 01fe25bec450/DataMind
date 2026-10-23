# DataMind — Talk to Your Data

> **ZeroDay OSS Hacktoberfest 2026 Hackathon Project**  
> *Stage 3: Gemma-Powered Natural-Language-to-SQL + Snowflake Execution*

DataMind is an AI-powered conversational data intelligence platform. Users ask questions in plain English, and DataMind translates them into safe, Snowflake-optimized SQL using **Google Gemma**, verifies the SQL through an independent server-side AST parser, and executes queries directly against Snowflake to render interactive data tables and visual analytics.

---

## 📌 Stage 3 Architecture & Capabilities

1. **Gemma Natural-Language-to-SQL**:
   - Synthesizes Snowflake SQL queries from user prompts constrained to allowed database schema metadata.
   - Dual runtime support:
     - **Local Option**: [Ollama](https://ollama.com) running `gemma2:2b` or `gemma2:9b` at `http://localhost:11434`.
     - **Cloud Option**: Google AI Studio Gemma API via `GEMMA_API_KEY` (e.g. `gemma-2-2b-it`, `gemma-2-9b-it`).
   - Pure server-side configuration; model keys and endpoints are never exposed to the frontend.

2. **Independent Server-Side SQL Safety Validator (`sqlglot`)**:
   - Independent AST parser using `sqlglot` (Snowflake dialect) acting as a security gate between model output and database execution.
   - **Enforces single statement**: Rejects multi-statement attacks (e.g. `SELECT 1; DROP TABLE orders;`).
   - **Strictly read-only**: Permitted statements are strictly `SELECT` (including Common Table Expressions with `WITH`).
   - **Rejects data-changing operations**: Blocks `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `CREATE`, `MERGE`, `GRANT`, `REVOKE`, and transaction controls.
   - **Schema conformance**: Verifies that referenced tables belong to authorized schema metadata.
   - **Enforces row limits**: Automatically injects or caps queries to `LIMIT 100` to prevent runaway memory usage.
   - **Fail-closed policy**: Any parsing ambiguity or syntax error immediately rejects execution.

3. **Safe Snowflake Execution**:
   - Connects using `snowflake-connector-python` and executes only validated queries.
   - Cursors and connections are cleanly closed in `try ... finally` blocks.
   - Returns structured JSON containing column names, row records, row count, and execution status without leaking credentials.

4. **Interactive Modern Dashboard**:
   - Natural language search input with clickable example prompts.
   - Live execution via `POST /api/query`.
   - Results table with row counter and formatted values.
   - Dynamic Bar Visualizations generated from quantitative query columns.
   - Validated SQL preview with copy button and safety audit trail.
   - Distinct **`REAL SNOWFLAKE DATA`** badges (emerald green) vs **`DEMO DATA`** badges (amber).

---

## 🛠 Technology Stack

- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite 8](https://vitejs.dev/)
- **Styling**: Modern Vanilla CSS Design System with dark mode, glassmorphism, responsive flex/grid layouts, and micro-animations
- **Backend**: [Python 3.14+](https://www.python.org/), [FastAPI](https://fastapi.tiangolo.com/), [Uvicorn](https://www.uvicorn.org/)
- **SQL Validator**: [`sqlglot`](https://github.com/tobymao/sqlglot) (Snowflake dialect AST parser)
- **Database**: [Snowflake](https://www.snowflake.com/) via `snowflake-connector-python`
- **AI Models**: [Google Gemma](https://ai.google.dev/gemma) (via local Ollama or Google AI Studio)

---

## 📂 Project Directory Structure

```text
DataMind/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx             # Live backend, Snowflake & Gemma status pills
│   │   │   ├── QuestionInput.tsx      # Natural language search & example chips
│   │   │   ├── ResultsView.tsx        # Results table, visual bar chart & SQL preview
│   │   │   ├── Sidebar.tsx            # Navigation sidebar and connection monitors
│   │   │   └── SnowflakeToolbar.tsx   # Snowflake connection test & fixed query toolbar
│   │   ├── api.ts                     # Centralized API client for FastAPI backend
│   │   ├── App.tsx                    # Top-level state coordinator
│   │   ├── demoData.ts                # Example queries and demo fallback previews
│   │   ├── index.css                  # Modern dashboard design system & CSS tokens
│   │   ├── main.tsx                   # React root entry point
│   │   └── types.ts                   # TypeScript interfaces
│   ├── .env.example                   # Frontend environment configuration template
│   ├── index.html                     # HTML entry point with fonts & metadata
│   ├── package.json                   # Frontend dependencies & build scripts
│   ├── tsconfig.json                  # TypeScript configuration
│   └── vite.config.ts                 # Vite bundler configuration (port 5173)
├── backend/
│   ├── app/
│   │   ├── __init__.py                # App package initializer
│   │   ├── gemma_service.py           # Gemma natural-language-to-SQL service
│   │   ├── main.py                    # FastAPI endpoints & CORS
│   │   ├── snowflake_service.py       # Snowflake connection lifecycle & schema extraction
│   │   └── sql_validator.py           # Server-side AST SQL validation engine
│   ├── tests/
│   │   ├── __init__.py                # Tests package
│   │   └── test_stage3.py             # 15 automated unit & integration tests
│   └── requirements.txt               # Backend dependencies
├── .env.example                       # Snowflake & Gemma environment variables template
├── .gitignore                         # Git exclusion rules (.env, venvs, node_modules)
└── README.md                          # Project documentation
```

---

## ⚙️ Prerequisites

Before getting started, make sure you have the following installed on your Windows machine:
1. **Node.js**: v18+ (tested with `v24.13.0`) and `npm` (tested with `11.6.2`)
2. **Python**: 3.10+ (tested with `3.14.8`) and `pip`
3. **Snowflake Account**: Active account with warehouse and database permissions.
4. **Gemma Runtime** (choose one):
   - **Option A (Local)**: [Ollama](https://ollama.com) installed with `gemma2:2b` (requires ~3-4 GB RAM).
   - **Option B (Cloud)**: Google AI Studio API key (`GEMMA_API_KEY`).

---

## 🔐 Environment Configuration (`.env`)

Configure a local `.env` file in the root workspace folder (`DataMind/`). **Never commit your `.env` file to Git.**

### 1. Setup `.env` in Windows PowerShell Without Sharing Secrets

```powershell
cd "C:\Users\Supriya Giriyappanav\Desktop\Data_Mind"
Copy-Item .env.example .env
notepad .env
```

### 2. Configure Snowflake & Gemma Variables in `.env`

```env
# Snowflake Data Warehouse Configuration
SNOWFLAKE_ACCOUNT=your_account_identifier
SNOWFLAKE_USER=your_username
SNOWFLAKE_PASSWORD=your_password
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_DATABASE=SNOWFLAKE_SAMPLE_DATA
SNOWFLAKE_SCHEMA=TPCH_SF1
SNOWFLAKE_ROLE=ACCOUNTADMIN

# Gemma AI Model Runtime (Option A: Local Ollama)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma2:2b

# Gemma AI Model Runtime (Option B: Google AI Studio)
# GEMMA_API_KEY=your_google_ai_studio_api_key
# GEMMA_MODEL=gemma-2-2b-it
```

---

## 🤖 Gemma Runtime Setup Guide

### Setting Up Local Ollama (Recommended for Offline/Local Execution)
1. Download and install Ollama from [ollama.com](https://ollama.com).
2. Open PowerShell and pull the lightweight Gemma 2 model:
   ```powershell
   ollama run gemma2:2b
   ```
3. Verify that the Ollama daemon is running at `http://localhost:11434`.

### Setting Up Hosted Google AI Studio Gemma API
1. Visit [Google AI Studio](https://aistudio.google.com/) and create a free API key.
2. In your `.env` file, set `GEMMA_API_KEY=AIzaSy...` and `GEMMA_MODEL=gemma-2-2b-it`.

---

## 🚀 Windows PowerShell Setup & Run Instructions

Open **two separate Windows PowerShell terminal windows**:

### Terminal 1: Backend (FastAPI + Gemma + Snowflake)

1. Navigate to the project root:
   ```powershell
   cd "C:\Users\Supriya Giriyappanav\Desktop\Data_Mind"
   ```

2. (Optional) Activate the virtual environment:
   ```powershell
   .\backend\.venv\Scripts\Activate.ps1
   ```
   > *If PowerShell execution policy blocks `.ps1` scripts, run: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` or directly invoke the virtual environment binary as shown below.*

3. Install/verify dependencies:
   ```powershell
   .\backend\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
   ```

4. Run the automated backend test suite (22 unit & integration tests):
   ```powershell
   .\backend\.venv\Scripts\pytest.exe backend/tests -v
   ```

5. Start the FastAPI backend server on port 8000:
   ```powershell
   .\backend\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
   ```
   *The backend will be live at `http://127.0.0.1:8000`. You can test operational health at `http://127.0.0.1:8000/health`.*

---

### Terminal 2: Frontend (React + Vite)

1. Navigate to the frontend directory:
   ```powershell
   cd "C:\Users\Supriya Giriyappanav\Desktop\Data_Mind\frontend"
   ```

2. Install dependencies:
   ```powershell
   npm.cmd install
   ```

3. Run frontend resilience tests & build verification:
   ```powershell
   npm.cmd test
   npm.cmd run build
   ```

4. Start the Vite dev server:
   ```powershell
   npm.cmd run dev
   ```
   *The dashboard will be live at `http://localhost:5173`.*

---

## 🌐 Local Endpoints & Documentation

| Service | Endpoint | Description |
| :--- | :--- | :--- |
| **Frontend Dashboard** | [http://localhost:5173](http://localhost:5173) | Interactive Stage 3 DataMind dashboard |
| **Natural Language Query API** | `POST http://127.0.0.1:8000/api/query` | Translates NL to SQL via Gemma & executes on Snowflake |
| **Gemma Model Status** | `GET http://127.0.0.1:8000/api/gemma/status` | Checks Ollama or Google AI Studio availability |
| **Schema Metadata API** | `GET http://127.0.0.1:8000/api/schema` | Returns allowed database schema tables & columns |
| **Snowflake Status API** | `GET http://127.0.0.1:8000/api/snowflake/status` | Checks Snowflake configuration without exposing secrets |
| **Snowflake Connection Test** | `GET http://127.0.0.1:8000/api/snowflake/status?test=true` | Runs live verification test on Snowflake |
| **Fixed Query (Orders Count)** | `GET http://127.0.0.1:8000/api/orders/status-counts` | Executes read-only Stage 2 query on ORDERS table |
| **Backend Health Check** | `GET http://127.0.0.1:8000/health` | Operational health check (does not require Snowflake or Gemma) |
| **FastAPI Swagger Docs** | `GET http://127.0.0.1:8000/docs` | Auto-generated interactive API documentation |

---

## 🛡️ SQL Safety Controls & Known Limitations

### Security Safeguards Implemented:
1. **Abstract Syntax Tree (AST) Parsing**: sqlglot parses Snowflake SQL into a formal syntax tree. Textual comment injection (`--`, `/* */`) cannot bypass validation.
2. **Single-Statement Rule**: Rejects requests containing multiple semicolon-separated statements.
3. **Strict Read-Only SELECT**: Rejects `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `CREATE`, `MERGE`, `GRANT`, `REVOKE`, etc. CTEs (`WITH ... SELECT`) are permitted.
4. **Table Conformance**: External table references must belong to the approved schema metadata dictionary.
5. **Row Limits**: Queries without an explicit `LIMIT` or with an excessive limit are capped to `LIMIT 100`.

### Limitations of Static SQL Validation:
- **Stored Procedures & UDFs**: Static AST analysis cannot inspect dynamically evaluated SQL inside procedures. Therefore, `CALL` statements are blocked.
- **Database-Level Permissions**: Static parsing validates syntax and table names, but column-level masking policies, row access policies, and object permissions must still be enforced via a least-privilege Snowflake role.
- **Execution Cost**: Even valid `SELECT` queries could perform large joins; Snowflake execution timeouts and row limits provide defense-in-depth against computational denial of service.

---

## 🔧 Verified Troubleshooting Guide

- **"Backend server is offline or unreachable at http://127.0.0.1:8000"**:
  - **Cause**: The FastAPI process is not running, or was launched with system Python which lacks dependencies.
  - **Fix**: Open a terminal, run `cd "C:\Users\Supriya Giriyappanav\Desktop\Data_Mind"`, and execute:
    ```powershell
    .\backend\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
    ```
    Verify it by visiting `http://127.0.0.1:8000/health`.

- **"Unexpected end of JSON input"**:
  - **Cause**: Occurred previously when fetch called `.json()` on an empty HTTP 504/502 gateway error or offline proxy response.
  - **Fix**: `frontend/src/api.ts` now inspects HTTP status and body length before parsing JSON, preventing this exception completely and displaying actionable error messages.

- **Snowflake Configuration & Authentication Errors**:
  - `ConfigurationMissing`: Create `.env` in the root folder with `SNOWFLAKE_ACCOUNT`, `SNOWFLAKE_USER`, and `SNOWFLAKE_PASSWORD`.
  - `AuthenticationError`: Check credentials in `.env` for typos in account identifier or password.
  - `ObjectNotFoundOrUnauthorized`: Ensure the specified `SNOWFLAKE_WAREHOUSE`, `SNOWFLAKE_DATABASE`, and `SNOWFLAKE_SCHEMA` exist and are accessible by `SNOWFLAKE_ROLE`.
  - `NetworkError`: Check firewall or internet connection to Snowflake account URL.

- **Model Unavailable (`HTTP 503`)**:
  - **Message**: `No Gemma runtime is currently available...`
  - **Fix (Option A - Local)**: Install Ollama from [ollama.com](https://ollama.com) and run `ollama run gemma2:2b`.
  - **Fix (Option B - Cloud)**: Add `GEMMA_API_KEY=your_key` and `GEMMA_MODEL=gemma-2-2b-it` to root `.env`.

- **SQL Validation Error (`HTTP 422`)**:
  - **Message**: `Generated SQL failed safety validation: Disallowed statement type...`
  - **Behavior**: The server safely intercepted a model hallucination or unapproved query pattern and refused execution.

- **PowerShell Execution Policy Error**:
  - Run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in your PowerShell session.
