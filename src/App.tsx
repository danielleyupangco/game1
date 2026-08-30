import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from '@/components/layout/Shell'
import { HomePage } from '@/pages/HomePage'

// Home loads eagerly — it's the page you open on a phone. The rest split out.
const InvestmentsPage = lazy(() => import('@/pages/InvestmentsPage').then((m) => ({ default: m.InvestmentsPage })))
const AirbnbPage = lazy(() => import('@/pages/AirbnbPage').then((m) => ({ default: m.AirbnbPage })))
const DataPage = lazy(() => import('@/pages/DataPage').then((m) => ({ default: m.DataPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))

export default function App() {
  return (
    <Shell>
      <Suspense fallback={<p className="py-16 text-center text-[13px] text-ink-3">Loading…</p>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/investments" element={<InvestmentsPage />} />
          <Route path="/airbnb" element={<AirbnbPage />} />
          <Route path="/data" element={<DataPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Shell>
  )
}
