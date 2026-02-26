# Discovery Session

## Date
2026-02-22T15:30:00+08:00

## Exploration Summary

### What
CybRisk — a self-service cyber risk posture calculator built as a hackathon SaaS entry for the DataExpert Vibe Coding Challenge. A 5-minute web questionnaire that outputs Monte Carlo-simulated financial exposure estimates with confidence intervals, loss exceedance curves, and board-ready executive summaries.

### Why
Existing cyber risk assessment tools output compliance checklists — pass/fail scores that boards don't read. CybRisk translates a company's security posture into a **dollar figure** of probable financial loss, speaking the language boards actually understand: money.

### Who
- **Primary**: vCISOs and fractional security advisors who need quick client-facing risk quantification
- **Secondary**: SMB executives/founders who need board-ready cyber risk summaries
- **Tertiary**: Cyber insurance buyers wanting to understand exposure before shopping for coverage
- **Audience (not users)**: Board members and audit committees who receive the output

### Differentiator
- Uses real actuarial data (IBM Cost of a Data Breach 2025, Verizon DBIR 2025, NetDiligence Cyber Claims Study 2025)
- Implements the Open FAIR model with 10,000 Monte Carlo iterations
- Outputs dollar-denominated exposure with confidence intervals, not qualitative heat maps
- Includes Gordon-Loeb optimal security spend calculation
- Free, self-service, no account required

### Key Quotes
> "Not 'are you compliant?' but 'what's your exposure in dollars?' — a board-ready financial risk calculator, not another compliance checklist."
> "Albert Hui — Chief Forensicator, Security Ronin. 20+ years in cyber security (DFIR, IR, risk advisory). Expert witness. vCISO. IoD Cyber Security Advisor."

## Gut Check Findings (Pressure Test)

### Strengths
- Strong conceptual clarity — the tagline sells itself
- Real data sources add credibility and defensibility
- TypeScript-only stack on Vercel = clean single-deploy architecture
- FAIR model is industry-standard, not invented methodology

### Critical Gaps Identified
1. **No data privacy statement** — ironic for a security tool asking for sensitive company data
2. **No build priority order** — need explicit MVP vs polish cut lines for 3-day timeline
3. **No loading/error states** — 10K iterations need visual feedback
4. **No form validation spec** — edge cases unhandled (e.g., 100M records for <$50M company)
5. **No mobile consideration** — judges might view on mobile
6. **Step 4 assumes security knowledge** — smart defaults needed for non-technical users
7. **Results page overloaded** — needs visual hierarchy: risk rating → ALE → benchmark → details
8. **No builder credibility on landing** — 20yr DFIR background is an unused trust signal
9. **No share/bookmark results** — URL-encoded params would enable sharing without a DB

### Steelman Risk
Statistical rigor vs UX polish compete for 3-day timeline. Recommendation: 95% the UX, 80% the statistics. Judges evaluate visually in minutes before questioning methodology.

## Open Questions
- Should the Monte Carlo run client-side (privacy win) or server-side (API route, validation)?
- What animation/loading treatment for the calculation step?
- Should results be URL-shareable via encoded params?
