# CybRisk — Cyber Risk Posture Calculator

> Translate your security posture into financial exposure — board-ready, in minutes.

**Live:** https://cybrisk.vercel.app

---

## What It Does

CybRisk answers the question every CFO asks: *"How much could this cost us?"*

Instead of compliance scores and traffic-light dashboards, CybRisk runs **100,000 Monte Carlo trials** against real breach cost data to produce dollar figures with confidence intervals.

**Outputs:**
- Annualized Loss Expectancy (ALE) with confidence intervals
- Probable Maximum Loss (PML) at the 95th percentile
- Gordon-Loeb optimal security spend — the mathematically derived point of diminishing returns
- Loss exceedance curve (probability distribution of potential losses)
- Downloadable board-ready DOCX report

**Data sources:** IBM Cost of a Data Breach 2024 · Verizon DBIR threat frequencies · NetDiligence cyber claims

**Models:** FAIR framework · Gordon-Loeb economic model

---

## Stack

- **Next.js 14+** (App Router) — single Vercel deployment, no separate backend
- **TypeScript** — strict mode throughout
- **Tailwind CSS + Shadcn/ui** — UI components
- **Recharts** — data visualisation
- Monte Carlo engine in TypeScript — no Python dependency

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build    # production build
npm run lint     # ESLint
npm test         # Vitest unit tests
npm run test:e2e # Playwright E2E tests
```

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── assess/page.tsx       # 5-step assessment wizard
│   ├── results/page.tsx      # Results dashboard
│   ├── simulate/page.tsx     # Live simulation console
│   └── api/calculate/        # Monte Carlo API endpoint
├── components/
│   ├── assess/               # Wizard step components
│   ├── results/              # Dashboard charts
│   ├── simulate/             # Simulation console
│   └── ui/                   # Shadcn/ui primitives
└── lib/
    ├── monte-carlo.ts         # FAIR Monte Carlo engine
    ├── lookup-tables.ts       # Actuarial data (IBM/DBIR/NetDiligence)
    ├── gordon-loeb.ts         # Optimal spend calculation
    └── docx-report.ts         # Board report generator
```

---

## About

Built by **Albert Hui** — Chief Forensicator, Security Ronin. 20+ years in cyber security (DFIR, IR, risk advisory, vCISO). Built from real-world experience translating technical risk into board-level financial language.

Submitted to the [DataExpert Vibe Coding Challenge](https://dataexpert.io), Feb 2026.
