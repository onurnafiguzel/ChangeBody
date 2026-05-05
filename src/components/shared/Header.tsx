import { logout, getStoredUser } from '../../services/auth'
import '../../styles/dashboard.css'

export default function Header() {
  const user = getStoredUser()
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'U'

  return (
    <header className="app-header">
      <div className="header-brand">
        Change<span>Body</span>
      </div>
      <div className="header-user">
        <span className="header-greeting">
          Hoş geldin, <strong>{user?.email?.split('@')[0]}</strong>
        </span>
        <div className="header-avatar">{initials}</div>
        <button className="btn-logout" onClick={logout}>
          Çıkış
        </button>
      </div>
    </header>
  )
}
