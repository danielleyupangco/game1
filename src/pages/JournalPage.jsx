import { useState, useEffect, useRef, useCallback } from 'react'
import { useToday } from '../hooks/useToday'
import { get, getAllDayKeys } from '../lib/storage'
import { formatDate, todayKey } from '../lib/dateUtils'
import { ChevronDown, ChevronUp } from 'lucide-react'

function GratitudeEntry({ gratitude, setGratitude }) {
  const allFilled = gratitude.every(g => g.trim().length > 0)

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '14px',
      }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: allFilled ? '#2dd4bf' : '#4b5563' }}>
            Gratitude
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>3 things I'm grateful for</div>
        </div>
        {allFilled && <span style={{ fontSize: '16px' }}>🙏</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {gratitude.map((val, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#374151', minWidth: '14px', fontFamily: 'var(--font-mono)' }}>
              {i + 1}.
            </span>
            <input
              type="text"
              value={val}
              onChange={e => setGratitude(i, e.target.value)}
              placeholder={['Something that made you smile', 'Someone you appreciate', 'A moment of ease'][i]}
              className="dark-input"
              style={{ padding: '9px 12px' }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function PastJournalEntry({ dateKey, record }) {
  const [open, setOpen] = useState(false)
  const hasContent = record?.journal?.trim() || record?.gratitude?.some(g => g.trim())

  if (!hasContent) return null

  return (
    <div className="card" style={{ marginBottom: '8px' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', fontFamily: 'var(--font-mono)' }}>
          {formatDate(dateKey)}
        </span>
        {open ? <ChevronUp size={14} color="#4b5563" /> : <ChevronDown size={14} color="#4b5563" />}
      </button>
      {open && (
        <div className="animate-fade-in" style={{ marginTop: '12px' }}>
          {record.gratitude?.some(g => g.trim()) && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '10px', color: '#4b5563', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Grateful for</div>
              {record.gratitude.filter(g => g.trim()).map((g, i) => (
                <div key={i} style={{ fontSize: '12px', color: '#6b7280', padding: '2px 0' }}>· {g}</div>
              ))}
            </div>
          )}
          {record.journal?.trim() && (
            <div>
              <div style={{ fontSize: '10px', color: '#4b5563', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Journal</div>
              <p style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.65', margin: 0, whiteSpace: 'pre-wrap' }}>
                {record.journal}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function JournalPage() {
  const { record, setGratitude, setJournal } = useToday()
  const [localJournal, setLocalJournal] = useState(record.journal)
  const [saveStatus, setSaveStatus] = useState('') // '' | 'saving' | 'saved'
  const debounceRef = useRef(null)
  const [showHistory, setShowHistory] = useState(false)

  const today = todayKey()
  const charCount = localJournal.length

  const handleJournalChange = (e) => {
    const text = e.target.value
    setLocalJournal(text)
    setSaveStatus('saving')
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setJournal(text)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(''), 2000)
    }, 800)
  }

  const pastKeys = getAllDayKeys()
    .filter(k => k.replace('day_', '') !== today)
    .slice(0, 14)

  const pastEntries = pastKeys
    .map(k => ({ dateKey: k.replace('day_', ''), record: get(k, null) }))
    .filter(({ record }) => record?.journal?.trim() || record?.gratitude?.some(g => g?.trim()))

  return (
    <div style={{ padding: '24px 20px', maxWidth: '480px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#4b5563', marginBottom: '4px' }}>
          Reflect
        </div>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#f0f0f0', letterSpacing: '-0.02em', fontFamily: 'var(--font-mono)' }}>
          Journal
        </h1>
      </div>

      {/* Gratitude */}
      <GratitudeEntry gratitude={record.gratitude} setGratitude={setGratitude} />

      {/* Journal */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#4b5563' }}>
              Today's Entry
            </div>
            <div style={{ fontSize: '11px', color: '#374151', marginTop: '2px' }}>What's on your mind?</div>
          </div>
          {saveStatus && (
            <span style={{ fontSize: '10px', color: saveStatus === 'saved' ? '#2dd4bf' : '#4b5563', letterSpacing: '0.06em', transition: 'color 0.3s' }}>
              {saveStatus === 'saved' ? '✓ Saved' : '...'}
            </span>
          )}
        </div>
        <textarea
          value={localJournal}
          onChange={handleJournalChange}
          placeholder="Write freely. This is your space..."
          className="dark-input"
          style={{ minHeight: '180px', lineHeight: '1.7', padding: '12px 14px' }}
          rows={8}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '8px' }}>
          <div style={{ fontSize: '10px', color: '#374151' }}>{charCount > 0 ? `${charCount} chars` : ''}</div>
        </div>
      </div>

      {/* Past entries */}
      {pastEntries.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(h => !h)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0 0 12px',
              color: '#4b5563',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            {showHistory ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            Previous Entries ({pastEntries.length})
          </button>
          {showHistory && (
            <div className="animate-fade-in">
              {pastEntries.map(({ dateKey, record }) => (
                <PastJournalEntry key={dateKey} dateKey={dateKey} record={record} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
