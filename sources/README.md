# Source files

Everything the dashboard knows comes from one of the files below. This folder
is where the raw ones live so a refresh is always the same three steps.

**The contents of this folder are gitignored.** They are real financial and
guest records; only this README is committed.

## What is authoritative for what

| Source | Authoritative for | How it arrives |
| --- | --- | --- |
| Airbnb transaction export (`airbnb_*.csv`) | Room revenue, fees, stay dates, guest name, confirmation code, and the resolution payouts that reconcile the bank | Airbnb → Account → Transaction history → Export CSV. Take both the **completed** and the **upcoming/pending** exports. |
| Guest add-on form responses (`addon-form.csv`) | The margin kept on food, boats and tours — guest total less the island crew's cost | Island T v2 sheet → Pipeline / form responses tab → File → Download → CSV |
| Airbnb host inbox (no export exists) | Party size, guest country, the review | Typed into the guest record in the app. The Guests tab lists which stays are still missing them. |
| Mastersheet metrics tab (`y3_2026_metrics.csv`) | The add-on trade with all three sides against a confirmation code — `requested` (guest charged), `To Allan` (crew quote), `Balance` (your patong) — plus guest country and review | Mastersheet → the year's `- metrics` tab → download as CSV. Recognised on sight; room revenue is **not** taken from it, the Airbnb export stays the authority on money received. |
| Mastersheet (`Island_T__Mastersheet.xlsx`) | Historical expenses, capital spend, dividends — the years before the exports above start | One-off import; superseded for revenue by the Airbnb export |

## Refreshing

1. Drop the new Airbnb CSV on **Data → Bookings**. It is recognised on sight:
   no column mapping, and the import shows whether transfers to the bank equal
   the reservations plus resolutions behind them. Re-importing a file that
   overlaps one already loaded will **not** duplicate anything — a stay already
   on file keeps its identity, and the details typed in by hand survive.
2. Drop the form responses CSV on **Data → Guest add-on form**. Test and setup
   submissions are flagged out with a stated reason and can be put back.
3. Open **Island T → Guests → stays still missing details** and fill in party
   size, country and review for anything new.

Nothing else needs doing; the P&L, forecast, valuation and guest book all read
from the same records.

## Why some of this is manual

Airbnb blocks automated access, and Google Sheets is not reachable from the
build environment either. Anything that would require reading either one live
is therefore a file drop or a typed entry — which is slower, but means every
number on screen is traceable to something a person can point at.
