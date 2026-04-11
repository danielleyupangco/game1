import { useState } from 'react'
import { useBreathingTimer } from '../hooks/useBreathingTimer'
import { usePlankTimer } from '../hooks/usePlankTimer'
import { useToday } from '../hooks/useToday'
import { Play, Pause, RotateCcw, Plus, Minus } from 'lucide-react'
import ProgressRing from '../components/ui/ProgressRing'

const DURATIONS = [
  { label: '30s', secs: 30 },
  { label: '1 min', secs: 60 },
  { label: '3 min', secs: 180 },
  { label: '5 min', secs: 300 },
  { label: '10 min', secs: 600 },
  { label: '15 min', secs: 900 },
]

function formatSecs(secs) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// Breathing orb scale based on phase
function getOrbScale(phase, phaseProgress) {
  if (phase === 'inhale') return 0.55 + phaseProgress * 0.45
  if (phase === 'hold') return 1
  if (phase === 'exhale') return 1 - phaseProgress * 0.45
  return 0.55 // rest or idle
}

export default function MeditationPage() {
  const [activeTab, setActiveTab] = useState('breathe') // breathe | plank
  const [selectedDuration, setSelectedDuration] = useState(300)

  const { logMeditationSession, logPlankSession } = useToday()

  const breath = useBreathingTimer(selectedDuration)
  const plank = usePlankTimer(60)

  // Handle breath session done
  const [breathDone, setBreathDone] = useState(false)
  if (breath.isDone && !breathDone) {
    setBreathDone(true)
    logMeditationSession(selectedDuration)
  }
  if (!breath.isDone && breathDone) setBreathDone(false)

  // Handle plank done
  const [plankLogged, setPlankLogged] = useState(false)
  if (plank.isDone && !plankLogged) {
    setPlankLogged(true)
    logPlankSession(plank.elapsed)
  }
  if (!plank.isDone && plankLogged) setPlankLogged(false)

  const orbScale = getOrbScale(breath.phase, breath.phaseProgress)

  return (
    <div style={{ padding: '24px 20px', maxWidth: '480px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#4b5563', marginBottom: '4px' }}>
          Mind + Body
        </div>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#f0f0f0', letterSpacing: '-0.02em', fontFamily: 'var(--font-mono)' }}>
          Meditate
        </h1>
      </div>

      {/* Tab switcher */}
      <div style={{
        display: 'flex',
        background: '#141414',
        borderRadius: '12px',
        padding: '4px',
        marginBottom: '24px',
        border: '1px solid #1f1f1f',
      }}>
        {[{ key: 'breathe', label: 'Breathing' }, { key: 'plank', label: 'Plank' }].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              padding: '9px',
              border: 'none',
              borderRadius: '9px',
              background: activeTab === tab.key ? '#2dd4bf' : 'transparent',
              color: activeTab === tab.key ? '#0a0a0a' : '#6b7280',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.06em',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Breathing section */}
      {activeTab === 'breathe' && (
        <div className="animate-fade-in">
          {/* Duration selector */}
          {breath.isIdle && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', justifyContent: 'center' }}>
              {DURATIONS.map(d => (
                <button
                  key={d.secs}
                  onClick={() => setSelectedDuration(d.secs)}
                  style={{
                    padding: '7px 14px',
                    border: `1px solid ${selectedDuration === d.secs ? '#2dd4bf' : '#1f1f1f'}`,
                    borderRadius: '20px',
                    background: selectedDuration === d.secs ? 'rgba(45,212,191,0.1)' : '#141414',
                    color: selectedDuration === d.secs ? '#2dd4bf' : '#6b7280',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          )}

          {/* Orb + phase label */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px' }}>
            {/* Session timer */}
            {!breath.isIdle && (
              <div style={{ fontSize: '11px', color: '#4b5563', marginBottom: '16px', letterSpacing: '0.1em' }}>
                {formatSecs(breath.sessionElapsed)} / {formatSecs(selectedDuration)}
              </div>
            )}

            {/* Breathing orb */}
            <div
              className={breath.isRunning ? 'animate-glow-pulse' : ''}
              style={{
                width: '140px',
                height: '140px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              <div style={{
                width: `${orbScale * 140}px`,
                height: `${orbScale * 140}px`,
                borderRadius: '50%',
                background: breath.isDone
                  ? 'radial-gradient(circle, rgba(45,212,191,0.9), rgba(45,212,191,0.4))'
                  : 'radial-gradient(circle, rgba(45,212,191,0.5), rgba(45,212,191,0.1))',
                border: '1.5px solid rgba(45,212,191,0.3)',
                transition: `width ${breath.phase === 'inhale' ? 4 : breath.phase === 'exhale' ? 6 : 0.3}s ease, height ${breath.phase === 'inhale' ? 4 : breath.phase === 'exhale' ? 6 : 0.3}s ease`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {breath.isRunning && !breath.isDone && (
                  <span style={{ fontSize: '22px', fontWeight: 700, color: '#2dd4bf', fontFamily: 'var(--font-mono)' }}>
                    {breath.phaseCountdown}
                  </span>
                )}
              </div>
            </div>

            {/* Phase label */}
            <div style={{ fontSize: '14px', fontWeight: 600, color: breath.isDone ? '#2dd4bf' : '#9ca3af', letterSpacing: '0.06em', marginBottom: '4px' }}>
              {breath.phaseLabel}
            </div>
            {breath.isRunning && (
              <div style={{ fontSize: '10px', color: '#4b5563', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                4 · 4 · 6 pattern
              </div>
            )}

            {/* Done message */}
            {breath.isDone && (
              <div className="animate-fade-in" style={{ marginTop: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {breath.cycles} breath cycles · {formatSecs(selectedDuration)}
                </div>
                <div style={{ fontSize: '11px', color: '#2dd4bf', marginTop: '4px' }}>
                  Meditation logged ✓
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            {breath.isDone ? (
              <button className="timer-btn" onClick={breath.reset}>New Session</button>
            ) : breath.isIdle ? (
              <button className="timer-btn" onClick={breath.start}>Begin</button>
            ) : (
              <>
                <button className="timer-btn secondary" onClick={breath.pause}>
                  <Pause size={15} style={{ display: 'inline', verticalAlign: 'middle' }} />
                  {' '}Pause
                </button>
                <button className="timer-btn secondary" onClick={breath.reset}>
                  <RotateCcw size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Plank section */}
      {activeTab === 'plank' && (
        <div className="animate-fade-in">
          {/* Duration adjuster */}
          {plank.phase === 'idle' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '28px' }}>
              <button
                className="press-effect"
                onClick={() => plank.adjustDuration(-30)}
                style={{ background: '#1e1e1e', border: '1px solid #1f1f1f', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <Minus size={16} color="#6b7280" />
              </button>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#f0f0f0', fontFamily: 'var(--font-mono)' }}>
                  {plank.targetDuration >= 60
                    ? `${Math.floor(plank.targetDuration / 60)}:${String(plank.targetDuration % 60).padStart(2, '0')}`
                    : `${plank.targetDuration}s`}
                </div>
                <div style={{ fontSize: '10px', color: '#4b5563', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Duration
                </div>
              </div>
              <button
                className="press-effect"
                onClick={() => plank.adjustDuration(30)}
                style={{ background: '#1e1e1e', border: '1px solid #1f1f1f', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <Plus size={16} color="#6b7280" />
              </button>
            </div>
          )}

          {/* Countdown ring */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px' }}>
            <ProgressRing
              progress={1 - plank.progress}
              size={160}
              strokeWidth={8}
              color={plank.isDone ? '#2dd4bf' : plank.isRunning ? '#818cf8' : '#2dd4bf'}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 700, color: plank.isDone ? '#2dd4bf' : '#f0f0f0', fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>
                  {plank.isDone ? '✓' : plank.formattedRemaining}
                </div>
                {!plank.isDone && (
                  <div style={{ fontSize: '10px', color: '#4b5563', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    remaining
                  </div>
                )}
              </div>
            </ProgressRing>

            {plank.isDone && (
              <div className="animate-fade-in" style={{ marginTop: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#2dd4bf' }}>Hold complete!</div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                  {plank.formattedElapsed} logged ✓
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            {plank.isDone ? (
              <>
                <button className="timer-btn" onClick={() => { plank.reset(); setPlankLogged(false) }}>Again</button>
              </>
            ) : plank.isRunning ? (
              <>
                <button className="timer-btn secondary" onClick={plank.pause}>
                  <Pause size={15} style={{ display: 'inline', verticalAlign: 'middle' }} /> Pause
                </button>
                <button className="timer-btn secondary" onClick={plank.reset}>
                  <RotateCcw size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
                </button>
              </>
            ) : (
              <button className="timer-btn" onClick={plank.start}>
                {plank.phase === 'paused' ? 'Resume' : 'Hold'}
              </button>
            )}
          </div>

          {/* Tip */}
          <div style={{
            marginTop: '24px',
            background: '#141414',
            border: '1px solid #1f1f1f',
            borderRadius: '12px',
            padding: '12px 14px',
          }}>
            <p style={{ margin: 0, fontSize: '11px', lineHeight: '1.6', color: '#4b5563', fontStyle: 'italic' }}>
              Forearms down, hips level, core tight. Breathe steadily. The discomfort is the work.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
