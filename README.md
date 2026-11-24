# Orqestra AI — Enterprise Process Intelligence Platform

Orqestra AI discovers how work actually moves through an organization using event-log data and machine learning. Built around an architectural Porcelain/Indigo/Apricot visual system, it reconstructs process paths, measures inter-event waiting bottlenecks, compares workflow variants, predicts deadline risk without future-event leakage, and generates executive PDF/CSV reports.

## Tech Stack

- **Frontend**: Next.js App Router, TypeScript (strict), Tailwind CSS v4, React Flow (`@xyflow/react`), Recharts, Motion
- **Backend**: Python FastAPI, pandas, SQLAlchemy, PostgreSQL (`pg8000`) / SQLite
- **ML**: scikit-learn (`LogisticRegression`, `RandomForestClassifier`, `HistGradientBoostingClassifier`)
- **Reporting**: `fpdf2` (PDF) and Python `csv`

## Quick Start (Local Development)

### 1. Backend (FastAPI)

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate  |  macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

On first boot, the backend automatically initializes the database, seeds `data/sample_purchase_requests.csv` (260 synthetic purchase-request cases), computes process-mining metrics, and trains the 3 ML delay-prediction models.

### 2. Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 3. Docker Compose (PostgreSQL + Backend + Frontend)

```bash
docker compose up --build
```

## Documentation

- [Architecture Diagram](docs/ARCHITECTURE.md)
- [Database Schema & ERD](docs/DATABASE_SCHEMA.md)
- [Functional & Non-Functional Requirements](docs/REQUIREMENTS.md)
- [Testing Report](docs/TESTING_REPORT.md)
- [Demonstration Guide](docs/DEMO_GUIDE.md)
