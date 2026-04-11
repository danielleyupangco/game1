import { Check } from 'lucide-react'

export default function CheckItem({ label, sublabel, checked, onToggle, icon }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        width: '100%',
        padding: '14px 0',
        background: 'none',
        border: 'none',
        borderBottom: '1px solid #1a1a1a',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'opacity 0.15s ease',
      }}
      className="press-effect"
    >
      <span style={{ fontSize: '18px', width: '24px', textAlign: 'center', flexShrink: 0 }}>
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 500,
          color: checked ? '#6b7280' : '#f0f0f0',
          textDecoration: checked ? 'line-through' : 'none',
          transition: 'all 0.2s ease',
          fontFamily: 'var(--font-mono)',
        }}>
          {label}
        </div>
        {sublabel && (
          <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
            {sublabel}
          </div>
        )}
      </div>
      <div className={`check-box${checked ? ' checked' : ''}`}>
        {checked && <Check size={13} strokeWidth={3} color="#0a0a0a" />}
      </div>
    </button>
  )
}
