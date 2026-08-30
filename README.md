# Ledger

A local dashboard for two things: an investment portfolio and Island T, a 3BR/3BA
private island retreat in Culion, Palawan.

Everything runs in your browser. Spreadsheets are parsed on your device, data is
stored in IndexedDB, and the app makes no network requests at runtime — no fonts,
no analytics, no server. There is nothing to sign into and nothing to leak.

```bash
npm install
npm run dev      # http://localhost:5173
```

## What's here

| Page | What it does |
|---|---|
| **Home** | Net worth, a one-line status per section, the three things most worth acting on, and an alert strip for anything off-target. |
| **Investments** | Holdings, time-weighted performance vs. a benchmark, allocation drift by asset class / geography / currency, concentration and drawdown, and a rebalancing engine that shows its scoring. |
| **Island T** | ADR, occupancy, RevPAR, seasonality; room revenue and the share of add-on revenue you keep, tracked separately; fixed vs. variable costs with break-even; monthly and trailing-12-month P&L; a DCF with a full assumptions panel, tornado and sensitivity table; capital-allocation modelling; and pricing suggestions built on the revenue/occupancy trade-off. |
| **Analysis** | Written findings — each with the numbers behind it, the holdings it bears on, and one next step you can mark done. Separate from the Home alerts, which are rules that recompute; these are judgements that persist. |
| **Data** | Import wizard, import history with the column mapping each batch used, and backup/restore. |
| **Settings** | Currency, benchmark, drift band, and allocation targets. |

## Importing your spreadsheets

The importer does **not** assume your column names. It reads the file, guesses a
mapping, shows you every guess, and lets you correct it before anything is saved.
Change your sheet layout next quarter and you just re-map two dropdowns.

It handles what real exports actually contain:

- title banners and blank rows above the real header row
- accounting negatives — `(1,234.50)`
- currency symbols and thousands separators — `₱ 12,000`, `$1,234.56`
- `YYYY-MM-DD`, `MM/DD/YYYY`, `DD/MM/YYYY` (there's a toggle), `5 Mar 2026`, and Excel serial numbers
- multiple sheets — it picks the one that maps best and lets you switch
- formula cells (it reads the computed result, and ignores a formula whose result was never cached)
- subtotal and grand-total rows, which are dropped so the sheet isn't double-counted
- **several tables stacked in one sheet** — one block per owner or account. Each is detected, and you name it on import so it becomes the account on those rows
- **a workbook of dated sheets** — if two or more sheet names read as dates ("August 13, 2026", "Oct 28, 2025 Portfolio"), the importer offers to load every one as its own snapshot in a single pass, giving you a full history instead of a single point
- **a management P&L, with months across the top** — the crosstab layout is detected and read cell by cell, one record per populated cell. Totals, margins, night counts and occupancy rates are unticked by default (a night count is not a peso amount), each cost line's fixed/variable tag is editable, and any period column already covered by an earlier import is dropped so a fiscal-year sheet doesn't double-count the calendar year beside it
- **refunds and cancellations booked as negative rows** — netted off revenue and nights rather than discarded

Rows it can't parse are **listed with a reason before you commit**, never dropped
silently.

### What each dataset is for

| Dataset | Required fields | Unlocks |
|---|---|---|
| **Portfolio holdings** | ticker, quantity, and either market value or price | Holdings table, weights, allocation, concentration |
| **Transactions** | date, type, cash amount | Returns net of contributions; money-weighted return |
| **Benchmark levels** | date, index level | The relative-performance line |
| **Bookings** | check-in, check-out (or nights), revenue | ADR, occupancy, RevPAR, seasonality, pricing |
| **Expenses** | date, category, amount | P&L, cost per available night, break-even, DCF |

Optional columns (cost basis, asset class, geography, currency, channel,
fixed/variable) each enable specific views; the app says which are missing rather
than filling them in.

### Snapshots

Each holdings import is stored as a **dated snapshot** rather than overwriting the
last one. That's what makes a return series possible: import in March, import
again in June, and the app has two valuation points to chain-link between. It also
locks the USD→PHP rate to each snapshot, so last quarter's numbers don't move when
today's exchange rate does.

## How the numbers are computed

Every model is in `src/domain/` and reads like a model, not a black box.

**Time-weighted return** (`investments/performance.ts`) chain-links Modified Dietz
sub-period returns between snapshots. Modified Dietz weights each cashflow by the
fraction of the period it was invested — an approximation, because a true TWR needs
a valuation on every cashflow date. The app flags periods where flows exceeded 20%
of the portfolio, since that's where the approximation gets loose. **Money-weighted
return** (IRR of actual cashflows) is reported separately: it answers "what did my
money earn", including timing, which is a different question.

**The rebalancing engine** (`investments/rebalance.ts`) ranks moves on four
components with published weights — gap closure (45%), tax/cost efficiency (25%),
concentration (20%), valuation signal (10%). Every card shows all four scores and
the reasoning. It assumes the PH stock transaction tax of 0.6% on gross proceeds
rather than capital gains tax, which is what applies to listed shares here. It is
decision support: it never places a trade and it knows nothing about markets beyond
what you imported.

**Revenue recognition** (`airbnb/metrics.ts`) apportions each stay across the months
it actually covers. A March 29 → April 2 booking puts three nights in March and one
in April, rather than creating a fake spike in whichever month you keyed on.

**The DCF** (`airbnb/dcf.ts`) lays out every projection year in full — nights, ADR,
revenue, costs, tax, capex, free cash flow, discount factor, present value. It
reports the **terminal share** prominently: when most of the value comes from a
growth rate beyond the forecast window, the answer is an opinion about the far
future, and you should know that. It refuses to produce a number when terminal
growth meets the discount rate instead of returning a nonsense one.

**Pricing** (`airbnb/pricing.ts`) only suggests a move when RevPAR improves after
the occupancy loss, using an elasticity you set. When elasticity is between 0 and
−1, revenue rises at every price and there is no interior optimum — so the model
just recommends your cap. The app **says so explicitly** rather than presenting the
cap as a finding.

## Assumptions

Nothing that drives a number is hidden in a component. Defaults live in
`src/state/defaults.ts` and every one is editable in the UI, with a note explaining
what it means. The DCF panel has a **Load from actuals** button that replaces the
year-1 operating assumptions with your trailing-12-month numbers.

## Provenance

Click any holding, allocation bucket, month, cost category, or the `source` link on
a KPI tile, and a drawer shows the exact file, sheet and row numbers behind that
figure. Every imported record carries this, and exported spreadsheets carry it too.

## Freshness and empty states

Each section shows how old its data is, turning amber past 30 days and red past 90.
Sections with no data show an empty state and an import prompt — the app never
invents a placeholder number. If you see a figure, it came from a file you imported.

## Data lives in this browser

There is no cloud. That means:

- **Backup** (Data → Download backup) is how you move data to another device, and
  the only protection against clearing your browsing data.
- Phone and laptop hold **separate** copies unless you move a backup across.
- The layout works on a phone, with the Home summary and key metrics designed for it.

## Exporting

Any table exports to `.xlsx` with real numbers (not strings), Excel number formats,
and a header noting what the export is and which assumptions produced it. For PDF,
use the browser's print dialogue — a print stylesheet drops the navigation and
controls.

## Shipping a copy with data in it

The app is browser-local, so a fresh copy opens empty. To hand someone a build
with their data already loaded:

```bash
npm run seed -- path/to/ledger-backup.json   # bakes the backup into the build
npm run build:artifact                        # one self-contained .html file
npm run seed -- --clear                       # back to the empty app
```

`src/seed/data.json` is gitignored — it is somebody's actual financial data and
does not belong in version control. The seed loads once, only into a database
that has never been written to, and never over the top of existing work.

`build:artifact` inlines every chunk into a single HTML file (code splitting and
the lazy ExcelJS import are collapsed for that build only), so the page needs no
server and no module loading of its own.

## Development

```bash
npm run dev         # dev server
npm test            # 48 unit tests over the financial models
npm run typecheck   # tsc
npm run lint        # eslint
npm run build       # production build
npm run smoke       # build first, then drives the real app in a browser
```

`npm test` covers the parts where a silent error would be most expensive: TWR and
cashflow handling, IRR, allocation drift, the rebalancing engine, night
apportionment, DCF identities (a flat DCF equals the textbook perpetuity), payback
and profitability, the pricing curve, and spreadsheet coercion across timezones.

`npm run smoke` generates deliberately awkward workbooks in `scripts/fixtures/`
(gitignored) and drives the built app through empty state → six imports → every tab
→ provenance → export → a phone viewport, asserting there are no console errors.
Those fixtures are for the test only; the app itself ships no sample data.

## Stack

React 19 · TypeScript · Vite · Tailwind 4 · Recharts · ExcelJS (lazy-loaded) ·
IndexedDB via `idb`. Hash routing, so the built app works from a static host or a
`file://` path with no server rewrite rules.
