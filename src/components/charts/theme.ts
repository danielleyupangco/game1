/**
 * Chart palette and shared axis styling.
 *
 * The categorical slots are the validated dark-mode sequence — assigned in
 * fixed order and never cycled. Status colours (positive/negative) are kept
 * separate and are never reused as "series 3".
 */

export const SERIES = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181'] as const

export const STATUS = {
  pos: '#34d399',
  neg: '#f87171',
  warn: '#fbbf24',
  neutral: '#5f6874',
} as const

/** Single-hue blue ramp, light → dark, for magnitude encoding (heatmaps). */
export const SEQUENTIAL = [
  '#cde2fb',
  '#9ec5f4',
  '#6da7ec',
  '#3987e5',
  '#256abf',
  '#184f95',
  '#0d366b',
] as const

/** Diverging blue ↔ red with a neutral grey midpoint, for signed values. */
export const DIVERGING = {
  low: '#3987e5',
  mid: '#383835',
  high: '#e66767',
} as const

export const AXIS = {
  stroke: '#262b34',
  tick: { fill: '#5f6874', fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const

export const GRID = {
  stroke: '#1e222a',
  strokeDasharray: '0',
  vertical: false,
} as const

export const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#1c2027',
    border: '1px solid #262b34',
    borderRadius: 10,
    fontSize: 12,
    padding: '8px 10px',
    boxShadow: '0 8px 24px rgba(0,0,0,.45)',
  },
  labelStyle: { color: '#9aa3af', fontSize: 11, marginBottom: 4 },
  itemStyle: { color: '#e8eaed', padding: '1px 0' },
  cursor: { fill: 'rgba(255,255,255,.04)' },
} as const

/** Interpolates the sequential ramp for a value in [0, 1]. */
export function sequentialColor(t: number): string {
  if (!Number.isFinite(t)) return STATUS.neutral
  const clamped = Math.max(0, Math.min(1, t))
  const index = Math.round(clamped * (SEQUENTIAL.length - 1))
  return SEQUENTIAL[index]
}
