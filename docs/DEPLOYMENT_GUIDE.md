# Deployment & Local Execution Guide — PhishGuard AI

**Project Name:** PhishGuard AI  
**Frontend Target:** Vercel (`frontend/`)  
**Backend Target:** Render Docker Web Service (`backend/`)  
**Database Target:** Managed PostgreSQL (Render PostgreSQL / Neon / Supabase) or Local PostgreSQL 18 / SQLite  

---

## 1. Running Locally on Windows 11

### Prerequisites
- **Python 3.12+**
- **Node.js 20+ / 24+** and **npm**
- *(Optional)* **PostgreSQL 18** (by default, local development works out-of-the-box using SQLite `sqlite:///./phishguard.db` if `DATABASE_URL` is not overridden, or connects to PostgreSQL when `DATABASE_URL` is set in `backend/.env`).

### Step 1: Start the FastAPI Backend (Terminal 1 — PowerShell)

```powershell
cd "d:\Shehan-projects\PhishGuard AI\backend"

# Create virtual environment if not already created
python -m venv .venv

# Install dependencies
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

# Optional: Copy .env.example to .env and customize DATABASE_URL if using PostgreSQL
Copy-Item .env.example .env -ErrorAction SilentlyContinue

# Apply Alembic database migrations
.\.venv\Scripts\alembic.exe upgrade head

# Start the FastAPI server on http://localhost:8000
.\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --reload
```

Verify the backend health endpoint at `http://localhost:8000/api/v1/health` and interactive Swagger UI at `http://localhost:8000/docs`.

### Step 2: Start the React + Vite Frontend (Terminal 2 — PowerShell)

```powershell
cd "d:\Shehan-projects\PhishGuard AI\frontend"

# Install frontend dependencies
npm install

# Optional: Copy .env.example to .env
Copy-Item .env.example .env -ErrorAction SilentlyContinue

# Start the Vite development server on http://localhost:5173
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 2. Production Cloud Deployment

### 2.1 Managed PostgreSQL Setup (Render PostgreSQL)
1. In the [Render Dashboard](https://dashboard.render.com/), click **New +** $\rightarrow$ **PostgreSQL**.
2. Name the instance `phishguard-ai-db`, select a region, and create the database.
3. Copy the **Internal Database URL** (or External Database URL). Note that PhishGuard AI's `config.py` automatically normalizes `postgres://` and `postgresql://` connection strings to `postgresql+psycopg://` for SQLAlchemy 2.0 + `psycopg` v3 compatibility.

### 2.2 Backend Deployment on Render (`backend/`)
1. In Render, click **New +** $\rightarrow$ **Web Service** and connect the GitHub repository `https://github.com/AravindaRajapaksha/PhishGuard-AI.git`.
2. Configure the service:
   - **Root Directory:** `backend`
   - **Runtime:** `Docker` (uses `backend/Dockerfile`)
   - **Health Check Path:** `/api/v1/health`
3. Add Environment Variables:
   - `ENVIRONMENT` = `production`
   - `DATABASE_URL` = `<Your Render PostgreSQL Internal Database URL>`
   - `CORS_ORIGINS` = `https://<your-vercel-domain>.vercel.app`
   - `MODEL_VERSION` = `v1`
   - `RATE_LIMIT_PER_MINUTE` = `30`
4. Deploy the service. On startup, `main.py` automatically initializes the schema and synchronizes the `v1.0.0` XGBoost artifact into `model_versions`.

### 2.3 Frontend Deployment on Vercel (`frontend/`)
1. In the [Vercel Dashboard](https://vercel.com/dashboard), click **Add New Project** and import `AravindaRajapaksha/PhishGuard-AI`.
2. Configure the project:
   - **Root Directory:** `frontend`
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add Environment Variable:
   - `VITE_API_BASE_URL` = `https://<your-render-backend>.onrender.com`
4. Click **Deploy**. `frontend/vercel.json` automatically configures SPA client-side routing rewrites for `/scanner`, `/history`, `/analytics`, `/model-insights`, and `/about`.
