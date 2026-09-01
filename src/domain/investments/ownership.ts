import type { Holding } from '@/types'

/**
 * Whose money is in the portfolio.
 *
 * Two pots that happen to sit in one spreadsheet, and they answer to different
 * people: what Dani holds on her own, and what she and Nicolo hold jointly from
 * wedding gifts. Reporting them as one number hides the thing that actually
 * matters about the joint pot — that it is somebody else's money too, and its
 * allocation is a decision the two of them make together rather than one she
 * makes alone.
 *
 * The split is read from the account label on each row rather than configured,
 * so it stays right when the next snapshot arrives with new accounts.
 */

export type Owner = 'dani' | 'joint' | 'business' | 'unassigned'

export const OWNER_LABELS: Record<Owner, string> = {
  dani: 'Dani',
  joint: 'Dani & Nicolo',
  business: 'Island T (business)',
  unassigned: 'Unlabelled',
}

export const OWNER_BLURBS: Record<Owner, string> = {
  dani: 'Held in Dani’s own name.',
  joint: 'Wedding gifts held jointly with Nicolo — decisions here are shared.',
  business:
    'The Island T operating account. It sits in a personal bank but it is the business’s working capital — guest money that still has crew, supplies and the next dividend to pay out of it. It is counted once, inside what the business is worth, and left out of personal net worth so it is not counted twice.',
  unassigned: 'Rows whose account column was blank or generic in the source sheet.',
}

/**
 * Anything naming both of them, or the gifts themselves, is joint. Deliberately
 * a small list of markers rather than an exact account name: the sheet has
 * already spelled it "DaNics (wedding gifts)" and will likely spell it
 * differently again.
 */
const JOINT_MARKERS = ['danic', 'da nics', 'nico', 'nics', 'wedding', 'joint', 'conjugal']

/** Account names that carry no ownership information at all. */
const GENERIC = ['', 'default', 'n/a', 'na', 'unassigned', 'none', '-']

/**
 * The business's own money, wherever it happens to be parked.
 *
 * The Island T takings sit in a personal BPI account, so the account label says
 * "Dani" and every total treated it as hers. It is not: it is the float the
 * business runs on, and it is already inside what the business is worth. Read
 * off the row's own label rather than the account column, because that is the
 * part that says "Airbnb" and the part that will still say it after the next
 * snapshot is imported.
 */
const BUSINESS_MARKERS = ['airbnb', 'island t']

export function isBusinessCash(holding: Holding): boolean {
  const text = `${holding.ticker} ${holding.name} ${holding.account}`.toLowerCase()
  return BUSINESS_MARKERS.some((marker) => text.includes(marker))
}

export function ownerOf(account: string): Owner {
  const key = account.trim().toLowerCase()
  if (GENERIC.includes(key)) return 'unassigned'
  if (JOINT_MARKERS.some((marker) => key.includes(marker))) return 'joint'
  return 'dani'
}

export function ownerOfHolding(holding: Holding): Owner {
  // Checked before the account label, which on this row says "Dani".
  if (isBusinessCash(holding)) return 'business'
  return ownerOf(holding.account)
}

/**
 * Everything that is actually the household's, which is what net worth means.
 *
 * The business float is excluded here and counted once inside the property's
 * valuation instead — see `businessCash` below and the DCF's net debt.
 */
export function personalHoldings(holdings: Holding[]): Holding[] {
  return holdings.filter((holding) => !isBusinessCash(holding))
}

/** The business float, in base currency. */
export function businessCash(holdings: Holding[], usdPhp: number): number {
  return holdings
    .filter(isBusinessCash)
    .reduce((sum, holding) => sum + holding.value * (holding.currency === 'USD' ? usdPhp : 1), 0)
}

export type OwnerSplit = {
  owner: Owner
  label: string
  value: number
  costBasis: number
  holdings: number
  /** account labels that landed in this bucket, so the grouping is checkable */
  accounts: string[]
}

export function splitByOwner(holdings: Holding[], usdPhp: number): OwnerSplit[] {
  const buckets = new Map<Owner, { value: number; costBasis: number; holdings: number; accounts: Set<string> }>()

  for (const holding of holdings) {
    const owner = ownerOfHolding(holding)
    const bucket = buckets.get(owner) ?? { value: 0, costBasis: 0, holdings: 0, accounts: new Set<string>() }
    const rate = holding.currency === 'USD' ? usdPhp : 1
    bucket.value += holding.value * rate
    bucket.costBasis += holding.costBasis * rate
    bucket.holdings += 1
    bucket.accounts.add(holding.account.trim() || '(blank)')
    buckets.set(owner, bucket)
  }

  const order: Owner[] = ['dani', 'joint', 'business', 'unassigned']
  return order
    .filter((owner) => buckets.has(owner))
    .map((owner) => {
      const bucket = buckets.get(owner)!
      return {
        owner,
        label: OWNER_LABELS[owner],
        value: bucket.value,
        costBasis: bucket.costBasis,
        holdings: bucket.holdings,
        accounts: [...bucket.accounts].sort(),
      }
    })
}

/**
 * How much of a pot is sitting in cash.
 *
 * Worth its own function because it is the question the joint pot keeps
 * failing: money given as a gift tends to sit in a savings account for years
 * while everyone waits for a good moment, and the waiting is itself a decision.
 */
export function cashShare(holdings: Holding[], usdPhp: number): { cash: number; total: number; share: number } {
  let cash = 0
  let total = 0
  for (const holding of holdings) {
    const rate = holding.currency === 'USD' ? usdPhp : 1
    const value = holding.value * rate
    total += value
    if (holding.assetClass === 'Cash') cash += value
  }
  return { cash, total, share: total > 0 ? cash / total : 0 }
}
