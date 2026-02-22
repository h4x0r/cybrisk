# CybRisk — Cyber Risk Posture Calculator

## What This Is

A hackathon SaaS entry for the DataExpert Vibe Coding Challenge (Feb 21-25, 2026). CybRisk translates cyber security posture into **financial exposure estimates** using Monte Carlo simulation, real actuarial data, and the FAIR/Gordon-Loeb models.

**Unique value prop**: Not "are you compliant?" but "what's your exposure in dollars?" — a board-ready financial risk calculator, not another compliance checklist.

**Deadline**: Tue Feb 25 11:59 PM PT (Wed Feb 26 3:59 PM HKT)

## Tech Stack

- **Framework**: Next.js 14+ (App Router) — required by hackathon rules
- **Styling**: Tailwind CSS + Shadcn/ui (already initialized)
- **Charts**: Recharts (already installed)
- **Icons**: Lucide React (already installed)
- **Deployment**: Vercel (required — must be publicly accessible)
- **Database**: Not required for MVP (all calculation is stateless)
- **Monte Carlo engine**: TypeScript implementation of FAIR model (no Python dependency — keeps it single-deploy on Vercel)

## Architecture

See `docs/SPEC.md` for full specification including:
- Data sources and lookup tables
- Monte Carlo simulation methodology
- User input flow
- Output calculations
- Component structure

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── layout.tsx            # Root layout
│   ├── assess/
│   │   └── page.tsx          # Risk assessment wizard (5-6 step form)
│   ├── results/
│   │   └── page.tsx          # Results dashboard with charts
│   └── api/
│       └── calculate/
│           └── route.ts      # Monte Carlo API endpoint
├── components/
│   ├── ui/                   # Shadcn/ui components (already installed)
│   ├── landing/              # Landing page sections (Hero, Features, CTA)
│   ├── assess/               # Wizard step components
│   └── results/              # Dashboard chart components
├── lib/
│   ├── utils.ts              # Shadcn/ui utils (already created)
│   ├── monte-carlo.ts        # FAIR Monte Carlo simulation engine
│   ├── lookup-tables.ts      # Hardcoded actuarial data (IBM/NetDiligence/DBIR)
│   ├── gordon-loeb.ts        # Gordon-Loeb optimal spend calculation
│   └── report-generator.ts   # AI-generated board summary (optional)
└── data/
    └── industry-benchmarks.ts # Industry-specific parameters
```

## Coding Conventions

- TypeScript strict mode
- Server Components by default; `"use client"` only when needed (forms, charts, interactivity)
- API routes use Next.js Route Handlers (app/api/*)
- No Python backend — keep everything deployable on Vercel as a single Next.js app
- Use Shadcn/ui components for all UI elements
- Recharts for data visualization

## Key Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
vercel               # Deploy to Vercel
```

## Submission Requirements

All in a single .zip:
1. `landing_page_<team_name>.png` — full-page screenshot (min 1280px wide)
2. All Next.js components
3. `explainer_<team_name>.md` — product name, description, team, live URL, GitHub URL, problem statement

## About the Developer

Albert Hui — Chief Forensicator, Security Ronin. 20+ years in cyber security (DFIR, IR, risk advisory). Expert witness. vCISO. IoD Cyber Security Advisor. This tool is built from real-world advisory experience translating technical risk into board-level financial language.
