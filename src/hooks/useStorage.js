import { useState, useCallback } from 'react'
import { get, set } from '../lib/storage'

export function useStorage(key, defaultValue) {
  const [value, setValueState] = useState(() => get(key, defaultValue))

  const setValue = useCallback((updater) => {
    setValueState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      set(key, next)
      return next
    })
  }, [key])

  return [value, setValue]
}
