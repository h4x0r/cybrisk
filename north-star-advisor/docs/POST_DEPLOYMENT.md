# CybRisk: Post-Deployment Operations

> **Tier**: 2 — Implementation (see [INDEX.md](INDEX.md))
> **Created**: 2026-02-22
> **Status**: Active
> **Generation Step**: 10 of 13
> **Scope**: Monitoring, Feedback, Iteration, Incident Response

Operations, monitoring, and continuous improvement for CybRisk deployed on Vercel.

---

## Document Purpose

This document defines **how to operate, monitor, and improve** CybRisk after deployment. It answers:

1. How do we know the system is healthy?
2. How do we collect and act on feedback?
3. How do we respond to incidents?
4. How do we control costs?
5. When do we revisit strategy?

**Relationship to Other Documents:**
- **NORTHSTAR.md** defines what success looks like
- **ARCHITECTURE_BLUEPRINT.md** defines how the system works
- **This document** defines how to keep it working and improving

---

## 1. Monitoring Dashboard

### 1.1 North Star Metric (Weekly Review)

```
  NORTH STAR: End-to-End Completion Rate
  (Users who land on site AND complete a full calculation)

  Current: ████████░░░░░░░░░░░░ TBD    Target: 40%    Trend: --

  Week-over-Week: N/A (launch pending)
  30-Day Trend: N/A
```

**Review Cadence**: Weekly (post-hackathon: every Monday)

**Review Questions**:
- What percentage of visitors complete a full calculation?
- Where do users drop off (landing, wizard step N, results)?
- Is the wizard taking too long (session duration)?

### 1.2 Input Metrics (Daily Review)

| Metric | Current | Target | Status | Owner |
|--------|---------|--------|--------|-------|
| Landing page visits | TBD | 100/day | -- | Albert |
| Wizard start rate | TBD | 60% of visitors | -- | Albert |
| Wizard completion rate | TBD | 70% of starters | -- | Albert |
| API success rate | TBD | >99% | -- | Albert |
| API response time P95 | TBD | <500ms | -- | Albert |

**Alert Thresholds**:

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| API error rate | >5% | >20% | Check Vercel function logs |
| API P95 latency | >1s | >3s | Check for cold starts or computation regression |
| Wizard drop-off step 1 | >60% | >80% | Review form UX, check for errors |

### 1.3 System Health Metrics

| Metric | Current | SLO | Status |
|--------|---------|-----|--------|
| **API Latency P50** | TBD | <200ms | -- |
| **API Latency P95** | TBD | <500ms | -- |
| **API Latency P99** | TBD | <2000ms | -- |
| **Error Rate** | TBD | <1% | -- |
| **Availability** | TBD | >99.5% | -- |
| **Cold Start Rate** | TBD | <20% of requests | -- |

### 1.4 Component-Specific Metrics

| Component | Key Metric | Target | How to Measure |
|-----------|-----------|--------|----------------|
| Monte Carlo Engine | Computation time | <100ms | `console.time()` in API route |
| Zod Validation | Rejection rate | <10% of requests | Count 400 responses |
| Gordon-Loeb Calc | Result reasonableness | No NaN/Infinity | Output bounds checking |
| Wizard UI | Step completion rate | >80% per step | Client-side analytics |
| Results Page | Chart render time | <500ms | Performance.mark() |

**Observability Stack**: Vercel Function Logs + Vercel Web Analytics (free tier)

---

## 2. Feedback Loops

### 2.1 User Feedback Collection

| Channel | What We Collect | Frequency | Owner |
|---------|-----------------|-----------|-------|
| Hackathon judges | Demo feedback, scoring | One-time (Feb 25) | Albert |
| GitHub Issues | Bug reports, feature requests | Continuous | Albert |
| Results page feedback | "Was this helpful?" thumbs up/down | Continuous (stretch) | Albert |
| Direct outreach | LinkedIn/Twitter feedback from security pros | Occasional | Albert |

### 2.2 Implicit Feedback Signals

| Signal | What It Indicates | How We Use It |
|--------|-------------------|---------------|
| Wizard completion rate | Form UX quality | If <50%, simplify form steps |
| Time on results page | Value of output | If <10s, results may be confusing |
| Return visits | Ongoing value | If >10%, consider saved reports feature |
| API error rate by industry | Data quality | If specific industry errors, check lookup tables |

### 2.3 Feedback Processing

**Post-Hackathon Feedback Review**:
- [ ] Collect all judge feedback
- [ ] Review any GitHub issues created
- [ ] Identify top 3 usability issues
- [ ] Identify top 3 feature requests
- [ ] Decide: iterate on MVP or move to V2

---

## 3. Calculation Maintenance

### 3.1 Data Update Triggers

CybRisk's calculation accuracy depends on hardcoded lookup tables. Updates needed when:

| Trigger | Data Source | Action |
|---------|-----------|--------|
| **IBM Cost of Data Breach Report** | Annual (typically July) | Update per-record cost by industry |
| **Verizon DBIR** | Annual (typically May) | Update breach frequency by attack type |
| **NetDiligence Cyber Claims Study** | Annual (typically October) | Update loss distribution parameters |
| **Regulatory changes** | As they occur | Add new frameworks to regulatory dropdown |

### 3.2 Validation After Data Updates

After updating lookup tables:
- [ ] Run Monte Carlo with test inputs, compare to previous results
- [ ] Verify no NaN/Infinity in outputs
- [ ] Check that Gordon-Loeb optimal spend is reasonable (not $0 or $infinity)
- [ ] Verify percentile ordering (P5 < P25 < P50 < P75 < P95)
- [ ] Deploy and test on preview URL before promoting to production

### 3.3 Calculation Spot Checks

**Monthly** (post-hackathon):
- Run 5 representative scenarios manually
- Compare results to intuition and industry benchmarks
- Verify PERT distribution parameters produce sensible ranges
- Check that control maturity meaningfully affects output

---

## 4. Incident Response

### 4.1 Severity Levels

| Level | Definition | Response Time | Examples |
|-------|------------|---------------|----------|
| **SEV1** | Complete outage | 1 hour | Vercel down, 500 on all requests |
| **SEV2** | Calculations produce wrong results | 4 hours | Math bug, lookup table error |
| **SEV3** | Degraded performance | 24 hours | Slow responses, intermittent errors |
| **SEV4** | Cosmetic or minor | Next availability | UI glitch, chart not rendering |

### 4.2 On-Call

| Role | Responsibility | Contact |
|------|----------------|---------|
| Albert Hui | Sole developer, all incidents | GitHub Issues |

**Post-hackathon**: If project continues, establish proper on-call rotation.

### 4.3 Incident Response Checklist

**SEV1/SEV2 Response**:
- [ ] Check Vercel dashboard for deployment status
- [ ] Check function logs for errors
- [ ] If deployment issue: redeploy last good commit (`vercel --prod`)
- [ ] If code bug: identify, fix, test locally, deploy
- [ ] If data issue: check lookup tables for corruption
- [ ] Verify fix in production
- [ ] Document in ADR if architecture change needed

---

## 5. Cost & Resource Tracking

### 5.1 Vercel Hobby Plan Costs

| Resource | Limit (Free) | Current Usage | Status |
|----------|-------------|---------------|--------|
| **Serverless Function Invocations** | 100K/month | TBD | OK |
| **Serverless Function Duration** | 100 GB-hours/month | TBD | OK |
| **Bandwidth** | 100 GB/month | TBD | OK |
| **Deployments** | Unlimited | TBD | OK |

### 5.2 Cost Optimization

CybRisk costs **$0/month** on Vercel Hobby plan:
- No database costs
- No external API costs (no LLM, no third-party services)
- No CDN costs beyond Vercel's included bandwidth
- Static assets served from Vercel Edge (free)

**When costs appear**: Only if traffic exceeds Hobby plan limits (100K function invocations/month). At that point, Vercel Pro ($20/month) provides 1M invocations.

### 5.3 Scaling Considerations

| Traffic Level | Infrastructure | Monthly Cost |
|---------------|---------------|-------------|
| <100K calculations/month | Vercel Hobby | $0 |
| 100K-1M calculations/month | Vercel Pro | $20 |
| 1M+ calculations/month | Vercel Enterprise or self-hosted | $150+ |

---

## 6. Iteration Planning

### 6.1 Post-Hackathon Review (Feb 26)

**Review Questions**:
- [ ] Did we complete the end-to-end flow?
- [ ] What did judges say?
- [ ] What broke during the demo?
- [ ] Is this worth continuing past the hackathon?

### 6.2 Kill List Maintenance

| Feature | Original Rationale for Killing | Reconsider If |
|---------|--------------------------------|---------------|
| User accounts/auth | Adds friction, unnecessary for stateless | Users want saved reports |
| PDF export | Scope creep | Judges specifically request it |
| Real-time threat intel | API dependency, cost | Major differentiator opportunity |
| Mobile-first design | Desktop is primary use case | >30% mobile traffic |
| Enterprise pricing | Not MVP | Users asking "how much?" |

### 6.3 V2 Feature Candidates (If Project Continues)

| Feature | Value | Effort | Priority |
|---------|-------|--------|----------|
| PDF report export | High (board-ready output) | Medium | P1 |
| Scenario comparison (side-by-side) | High (what-if analysis) | Medium | P1 |
| Shareable results via URL | Medium (collaboration) | Low | P2 |
| API for third-party integration | Medium (platform play) | Medium | P2 |
| Saved reports (requires auth) | Medium (returning users) | High | P3 |

---

## 7. Runbook Quick Reference

### Pre-Demo Checklist (Hackathon)
- [ ] Verify production URL is accessible
- [ ] Run happy-path test: landing -> wizard -> calculate -> results
- [ ] Verify charts render correctly
- [ ] Test on demo device/browser
- [ ] Have screenshots as backup if live demo fails
- [ ] Verify "healthcare, $50M revenue, 500 employees" test case produces reasonable output

### Post-Deployment Checklist
- [ ] Production URL responds with 200
- [ ] API endpoint returns valid JSON for test input
- [ ] No console errors in browser
- [ ] Charts render on results page
- [ ] Mobile layout is usable (even if not optimized)

### Weekly Checklist (Post-Hackathon)
- [ ] Check Vercel dashboard for errors
- [ ] Review any GitHub issues
- [ ] Spot-check one calculation for reasonableness
- [ ] Check Vercel usage (stay within Hobby limits)

---

*Document generated by North Star Advisor*
