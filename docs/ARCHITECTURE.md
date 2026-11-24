# Orqestra AI — System Architecture

## Overview

Orqestra AI separates event-log ingestion, deterministic process-mining computation, leakage-free machine learning inference, and interactive visualization into clean architectural layers.

```mermaid
flowchart LR
    UI["Next.js App Router UI\n(React Flow, Recharts, Motion)"] -->|REST JSON / Multipart CSV| API["FastAPI Router\n(/api/datasets/*)"]
    API --> ING["Ingestion & Validation\n(pandas, Timestamp Ordering)"]
    API --> PM["Process Mining Engine\n(DFG, Layered Layout, Bottlenecks, Variants)"]
    API --> ML["ML Delay Pipeline\n(LR, Random Forest, HistGradientBoosting)"]
    API --> REC["Recommendation Engine\n(Evidence-Linked Rules)"]
    API --> REP["Reporting Service\n(fpdf2 PDF & CSV Export)"]
    ING --> DB[("PostgreSQL / SQLite\nSQLAlchemy ORM")]
    PM --> DB
    ML --> DB
    REC --> DB
    REP --> DB
```

## Key Architectural Decisions

1. **Deterministic Process Graph Layout**: Graph node layers and `(x, y)` coordinates are computed deterministically on the backend using topological longest-path ranking with cycle breaking, ensuring reproducible diagrams across reloads.
2. **Leakage-Free ML Pipeline**: Closed cases are split chronologically (`75%` earliest for training, `25%` latest for testing) at the case level. Feature extraction uses only event prefixes observed prior to completion, and historical stage median waits are computed strictly on the training split.
3. **Single-Timestamp Measurement Honesty**: When event logs contain one timestamp per activity, Orqestra AI explicitly reports *observed inter-event waiting time* rather than claiming to measure hands-on employee working time.
4. **Database Portability**: SQLAlchemy ORM models support PostgreSQL (`pg8000` driver in Docker/production) and SQLite for zero-dependency local evaluation and automated testing.
