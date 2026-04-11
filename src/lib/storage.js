const PREFIX = 'dani_'

export function get(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function set(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // localStorage full or unavailable
  }
}

export function merge(key, patch, fallback = {}) {
  const current = get(key, fallback)
  const updated = { ...current, ...patch }
  set(key, updated)
  return updated
}

export function mergeDeep(key, path, patch, fallback = {}) {
  const current = get(key, fallback)
  const nested = current[path] ?? {}
  const updated = { ...current, [path]: { ...nested, ...patch } }
  set(key, updated)
  return updated
}

export function getAllDayKeys() {
  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(PREFIX + 'day_')) {
      keys.push(k.replace(PREFIX, ''))
    }
  }
  return keys.sort().reverse() // newest first
}

export function remove(key) {
  localStorage.removeItem(PREFIX + key)
}
