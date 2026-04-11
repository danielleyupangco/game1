import { useState } from 'react'
import { useToday } from '../hooks/useToday'
import { MOODS } from '../constants/habits'
import { get, getAllDayKeys } from '../lib/storage'
import { formatDate, formatTime, todayKey } from '../lib/dateUtils'

function MoodHistory() {
  const allKeys = getAllDayKeys().slice(0, 7)
  const today = todayKey()
  const entries = []

  for (const key of allKeys) {
    const dateKey = key.replace('day_', '')
    const record = get(key, null)
    if (record?.mood?.length > 0) {
      entries.push({ dateKey, moods: record.mood })
    }
  }

  if (entries.length === 0) return null

  return (
    <div style={{ marginTop: '24px' }}>
      <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#4b5563', marginBottom: '12px' }}>
        Recent History
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {entries.map(({ dateKey, moods }) => (
          <div key={dateKey} className="card" style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: '10px', color: '#4b5563', marginBottom: '6px', letterSpacing: '0.08em' }}>
              {dateKey === today ? 'Today' : formatDate(dateKey)}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {moods.map((m, i) => (
                <span key={i} style={{
                  fontSize: '11px',
                  background: 'rgba(45,212,191,0.07)',
                  border: '1px solid rgba(45,212,191,0.12)',
                  borderRadius: '20px',
                  padding: '3px 10px',
                  color: '#9ca3af',
                }}>
                  {m.emoji} {m.value}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MoodPage() {
  const { record, logMood } = useToday()
  const [justLogged, setJustLogged] = useState(null)

  const latestMood = record.mood[record.mood.length - 1]

  const handleSelect = (mood) => {
    logMood(mood)
    setJustLogged(mood.value)
    setTimeout(() => setJustLogged(null), 2000)
  }

  return (
    <div style={{ padding: '24px 20px', maxWidth: '480px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#4b5563', marginBottom: '4px' }}>
          Check In
        </div>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#f0f0f0', letterSpacing: '-0.02em', fontFamily: 'var(--font-mono)' }}>
          Right Now, I Feel...
        </h1>
        {latestMood && (
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
            Last: {latestMood.emoji} {latestMood.value} · {formatTime(latestMood.ts)}
          </div>
        )}
      </div>

      {/* Mood grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {MOODS.map((mood) => {
          const isSelected = latestMood?.value === mood.value
          return (
            <button
              key={mood.value}
              className={`mood-tile${isSelected ? ' selected' : ''} press-effect`}
              onClick={() => handleSelect(mood)}
              style={{ border: 'none' }}
            >
              <span style={{ fontSize: '28px', lineHeight: 1 }}>{mood.emoji}</span>
              <span style={{
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: isSelected ? '#2dd4bf' : '#6b7280',
                fontFamily: 'var(--font-mono)',
              }}>
                {mood.value}
              </span>
            </button>
          )
        })}
      </div>

      {justLogged && (
        <div className="animate-fade-in" style={{
          marginTop: '16px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#2dd4bf',
          letterSpacing: '0.06em',
        }}>
          Logged ✓
        </div>
      )}

      {/* Reflection prompt */}
      <div style={{
        marginTop: '24px',
        background: 'rgba(129,140,248,0.05)',
        border: '1px solid rgba(129,140,248,0.1)',
        borderRadius: '14px',
        padding: '14px 16px',
      }}>
        <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#818cf8', marginBottom: '6px' }}>
          The 5-Minute Reset
        </div>
        <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.7', color: '#6b7280', fontStyle: 'italic' }}>
          Sit. Breathe in for 4 counts, hold 4, out for 6. Repeat ×5. Then ask: <em style={{ color: '#9ca3af' }}>What is mine to do today?</em> Not what's urgent for others — what's yours.
        </p>
      </div>

      <MoodHistory />
    </div>
  )
}
