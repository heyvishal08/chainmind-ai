# ChainMind AI — Intelligent Supply Chain Copilot

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.110+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_18_+_Vite-61DAFB?style=flat&logo=react)](https://react.dev)
[![Google OR-Tools](https://img.shields.io/badge/Optimization-Google_OR--Tools_MILP-4285F4?style=flat&logo=google)](https://developers.google.com/optimization)
[![Machine Learning](https://img.shields.io/badge/Forecasting-Scikit--Learn_Gradient_Boost-F7931E?style=flat&logo=scikit-learn)](https://scikit-learn.org)
[![Database](https://img.shields.io/badge/Database-SQLite_WAL_+_SQLAlchemy_2.0-003B57?style=flat&logo=sqlite)](https://www.sqlite.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **ChainMind AI** is an enterprise-grade, agentic supply chain intelligence platform designed to understand, predict, and resolve physical supply disruptions before they cause stockouts or revenue loss.

Inspired by state-of-the-art platforms like **Palantir Foundry**, **Kinaxis RapidResponse**, and **E2open**, ChainMind unites data engineering, predictive machine learning, mathematical operations research (Google OR-Tools), grounded contract RAG, and an autonomous human-in-the-loop AI copilot into a unified workspace.

---

## 🏛️ System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                  ChainMind AI — Modern Cyber Slate React 18 UI                │
│   [Executive Overview] [Copilot Studio] [Forecasting] [Inventory] [Logistics] │
│   [Supplier Scorecards] [Optimization Lab] [Knowledge Hub] [Action Center]    │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │ REST API (JSON)
┌──────────────────────────────────────▼───────────────────────────────────────┐
│                           FastAPI Asynchronous Backend                       │
│                                                                              │
│   ┌──────────────────────────────────────────────────────────────────────┐   │
│   │                     Agentic Copilot Supervisor                       │   │
│   │   • Intent Classifier & Workflow Router (Groq Llama 3.3 / Offline)   │   │
│   │   • Structured Tool Execution & Telemetry State Machine              │   │
│   │   • Inspectable Evidence Drawer & Proposal Generator                 │   │
│   └───────────────┬───────────────────┬───────────────────┬──────────────┘   │
│                   │                   │                   │                  │
│   ┌───────────────▼──────────┐ ┌──────▼─────────────┐ ┌───▼──────────────┐   │
│   │ Demand Forecasting Engine│ │ OR-Tools Optimizer │ │ Grounded RAG Hub │   │
│   │ • Lag Feature Pipeline   │ │ • SCIP MILP Solver │ │ • n-gram Vector  │   │
│   │ • Walk-Forward Backtest  │ │ • 18d Donor Rule   │ │ • Exact Clause   │   │
│   │ • P10 / P50 / P90 Bands  │ │ • Budget & SLA     │ │ • Abstention     │   │
│   └───────────────┬──────────┘ └──────┬─────────────┘ └───┬──────────────┘   │
│                   │                   │                   │                  │
│   ┌───────────────▼───────────────────▼───────────────────▼──────────────┐   │
│   │                     Enterprise SQLite (WAL Mode)                     │   │
│   │   • 30 SKUs Across 4 Categories        • 4 Regional Fulfillment Hubs │   │
│   │   • 8 Tiered Suppliers (Lead Time Var) • 43,920 Daily Sales Records  │   │
│   │   • Purchase Orders & Live Shipments   • Risk Registry & Audit Logs  │   │
│   └──────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 The 12 Product Modules

| # | Module | Core Functionality |
| :--- | :--- | :--- |
| **1** | **Executive Overview Dashboard** | Real-time calculation of Total Inventory Value (`INR 26.07 Cr`), At-Risk SKUs, Late Shipments, High-Risk Suppliers, and Autonomous Daily Briefing. |
| **2** | **AI Copilot Studio** | Conversational agent connected directly to the database, models, and solvers with an **Inspectable Evidence Drawer** displaying underlying SQL/MILP telemetry. |
| **3** | **Demand Forecasting Intelligence** | Time-series machine learning model comparing **Gradient Boosting** vs. **Seasonal-Naïve Baseline** ($y_t = y_{t-7}$) with walk-forward backtesting, WAPE/MAE error tracking, and $P_{10}/P_{50}/P_{90}$ prediction intervals. |
| **4** | **Inventory Intelligence & Replenishment** | Multi-facility tracking across 120 inventory nodes. Computes dynamic Safety Stock ($SS = z \cdot \sqrt{LT \cdot \sigma_d^2 + \mu_d^2 \cdot \sigma_{LT}^2}$) and Reorder Points ($ROP$). |
| **5** | **Supplier Intelligence & Procurement** | Scorecards measuring On-Time Delivery (OTD), lead-time variance ($\sigma_{LT}$), and defect rates. Automated Draft Purchase Order builder with contract volume rebates. |
| **6** | **Logistics & Shipment Intelligence** | Active shipment tracker with predictive machine learning delay risk, carrier SLAs (BlueDart, Delhivery, Maersk, Gati), and downstream stockout correlation. |
| **7** | **Supply Chain Risk & Disruption Center** | Cross-echelon risk registry ranking operational threats by probability, urgency, and estimated financial impact. |
| **8** | **Optimization Lab & What-If Simulator** | Interactive slider simulator powered by **Google OR-Tools SCIP MILP** comparing **Accept Delay** vs. **Expedite Freight** vs. **Inter-Warehouse Transfer**. |
| **9** | **Knowledge Hub & Grounded RAG** | Hybrid semantic retrieval over supplier Master Supply Agreements (MSAs), Delegation of Authority (DOA) matrices, and disruption playbooks with anti-hallucination abstention guardrails. |
| **10** | **Action Center & Human Governance** | Human-in-the-loop review queue for AI-proposed actions (`Draft` $\to$ `Pending Approval` $\to$ `Approved` $\to$ `Executed`) with immutable execution audit logs. |
| **11** | **Automated Alerts & Telemetry Monitor** | Autonomous background monitor evaluating stockout thresholds and carrier bottlenecks. |
| **12** | **Analytics & Operations Performance** | Benchmarks simulated operational ROI against historical baseline shortage penalties. |

---

## 🔬 Core Engineering Innovations

### 1. Operations Research (Google OR-Tools) vs. LLM Hallucination
Rather than allowing an LLM to hallucinate order quantities, ChainMind delegates numerical decision-making to Google OR-Tools:
- **Mathematical Formulation**: Solves a Mixed-Integer Linear Program (MILP) minimizing transfer shipping costs and residual shortage penalties:
  $$\min \sum_{w} \text{TransferCost}_{w} \cdot x_{w} + \text{ShortagePenalty} \cdot S$$
- **Hard Operational Constraints**:
  1. $\sum_{w} x_{w} + S = \text{Needed Units}$
  2. $x_{w} \le \max(0, \text{Stock}_{w} - 18 \cdot \mu_{d,w})$ *(Mandatory 18-day retention rule per SOP-OPS-2025-08)*
  3. Total Cost $\le \text{Budget Cap}$

### 2. Time-Series Feature Engineering Without Data Leakage
The demand forecasting pipeline uses walk-forward backtesting:
- Lags ($t_{-1}, t_{-2}, t_{-7}, t_{-14}, t_{-28}$) and rolling statistics (7d, 14d, 28d) strictly shift by 1 day to prevent lookahead leakage.
- Incorporates calendar day-of-week, festive season multipliers (Diwali, New Year, Republic Day), and organic annual growth trends.
- Tracks **WAPE (Weighted Absolute Percentage Error)** and **MAE** against the baseline.

### 3. Grounded Local RAG with Anti-Hallucination Abstention
- Ingests contracts and SOPs with structural markdown chunking.
- Preserves document IDs, hierarchical section titles, and page numbers.
- **Strict Governance Guardrail**: Evaluates domain scope and cosine similarity. If the query is out of scope (e.g., *"What is company policy on employee vacation in Hawaii?"*), the system refuses to hallucinate and triggers an explicit abstention notice.

### 4. Dual-Mode Agent Architecture
- **Production Mode**: Calls **Groq API** (`llama-3.3-70b-versatile`) with sub-second tool-calling latency.
- **Offline / Recruiter Mode**: Embedded with a deterministic reasoning engine that selects tools, executes queries, and structures responses out-of-the-box without requiring an API key.

---

## 🚀 Quickstart & Single-Click Launch

### Prerequisites
- Python 3.10+ (Tested on Python 3.13)
- Node.js 18+ (Tested on Node.js 24)

### 1-Click Launch (Windows)
Double-click [`run_demo.bat`](file:///d:/Personal/Google%20Antigravity%20projects/ChainMind%20AI/run_demo.bat) or run:
```powershell
.\run_demo.bat
```
This automatically seeds the SQLite database, launches the FastAPI backend on `http://localhost:8000`, launches the React Vite frontend on `http://localhost:5173`, and opens your default browser.

### 1-Click Launch (macOS / Linux)
```bash
chmod +x run_demo.sh
./run_demo.sh
```

### Manual Startup
```bash
# 1. Seed the Database
python -m backend.app.data.seed

# 2. Start FastAPI Backend
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000

# 3. Start React Frontend (In a separate terminal)
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

---

## 🧪 Automated Test Suite

Run the automated test suite covering all core engines:
```bash
python -m pytest tests/ -v
```

**Test Coverage Highlights**:
- `test_forecasting_pipeline`: Verifies lag features, backtesting, and uncertainty ordering ($P_{10} \le P_{50} \le P_{90}$).
- `test_ortools_optimization`: Verifies MILP constraint satisfaction, cost minimization, and donor 18-day health checks.
- `test_rag_grounding_and_abstention`: Validates verified citation extraction and anti-hallucination guardrail triggers.
- `test_action_center_lifecycle`: Tests human approval state machine transitions (`Pending` $\to$ `Approved` $\to$ `Executed`).
- `test_api_endpoints_health`: Confirms all REST endpoints return HTTP 200 OK.

---

## 💼 Recruiter & Portfolio Walkthrough Script

When presenting this project in an interview, showcase the following flow:
1. **The Executive Problem** (Dashboard): Show how `SKU-AUD-101` in Delhi has only 2.8 days of supply remaining because scheduled replenishment `PO-2026-101` via BlueDart is delayed 48 hours at Jaipur.
2. **Consulting the Copilot**: Ask *"Which products are likely to stock out in Delhi next week, and what should we do?"* Point out the supervisor thought process, tool execution badges, and the **Inspectable Evidence Drawer**.
3. **What-If Optimization** (Operations Research): Move to the **Optimization Lab**. Show how Google OR-Tools evaluates 3 alternatives and mathematically proves that **Scenario C (Inter-Warehouse Stock Transfer)** from Mumbai protects INR 605,748 with a transfer cost of only INR 6,145.
4. **Knowledge Hub (RAG Grounding)**: Search *"What is the penalty if Apex delivers late?"* to show exact contract clause citations ([`MSA-2024-APEX-001 §4.1`]). Then ask an out-of-scope question to demonstrate anti-hallucination abstention.
5. **Human Governance** (Action Center): Review the generated recommendation and click **Approve** followed by **Dispatch & Execute Manifest**, showing the immutable audit record created in the database.

---

## 📄 License
This project is open-source under the MIT License.
