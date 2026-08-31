import type { CostModel, DcfAssumptions, PricingAssumptions, Settings } from '@/types'

/**
 * Every assumption in this app is defined here and editable in the UI.
 * Nothing that drives a number is hidden inside a component.
 */

export const DEFAULT_SETTINGS: Settings = {
  baseCurrency: 'PHP',
  usdPhp: 58,
  benchmarkName: 'PSEi',
  driftBandPct: 0.05,
  cashOnHand: 0,
  targetsByAssetClass: [
    { key: 'Equity', weight: 0.6 },
    { key: 'Fixed Income', weight: 0.2 },
    { key: 'Cash', weight: 0.1 },
    { key: 'Real Estate', weight: 0.05 },
    { key: 'Alternatives', weight: 0.03 },
    { key: 'Crypto', weight: 0.02 },
  ],
  targetsByGeography: [],
  targetsByCurrency: [
    { key: 'PHP', weight: 0.5 },
    { key: 'USD', weight: 0.5 },
  ],
}

/**
 * Island T: 3BR/3BA private island retreat, Culion, Palawan.
 * Starting points only — the DCF panel exists so these get replaced with
 * numbers from your own P&L once bookings and expenses are imported.
 */
export const DEFAULT_DCF: DcfAssumptions = {
  availableNightsPerYear: 330,
  startOccupancy: 0.35,
  terminalOccupancy: 0.55,
  occupancyRampYears: 4,
  adr: 25000,
  adrGrowth: 0.04,
  variableCostPerNight: 6000,
  fixedCostPerYear: 1200000,
  costInflation: 0.045,
  taxRate: 0.25,
  maintenanceCapexPerYear: 250000,
  discountRate: 0.14,
  terminalGrowth: 0.03,
  projectionYears: 10,
  netDebt: 0,
}

export const DEFAULT_PRICING: PricingAssumptions = {
  priceElasticity: -0.6,
  // Palawan dry season: roughly November through May.
  highSeasonMonths: [11, 12, 1, 2, 3, 4, 5],
  targetOccupancy: 0.6,
  maxRateChangePct: 0.2,
  weekendUpliftPct: 0.15,
}

export const ASSUMPTION_NOTES: Record<keyof DcfAssumptions, string> = {
  availableNightsPerYear: 'Sellable nights after blocking out owner stays, maintenance and any hard weather closures.',
  startOccupancy: 'Occupancy in year 1 of the projection. Pre-filled from your trailing-12-month actuals when bookings are imported.',
  terminalOccupancy: 'The steady-state occupancy the ramp converges to.',
  occupancyRampYears: 'Years taken to move from start to terminal occupancy, straight-line.',
  adr: 'Average daily rate in year 1. Pre-filled from actuals when available.',
  adrGrowth: 'Annual nominal rate growth. Above local inflation implies real pricing power.',
  variableCostPerNight: 'Catering, boat fuel, cleaning, linen — costs that only occur when a guest is on the island.',
  fixedCostPerYear: 'Property tax, insurance, crew salaries, retainers, connectivity — incurred at zero occupancy.',
  costInflation: 'Annual growth applied to both fixed and variable costs.',
  taxRate: 'Effective tax on operating profit.',
  maintenanceCapexPerYear: 'Upkeep spend to hold the asset at its current standard. Deducted after tax, not expensed above it.',
  discountRate: 'Required return. For an illiquid, single-asset, single-location property this sits well above a listed-equity cost of capital.',
  terminalGrowth: 'Perpetual growth after the projection window. Must stay below the discount rate.',
  projectionYears: 'Explicit forecast horizon before the terminal value takes over.',
  netDebt: 'Debt against the property minus cash held in the business. Subtracted from enterprise value to get equity value.',
}

/**
 * The operating cost model, as an owner keeps it: what you pay every month
 * whatever happens, what each night sold costs you, and what each booking
 * costs you. Edited in the app — these are only the starting shape.
 */
export const DEFAULT_COST_MODEL: CostModel = {
  fixedMonthly: [
    { id: 'salaries', label: 'Crew salaries', amount: 34000 },
    { id: 'maintenance', label: 'Maintenance', amount: 13000 },
    { id: 'connectivity', label: 'Starlink', amount: 2700 },
    { id: 'supplies', label: 'Towels and supplies', amount: 2000 },
    { id: 'depreciation', label: 'Solar and genset wear', amount: 12750 },
  ],
  perNight: [{ id: 'power', label: 'Generator diesel and electricity', amount: 2000 }],
  perStay: [
    { id: 'water', label: 'Water pump', amount: 600 },
    { id: 'gas', label: 'Cooking gas', amount: 600 },
    { id: 'laundry', label: 'Laundry and soap', amount: 1500 },
  ],
  platformFeePct: 0.03,
  nightsPerStay: 3,
  availableNightsPerYear: 365,
}
