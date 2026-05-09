import { useLocation, useNavigate } from 'react-router-dom'
import '../../styles/dashboard.css'

const NAV_ITEMS = [
  { path: '/dashboard', icon: '⚡', label: 'Ana Sayfa' },
  { path: '/exercises', icon: '💪', label: 'Egzersizler' },
  { path: '/packages', icon: '📦', label: 'Paketler' },
  { path: '/programs', icon: '📋', label: 'Program' },
  { path: '/profile', icon: '👤', label: 'Profil' },
]

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        Change<span>Body</span>
      </div>
      <div className="sidebar-section-title">Menü</div>
      {NAV_ITEMS.map((item) => (
        <button
          key={item.path}
          className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
          onClick={() => navigate(item.path)}
        >
          <span className="nav-icon">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>
  )
}

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.path}
          className={`bottom-nav-item ${location.pathname === item.path ? 'active' : ''}`}
          onClick={() => navigate(item.path)}
        >
          <span className="bottom-nav-icon">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>
  )
}
