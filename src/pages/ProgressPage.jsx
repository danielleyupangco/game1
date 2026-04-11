import { useState } from 'react'
import { useToday } from '../hooks/useToday'
import { useStreak } from '../hooks/useStreak'
import { get, set, getAllDayKeys } from '../lib/storage'
import { isoWeekKey, todayKey, formatDate, offsetDayKey } from '../lib/dateUtils'
import { PROTOCOL_ITEMS, PROTOCOL_KEYS } from '../constants/habits'
import ProgressRing from '../components/ui/ProgressRing'
import { Flame, Trophy, Target } from 'lucide-react'

const WEEK_GOAL = 7

function WeekGrid({ weekDays }) {
  const today = todayKey()
  return (
    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
      {weekDays.map(({ key, dayLabel, isComplete, isToday, isFuture }) => (
        <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
          <div style={{ fontSize: '9px', fontWeight: 600, color: '#4b5563', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {dayLabel}
          </div>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: isComplete ? '#2dd4bf' : isFuture ? '#0d0d0d' : '#141414',
            border: isToday
              ? '1.5px solid #2dd4bf'
              : isFuture
              ? '1px solid #1a1a1a'
              : isComplete
              ? 'none'
              : '1px solid #1f1f1f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
          }}>
            {isComplete && <span style={{ fontSize: '14px' }}>✓</span>}
            {isToday && !isComplete && <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#2dd4bf' }} />}
          </div>
        </div>
      ))}
    </div>
  )
}

function CalendarHeatmap({ last90 }) {
  const weeks = []
  let week = []
  for (let i = 0; i < last90.length; i++) {
    week.push(last90[i])
    if (week.length === 7) { weeks.push(week); week = [] }
  }
  if (week.length > 0) weeks.push(week)
  const today = todayKey()

  return (
    <div style={{ overflowX: 'auto' }} className="no-scrollbar">
      <div style={{ display: 'flex', gap: '3px', minWidth: 'max-content' }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {week.map(({ key, completion, isComplete }) => {
              const isFuture = key > today
              const bg = isFuture
                ? '#0d0d0d'
                : isComplete
                ? '#2dd4bf'
                : completion > 0
                ? `rgba(45,212,191,${0.08 + completion * 0.35})`
                : '#141414'
              return (
                <div
                  key={key}
                  title={`${formatDate(key)} · ${Math.round(completion * 100)}%`}
                  style={{
                    width: '11px', height: '11px', borderRadius: '2px',
                    background: bg,
                    border: key === today ? '1px solid rgba(45,212,191,0.5)' : 'none',
                    transition: 'background 0.3s ease',
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function HabitConsistency() {
  const today = todayKey()
  // Build last 30 days of records
  const days30 = []
  for (let i = 29; i >= 0; i--) {
    const key = offsetDayKey(-i)
    if (key > today) continue
    const record = get('day_' + key, null)
    days30.push({ key, protocol: record?.protocol ?? {} })
  }
  const totalDays = days30.length

  // For each protocol item compute how many days it was done
  const stats = PROTOCOL_ITEMS.map(item => {
    const done = days30.filter(d => d.protocol[item.key] === true).length
    // Last 7 days
    const last7 = days30.slice(-7)
    const done7 = last7.filter(d => d.protocol[item.key] === true).length
    return { ...item, done, done7, total: totalDays, pct: totalDays > 0 ? done / totalDays : 0 }
  })

  // Mini dots (last 14 days) per habit
  const last14Keys = []
  for (let i = 13; i >= 0; i--) {
    const k = offsetDayKey(-i)
    if (k <= today) last14Keys.push(k)
  }

  return (
    <div className="card" style={{ marginBottom: '16px' }}>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#4b5563' }}>
          Habit Consistency
        </div>
        <div style={{ fontSize: '11px', color: '#374151', marginTop: '2px' }}>Last 30 days</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {stats.map(({ key, icon, label, done, done7, total, pct }) => (
          <div key={key}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px' }}>{icon}</span>
                <span style={{ fontSize: '12px', color: '#9ca3af', fontFamily: 'var(--font-mono)' }}>
                  {label.split(':')[0]}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '10px', color: '#4b5563' }}>
                  7d: <span style={{ color: done7 >= 5 ? '#2dd4bf' : done7 >= 3 ? '#eab308' : '#6b7280', fontWeight: 600 }}>{done7}/7</span>
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: pct >= 0.8 ? '#2dd4bf' : pct >= 0.5 ? '#eab308' : '#6b7280', minWidth: '36px', textAlign: 'right' }}>
                  {done}/{total}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ height: '4px', background: '#1e1e1e', borderRadius: '2px', overflow: 'hidden', marginBottom: '5px' }}>
              <div style={{
                height: '100%',
                width: `${pct * 100}%`,
                background: pct >= 0.8
                  ? '#2dd4bf'
                  : pct >= 0.5
                  ? 'linear-gradient(90deg, #eab308, #f97316)'
                  : '#374151',
                borderRadius: '2px',
                transition: 'width 0.6s ease',
              }} />
            </div>

            {/* Mini dot trail — last 14 days */}
            <div style={{ display: 'flex', gap: '3px' }}>
              {last14Keys.map(k => {
                const dayRecord = get('day_' + k, null)
                const checked = dayRecord?.protocol?.[key] === true
                return (
                  <div
                    key={k}
                    style={{
                      flex: 1,
                      height: '5px',
                      borderRadius: '2px',
                      background: checked ? '#2dd4bf' : k === today ? 'rgba(45,212,191,0.15)' : '#1e1e1e',
                    }}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function WeeklyReflection() {
  const weekKey = isoWeekKey()
  const storageKey = 'week_' + weekKey
  const saved = get(storageKey, null)
  const [text, setText] = useState(saved?.reflection ?? '')
  const [rating, setRating] = useState(saved?.rating ?? 0)
  const [saveStatus, setSaveStatus] = useState('')
  const [isEditing, setIsEditing] = useState(!saved)

  const handleSave = () => {
    set(storageKey, { week: weekKey, reflection: text, rating, completedAt: new Date().toISOString() })
    setSaveStatus('saved')
    setIsEditing(false)
    setTimeout(() => setSaveStatus(''), 2000)
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#4b5563' }}>
            Weekly Reflection
          </div>
          <div style={{ fontSize: '11px', color: '#374151', marginTop: '2px' }}>{weekKey}</div>
        </div>
        {!isEditing && saved && (
          <button onClick={() => setIsEditing(true)} style={{ fontSize: '10px', color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer' }}>
            Edit
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => setRating(n)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', opacity: n <= rating ? 1 : 0.2, transition: 'opacity 0.15s' }}>
            ★
          </button>
        ))}
      </div>

      {isEditing ? (
        <>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="How did this week go? What did you learn? What will you do differently?"
            className="dark-input"
            style={{ minHeight: '100px', lineHeight: '1.65', padding: '10px 12px' }}
            rows={5}
          />
          <button className="timer-btn" onClick={handleSave} style={{ marginTop: '10px', width: '100%', padding: '11px' }}>
            Save Reflection
          </button>
        </>
      ) : (
        <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.65', color: '#6b7280', whiteSpace: 'pre-wrap' }}>
          {text || <span style={{ color: '#374151', fontStyle: 'italic' }}>No reflection yet</span>}
        </p>
      )}
      {saveStatus && <div style={{ marginTop: '6px', fontSize: '11px', color: '#2dd4bf' }}>✓ Saved</div>}
    </div>
  )
}

export default function ProgressPage() {
  const { record } = useToday()
  const { currentStreak, longestStreak, weekDays, last90 } = useStreak(record.protocolComplete)

  const streakProgress = Math.min(currentStreak / WEEK_GOAL, 1)
  const atWeekGoal = currentStreak >= WEEK_GOAL
  const totalComplete = last90.filter(d => d.isComplete).length

  return (
    <div style={{ padding: '24px 20px', maxWidth: '480px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#4b5563', marginBottom: '4px' }}>
          Your Journey
        </div>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#f0f0f0', letterSpacing: '-0.02em', fontFamily: 'var(--font-mono)' }}>
          Progress
        </h1>
      </div>

      {/* Streak hero */}
      <div className="card" style={{ marginBottom: '16px', textAlign: 'center', padding: '24px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <ProgressRing progress={streakProgress} size={140} strokeWidth={8} color={atWeekGoal ? '#2dd4bf' : '#818cf8'}>
            <div>
              <div style={{ fontSize: '38px', fontWeight: 700, color: '#f0f0f0', lineHeight: 1, fontFamily: 'var(--font-mono)' }}>
                {currentStreak}
              </div>
              <div style={{ fontSize: '10px', color: '#6b7280', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '2px' }}>
                {currentStreak === 1 ? 'day' : 'days'}
              </div>
            </div>
          </ProgressRing>
        </div>

        <div style={{ fontSize: '13px', fontWeight: 500, color: '#9ca3af', marginBottom: '4px' }}>
          {atWeekGoal ? '🎉 Week goal reached — keep going!' : `${WEEK_GOAL - currentStreak} days to your first milestone`}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #1a1a1a' }}>
          {[
            { icon: <Flame size={13} color="#f97316" />, value: currentStreak, label: 'Current' },
            { icon: <Trophy size={13} color="#eab308" />, value: longestStreak, label: 'Best' },
            { icon: <Target size={13} color="#818cf8" />, value: totalComplete, label: 'Total Days' },
          ].map(({ icon, value, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                {icon}
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#f0f0f0' }}>{value}</span>
              </div>
              <div style={{ fontSize: '9px', color: '#4b5563', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '2px' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* This week */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#4b5563', marginBottom: '14px' }}>
          This Week
        </div>
        <WeekGrid weekDays={weekDays} />
      </div>

      {/* Per-habit consistency */}
      <HabitConsistency />

      {/* 90-day heatmap */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#4b5563' }}>
            90-Day View
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#141414', border: '1px solid #1f1f1f' }} />
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(45,212,191,0.25)' }} />
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#2dd4bf' }} />
          </div>
        </div>
        <CalendarHeatmap last90={last90} />
      </div>

      {/* Weekly reflection */}
      <WeeklyReflection />

      <div style={{ height: '12px' }} />
    </div>
  )
}
