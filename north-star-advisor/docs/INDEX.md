# CybRisk: Documentation Index

> **Last Updated**: 2026-02-22
> **Purpose**: Single source of truth for documentation structure and hierarchy
> **Generation Step**: 13 of 13 — References all other documents

---

## Document Hierarchy

```
+-------------------------------------------------------------------------+
|                      CybRisk DOCUMENTATION                              |
+-------------------------------------------------------------------------+
|                                                                         |
|  TIER 1: STRATEGIC AUTHORITY                                            |
|  ---------------------------                                            |
|  The source of truth for product direction.                             |
|  All other docs defer here.                                             |
|                                                                         |
|  +-------------------------------------------------------------+       |
|  |  NORTHSTAR.md                                                 |       |
|  |  * North Star metric (end-to-end completion rate)             |       |
|  |  * Target users (vCISOs, SMB executives)                      |       |
|  |  * Phase boundaries (MVP hackathon -> V2)                     |       |
|  |  * What we build / explicitly don't build                     |       |
|  +-------------------------------------------------------------+       |
|                                                                         |
|  +-------------------------------------------------------------+       |
|  |  COMPETITIVE_LANDSCAPE.md                                     |       |
|  |  * Enterprise FAIR tools (RiskLens, Safe Security)            |       |
|  |  * Generic risk calculators and matrices                      |       |
|  |  * Strategic whitespace: free self-service FAIR               |       |
|  +-------------------------------------------------------------+       |
|                                                                         |
|  +-------------------------------------------------------------+       |
|  |  NORTHSTAR_EXTRACT.md (Design DNA)                            |       |
|  |  * Core axioms (dollars not heatmaps, stateless, no auth)     |       |
|  |  * Explicit non-goals (kill list)                             |       |
|  |  * Re-evaluation triggers                                     |       |
|  +-------------------------------------------------------------+       |
|                                                                         |
|  +-------------------------------------------------------------+       |
|  |  STRATEGIC_RECOMMENDATION.md                                  |       |
|  |  * Path C: Balanced (real math + strategic shortcuts)          |       |
|  |  * Focus: Monte Carlo first, E2E second, polish third         |       |
|  |  * Avoid: scope creep, auth, PDF export, animations           |       |
|  +-------------------------------------------------------------+       |
|                                                                         |
|  +-------------------------------------------------------------+       |
|  |  ACTION_ROADMAP.md                                            |       |
|  |  * Day 1: Monte Carlo engine + API + deploy                   |       |
|  |  * Day 2: Wizard UI + Results dashboard + E2E flow            |       |
|  |  * Day 3: Landing page + polish + submit                      |       |
|  +-------------------------------------------------------------+       |
|                          |                                              |
|                          v                                              |
|  TIER 2: IMPLEMENTATION                                                 |
|  -----------------------                                                |
|  How we build what the strategy defines.                                |
|                                                                         |
|  +-------------------------------+  +-----------------------------+     |
|  |  ARCHITECTURE_BLUEPRINT.md    |  |  SECURITY_ARCHITECTURE.md  |     |
|  |  * System topology            |  |  * OWASP API Top 10        |     |
|  |  * Data flow (wizard->API->   |  |  * Input validation (Zod)  |     |
|  |    results)                   |  |  * Privacy by design       |     |
|  |  * Monte Carlo engine spec    |  |  * Defense in depth        |     |
|  |  * Tech stack decisions       |  |  * Incident response       |     |
|  +-------------------------------+  +-----------------------------+     |
|                                                                         |
|  +-------------------------------------------------------------+       |
|  |  Architecture Modules (architecture/)                         |       |
|  |  * PIPELINE_ORCHESTRATION.md  - Calculation flow              |       |
|  |  * RESILIENCE_PATTERNS.md     - Error handling                |       |
|  |  * IMPLEMENTATION_SCAFFOLD.md - Directory structure, setup    |       |
|  |  * OBSERVABILITY.md           - Logging, metrics              |       |
|  |  * TESTING_STRATEGY.md        - Test plan, golden datasets    |       |
|  |  * HANDOFF_PROTOCOL.md        - Component data contracts      |       |
|  +-------------------------------------------------------------+       |
|                                                                         |
|  +-------------------------------------------------------------+       |
|  |  AGENT_PROMPTS.md (Component Behavior Specifications)         |       |
|  |  * Monte Carlo Engine spec                                    |       |
|  |  * Lookup Table Engine spec                                   |       |
|  |  * Gordon-Loeb Calculator spec                                |       |
|  |  * API Route Handler spec                                     |       |
|  |  * Wizard State Manager spec                                  |       |
|  |  * Results Context spec                                       |       |
|  |  * Chart Data Formatter spec                                  |       |
|  |  * Validation Engine spec                                     |       |
|  +-------------------------------------------------------------+       |
|                                                                         |
|  +-------------------------------------------------------------+       |
|  |  Design Documents                                             |       |
|  |  * USER_JOURNEYS.md    - First-time and returning user flows  |       |
|  |  * UI_DESIGN_SYSTEM.md - Design tokens, components, colors    |       |
|  |  * ACCESSIBILITY.md    - WCAG 2.1 AA compliance               |       |
|  |  * WIREFRAMES.md       - ASCII wireframes for all screens     |       |
|  +-------------------------------------------------------------+       |
|                                                                         |
|  +-------------------------------+  +-----------------------------+     |
|  |  ADR.md                       |  |  POST_DEPLOYMENT.md        |     |
|  |  * 12 architecture decisions  |  |  * Monitoring dashboard    |     |
|  |  * Trade-offs documented      |  |  * Feedback loops          |     |
|  |  * Alternatives rejected      |  |  * Incident response       |     |
|  +-------------------------------+  +-----------------------------+     |
|                          |                                              |
|                          v                                              |
|  TIER 3: SUPPORTING                                                     |
|  ------------------                                                     |
|  Brand identity and voice.                                              |
|                                                                         |
|  +-------------------------------------------------------------+       |
|  |  BRAND_GUIDELINES.md                                          |       |
|  |  * Brand identity (CybRisk)                                   |       |
|  |  * Voice: direct, financial, no jargon                        |       |
|  |  * Visual: dark theme, professional, data-focused             |       |
|  |  * Anti-patterns to avoid                                     |       |
|  +-------------------------------------------------------------+       |
|                                                                         |
+-------------------------------------------------------------------------+
```

---

## Quick Reference

| Document | Tier | Purpose | When to Use |
|----------|------|---------|-------------|
| [NORTHSTAR.md](NORTHSTAR.md) | 1 | Strategic direction | Product decisions, prioritization |
| [COMPETITIVE_LANDSCAPE.md](COMPETITIVE_LANDSCAPE.md) | 1 | Market intelligence | Competitive positioning |
| [NORTHSTAR_EXTRACT.md](NORTHSTAR_EXTRACT.md) | 1 | Design DNA | Prevent re-litigating decisions |
| [STRATEGIC_RECOMMENDATION.md](STRATEGIC_RECOMMENDATION.md) | 1 | Strategic decision | Path selection, trade-offs |
| [ACTION_ROADMAP.md](ACTION_ROADMAP.md) | 1 | 3-day execution plan | Daily planning, focus alignment |
| [ARCHITECTURE_BLUEPRINT.md](ARCHITECTURE_BLUEPRINT.md) | 2 | Technical architecture | Building components, data flow |
| [AGENT_PROMPTS.md](AGENT_PROMPTS.md) | 2 | Component specs | Module contracts, behavior rules |
| [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) | 2 | Security patterns | Input validation, API security |
| [ADR.md](ADR.md) | 2 | Decision records | Understanding trade-offs |
| [POST_DEPLOYMENT.md](POST_DEPLOYMENT.md) | 2 | Operations | Monitoring, incidents, iteration |
| [architecture/PIPELINE_ORCHESTRATION.md](architecture/PIPELINE_ORCHESTRATION.md) | 2 | Calculation pipeline | Execution flow, state transitions |
| [architecture/RESILIENCE_PATTERNS.md](architecture/RESILIENCE_PATTERNS.md) | 2 | Error handling | Edge cases, fallbacks |
| [architecture/IMPLEMENTATION_SCAFFOLD.md](architecture/IMPLEMENTATION_SCAFFOLD.md) | 2 | Code structure | Directory layout, setup |
| [architecture/OBSERVABILITY.md](architecture/OBSERVABILITY.md) | 2 | Monitoring | Logging, metrics, tracing |
| [architecture/TESTING_STRATEGY.md](architecture/TESTING_STRATEGY.md) | 2 | Test plan | Unit tests, integration, golden datasets |
| [architecture/HANDOFF_PROTOCOL.md](architecture/HANDOFF_PROTOCOL.md) | 2 | Data contracts | Component interfaces, type safety |
| [USER_JOURNEYS.md](USER_JOURNEYS.md) | 2 | User experience | Journey maps, friction points |
| [UI_DESIGN_SYSTEM.md](UI_DESIGN_SYSTEM.md) | 2 | Design tokens | CSS variables, components, colors |
| [ACCESSIBILITY.md](ACCESSIBILITY.md) | 2 | Inclusive design | WCAG 2.1 AA compliance |
| [WIREFRAMES.md](WIREFRAMES.md) | 2 | Screen specs | ASCII wireframes, layouts |
| [BRAND_GUIDELINES.md](BRAND_GUIDELINES.md) | 3 | Brand identity | Voice, tone, visual standards |

---

## Decision Authority

When documents conflict, defer to lower tier number:

```
Tier 1 (NORTHSTAR) > Tier 2 (Blueprint/Security) > Tier 3 (Brand)
```

**Example**: If NORTHSTAR says "dollars, not heatmaps" and a design doc suggests traffic-light ratings, NORTHSTAR wins.

---

## Document Dependencies

```
BRAND_GUIDELINES.md (Identity - Phase 1)
    |
    +---> NORTHSTAR.md (Strategic Authority - Phase 2)
         |
         +---> COMPETITIVE_LANDSCAPE.md (Market - Phase 3)
         |
         +---> NORTHSTAR_EXTRACT.md (Design DNA - Phase 4)
         |
         +---> UX Design (Phase 5a-5d)
         |    USER_JOURNEYS -> UI_DESIGN_SYSTEM -> ACCESSIBILITY -> WIREFRAMES
         |
         +---> ARCHITECTURE_BLUEPRINT.md (Phase 6)
         |    |
         |    +---> AGENT_PROMPTS.md (Component Specs - Phase 7)
         |    |
         |    +---> Deep Architecture (Phase 7d, parallel)
         |         PIPELINE_ORCHESTRATION, RESILIENCE_PATTERNS,
         |         IMPLEMENTATION_SCAFFOLD, OBSERVABILITY,
         |         TESTING_STRATEGY, HANDOFF_PROTOCOL
         |
         +---> SECURITY_ARCHITECTURE.md (Phase 8)
         |
         +---> ADR.md (Phase 9)
         |
         +---> POST_DEPLOYMENT.md (Phase 10)
         |
         +---> STRATEGIC_RECOMMENDATION.md (Phase 11)
         |    |
         |    +---> ACTION_ROADMAP.md (Phase 12)
         |
         +---> INDEX.md (This file - Phase 13)
```

---

## Current State

| Document | Status | Phase |
|----------|--------|-------|
| BRAND_GUIDELINES.md | Active | 1 |
| NORTHSTAR.md | Active | 2 |
| COMPETITIVE_LANDSCAPE.md | Active | 3 |
| NORTHSTAR_EXTRACT.md | Active | 4 |
| USER_JOURNEYS.md | Active | 5a |
| UI_DESIGN_SYSTEM.md | Active | 5b |
| ACCESSIBILITY.md | Active | 5c |
| WIREFRAMES.md | Active | 5d |
| ARCHITECTURE_BLUEPRINT.md | Active | 6 |
| AGENT_PROMPTS.md | Active | 7 |
| architecture/PIPELINE_ORCHESTRATION.md | Active | 7d |
| architecture/RESILIENCE_PATTERNS.md | Active | 7d |
| architecture/IMPLEMENTATION_SCAFFOLD.md | Active | 7d |
| architecture/OBSERVABILITY.md | Active | 7d |
| architecture/TESTING_STRATEGY.md | Active | 7d |
| architecture/HANDOFF_PROTOCOL.md | Active | 7d |
| SECURITY_ARCHITECTURE.md | Active | 8 |
| ADR.md | Active | 9 |
| POST_DEPLOYMENT.md | Active | 10 |
| STRATEGIC_RECOMMENDATION.md | Active | 11 |
| ACTION_ROADMAP.md | Active | 12 |
| INDEX.md | Active | 13 |

**Total**: 22 documents generated

---

## Strategic Context File

The `north-star-advisor/ai-context.yml` provides a machine-readable summary of all strategic context. Claude Code and other AI tools should read this file first for project context.

---

*Document generated by North Star Advisor*
