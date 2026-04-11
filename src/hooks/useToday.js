import { useState, useCallback } from 'react'
import { get, set } from '../lib/storage'
import { todayKey } from '../lib/dateUtils'
import { DEFAULT_DAY_RECORD, isProtocolComplete } from '../constants/habits'

function getDayRecord(dateKey) {
  const stored = get('day_' + dateKey, null)
  if (!stored) {
    return { ...DEFAULT_DAY_RECORD, date: dateKey }
  }
  // Merge with defaults to handle new fields
  return {
    ...DEFAULT_DAY_RECORD,
    ...stored,
    protocol: { ...DEFAULT_DAY_RECORD.protocol, ...(stored.protocol || {}) },
    steps: { ...DEFAULT_DAY_RECORD.steps, ...(stored.steps || {}) },
    meditation: { ...DEFAULT_DAY_RECORD.meditation, ...(stored.meditation || {}) },
    plank: { ...DEFAULT_DAY_RECORD.plank, ...(stored.plank || {}) },
  }
}

export function useToday() {
  const key = todayKey()
  const [record, setRecord] = useState(() => getDayRecord(key))

  const updateRecord = useCallback((patch) => {
    setRecord(prev => {
      const next = { ...prev, ...patch }
      // Auto-compute protocolComplete
      next.protocolComplete = isProtocolComplete(next.protocol)
      set('day_' + key, next)
      return next
    })
  }, [key])

  const toggleProtocol = useCallback((protocolKey) => {
    setRecord(prev => {
      const protocol = { ...prev.protocol, [protocolKey]: !prev.protocol[protocolKey] }
      const next = { ...prev, protocol }
      next.protocolComplete = isProtocolComplete(protocol)
      set('day_' + key, next)

      // Update streak cache if protocol just became complete
      if (next.protocolComplete && !prev.protocolComplete) {
        const streak = get('streak', { currentStreak: 0, longestStreak: 0, lastCompleteDate: null })
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yKey = yesterday.toISOString().slice(0, 10)
        const newStreak = streak.lastCompleteDate === yKey || streak.lastCompleteDate === key
          ? streak.currentStreak + 1
          : 1
        const updated = {
          currentStreak: newStreak,
          longestStreak: Math.max(newStreak, streak.longestStreak),
          lastCompleteDate: key,
        }
        set('streak', updated)
      }

      return next
    })
  }, [key])

  const setSteps = useCallback((entered) => {
    setRecord(prev => {
      const goal = prev.steps.goal
      const stepsGoalMet = entered >= goal
      const protocol = { ...prev.protocol, stepsGoalMet }
      const next = { ...prev, steps: { entered, goal }, protocol }
      next.protocolComplete = isProtocolComplete(protocol)
      set('day_' + key, next)
      return next
    })
  }, [key])

  const logMood = useCallback((mood) => {
    setRecord(prev => {
      const moodEntry = { ...mood, ts: new Date().toISOString() }
      const next = { ...prev, mood: [...prev.mood, moodEntry] }
      set('day_' + key, next)
      return next
    })
  }, [key])

  const setGratitude = useCallback((index, text) => {
    setRecord(prev => {
      const gratitude = [...prev.gratitude]
      gratitude[index] = text
      const next = { ...prev, gratitude }
      set('day_' + key, next)
      return next
    })
  }, [key])

  const setJournal = useCallback((text) => {
    setRecord(prev => {
      const next = { ...prev, journal: text }
      set('day_' + key, next)
      return next
    })
  }, [key])

  const logMeditationSession = useCallback((durationSeconds) => {
    setRecord(prev => {
      const session = { durationSeconds, completedAt: new Date().toISOString() }
      const meditation = { sessions: [...prev.meditation.sessions, session] }
      const protocol = { ...prev.protocol, meditateDone: true }
      const next = { ...prev, meditation, protocol }
      next.protocolComplete = isProtocolComplete(protocol)
      set('day_' + key, next)
      return next
    })
  }, [key])

  const logPlankSession = useCallback((durationSeconds) => {
    setRecord(prev => {
      const session = { durationSeconds, completedAt: new Date().toISOString() }
      const plank = { sessions: [...(prev.plank?.sessions || []), session] }
      const protocol = { ...prev.protocol, plankDone: true }
      const next = { ...prev, plank, protocol }
      next.protocolComplete = isProtocolComplete(protocol)
      set('day_' + key, next)
      return next
    })
  }, [key])

  return {
    dateKey: key,
    record,
    updateRecord,
    toggleProtocol,
    setSteps,
    logMood,
    setGratitude,
    setJournal,
    logMeditationSession,
    logPlankSession,
  }
}
