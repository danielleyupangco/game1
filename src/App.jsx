import { HashRouter, Routes, Route } from 'react-router-dom'
import Shell from './components/layout/Shell'
import TodayPage from './pages/TodayPage'
import MoodPage from './pages/MoodPage'
import MeditationPage from './pages/MeditationPage'
import JournalPage from './pages/JournalPage'
import ProgressPage from './pages/ProgressPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Shell />}>
          <Route index element={<TodayPage />} />
          <Route path="mood" element={<MoodPage />} />
          <Route path="meditate" element={<MeditationPage />} />
          <Route path="journal" element={<JournalPage />} />
          <Route path="progress" element={<ProgressPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
