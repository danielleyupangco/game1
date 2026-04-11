import { useState, useRef, useCallback, useEffect } from 'react'

export function usePlankTimer(defaultDuration = 60) {
  const [targetDuration, setTargetDuration] = useState(defaultDuration)
  const [elapsed, setElapsed] = useState(0)
  const [phase, setPhase] = useState('idle') // idle | running | paused | done

  const rafRef = useRef(null)
  const startTsRef = useRef(null)
  const baseElapsedRef = useRef(0)
  const isRunningRef = useRef(false)
  const targetRef = useRef(defaultDuration)

  useEffect(() => { targetRef.current = targetDuration }, [targetDuration])

  const tick = useCallback((ts) => {
    if (!isRunningRef.current) return
    const newElapsed = baseElapsedRef.current + (ts - startTsRef.current) / 1000
    const clamped = Math.min(newElapsed, targetRef.current)
    setElapsed(clamped)

    if (newElapsed >= targetRef.current) {
      isRunningRef.current = false
      setPhase('done')
      if (navigator.vibrate) navigator.vibrate([200, 100, 200])
      return
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const start = useCallback(() => {
    if (isRunningRef.current || phase === 'done') return
    isRunningRef.current = true
    startTsRef.current = performance.now()
    setPhase('running')
    rafRef.current = requestAnimationFrame(tick)
  }, [tick, phase])

  const pause = useCallback(() => {
    if (!isRunningRef.current) return
    isRunningRef.current = false
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    baseElapsedRef.current = elapsed
    setPhase('paused')
  }, [elapsed])

  const reset = useCallback(() => {
    isRunningRef.current = false
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    baseElapsedRef.current = 0
    setElapsed(0)
    setPhase('idle')
  }, [])

  const adjustDuration = useCallback((delta) => {
    if (phase !== 'idle') return
    setTargetDuration(prev => Math.max(30, Math.min(300, prev + delta)))
  }, [phase])

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }, [])

  const remaining = Math.max(0, targetDuration - elapsed)
  const progress = Math.min(elapsed / targetDuration, 1)

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${Math.floor(secs)}s`
  }

  return {
    targetDuration,
    elapsed,
    remaining,
    progress,
    phase,
    isRunning: phase === 'running',
    isDone: phase === 'done',
    formattedRemaining: formatTime(remaining),
    formattedElapsed: formatTime(elapsed),
    start,
    pause,
    reset,
    adjustDuration,
  }
}
