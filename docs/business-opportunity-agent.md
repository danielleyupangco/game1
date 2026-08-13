# Business Opportunity Agent

An analyst agent that finds, verifies, financially models, and ranks specific
business opportunities for Dani — what to start, what to import from China/Europe,
and which franchise/licensing gaps to take — grounded in top-tier market research
(McKinsey, BCG, Bain, World Bank, ADB, PSA/BSP data) and hard unit-economics math.

The agent definition lives at [`.claude/agents/business-opportunity.md`](../.claude/agents/business-opportunity.md).

## What it knows about the operator

| Parameter | Setting |
|---|---|
| Capital per play | ₱500K – ₱2.5M all-in (incl. working capital + 20% buffer) |
| Involvement | Owner-strategist with hired manager — only manager-runnable businesses |
| Home market | Metro Manila, with national/export awareness |
| Hunting lanes | Imports (China/Europe), franchise & licensing gaps, her interest sectors (fintech/SME lending, hospitality, real estate, consumer brands, wellness), and anything sector-agnostic with exceptional numbers |
| Target payback | ≤ 24–30 months base case |

Edit the agent file to change any of these — they're all in plain text under
"Who you work for" and "Hard screens."

## How to use it

**On-demand deep dives** — in any Claude Code session in this repo, just ask:

- "Find me opportunities in pet care"
- "What products from Europe should I bring into the Philippines?"
- "Run a full opportunity scan"
- "Model the numbers on a matcha cafe in BGC"

Claude will route the request to the `business-opportunity` agent automatically.
To use it outside this repo, copy `.claude/agents/business-opportunity.md` into
`~/.claude/agents/` on your machine.

**Weekly automatic scan** — a Claude Routine ("Weekly Business Opportunity Scan")
runs every Monday 8:00 AM Philippine time in a fresh cloud session and executes a
full scan per the agent's method. Each run delivers its report by posting a GitHub
issue titled `Opportunity Scan — <date>` on this repo — GitHub then emails the full
report to the repo owner automatically, so reports arrive in your inbox with no
action needed. Past reports stay browsable under the repo's Issues tab. Manage the
Routine (pause, reschedule, delete) from your Claude Routines list, or just ask
Claude.

## What a report looks like

1. **Verdict first** — top 1–3 "do this" recommendations in three lines.
2. **Ranked shortlist table** — opportunity, lane, capital, payback, score.
3. **Per recommendation** — exact sourcing (suppliers/brands/platforms/fairs),
   first-90-days action list, capital breakdown, mini P&L with
   conservative/base/upside cases, sensitivity analysis, risks, and explicit
   kill criteria.
4. **Sources** — every macro claim cited with study and year.
5. **Passed-on list** — ideas rejected this scan and why, so they don't recycle.
