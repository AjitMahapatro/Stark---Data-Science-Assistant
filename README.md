# Stark Data Science Assistant

A production-style, decoupled AI data science copilot engine. Built using an asynchronous Python backend architecture paired with a lightweight, zero-overhead browser execution client.

- **Decoupled System Design:** Separate dedicated backend engine and static frontend asset layouts.
- **FastAPI Core Async Backend:** High-speed data payload processing and statistical computation.
- **Groq-Powered Intelligence:** Rapid Llama-3.3 inference pipeline delivering decision-ready analysis.
- **BI-Grade Visual Lab:** Interactive data profiling and advanced Plotly plotting (Trends, Histograms, Correlation Matrices).
- **Voice Navigation & Scraper:** Native Speech Recognition tokens for hands-free analysis paired with an active BeautifulSoup4 scraping engine.

---

## 📁 Project Architecture

The repository is cleanly split into independent execution environments:

```text
📁 Stark-Data-Science-Assistant/
├── 📁 backend/                # FastAPI Application Core
│   ├── 📁 app/                # Main Application Code Package
│   │   ├── 📁 routers/        # Chat, Ingestion, and Analytics API Endpoints
│   │   ├── 📁 services/       # Statistics logic, Groq clients, and data store
│   │   ├── 📄 config.py       # Pydantic environment configuration
│   │   └── 📄 schemas.py      # Strict Pydantic Request/Response data contracts
│   ├── 📁 dsa_env/            # Isolated Python Virtual Environment (Local only)
│   ├── 📄 main.py             # Application Gateway and Middleware Launch
│   ├── 📄 requirements.txt    # Backend package dependencies
│   └── 📄 .env                # Runtime Application Credentials
├── 📁 frontend/               # Lightweight Core Web Client UI Assets
│   ├── 📄 index.html          # Cyberpunk-themed interactive UI dashboard
│   ├── 📄 app.js              # Vanilla JavaScript & Web API controller
│   └── 📄 styles.css          # Production-grade Neon design layout
└── 📄 README.md               # System Documentation