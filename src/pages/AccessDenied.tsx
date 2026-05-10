import { useNavigate } from 'react-router-dom'
import { getStoredUser } from '../services/auth'
import { logout } from '../services/auth'
import '../styles/dashboard.css'

export default function AccessDenied() {
  const navigate = useNavigate()
  const user = getStoredUser()

  const homePath = user?.role === 'Coach' ? '/coach/dashboard' : '/dashboard'

  return (
    <div className="page-loading" style={{ flexDirection: 'column', gap: 16, padding: 24 }}>
      <div className="placeholder-card" style={{ maxWidth: 480 }}>
        <div className="placeholder-icon">🚫</div>
        <h3 className="placeholder-title">Erişim Engellendi</h3>
        <p className="placeholder-desc">
          Bu sayfaya erişim yetkiniz bulunmuyor. Hesap rolünüz ile bu içerik görüntülenemez.
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {user ? (
            <button className="btn-primary" onClick={() => navigate(homePath)}>
              Ana Sayfa'ya Dön
            </button>
          ) : (
            <button className="btn-primary" onClick={() => navigate('/login')}>
              Giriş Yap
            </button>
          )}
          {user && (
            <button className="btn-secondary" onClick={logout}>
              Çıkış
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
