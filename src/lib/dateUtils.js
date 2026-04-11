export function toDateKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayKey() {
  return toDateKey(new Date())
}

export function yesterdayKey() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return toDateKey(d)
}

export function offsetDayKey(offsetDays) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return toDateKey(d)
}

export function dayOfYear(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date - start
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function isoWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

export function formatDate(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatTime(isoString) {
  const d = new Date(isoString)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export function getLast7DayKeys() {
  const keys = []
  for (let i = 6; i >= 0; i--) {
    keys.push(offsetDayKey(-i))
  }
  return keys
}

export function getLast90DayKeys() {
  const keys = []
  for (let i = 89; i >= 0; i--) {
    keys.push(offsetDayKey(-i))
  }
  return keys
}

export function getWeekDayKeys() {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0=Sun
  const keys = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - dayOfWeek + i)
    keys.push({ key: toDateKey(d), dayLabel: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][i] })
  }
  return keys
}
