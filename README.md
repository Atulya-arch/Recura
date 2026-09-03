# RECURA — AI Revenue Recovery, on Autopilot

> **Recura** is an AI revenue-recovery agent for merchants that automatically detects revenue at risk, diagnoses payment failure root causes, decides the appropriate recovery intervention, validates every action against deterministic merchant policy guardrails, executes recovery safely, and measures actual recovered revenue compared to standard baselines.

---

## 1. Core Architecture & Workflow

```
               +-----------------------+
               |  DETECT REVENUE AT    |
               |        RISK           |
               +-----------+-----------+
                           |
                           v
               +-----------------------+
               |     AI DIAGNOSIS      |  <-- Interprets failure reason & strategy
               +-----------+-----------+
                           |
                           v
               +-----------------------+
               | POLICY ENGINE GATE    |  <-- Independent deterministic check
               +-----------+-----------+
                           |
                           v
               +-----------------------+
               |   SAFE EXECUTION &    |  <-- Idempotency check + Provider call
               |     VERIFICATION      |  <-- Timeout -> Authoritative verification
               +-----------+-----------+
                           |
                           v
               +-----------------------+
               | STOP / RETRY /        |
               |      ESCALATE         |
               +-----------+-----------+
                           |
                           v
               +-----------------------+
               |   MEASURE RECOVERED   |  <-- Derived strictly from DB records
               |       REVENUE         |
               +-----------------------+
```

---

## 2. AI vs. Deterministic Responsibilities

| Responsibility Area | Handled By | Details |
| :--- | :--- | :--- |
| **Failure Interpretation & Diagnosis** | **AI Agent** | Analyzes error codes, customer payment history, and checkout state. |
| **Strategy & Messaging Recommendation**| **AI Agent** | Recommends `IMMEDIATE_RETRY`, `DELAYED_RETRY`, `REMINDER`, or `ESCALATE`. |
| **Money & Monetary Limits** | **Deterministic Code**| Uses integer minor units (paise / cents). No floats. |
| **Policy Enforcement & Guardrails** | **Policy Engine** | Checks retry counts, time windows, and AI confidence thresholds. |
| **Idempotency & Execution** | **Recovery Executor**| Prevents duplicate payments using idempotency keys. |
| **Verification & State Machine** | **Payment Provider** | Handles `UNKNOWN` timeouts via authoritative gateway verification. |
| **Metrics & Evaluation** | **Evaluation Engine** | Dynamically calculates baseline vs Recura revenue recovered from DB. |

---

## 3. Recovery Workflow State Machine

`DETECTED` → `DIAGNOSING` → `PLANNED` → `POLICY_CHECK` → `READY` → `EXECUTING` → `VERIFYING` → (`RECOVERED` | `RETRY_SCHEDULED` | `ESCALATED` | `STOPPED` | `FAILED`)

---

## 4. Setup & Running Instructions

### Environment Variables
Create a `.env` file in the root directory (optional for Gemini AI & Razorpay Test Mode):
```env
PORT=3001
GEMINI_API_KEY=your_gemini_api_key
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

### Installation
```bash
npm install
```

### Seed Synthetic Dataset (1,200 Deterministic Transactions)
```bash
npm run seed
```

### Run Evaluation Runner (Recura vs Baseline)
```bash
npm run evaluate
```

### Run Unit Tests
```bash
npm test
```

### Launch Monolith Application (Server + Dashboard)
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Live Hackathon Demo Scenarios

In the merchant dashboard header, click any of the 4 live demo scenario buttons:

1. **Successful Recovery**: Demonstrates failure → AI diagnosis → policy approval → retry → verified success.
2. **Gateway Timeout**: Demonstrates retry → gateway timeout → status `UNKNOWN` → authoritative verification → safe decision.
3. **Retry Limit Policy**: Demonstrates repeated failures → max retry policy reached → automation blocked → safe escalation.
4. **Duplicate Protection**: Demonstrates repeated execution with identical idempotency key → duplicate attempt blocked & logged to audit trail.

---

## 6. Evaluation Methodology & Baseline

- **Dataset**: 1,200 deterministic synthetic transactions generated with fixed PRNG seed (`seed = 42`).
- **Baseline**: Naive single retry across all eligible failed payments.
- **Recura Engine**: Intelligent state-machine recovery guided by AI diagnosis and constrained by policy engine.
- **No Hardcoded Metrics**: All numbers on the dashboard and evaluation runner are calculated directly from stored database records.
