import { useLocation, useNavigate } from 'react-router-dom'
import { Home, SmilePlus, Wind, BookOpen, BarChart2 } from 'lucide-react'

const TABS = [
  { path: '/', icon: Home, label: 'Today' },
  { path: '/mood', icon: SmilePlus, label: 'Mood' },
  { path: '/meditate', icon: Wind, label: 'Breathe' },
  { path: '/journal', icon: BookOpen, label: 'Journal' },
  { path: '/progress', icon: BarChart2, label: 'Progress' },
]

export default function BottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '68px',
        background: 'rgba(10,10,10,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid #1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 8px',
        zIndex: 100,
      }}
    >
      {TABS.map(({ path, icon: Icon, label }) => {
        const active = path === '/' ? pathname === '/' : pathname.startsWith(path)
        return (
          <button
            key={path}
            className={`nav-item${active ? ' active' : ''}`}
            onClick={() => navigate(path)}
            style={{ background: 'none', border: 'none', minWidth: '56px' }}
          >
            <Icon size={20} strokeWidth={active ? 2.2 : 1.6} />
            <span style={{ fontSize: '9px', fontWeight: active ? 600 : 400, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
