# ⚡ Recura — Autonomous AI Revenue Recovery Engine

> **Recura** is a production-grade, policy-governed AI revenue recovery agent for modern merchants. It autonomously detects revenue at risk, diagnoses payment failures with contextual reasoning, negotiates recovery via **Hinglish AI Voice/Chat**, extracts **Promise-to-Pay (PTP)** commitments, strictly enforces merchant policy guardrails, executes idempotent retries, and measures actual recovered revenue against standard baselines.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-recura.onrender.com-lime?style=for-the-badge&logo=render&logoColor=white)](https://recura.onrender.com)
[![Tests](https://img.shields.io/badge/Tests-22%20Passed-brightgreen?style=for-the-badge&logo=vitest&logoColor=white)](https://github.com/Atulya-arch/Recura)
[![RAM Usage](https://img.shields.io/badge/Memory-~75MB%20RSS-blue?style=for-the-badge&logo=node.js&logoColor=white)](https://github.com/Atulya-arch/Recura)

---

## 🌟 Key Highlights & Standout Capabilities

| Feature | Description |
| :--- | :--- |
| 🧠 **Dual AI Engine** | Powered by **Google Gemini 3.6 Flash** with an ultra-fast deterministic fallback heuristic engine. |
| 🎙️ **Hinglish AI Voice & Chat** | Generates culturally nuanced Hindi+English hybrid scripts for Indian customers with real in-browser audible voice synthesis. |
| 📅 **Promise-to-Pay (PTP) NLP** | Autonomous natural language date extractor (e.g. *"Salary 7th ko aayegi, tab charge kar lena"*) that locks and schedules future retry windows. |
| 🛡️ **Merchant Policy Guardrails** | Hard limits on retries, automated actions, recovery timeframes, and minimum AI confidence thresholds. **AI recommends. Policy governs.** |
| 🔒 **Idempotency & Timeout Safety** | SHA-256 idempotency key deduplication prevents double charges. Gateway timeouts trigger authoritative state verification. |
| 📦 **Ultra-Low Memory SQLite DB** | Native high-speed SQLite engine (`better-sqlite3` + `drizzle-orm`) using only ~75MB RAM. Zero external cloud DB required. |
| 🎨 **Flux-Inspired UI Theme** | High-contrast modern interface with matte dark sidebar, warm canvas, and Volt Lime (`#d4ff32`) accents. |

---

## 1. Core Architecture & Governance Model

```
               +----------------------------------+
               |     DETECT REVENUE AT RISK       |  <-- Checkout drop-offs & failed transactions
               +----------------+-----------------+
                                |
                                v
               +----------------------------------+
               |        AI REASONING ENGINE       |  <-- Failure root-cause diagnosis
               | (Gemini 3.6 Flash + Hinglish)    |  <-- Recommends Action & Customer copy
               +----------------+-----------------+
                                |
                                v
               +----------------------------------+
               |      POLICY ENGINE GATEWAY       |  <-- Independent deterministic check
               |  (Hard Limits, Caps, Confidence) |  <-- Blocks unauthorized automation
               +----------------+-----------------+
                                |
               +----------------+----------------+
               |                                 |
               v (If Customer Negotiates)        v (If Policy Approved)
+-------------------------------+ +----------------------------------+
|   PROMISE-TO-PAY (PTP) NLP    | |   SAFE EXECUTION & VERIFICATION  |
|  Date Extraction & Scheduling | |  Idempotency Key + Auth Verify   |
+---------------+---------------+ +----------------+-----------------+
                |                                  |
                +----------------+-----------------+
                                 |
                                 v
               +----------------------------------+
               |        IMMUTABLE AUDIT LOG       |  <-- Every decision recorded for merchants
               |     (SQLite Event Ledger)        |
               +----------------+-----------------+
                                 |
                                 v
               +----------------------------------+
               |  MEASURE INCREMENTAL REVENUE     |  <-- Dynamic calculation vs naive baseline
               +----------------------------------+
```

---

## 2. AI vs. Deterministic Governance

| Area | Handled By | Guarantees |
| :--- | :--- | :--- |
| **Failure Diagnosis & Strategy** | **AI Agent (Gemini 3.6 Flash)** | Identifies root causes (`NETWORK_FAILURE`, `INSUFFICIENT_FUNDS`, `BANK_FAILURE`, `ABANDONMENT`). |
| **Hinglish Communication** | **AI Agent** | Contextual personalized communication tailored for Indian merchants & buyers. |
| **PTP Date Extraction** | **AI NLP Parser** | Extracts promised payment dates from unstructured customer replies. |
| **Money Calculations** | **Deterministic Engine** | All calculations performed in integer minor units (paise/cents). No floating-point inaccuracies. |
| **Policy Guardrails** | **Policy Engine** | Hard stops after max retries or elapsed recovery windows. |
| **Duplicate Prevention** | **Recovery Executor** | Deduplicates repeat executions via unique idempotency keys. |
| **Timeout Handling** | **Payment Provider** | Never retries on ambiguous `UNKNOWN` timeouts without authoritative gateway query. |

---

## 3. Recovery Workflow State Machine

```
DETECTED ➔ DIAGNOSING ➔ PLANNED ➔ POLICY_CHECK ➔ READY ➔ EXECUTING ➔ VERIFYING ➔
  ├── RECOVERED (Payment confirmed)
  ├── PROMISE_TO_PAY (Customer scheduled committed date)
  ├── RETRY_SCHEDULED (Exponential backoff window)
  ├── ESCALATED (Safety limit reached / Human handoff)
  └── STOPPED (Policy blocked / Customer opted out)
```

---

## 4. Quick Start & Local Setup

### Prerequisites
- Node.js v18+ (Node v20+ recommended)
- npm v9+

### Installation & Launch
```bash
# 1. Clone repository
git clone https://github.com/Atulya-arch/Recura.git
cd Recura

# 2. Install dependencies
npm install

# 3. (Optional) Set your Gemini API Key in .env
echo "GEMINI_API_KEY=your_gemini_api_key" > .env

# 4. Start local development server (Backend + Vite Frontend)
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser!

---

## 5. Available Scripts & Testing

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts concurrent backend API server on `:3001` and Vite client on `:3000`. |
| `npm test` | Runs the Vitest test suite (**22 unit tests passing**). |
| `npm run build` | Compiles TypeScript, builds React SPA in `dist/client`, and bundles Node backend. |
| `npm run seed` | Seeds 1,200 transactions & 417 candidate cases into embedded SQLite database. |
| `npm run evaluate` | Runs high-speed batch evaluation comparing Recura Autopilot against naive baseline. |
| `npm run demo` | Executes deterministic terminal recovery workflows. |

---

## 6. Live Hackathon Demo Scenarios

In the **Overview Dashboard**, use the interactive scenario buttons to test the engine deterministically:

1. **Successful Recovery**: Failure ➔ AI Diagnosis ➔ Immediate Retry ➔ Verified Success.
2. **Gateway Timeout**: Timeout ➔ Status `UNKNOWN` ➔ Authoritative Gateway Verification ➔ Duplicate Protection.
3. **Retry Limit Policy**: Repeated Failures ➔ Max Retries Limit Reached ➔ Automation Blocked & Escalated.
4. **Duplicate Protection**: Repeated key execution ➔ Idempotency Blocked & Logged to Audit Trail.

---

## 7. Cloud Deployment (1-Click Monolith)

Recura is packaged as a zero-dependency self-contained monolith (Express backend + Embedded SQLite DB + React SPA static build).

### Deploying to Render.com:
1. Create a **New Web Service** connected to your GitHub repo (`https://github.com/Atulya-arch/Recura.git`).
2. **Runtime**: `Node`
3. **Build Command**: `npm install && npm run build && npm run seed`
4. **Start Command**: `npm start`
5. **Environment Variables**:
   - `NODE_ENV`: `production`
   - `GEMINI_API_KEY`: *(Your Google Gemini API Key)*

*(No external database service or payment gateway account needed — embedded SQLite and the Simulation Provider run seamlessly out of the box).*
