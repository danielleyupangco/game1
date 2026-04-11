import { useState } from 'react'
import { useToday } from '../hooks/useToday'
import { useStreak } from '../hooks/useStreak'
import { get, set } from '../lib/storage'
import { isoWeekKey, todayKey, formatDate } from '../lib/dateUtils'
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
  // Group by week columns (13 cols × 7 rows)
  const weeks = []
  let week = []
  for (let i = 0; i < last90.length; i++) {
    week.push(last90[i])
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
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
                    width: '11px',
                    height: '11px',
                    borderRadius: '2px',
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

function WeeklyReflection() {
  const weekKey = isoWeekKey()
  const storageKey = 'week_' + weekKey
  const saved = get(storageKey, null)
  const [text, setText] = useState(saved?.reflection ?? '')
  const [rating, setRating] = useState(saved?.rating ?? 0)
  const [saveStatus, setSaveStatus] = useState('')
  const [isEditing, setIsEditing] = useState(!saved)

  const handleSave = () => {
    const data = { week: weekKey, reflection: text, rating, completedAt: new Date().toISOString() }
    set(storageKey, data)
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
          <button
            onClick={() => setIsEditing(true)}
            style={{ fontSize: '10px', color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.06em' }}
          >
            Edit
          </button>
        )}
      </div>

      {/* Star rating */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => setRating(n)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', opacity: n <= rating ? 1 : 0.25, transition: 'opacity 0.15s' }}
          >
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
          <button
            className="timer-btn"
            onClick={handleSave}
            style={{ marginTop: '10px', width: '100%', padding: '11px' }}
          >
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
      {/* Header */}
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
          <ProgressRing
            progress={streakProgress}
            size={140}
            strokeWidth={8}
            color={atWeekGoal ? '#2dd4bf' : '#818cf8'}
          >
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

        {/* Stats row */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #1a1a1a' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Flame size={13} color="#f97316" />
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#f0f0f0' }}>{currentStreak}</span>
            </div>
            <div style={{ fontSize: '9px', color: '#4b5563', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '2px' }}>Current</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Trophy size={13} color="#eab308" />
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#f0f0f0' }}>{longestStreak}</span>
            </div>
            <div style={{ fontSize: '9px', color: '#4b5563', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '2px' }}>Best</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Target size={13} color="#818cf8" />
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#f0f0f0' }}>{totalComplete}</span>
            </div>
            <div style={{ fontSize: '9px', color: '#4b5563', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '2px' }}>Total Days</div>
          </div>
        </div>
      </div>

      {/* This week */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#4b5563', marginBottom: '14px' }}>
          This Week
        </div>
        <WeekGrid weekDays={weekDays} />
      </div>

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
