# CTRM MCP Server Documentation

## Overview

The Clinical Trial Risk Monitor (CTRM) Model Context Protocol (MCP) Server provides an AI-orchestrated compliance and deviation monitoring interface for clinical trials. Designed for integration with **IBM Bob**, the MCP server enables autonomous analysis of patient visits, ICH E6 GCP protocol deviation detection and severity classification, predictive site risk scoring, ChromaDB semantic deviation lookup, and grounded CAPA report generation.

---

## MCP Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        IBM Bob                          │
│                     (MCP Client)                        │
└──────────────────────────┬──────────────────────────────┘
                           │ (stdio / SSE JSON-RPC)
┌──────────────────────────▼──────────────────────────────┐
│                  TypeScript MCP Server                  │
│                (@modelcontextprotocol/sdk)              │
│  - Input validation (Zod)                               │
│  - Thin controlled interface layer                      │
│  - Centralized error handling & timeout control         │
└──────────────────────────┬──────────────────────────────┘
                           │ (Typed BackendClient / HTTP)
┌──────────────────────────▼──────────────────────────────┐
│           Application / Backend Service Layer           │
│  - DeviationService (ICH E6 GCP Rule Engine)            │
│  - RiskScoreService (Leading Indicators & Tiers)        │
│  - ChromaService (Vector Embeddings & Precedents)       │
│  - CapaReportService (Grounded Root Cause & Actions)    │
│  - LLMService (watsonx.ai / OpenAI)                     │
└──────────────────────────┬──────────────────────────────┘
                           │
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
    MongoDB            ChromaDB              Redis
 (Patient/Visit/    (Deviation Vector     (Risk Scores &
  Protocol Data)       Embeddings)         Report Cache)
```

---

## Available MCP Tools

| # | Tool Name | Parameters | Output / Description |
|---|---|---|---|
| 1 | `get_patient_records` | `siteId` (or `site_id`), `patientId` (or `patient_id`), `visitId` (or `visit_id`), `page`, `limit` | Structured patient and visit records with vital signs, lab results, and visit timestamps. |
| 2 | `get_protocol_spec` | `protocolId` / `trial_id` | Full clinical trial protocol specification: visit schedule, permitted windows, procedure checklists, dosage constraints, and prohibited co-medications. |
| 3 | `detect_deviations` | `patientId` (or `patient_id`), `visitId` (or `visit_id`), `siteId` (or `site_id`), `from`, `to` | List of detected protocol deviations (`deviation_id`, `protocol_clause`, `observed_value`, `expected_value`, `status`, `evidence`). |
| 4 | `classify_severity` | `deviationId` (or `deviation_id`), `deviationText` (or `deviation_text`) | ICH E6 GCP severity classification (`Major`, `Minor`, `Administrative`), clinical reasoning, and confidence score. |
| 5 | `get_site_risk_score` | `siteId` (or `site_id`) | Site risk score (0–100), risk tier (`Low`, `Medium`, `High`, `Critical`), contributing factors, and deviation counts. |
| 6 | `list_high_risk_sites` | `threshold` (default: 50), `limit` (default: 50) | Ranked list of high-risk sites exceeding the risk threshold, sorted highest risk first. |
| 7 | `search_similar_deviations` | `query` (or `query_text`), `topK` (or `top_k`, default: 5) | Semantic vector search across historical deviations in ChromaDB to retrieve precedents and mitigation strategies. |
| 8 | `generate_capa_report` | `siteId` (or `site_id`), `deviationIds` (or `deviation_id` / `deviation_ids`) | Grounded CAPA-ready report with root cause analysis, immediate corrective actions, and systemic preventive measures. |

---

## Local MCP Server Startup

### Prerequisites
- Node.js 18+
- Backend API running on `http://localhost:3001` (or configured via `BACKEND_URL`)

### Build & Run
```bash
cd src/mcp-server
npm install
npm run build
```

#### Run on stdio (Default for IBM Bob):
```bash
npm start
```

#### Run on SSE (For container/remote testing):
```bash
MCP_TRANSPORT=sse MCP_PORT=3002 npm start
```
- SSE endpoint: `http://localhost:3002/sse`
- Health check: `http://localhost:3002/health`

---

## IBM Bob Integration

The project provides `.bob/mcp.json` for plug-and-play registration with IBM Bob:

```json
{
  "mcpServers": {
    "clinical-trial-monitor": {
      "command": "node",
      "args": ["src/mcp-server/dist/index.js"],
      "env": {
        "NODE_ENV": "development",
        "MCP_TRANSPORT": "stdio",
        "BACKEND_URL": "http://localhost:3001",
        "LOG_LEVEL": "info",
        "MCP_PORT": "3002"
      },
      "description": "Clinical Trial Risk Monitor — detects protocol deviations, classifies ICH E6 GCP severity, calculates site risk scores, searches similar historical deviations, and generates CAPA-ready reports."
    }
  }
}
```

---

## Required Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `NODE_ENV` | `development` | Runtime environment mode (`development`, `production`, `test`) |
| `MCP_TRANSPORT` | `stdio` | Transport protocol: `stdio` (IBM Bob) or `sse` (Docker / HTTP) |
| `MCP_PORT` | `3002` | Port used when running SSE transport |
| `BACKEND_URL` | `http://localhost:3001` | URL of the backend application service layer |
| `LOG_LEVEL` | `info` | Structured logging verbosity (`debug`, `info`, `warn`, `error`) |

---

## CAPA Safety & Compliance Rules

1. **Zero Hallucination Guarantee**: The LLM never invents patient facts, trial dates, or protocol rules.
2. **Context Grounding**: The LLM receives strictly verified deviation records from the database.
3. **Deterministic Risk Calculations**: Severity classifications and site risk scores are calculated by deterministic algorithms and leading indicators, never guessed by the LLM.
4. **Structured Error Handling**: If required data is missing or a service is unavailable, structured error states are returned without exposing stack traces or credentials.

---

## Verification & Testing

Run the test suite:
```bash
cd src/mcp-server
npm test
```

Build the TypeScript distribution:
```bash
cd src/mcp-server
npm run build
```
