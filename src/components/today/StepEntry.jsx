import { useState } from 'react'
import { Footprints } from 'lucide-react'

export default function StepEntry({ steps, onSetSteps }) {
  const { entered, goal } = steps
  const pct = Math.min((entered / goal) * 100, 100)
  const [input, setInput] = useState(entered > 0 ? String(entered) : '')

  const handleChange = (e) => {
    const val = e.target.value.replace(/\D/g, '')
    setInput(val)
    const num = parseInt(val, 10)
    if (!isNaN(num)) onSetSteps(num)
    else if (val === '') onSetSteps(0)
  }

  const met = entered >= goal

  return (
    <div style={{
      background: '#141414',
      border: `1px solid ${met ? 'rgba(45,212,191,0.3)' : '#1f1f1f'}`,
      borderRadius: '14px',
      padding: '14px',
      marginBottom: '12px',
      transition: 'border-color 0.3s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Footprints size={15} color={met ? '#2dd4bf' : '#4b5563'} />
          <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4b5563' }}>
            Steps
          </span>
        </div>
        <span style={{ fontSize: '11px', color: met ? '#2dd4bf' : '#4b5563' }}>
          Goal: {goal.toLocaleString()}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <input
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          value={input}
          onChange={handleChange}
          placeholder="0"
          className="dark-input"
          style={{ flex: 1, fontSize: '18px', fontWeight: 600, padding: '8px 12px', textAlign: 'center' }}
        />
        <div style={{ fontSize: '13px', color: met ? '#2dd4bf' : '#6b7280', minWidth: '50px', textAlign: 'right' }}>
          {entered > 0 ? `${Math.floor(pct)}%` : '—'}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: '10px', height: '3px', background: '#1e1e1e', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: met ? '#2dd4bf' : 'linear-gradient(90deg, #2dd4bf, #818cf8)',
          borderRadius: '2px',
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  )
}
