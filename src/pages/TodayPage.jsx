import { useNavigate } from 'react-router-dom'
import { Flame, Check } from 'lucide-react'
import { useToday } from '../hooks/useToday'
import { useStreak } from '../hooks/useStreak'
import { PROTOCOL_ITEMS, CREATOR_ITEM } from '../constants/habits'
import CheckItem from '../components/ui/CheckItem'
import StepEntry from '../components/today/StepEntry'
import QuoteCard from '../components/today/QuoteCard'
import { formatDate, todayKey } from '../lib/dateUtils'

export default function TodayPage() {
  const { record, toggleProtocol, setSteps } = useToday()
  const { currentStreak } = useStreak(record.protocolComplete)
  const navigate = useNavigate()

  const { protocol, steps } = record
  const allDone = record.protocolComplete
  const doneCount = Object.keys(protocol).filter(k => k !== 'creatorDone' && protocol[k]).length
  const totalItems = 8
  const pct = doneCount / totalItems

  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div style={{ padding: '0', maxWidth: '480px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        padding: '20px 20px 0',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#4b5563', marginBottom: '4px' }}>
            {dateStr}
          </div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#f0f0f0', letterSpacing: '-0.02em', fontFamily: 'var(--font-mono)' }}>
            dani-toolkit
          </h1>
        </div>
        {currentStreak > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            background: 'rgba(45,212,191,0.08)',
            border: '1px solid rgba(45,212,191,0.15)',
            borderRadius: '20px',
            padding: '6px 12px',
          }}>
            <Flame size={14} color="#2dd4bf" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#2dd4bf' }}>{currentStreak}</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4b5563' }}>
            Today's Protocol
          </span>
          <span style={{ fontSize: '11px', color: allDone ? '#2dd4bf' : '#6b7280' }}>
            {doneCount}/{totalItems}
          </span>
        </div>
        <div style={{ height: '3px', background: '#1e1e1e', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${pct * 100}%`,
            background: 'linear-gradient(90deg, #2dd4bf, #818cf8)',
            borderRadius: '2px',
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* Complete banner */}
      {allDone && (
        <div className="animate-fade-in" style={{
          margin: '16px 20px 0',
          background: 'rgba(45,212,191,0.08)',
          border: '1px solid rgba(45,212,191,0.25)',
          borderRadius: '14px',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: '#2dd4bf', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Check size={15} color="#0a0a0a" strokeWidth={3} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#2dd4bf' }}>Protocol Complete</div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>
              {currentStreak} day streak — keep going
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '16px 20px 0' }}>
        {/* Quote */}
        <QuoteCard />

        {/* Protocol list */}
        <div className="card" style={{ marginBottom: '12px' }}>
          <div style={{ marginBottom: '4px' }}>
            {PROTOCOL_ITEMS.map((item) => {
              const isLinked = item.key === 'meditateDone' || item.key === 'plankDone' || item.key === 'journalDone'
              const handleToggle = isLinked
                ? () => navigate(item.key === 'journalDone' ? '/journal' : '/meditate')
                : () => toggleProtocol(item.key)
              return (
                <CheckItem
                  key={item.key}
                  label={item.label}
                  sublabel={item.sublabel}
                  icon={item.icon}
                  checked={protocol[item.key]}
                  onToggle={isLinked && !protocol[item.key] ? handleToggle : () => toggleProtocol(item.key)}
                />
              )
            })}
          </div>
        </div>

        {/* Steps */}
        <StepEntry steps={steps} onSetSteps={setSteps} />

        {/* Creator mode bonus */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#4b5563', marginBottom: '8px' }}>
            Bonus
          </div>
          <CheckItem
            key={CREATOR_ITEM.key}
            label={CREATOR_ITEM.label}
            sublabel={CREATOR_ITEM.sublabel}
            icon={CREATOR_ITEM.icon}
            checked={protocol[CREATOR_ITEM.key]}
            onToggle={() => toggleProtocol(CREATOR_ITEM.key)}
          />
        </div>
      </div>
    </div>
  )
}
