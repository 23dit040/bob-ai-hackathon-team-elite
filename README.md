# 🚀 Clinical Trial Risk Monitor & Protocol Deviation Detector

---

## 👥 Team

| Field | Value |
|---|---|
| **Team Name** | Team Elite |
| **Track** | AI |
| **Team Lead** | Drijesh Patel — 23dit040@charusat.edu.in |
| **Members** | Drijesh Patel, Ayush Patel, Team Elite Member 3 |

---

## 🎯 Problem Statement

Clinical trial sites generate thousands of patient visit records that must comply with strict protocol specifications. Manual review is slow, error-prone, and fails to surface high-risk sites before regulatory audits, putting trial integrity and patient safety at risk.

---

## 💡 Solution

An AI-powered monitoring platform that automatically compares patient visit records against protocol specifications, detects and classifies deviations (Major/Minor/Administrative), calculates site-level risk scores, and generates CAPA-ready reports — all accessible through IBM Bob via a custom MCP server.

---

## ✨ Key Features

- **Protocol Deviation Detection:** Automated comparison of 5,000+ patient visits across 200+ sites against protocol specs
- **AI Severity Classification:** Major / Minor / Administrative classification using Hugging Face models
- **Site Risk Scoring:** Weighted risk scores with Redis caching, trend analysis, and high-risk site ranking
- **CAPA Report Generation:** LLM-powered corrective action reports via IBM watsonx.ai Granite model
- **IBM Bob MCP Integration:** 8 MCP tools for real-time clinical trial analysis directly from the Bob IDE

---

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| **Languages** | TypeScript, JavaScript |
| **Frameworks** | React 18, Express 4, Tailwind CSS, Vite |
| **IBM Technologies** | IBM Bob, watsonx.ai |
| **Databases** | MongoDB, Redis, ChromaDB |
| **Other** | Docker, Docker Compose, Zod, Mongoose, GitHub Actions |

---

## 📁 Repository Structure

```
├── src/
│   ├── backend/        # Express API, services, Mongoose models
│   ├── mcp-server/     # IBM Bob MCP integration (8 tools)
│   ├── frontend/       # React + Tailwind dashboard
│   ├── shared/         # Shared TypeScript types and constants
│   └── data/           # Synthetic data seed scripts
├── docs/               # Architecture, setup guide, problem statement
├── demo/               # Screenshots and demo video link
├── presentation/       # Slide deck
└── submission.yaml     # Structured submission metadata
```

---

## ⚡ How to Run

```bash
# 1. Clone the repo
git clone https://github.com/23dit040/bob-ai-hackathon-team-elite.git
cd bob-ai-hackathon-team-elite

# 2. Configure environment
cp src/.env.example src/.env
# Edit src/.env with your values

# 3. Start all services
docker compose up --build

# 4. Seed synthetic data
docker compose run --rm backend npm run seed

# 5. Open dashboard
# http://localhost:5173
```

---

## 🖥️ Demo

| Artifact | Link |
|---|---|
| 📹 Demo Video | [See demo/demo-video-link.txt](demo/demo-video-link.txt) |
| 🌐 Live Demo | NOT DEPLOYED — run locally using docs/setup-guide.md |
| 🖼️ Screenshots | [See demo/screenshots/](demo/screenshots/) |
| 📊 Presentation | [See presentation/](presentation/) |

---

## ⚠️ Known Limitations

- Severity classifier uses zero-shot classification — not fine-tuned on clinical trial data yet
- CAPA report generation requires a watsonx.ai or OpenAI API key; stub responses returned without one
- Demo uses synthetic data only — no real patient data included
- MCP SSE transport for Docker mode is scaffolded but not fully wired yet

---

## 🏅 What We're Most Proud Of

The IBM Bob MCP integration — 8 purpose-built tools that make Bob a genuine load-bearing component, enabling natural language queries over live clinical trial data, deviation detection, risk scoring, and CAPA report generation directly from the Bob IDE.

---
