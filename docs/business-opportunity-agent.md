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
full scan per the agent's method.

Delivery works in three hops, because scheduled sessions have git but no GitHub
API tools:

1. The scheduled run writes its report to `reports/scan-<date>.md` and pushes it.
2. `.github/workflows/scan-report-publish.yml` sees the pushed file and opens an
   issue titled `Opportunity Scan — <date>` with the report as the body.
3. Because the issue is opened by `github-actions[bot]` rather than the repo
   owner, GitHub emails the full report to the owner — GitHub suppresses
   notifications for your own actions, which is why the bot must be the author.

So reports arrive in your inbox with no action needed, `reports/` is the archive
in git, and the Issues tab is the readable archive. Manage the Routine (pause,
reschedule, delete) from your Claude Routines list, or just ask Claude.

A second workflow, `scan-report-email.yml`, covers the other path: if an
`Opportunity Scan` issue is ever opened by the owner's own account (e.g. from an
interactive session), it re-posts the report as a bot comment so that it, too,
generates an email.

## What a report looks like

1. **Verdict first** — top 1–3 "do this" recommendations in three lines.
2. **Ranked shortlist table** — opportunity, lane, capital, payback, score.
3. **Per recommendation** — exact sourcing (suppliers/brands/platforms/fairs),
   first-90-days action list, capital breakdown, mini P&L with
   conservative/base/upside cases, sensitivity analysis, risks, and explicit
   kill criteria.
4. **Sources** — every macro claim cited with study and year.
5. **Passed-on list** — ideas rejected this scan and why, so they don't recycle.
