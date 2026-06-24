# Stark Data Science Assistant

A production-style, decoupled AI data science copilot engine. This project combines a high-performance asynchronous Python backend with a lightweight, zero-dependency vanilla JavaScript frontend, providing a powerful tool for interactive data analysis and visualization.

- **Decoupled System Design:** Separate dedicated backend engine and static frontend asset layouts.
- **FastAPI Core Async Backend:** High-speed data payload processing and statistical computation.
- **Groq-Powered Intelligence:** Rapid Llama 3.1 inference for decision-ready analysis, summarization, and chat.
- **BI-Grade Visual Lab:** Interactive data profiling and advanced Plotly plotting (Trends, Histograms, Correlation Matrices).
- **Voice Navigation & Scraper:** Native Speech Recognition tokens for hands-free analysis paired with an active BeautifulSoup4 scraping engine.

---

## ✨ Core Features

### Backend (FastAPI)
- **CSV Data Ingestion**: Upload CSV files via a REST API endpoint. The backend processes the data using Pandas, generating a comprehensive initial profile.
- **Automated Data Profiling**: On upload, the system automatically calculates:
  - Dataset dimensions (rows, columns)
  - Duplicate row counts and percentage
  - Memory usage
  - Column data types (dtypes)
  - Missing value counts and percentages
  - Unique value counts
- **AI-Powered Analysis**: Leverage the Groq API with Llama 3.1 to answer natural language questions about your dataset. The system provides a rich context to the model for more accurate insights.
- **Web Scraping & Summarization**: Provide a URL and an instruction to scrape web content, clean it, and generate an AI-powered summary.
- **General Purpose Chat**: A conversational endpoint for general questions, which can be aware of the currently loaded dataset.
- **Asynchronous by Design**: Built with `async` and `await` for high-concurrency, non-blocking I/O operations, making it fast and efficient.

### Frontend (Vanilla JavaScript)
- **Zero-Dependency UI**: A lightweight, fast, and modern interface built with vanilla JavaScript, HTML, and CSS. No frameworks, no build steps.
- **Interactive Data Visualization**:
  - Utilizes **Plotly.js** to render a wide array of charts (15+ types), including heatmaps, treemaps, violin plots, and stacked bars.
  - Features a UI for selecting chart type, X/Y axes, color grouping, and size encoding.
- **Natural Language to Chart**: A unique NLP parser that translates plain English commands (e.g., "donut chart of sales by product") into chart configurations.
- **Voice-to-Text Input**: Use your voice to dictate analysis prompts and chat messages using the browser's native SpeechRecognition API.
- **Text-to-Speech Output**: Listen to the AI's analysis and chat responses with the click of a button.
- **Full-Featured Profiler**: View detailed statistics for each column, including missing values, uniqueness, and data types in a clean, tabular format.

---

## 📁 Project Architecture

The repository is cleanly split into independent execution environments:

```text
📁 Stark-Data-Science-Assistant/
├── 📁 backend/                 # FastAPI Application Core
│   ├── 📁 app/                 # Main Application Code Package
│   │   ├── 📁 routers/         # Chat, Ingestion, and Analytics API Endpoints
│   │   ├── 📁 services/        # Statistics logic, Groq clients, and data store
│   │   ├── 📄 config.py        # Pydantic environment configuration
│   │   └── 📄 schemas.py       # Strict Pydantic Request/Response data contracts
│   ├── 📄 .env                 # Runtime Application Credentials (e.g., API keys)
│   ├── 📄 main.py              # Application Gateway and Middleware Launch
│   └── 📄 requirements.txt     # Backend package dependencies
├── 📁 frontend/                # Lightweight Core Web Client UI Assets
│   ├── 📄 index.html           # Cyberpunk-themed interactive UI dashboard
│   ├── 📄 app.js               # Vanilla JavaScript & Web API controller
│   └── 📄 styles.css           # Production-grade Neon design layout
└── 📄 README.md                # System Documentation