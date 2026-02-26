# CybRisk: Brand Guidelines

> **Created**: 2026-02-22
> **Status**: Active
> **Builder**: Albert Hui -- Chief Forensicator, Security Ronin

Identity, positioning, and principles for the CybRisk brand.

---

## Brand Essence

**CybRisk** -- a portmanteau of "Cyber" and "Risk," deliberately stripped of the word "compliance." The name signals exactly what the product does: quantify cyber risk. No ambiguity, no marketing fluff, no suggestion that this is yet another audit framework.

CybRisk exists to answer the one question boards actually ask: "How much could a breach cost us?"

### Positioning Statement

> **CybRisk is a self-service cyber risk calculator** that translates a company's security posture into dollar-denominated financial exposure estimates for vCISOs, fractional security advisors, SMB executives, and cyber insurance buyers. Unlike compliance-focused tools that output checkbox scores, CybRisk uses Monte Carlo simulation with real actuarial data to produce probabilistic financial loss distributions -- board-ready numbers, not traffic-light heat maps.

### Core Tagline

> "Know your cyber risk in dollars, not checkboxes."

---

## Brand Identity

### The Name

**CybRisk** uses a capital R to visually split the compound word and aid readability. Always written as one word with a capital C and capital R. Never "Cybrisk," "CYBRISK," "Cyb-Risk," or "Cyber Risk Calculator."

| Format | Usage |
|--------|-------|
| **CybRisk** | Default everywhere -- UI, documentation, conversation |
| **cybrisk** | URLs, package names, repository names only |
| **CybRisk -- Cyber Risk Posture Calculator** | Full formal name for landing page hero and metadata |

### Logo

CybRisk uses a text-based wordmark in Inter Bold against a slate-950 background, with a cyan-400 accent on the "R" to visually split the name and draw the eye to "Risk." No icon or symbol -- the product is about data, not decoration.

| Element | Meaning |
|---------|---------|
| **Inter Bold wordmark** | Clean, modern, professional -- signals a serious financial tool |
| **Cyan-400 accent on "R"** | Separates "Cyb" from "Risk," highlights the core concept |
| **No icon** | Avoids the cliched shield/lock imagery that every security tool uses |

**Usage Requirements:**
- Always use the wordmark on dark backgrounds (slate-950 or darker)
- Minimum clear space: 1x the height of the "R" on all sides
- Never place the wordmark over images, gradients, or light backgrounds
- Source assets: `/public/brand/` directory in the repository

### Color Philosophy

**Primary: Cyan-400 (#22d3ee)**

We chose cyan over the obvious alternatives for strategic reasons:

| Color Option | Why We Rejected It |
|--------------|-------------------|
| Red / Orange | Signals danger and alarm. CybRisk quantifies risk -- it does not create panic. |
| Blue (corporate) | Every enterprise security vendor uses corporate blue. CybRisk is not enterprise software. |
| Green | Implies safety or "all clear." CybRisk delivers hard numbers, not reassurance. |
| Purple | Signals AI/ML hype. CybRisk is grounded in actuarial math, not buzzwords. |

**Cyan-400 signals:**
- Data visualization and analytics (Bloomberg, Grafana, financial terminals)
- Technical precision without corporate stuffiness
- Modern SaaS identity distinct from legacy enterprise security tools
- Energy and clarity against dark backgrounds

**Full palette:**

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Background | Slate-950 | #020617 | Page background |
| Surface | Slate-900 | #0f172a | Cards, panels, modals |
| Primary accent | Cyan-400 | #22d3ee | CTAs, active states, key metrics |
| Positive / low risk | Emerald-400 | #34d399 | Good posture indicators, savings |
| Warning / medium risk | Amber-400 | #fbbf24 | Moderate risk, caution states |
| Danger / high risk | Rose-500 | #f43f5e | High exposure, critical findings |
| Primary text | Slate-50 | #f8fafc | Headings, body text |
| Secondary text | Slate-400 | #94a3b8 | Labels, descriptions, muted content |

**Accessibility:** Cyan-400 on Slate-950 achieves a 10.1:1 contrast ratio, exceeding WCAG AAA (7:1). All color combinations in the palette meet WCAG AA standards (4.5:1 minimum contrast ratio). Risk severity colors (emerald/amber/rose) are never used as the sole indicator -- always paired with text labels for color-blind users.

### Typography

| Use | Font | Character |
|-----|------|-----------|
| UI text, headings, body | Inter | Clean sans-serif with excellent readability at all sizes. Industry standard for modern SaaS. Avoids the coldness of Helvetica. |
| Numbers, data, currency | JetBrains Mono | Monospaced font designed for code and data. Tabular figures align dollar amounts in tables. Signals precision. |
| Marketing / landing | Inter | Same as UI -- no font switching between marketing and product. Consistent experience. |

**Typographic rules:**
- Dollar amounts always use JetBrains Mono: `$1,250,000`
- Percentages in data contexts use JetBrains Mono: `90th percentile`
- Never use decorative, serif, or handwritten fonts anywhere
- Minimum body text size: 14px (accessibility)

---

## Voice & Tone

### Personality

| Trait | Expression |
|-------|------------|
| **Direct** | Lead with the number. "Your estimated annual exposure is $1.2M" -- not "Based on our advanced analysis, we've determined that your organization may potentially face..." |
| **Authoritative** | Cite the source. "Per IBM's 2025 Cost of a Data Breach report, healthcare breaches average $10.93M." We earned credibility through 20 years of DFIR -- we don't need to inflate it. |
| **Honest about uncertainty** | "90% of simulated outcomes fall between $120K and $3.4M." Never present a point estimate as gospel. Monte Carlo gives us distributions -- we show distributions. |
| **Respectful of the user's time** | 5-minute questionnaire, instant results. No signup, no onboarding flow, no email gate. If it takes longer than a coffee break, we failed. |
| **Unimpressed by jargon** | Translate security-speak into financial language. The board does not care about MITRE ATT&CK technique IDs -- they care about dollars at risk. |

### Writing Principles

**Do:**
- Lead with the dollar figure, then explain the methodology
- Say "estimated" or "simulated" -- never "predicted" or "guaranteed"
- Use "exposure" instead of "risk score" (exposure is financial; scores are abstract)
- Attribute data sources explicitly: "Based on Verizon DBIR 2025 data"
- Write in second person: "Your exposure..." not "The user's exposure..."
- Keep sentences under 25 words in UI copy

**Don't:**
- Use fear, uncertainty, and doubt (FUD) to drive engagement
- Claim precision we do not have ("Your exact loss will be $1,247,832")
- Use the word "comprehensive" (nothing built in 3 days is comprehensive -- and we are honest about that)
- Bury the number behind qualitative labels (say "$1.2M" not "High Risk")
- Use passive voice in results ("$1.2M in annual exposure was estimated" -- no, say "Your estimated annual exposure: $1.2M")
- Hide methodology -- every number should be traceable to a source

### Language Examples

| Instead of... | Write... |
|---------------|----------|
| "Your risk score is 7.3 out of 10" | "Your estimated annual exposure is $1.2M (90th percentile: $3.4M)" |
| "You have critical vulnerabilities" | "Lack of an incident response plan increases your expected loss by ~23%" |
| "Our AI-powered platform" | "Monte Carlo simulation with 10,000 iterations using FAIR methodology" |
| "Get protected today" | "See your exposure in 5 minutes -- no account required" |
| "Industry-leading security solution" | "Financial exposure estimates calibrated against IBM, Verizon DBIR, and NetDiligence actuarial data" |
| "You need to improve your security posture" | "Adding AI/automation tools could reduce your expected annual loss by ~$375K" |

---

## Core Beliefs

These beliefs shape every brand decision:

### 1. Risk must be denominated in dollars

Qualitative risk matrices (High/Medium/Low) and compliance scores (82/100) do not help a CFO decide how much to invest in security. Dollars do. Every CybRisk output is denominated in currency because that is the language of business decisions. This belief means we never ship a feature that outputs a score without a corresponding dollar figure.

### 2. Show the distribution, not just the average

A single number is a lie by omission. Breach costs follow heavy-tailed distributions -- the average and the 95th percentile can differ by 10x. CybRisk always shows the range: the optimistic case, the expected case, and the catastrophic tail. This belief means every chart shows a distribution, every metric shows confidence intervals, and we never present a point estimate in isolation.

### 3. Methodology transparency is non-negotiable

If a user cannot trace a number back to its source, that number is worthless. CybRisk cites IBM, Verizon DBIR, and NetDiligence data explicitly. The FAIR model and Gordon-Loeb formula are documented, not hidden behind a proprietary "risk engine" black box. This belief means we publish our methodology, show our assumptions, and never hide behind "proprietary algorithms."

### 4. Respect the user's time and intelligence

Our users are busy professionals -- vCISOs managing multiple clients, founders running companies, board members preparing for meetings. CybRisk asks the minimum viable questions (5 steps, under 5 minutes) to produce a credible estimate. We do not gate content behind signups. We do not require training. We do not send follow-up emails. This belief means every UX decision optimizes for time-to-insight.

### 5. Honesty over impressiveness

CybRisk is a hackathon project built in 3 days by one developer. It uses hardcoded lookup tables, not real-time threat feeds. Its Monte Carlo engine runs 10,000 iterations, not millions. We are transparent about these limitations because a tool that oversells its precision is worse than useless in risk management -- it is dangerous. This belief means we state limitations clearly and resist the temptation to present estimates as more precise than they are.

---

## What We're Not

| We Are Not | Why This Matters |
|------------|------------------|
| **A compliance tool** | Compliance asks "Did you check the box?" CybRisk asks "What does it cost you if you get breached?" These are fundamentally different questions. Conflating them undermines both. |
| **An audit framework** | We do not assess controls against ISO 27001, SOC 2, NIST CSF, or any regulatory framework. We take your control posture as input and translate it to financial exposure. Auditing is someone else's job. |
| **Enterprise security software** | No procurement process. No sales team. No annual contract. CybRisk is a free, self-service web tool. If it requires a demo call, we have already failed. |
| **A real-time threat intelligence platform** | CybRisk uses hardcoded actuarial data from published reports, not live threat feeds. It estimates annualized exposure, not "you are being attacked right now." |
| **A replacement for professional risk assessment** | CybRisk produces estimates, not audited findings. It is a starting point for conversation, not an endpoint for decision-making. Users who need engagement-letter-grade analysis should hire a qualified risk advisor. |

---

## Design Principles

### Visual Aesthetic

| Principle | Expression |
|-----------|------------|
| **Data-dense, not decoration-heavy** | Every pixel earns its place by conveying information. No hero images, no stock photos, no decorative illustrations. The data IS the visual. Think Bloomberg Terminal meets modern SaaS. |
| **Dark-first** | Slate-950 backgrounds with high-contrast data. Dark themes reduce eye strain during analysis, signal technical sophistication, and make charts pop. Light mode is not planned. |
| **Numbers are the hero** | The largest visual element on any screen should be a dollar figure. ALE, PML, and recommended spend are displayed in 2xl+ JetBrains Mono. Charts support the numbers; they do not replace them. |
| **Progressive disclosure** | Lead with the headline metric (Annual Loss Expectancy), then KPI cards, then charts, then methodology details. Users control depth. Nothing is hidden, but nothing overwhelms on first view. |

### Why These Choices?

**Dark theme:**
CybRisk targets professionals who spend hours in dashboards and terminals. Dark backgrounds reduce eye strain, provide better contrast for data visualization, and immediately distinguish CybRisk from the sea of white-background compliance tools. The dark aesthetic also signals "this is a serious analytical tool" rather than "this is friendly onboarding software."

**No illustrations or stock imagery:**
Every security vendor uses the same stock photos: hooded hackers, padlocks, shield icons, glowing circuit boards. CybRisk differentiates by letting data speak. The loss distribution histogram IS the visual identity. The loss exceedance curve IS the brand imagery. When the product is about numbers, the design should be about numbers.

**Minimal UI chrome:**
Cards have subtle borders (slate-800), not drop shadows. Buttons are flat with slight hover states, not 3D. Spacing is generous but not wasteful. The goal is to disappear the interface so the user sees only their risk data.

---

## Anti-Patterns

What we explicitly avoid in brand expression:

| Anti-Pattern | Why We Avoid It |
|--------------|-----------------|
| Fear-based marketing ("You WILL be breached") | FUD erodes trust. Our users are security professionals -- they already know the threat landscape. Scaring them insults their intelligence and makes us look like we are selling snake oil. |
| Gamification of risk (letter grades, badges, "security score") | Reducing financial exposure to a letter grade is exactly the problem CybRisk exists to solve. We will not recreate the problem we are fixing. |
| "AI-powered" positioning | CybRisk uses Monte Carlo simulation and actuarial models, not machine learning. Calling it "AI" would be dishonest and would associate us with the AI hype cycle that is already generating skepticism in the security industry. |
| Vendor comparison attacks | We do not disparage RiskLens, Safe Security, or FAIR-U by name in marketing copy. We differentiate on approach (free, self-service, instant) rather than attacking competitors. |
| Overdesigned onboarding | No tutorial overlays, no guided tours, no "Welcome to CybRisk!" modals. The wizard IS the onboarding. If the UI needs explanation, the UI is broken. |
| Precision theater | Never show more than 2 significant digits in dollar estimates. "$1,247,832.17" implies false precision. "$1.2M" is honest. Display granular numbers only in downloadable detail views where context is available. |

---

## Social Positioning

How users describe CybRisk to others matters. We design for the moment when someone asks "What's CybRisk?"

### What Users Tell Others

Different audiences need different framings:

| Audience | Preferred Framing |
|----------|-------------------|
| vCISO talking to a client | "It's a free tool that gives you a dollar estimate of your cyber exposure in 5 minutes. I use it for initial client scoping before we do a full engagement." |
| CFO explaining to the board | "It's a Monte Carlo risk calculator -- like a financial stress test but for cyber breaches. Gives us a probable loss range based on actuarial data." |
| Security practitioner on social media | "Open-source FAIR model calculator with Gordon-Loeb optimal spend. Uses IBM/DBIR/NetDiligence data. No account required." |
| Insurance broker assessing a client | "It gives a quick-and-dirty exposure estimate using the same actuarial data we use for underwriting. Good for pre-qualification conversations." |
| Hackathon judge evaluating the entry | "It's a Monte Carlo simulation engine that converts a 5-step security questionnaire into board-ready financial exposure dashboards." |

### Addressing Skepticism

Users may encounter skepticism about automated risk quantification. Provide language that reframes:

| Skepticism | Reframe |
|------------|---------|
| "You can't quantify cyber risk -- there's too much uncertainty." | "You're right that uncertainty is high. That's exactly why CybRisk shows a probability distribution instead of a single number. The range IS the answer." |
| "This is just a fancy calculator with made-up numbers." | "Every number traces back to published actuarial data: IBM Cost of a Data Breach, Verizon DBIR, NetDiligence claims studies. The model is Open FAIR, an industry standard. The inputs are yours." |
| "Real risk assessment requires weeks of professional analysis." | "Absolutely -- and CybRisk is not a replacement for that. It is a 5-minute starting point that helps you scope the conversation and prioritize where to invest deeper analysis." |

### Brand Voice in Social Context

When users share or discuss CybRisk publicly:

**Do:**
- Share specific outputs: "CybRisk estimated my client's ALE at $2.1M -- useful for their board presentation"
- Link to methodology sources (FAIR, IBM, DBIR) to build credibility
- Acknowledge limitations openly: "It's a model, not a crystal ball"
- Credit the actuarial data sources when discussing results

**Don't:**
- Present CybRisk estimates as definitive financial forecasts
- Use CybRisk outputs in legally binding documents without professional review
- Screenshot results without context about assumptions and limitations
- Claim CybRisk replaces professional risk assessment or actuarial analysis

### Social Proof Strategy

We do not use testimonials or customer logos (this is a hackathon project). Instead, we emphasize:
- Published data sources (IBM, Verizon, NetDiligence) as trust anchors
- Open-source code and transparent methodology as credibility signals
- Builder credentials: 20+ years in DFIR, IR, risk advisory, expert witness, vCISO
- Industry-standard methodology: Open FAIR model, Gordon-Loeb formula
- No-account-required as proof of confidence in the product experience

---

## Licensing & Ethics

### MIT License

We chose the MIT License because CybRisk is a hackathon project intended to demonstrate that financial risk quantification should be accessible, not locked behind enterprise paywalls. Restrictive licensing would contradict our core belief that risk transparency serves everyone.

**Why MIT and not something more restrictive?**
CybRisk's value is in the methodology and the user experience, not in proprietary algorithms. The FAIR model is open. The actuarial data comes from published reports. The Gordon-Loeb formula is academic literature. Restricting access to an implementation of public knowledge would be intellectually dishonest. MIT lets anyone learn from, build on, or fork this work.

**The license permits:**
- Commercial use, modification, and distribution
- Private use and sublicensing
- Integration into proprietary products

**The license requires:**
- Inclusion of the original copyright notice and license text in copies
- That is all -- MIT is intentionally minimal

**Ethical commitments (beyond the license):**
- CybRisk never stores user input data -- all calculation is stateless
- No analytics tracking beyond basic Vercel web analytics
- No email collection, no lead capture, no dark patterns
- Results are not shared with third parties, insurers, or anyone else
- Users own their inputs and outputs entirely

---

## Brand Governance

### Trademark

**CybRisk** is an unregistered trademark of Albert Hui / Security Ronin, used for identification purposes during the DataExpert Vibe Coding Challenge 2026.

The name should be used consistently across:
- Website header, footer, and page titles
- Open Graph metadata and social cards
- Documentation and README files
- Hackathon submission materials

### Style Quick Reference

| Element | Standard |
|---------|----------|
| Product name | CybRisk (capital C, capital R, one word) |
| Tagline | "Know your cyber risk in dollars, not checkboxes." |
| Primary color | Cyan-400 (#22d3ee) |
| Background | Slate-950 (#020617) |
| UI font | Inter |
| Data font | JetBrains Mono |
| License | MIT |
| Tone | Direct, authoritative, honest about uncertainty |

### Questions?

For brand-related questions, open an issue in the GitHub repository or contact Albert Hui via Security Ronin.

---

*Document generated by North Star Advisor*
