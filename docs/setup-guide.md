# Setup Guide — Clinical Trial Risk Monitor

> **This file is read by the automated evaluation pipeline. Be precise and complete.**

---

## Prerequisites

Before you begin, ensure you have the following installed:

- [x] **Node.js 20+** — `node --version`
- [x] **npm 10+** — `npm --version`
- [x] **Docker Desktop** — required for MongoDB, Redis, ChromaDB
- [x] **IBM Bob 2.1.0+** — for MCP integration (optional for backend-only testing)

---

## Repository Structure

```
bob-ai-hackathon-submission-template/
├── .bob/
│   └── mcp.json              ← Bob project-level MCP server config
├── src/
│   ├── backend/              ← Express API (port 3001)
│   ├── mcp-server/           ← TypeScript MCP server (stdio / SSE)
│   ├── frontend/             ← React + Tailwind dashboard (port 5173)
│   ├── shared/               ← Shared TypeScript types
│   ├── data/                 ← Seed scripts
│   └── .env.example          ← Environment variable template
├── docs/
├── demo/
├── presentation/
└── docker-compose.yml
```

---

## Environment Variables

Copy `.env.example` to `.env` inside the `src/` directory and fill in your values:

```bash
cp src/.env.example src/.env
```

| Variable | Description | Required |
|---|---|---|
| `NODE_ENV` | `development` / `production` / `test` | Yes |
| `BACKEND_PORT` | Express API port (default: `3001`) | Yes |
| `MCP_PORT` | MCP SSE server port (default: `3002`) | Yes |
| `MCP_TRANSPORT` | `stdio` (for Bob) or `sse` (for Docker) | Yes |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `CHROMA_URL` | ChromaDB URL (default: `http://localhost:8000`) | Yes |
| `BACKEND_URL` | URL MCP server uses to call backend (default: `http://localhost:3001`) | Yes |
| `LLM_PROVIDER` | `watsonx` / `openai` / `none` | Yes |
| `WATSONX_API_KEY` | IBM watsonx.ai API key | Only if `LLM_PROVIDER=watsonx` |
| `WATSONX_PROJECT_ID` | watsonx.ai project ID | Only if `LLM_PROVIDER=watsonx` |
| `WATSONX_URL` | watsonx.ai endpoint | Only if `LLM_PROVIDER=watsonx` |
| `OPENAI_API_KEY` | OpenAI key (fallback LLM) | Only if `LLM_PROVIDER=openai` |
| `LOG_LEVEL` | Pino log level (`info` recommended) | No |

> **Never place API keys in `.bob/mcp.json`.** The MCP server reads `BACKEND_URL` from its `env` block; all other secrets remain in `src/.env` loaded by the backend.

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/23dit040/bob-ai-hackathon-team-elite.git
cd bob-ai-hackathon-team-elite
```

### 2. Install backend dependencies

```bash
cd src/backend
npm install
cd ../..
```

### 3. Install and build MCP server

```bash
cd src/mcp-server
npm install
npm run build
cd ../..
```

> The build outputs compiled JavaScript to `src/mcp-server/dist/`. Bob will launch `src/mcp-server/dist/index.js` via `node`.

### 4. Install frontend dependencies

```bash
cd src/frontend
npm install
cd ../..
```

---

## Running the Full Stack

### Option A — Docker Compose (recommended)

```bash
# From repo root
docker compose up --build
```

This starts:
- **MongoDB** on port 27017
- **Redis** on port 6379
- **ChromaDB** on port 8000
- **Backend API** on port 3001
- **Frontend** on port 5173

### Option B — Local (without Docker)

Start MongoDB, Redis, and ChromaDB manually, then:

```bash
# Terminal 1 — Backend
cd src/backend
npm run dev

# Terminal 2 — Frontend
cd src/frontend
npm run dev
```

The MCP server does **not** need to be started manually — Bob launches it automatically via `stdio` using the config in `.bob/mcp.json`.

---

## Seed Synthetic Data

After all services are running:

```bash
# With Docker
docker compose run --rm backend npm run seed

# Or locally
cd src/backend
npm run seed
```

This seeds 5,000 patient visits across 200 sites with synthetic deviations.

---

## Running Tests

```bash
# MCP server tests (28 tests)
cd src/mcp-server
npm test

# Backend tests (8 tests)
cd src/backend
npm test

# Frontend tests (1 test)
cd src/frontend
npm test
```

---

## IBM Bob MCP Integration Setup

The MCP server is pre-configured at **project scope** in `.bob/mcp.json`. Bob reads this file automatically when you open the project folder.

### Step-by-Step: Add the MCP Server in Bob

1. **Build the MCP server** (one-time, or after code changes):
   ```bash
   cd src/mcp-server
   npm run build
   ```

2. **Open the project folder in Bob**:
   - Launch IBM Bob
   - Open the folder: `bob-ai-hackathon-submission-template/`
   - Bob will detect `.bob/mcp.json` automatically

3. **Verify the server appears in Bob's MCP panel**:
   - Go to **Settings → MCP Servers**
   - You should see **`clinical-trial-monitor`** listed
   - Status should show ✅ **Connected** (only when backend is running)

4. **Start the backend before using tools**:
   ```bash
   docker compose up   # or: cd src/backend && npm run dev
   ```

5. **Reload MCP config if needed**:
   - In Bob: **Settings → MCP Servers → Reload**
   - Or restart Bob after changes to `.bob/mcp.json`

### `.bob/mcp.json` Configuration (Project Scope)

```json
{
  "mcpServers": {
    "clinical-trial-monitor": {
      "command": "node",
      "args": ["src/mcp-server/dist/index.js"],
      "env": {
        "NODE_ENV": "production",
        "MCP_TRANSPORT": "stdio",
        "BACKEND_URL": "http://localhost:3001",
        "LOG_LEVEL": "info",
        "MCP_PORT": "3002"
      }
    }
  }
}
```

**Key points:**
- `command: "node"` — uses the system Node.js (no absolute path)
- `args` path is **workspace-relative** — works on any machine
- `MCP_TRANSPORT: "stdio"` — Bob communicates via stdin/stdout (no port needed)
- `BACKEND_URL` points to the locally running Express backend
- No API keys in this file — secrets stay in `src/.env`

---

## Available MCP Tools (8 total)

Once registered, Bob can use these tools in natural language conversations:

| Tool | Description |
|---|---|
| `get_protocol_spec` | Retrieve full protocol specification (visit schedule, procedures, criteria) |
| `get_patient_records` | Query patient records filtered by site, patient, or visit ID |
| `detect_deviations` | Run deterministic protocol deviation detection for a visit/site/patient/date range |
| `classify_severity` | Classify deviation severity: Major / Minor / Administrative (ICH E6 GCP) |
| `get_site_risk_score` | Get weighted 0–100 risk score + tier + contributing factors for a site |
| `list_high_risk_sites` | List all sites above a risk threshold, ranked by score |
| `search_similar_deviations` | Semantic search across historical deviations via ChromaDB |
| `generate_capa_report` | Generate grounded CAPA report for a site's deviations using LLM |

### Example Bob Queries

```
"Which sites have the highest risk score this week?"
→ uses: list_high_risk_sites

"Show me all deviations for patient PAT-042 at site SITE-007"
→ uses: detect_deviations, get_patient_records

"Classify the severity of this deviation: patient missed scheduled blood draw at visit 3"
→ uses: classify_severity

"Generate a CAPA report for SITE-007 covering deviations DEV-001, DEV-002, DEV-003"
→ uses: generate_capa_report

"Find similar historical cases to: prohibited medication warfarin taken during trial"
→ uses: search_similar_deviations
```

---

## Verification Checklist

After setup, verify end-to-end connectivity:

```bash
# 1. Backend health check
curl http://localhost:3001/health
# Expected: {"status":"ok","service":"ctrm-backend"}

# 2. MCP server direct check (stdio mode — Bob handles this automatically)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | \
  node src/mcp-server/dist/index.js 2>/dev/null
# Expected: JSON response listing all 8 tools

# 3. Run all tests
cd src/mcp-server && npm test   # 28/28 pass
cd src/backend && npm test      # 8/8 pass
```

---

## Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| `Cannot find module 'dist/index.js'` | MCP server not built | Run `cd src/mcp-server && npm run build` |
| Bob shows server as ❌ disconnected | Backend not running | Start backend: `docker compose up` or `cd src/backend && npm run dev` |
| `[SERVICE_UNAVAILABLE]` errors | Backend unreachable | Check `BACKEND_URL` in `.bob/mcp.json` matches your backend port |
| Tools not visible in Bob | mcp.json not detected | Ensure Bob opened the `bob-ai-hackathon-submission-template/` folder (not a subfolder) |
| `generate_capa_report` returns stub | No LLM API key | Set `LLM_PROVIDER=watsonx` + `WATSONX_API_KEY` in `src/.env`, restart backend |
| MongoDB connection refused | Docker not running | Run `docker compose up mongodb` |
| Redis connection refused | Docker not running | Run `docker compose up redis` |
| ChromaDB errors | ChromaDB not running | Run `docker compose up chromadb` |
| Port 3001 already in use | Another process | Change `BACKEND_PORT` in `src/.env` and update `BACKEND_URL` in `.bob/mcp.json` |
