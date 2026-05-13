import { useLocation, useNavigate } from 'react-router-dom'
import { getStoredUser } from '../../services/auth'
import '../../styles/dashboard.css'

interface NavItem {
  path: string
  icon: string
  label: string
}

const USER_NAV: NavItem[] = [
  { path: '/dashboard', icon: '⚡', label: 'Ana Sayfa' },
  { path: '/exercises', icon: '💪', label: 'Egzersizler' },
  { path: '/packages', icon: '📦', label: 'Paketler' },
  { path: '/programs', icon: '📋', label: 'Program' },
  { path: '/profile', icon: '👤', label: 'Profil' },
]

const COACH_NAV: NavItem[] = [
  { path: '/coach/dashboard', icon: '⚡', label: 'Ana Sayfa' },
  { path: '/coach/waiting-users', icon: '⏳', label: 'Bekleyenler' },
  { path: '/coach/programs', icon: '📋', label: 'Programlarım' },
  { path: '/coach/foods', icon: '🥗', label: 'Besinler' },
  { path: '/coach/fitness-goals', icon: '🎯', label: 'Hedefler' },
  { path: '/coach/profile', icon: '👤', label: 'Profil' },
]

function getNavItems(role?: string): NavItem[] {
  return role === 'Coach' ? COACH_NAV : USER_NAV
}

function isActive(currentPath: string, itemPath: string): boolean {
  if (currentPath === itemPath) return true
  // Coach prefixed routes — örn. /coach/programs/123 aktif olsa /coach/programs sekmesi vurgulansın
  return currentPath.startsWith(itemPath + '/')
}

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = getStoredUser()
  const items = getNavItems(user?.role)

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        Change<span>Body</span>
      </div>
      <div className="sidebar-section-title">Menü</div>
      {items.map((item) => (
        <button
          key={item.path}
          className={`nav-item ${isActive(location.pathname, item.path) ? 'active' : ''}`}
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
  const user = getStoredUser()
  const items = getNavItems(user?.role)

  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <button
          key={item.path}
          className={`bottom-nav-item ${isActive(location.pathname, item.path) ? 'active' : ''}`}
          onClick={() => navigate(item.path)}
        >
          <span className="bottom-nav-icon">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>
  )
}
