import { useState, useEffect } from 'react'
import { get, getAllDayKeys } from '../lib/storage'
import { todayKey, getWeekDayKeys, getLast90DayKeys } from '../lib/dateUtils'

function computeStreak() {
  const cached = get('streak', null)
  const today = todayKey()

  // Walk backward to compute current streak
  const allKeys = getAllDayKeys()
  const completeSet = new Set(
    allKeys
      .map(k => ({ key: k.replace('day_', ''), record: get(k, null) }))
      .filter(({ record }) => record?.protocolComplete)
      .map(({ key }) => key)
  )

  // Also check today
  const todayRecord = get('day_' + today, null)
  if (todayRecord?.protocolComplete) completeSet.add(today)

  // Walk backward from today counting consecutive days
  let streak = 0
  const cursor = new Date()
  while (true) {
    const k = cursor.toISOString().slice(0, 10)
    if (completeSet.has(k)) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }

  const longest = cached?.longestStreak ?? 0
  const newLongest = Math.max(streak, longest)

  return {
    currentStreak: streak,
    longestStreak: newLongest,
    lastCompleteDate: cached?.lastCompleteDate ?? null,
  }
}

export function useStreak(protocolComplete) {
  const today = todayKey()

  const [streakData, setStreakData] = useState(() => computeStreak())

  useEffect(() => {
    setStreakData(computeStreak())
  }, [protocolComplete])

  const weekDayKeys = getWeekDayKeys()
  const weekDays = weekDayKeys.map(({ key, dayLabel }) => {
    const record = get('day_' + key, null)
    const isComplete = record?.protocolComplete ?? false
    const isToday = key === today
    const isPast = key < today
    const isFuture = key > today
    return { key, dayLabel, isComplete, isToday, isPast, isFuture }
  })

  const last90 = getLast90DayKeys().map(key => {
    const record = get('day_' + key, null)
    if (!record) return { key, completion: 0 }
    const protocol = record.protocol ?? {}
    const keys = ['noBreakfast', 'lunchLiquids', 'fastUntil630', 'stepsGoalMet', 'meditateDone', 'plankDone', 'journalDone']
    const done = keys.filter(k => protocol[k]).length
    return { key, completion: done / keys.length, isComplete: record.protocolComplete }
  })

  return {
    ...streakData,
    weekDays,
    last90,
  }
}
