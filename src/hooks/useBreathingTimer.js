import { useState, useRef, useCallback, useEffect } from 'react'

// Phases: inhale 4s → hold 4s → exhale 6s → rest 2s (total 16s/cycle)
const PHASES = [
  { name: 'inhale', label: 'Breathe In', duration: 4 },
  { name: 'hold', label: 'Hold', duration: 4 },
  { name: 'exhale', label: 'Breathe Out', duration: 6 },
  { name: 'rest', label: 'Rest', duration: 2 },
]

export function useBreathingTimer(targetDuration = 300) {
  const [phase, setPhase] = useState('idle') // idle | inhale | hold | exhale | rest | done
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [phaseElapsed, setPhaseElapsed] = useState(0)
  const [sessionElapsed, setSessionElapsed] = useState(0)
  const [cycles, setCycles] = useState(0)

  const rafRef = useRef(null)
  const startTimeRef = useRef(null)
  const sessionStartRef = useRef(null)
  const phaseStartRef = useRef(null)
  const phaseIndexRef = useRef(0)
  const isRunningRef = useRef(false)
  const targetRef = useRef(targetDuration)

  useEffect(() => { targetRef.current = targetDuration }, [targetDuration])

  const tick = useCallback((ts) => {
    if (!isRunningRef.current) return

    const sessionSecs = (ts - sessionStartRef.current) / 1000
    const phaseSecs = (ts - phaseStartRef.current) / 1000
    const pi = phaseIndexRef.current
    const currentPhase = PHASES[pi]

    setSessionElapsed(Math.min(sessionSecs, targetRef.current))
    setPhaseElapsed(phaseSecs)

    if (sessionSecs >= targetRef.current) {
      isRunningRef.current = false
      setPhase('done')
      return
    }

    if (phaseSecs >= currentPhase.duration) {
      const nextPi = (pi + 1) % PHASES.length
      phaseIndexRef.current = nextPi
      phaseStartRef.current = ts
      setPhaseIndex(nextPi)
      setPhase(PHASES[nextPi].name)
      if (nextPi === 0) setCycles(c => c + 1)
      // Vibration cues for each phase transition
      if (navigator.vibrate) {
        const patterns = {
          inhale: [80],           // single short pulse — begin inhale
          hold: [60, 60, 60],     // double tap — hold
          exhale: [200],          // long pulse — begin exhale
          rest: [40],             // tiny tap — rest
        }
        navigator.vibrate(patterns[PHASES[nextPi].name] || [50])
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const start = useCallback(() => {
    if (isRunningRef.current) return
    isRunningRef.current = true
    const now = performance.now()
    sessionStartRef.current = now - sessionElapsed * 1000
    phaseStartRef.current = now - phaseElapsed * 1000
    setPhase(PHASES[phaseIndexRef.current].name)
    if (navigator.vibrate) navigator.vibrate([80])
    rafRef.current = requestAnimationFrame(tick)
  }, [tick, sessionElapsed, phaseElapsed])

  const pause = useCallback(() => {
    isRunningRef.current = false
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setPhase('idle')
  }, [])

  const reset = useCallback(() => {
    isRunningRef.current = false
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    phaseIndexRef.current = 0
    setPhase('idle')
    setPhaseIndex(0)
    setPhaseElapsed(0)
    setSessionElapsed(0)
    setCycles(0)
  }, [])

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }, [])

  const currentPhaseData = PHASES[phaseIndex]
  const phaseProgress = Math.min(phaseElapsed / currentPhaseData.duration, 1)
  const sessionProgress = Math.min(sessionElapsed / targetDuration, 1)

  return {
    phase,
    phaseLabel: phase === 'idle' ? 'Ready' : phase === 'done' ? 'Complete' : currentPhaseData.label,
    phaseCountdown: Math.max(0, Math.ceil(currentPhaseData.duration - phaseElapsed)),
    phaseProgress,
    sessionElapsed: Math.floor(sessionElapsed),
    sessionProgress,
    cycles,
    isRunning: isRunningRef.current,
    isDone: phase === 'done',
    isIdle: phase === 'idle',
    start,
    pause,
    reset,
  }
}
