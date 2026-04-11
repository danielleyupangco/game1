import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function Shell() {
  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#0a0a0a' }}>
      <main
        className="no-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingBottom: '68px',
        }}
      >
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
