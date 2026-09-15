# Solution Overview — Clinical Trial Risk Monitor

## What We Built

The **Clinical Trial Risk Monitor (CTRM)** is an AI-powered compliance platform that automatically monitors clinical trial sites, detects protocol deviations, scores site risk, and generates regulatory-ready CAPA reports — all accessible through **IBM Bob** via a custom MCP (Model Context Protocol) server.

A clinical monitor can ask Bob in plain English:
> *"Which sites are at critical risk this week?"*
> *"Detect all deviations for patient PAT-042 at SITE-007"*
> *"Generate a CAPA report for SITE-001"*

Bob calls the appropriate MCP tools, which call real application services, which query live MongoDB data — and returns a structured, actionable result in seconds.

---

## How It Works

```
1. Patient visit records ingested into MongoDB
         ↓
2. Deviation detection runs (rule engine, no LLM)
         ↓
3. Each deviation classified: Major / Minor / Administrative
         ↓
4. Site risk score calculated: 0–100 (weighted formula)
         ↓
5. Deviations indexed in ChromaDB for semantic search
         ↓
6. CAPA report generated (LLM grounded on verified data)
         ↓
7. IBM Bob queries everything via 8 MCP tools
```

### Step-by-step detail

1. **Data Ingestion** — `SeedService` generates 200 sites, 5,000 patients, and ~30,000 visits with realistic synthetic data in MongoDB. Each visit records: actual date, completed procedures, medications taken, adherence percentage.

2. **Protocol Deviation Detection** — `DeviationService` compares each visit against the protocol specification using a deterministic rule engine:
   - Visit date vs. allowed window (`±N days`)
   - Completed procedures vs. required procedure list
   - Medications taken vs. prohibited medication list
   - Adherence percentage vs. 80% threshold

3. **Severity Classification** — Each deviation is classified per ICH E6 GCP rules:
   - `Major` — patient safety or data integrity impact (missed visits, prohibited meds, dosing errors)
   - `Minor` — protocol departure without direct safety impact (late/early visits)
   - `Administrative` — record-keeping gaps (CRF errors)

4. **Site Risk Scoring** — `RiskScoreService` calculates a weighted 0–100 score:
   ```
   score = (major × 15) + (minor × 5) + (admin × 1) + (open × 3) + (rate>30% ? 10 : 0)
   ```
   Cached in Redis (5-min TTL). Trend calculated over rolling 30-day windows.

5. **Semantic Search** — `ChromaService` indexes deviation text in ChromaDB. Monitors can search for similar historical cases to inform CAPA decisions.

6. **CAPA Generation** — `CapaReportService` builds a CAPA report using:
   - Verified deviation data from MongoDB (no hallucination)
   - Deterministic corrective/preventive actions from rule engine
   - LLM (watsonx.ai or OpenAI) for narrative root cause analysis only

7. **IBM Bob Integration** — All 7 capabilities above are exposed as 8 MCP tools. Bob discovers them automatically via `tools/list` and invokes them during natural language conversations.

---

## Architecture Diagram

```
Clinical Monitor / CRA
        │
        ├── IBM Bob (natural language)
        │       │
        │       └── MCP Client → TypeScript MCP Server (8 tools)
        │                               │
        │                               └── BackendClient (HTTP)
        │                                       │
        │                        ┌──────────────┤
        │                        ▼              ▼
        │                   Express API    Services
        │                        │    ┌────────────────────┐
        │                        │    │ DeviationService   │
        │                        │    │ RiskScoreService   │
        │                        │    │ CapaReportService  │
        │                        │    │ ChromaService      │
        │                        │    │ LLMService         │
        │                        │    └────────────────────┘
        │                        │           │
        │                  ┌─────┼───────────┤
        │                  ▼     ▼           ▼
        │              MongoDB  Redis    ChromaDB
        │
        └── React Dashboard (localhost:5173)
                │
                └── REST API → Express Backend (localhost:3001)
```

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| **No LLM for risk scoring or deviation detection** | Deterministic rules are auditable, explainable, and reproducible — critical for FDA-facing systems. LLM outputs cannot be used as regulatory evidence. |
| **MCP over REST API for Bob integration** | MCP gives Bob structured tool discovery, typed inputs/outputs, and error handling — making Bob a genuine load-bearing component, not just a wrapper. |
| **Redis caching for risk scores** | Risk score calculation requires aggregating all deviations per site — expensive at scale. 5-minute Redis cache makes it sub-100ms after first call. |
| **ChromaDB for deviation search** | Semantic similarity across historical deviations enables CAPA teams to find precedents without knowing exact IDs or text — critical for large trial histories. |
| **Grounded CAPA generation** | LLM receives only verified MongoDB records as context. System prompt explicitly forbids inventing patient facts. Corrective actions are generated deterministically. |
| **Dual transport (stdio + SSE)** | `stdio` for IBM Bob local integration; `SSE` for Docker/container deployments — same server, different transport. |

---

## IBM Technologies Used

### IBM Bob
Bob is the **primary user interface** for this system. Clinical monitors interact with CTRM entirely through Bob's chat interface:
- Bob discovers 8 MCP tools automatically via `tools/list`
- Bob selects the appropriate tool(s) based on the user's natural language query
- Bob calls the tool with structured parameters
- Bob presents the structured JSON result as a natural language response

Bob is not a thin wrapper — it is a **load-bearing component**. Without Bob, the MCP layer has no user interface.

**Development workflow:** Bob was also used during development for planning, code review, debugging TypeScript errors, and generating documentation.

### IBM watsonx.ai
Used as the **primary LLM provider** for CAPA narrative generation:
- Model: `ibm/granite-13b-instruct-v2`
- Called via IBM IAM token authentication → watsonx inference API
- Temperature: 0.3 (low, for regulatory-appropriate consistency)
- Only called when `LLM_PROVIDER=watsonx` is set in environment
- Falls back to OpenAI or stub if not configured

watsonx.ai is used **only for natural language generation** — never for risk calculations, severity classification, or deviation detection.

---

## What We Are Most Proud Of

The IBM Bob MCP integration — 8 purpose-built tools that make Bob a genuine load-bearing component of a real clinical compliance system. A clinical monitor can go from zero to a full site risk assessment in one conversation, without ever opening a database or running a query.
