import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/shared/Header'
import { Sidebar, BottomNav } from '../../components/shared/Navigation'
import { getCoachProfile } from '../../services/coach'
import { getStoredUser } from '../../services/auth'
import { parseApiError } from '../../utils/errorHandler'
import type { CoachDto } from '../../types/api.types'
import '../../styles/dashboard.css'

function formatDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function CoachProfilePage() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const [coach, setCoach] = useState<CoachDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.userId) return
    getCoachProfile(user.userId)
      .then(setCoach)
      .catch((err) => setError(parseApiError(err, 'Profil yüklenemedi.')))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header />
        <div className="page-content">
          <div className="section-header">
            <span className="section-title">Coach Profilim</span>
          </div>

          {loading ? (
            <div className="profile-summary-card">
              <div className="skeleton" style={{ height: '160px' }} />
            </div>
          ) : error || !coach ? (
            <div className="error-banner">⚠️ {error ?? 'Profil yüklenemedi.'}</div>
          ) : (
            <>
              <div className="profile-summary-card">
                <div className="profile-summary-header">
                  <div className="profile-summary-title">
                    {coach.firstName} {coach.lastName}
                  </div>
                  <button
                    className="profile-summary-edit"
                    onClick={() => navigate('/coach/profile/edit')}
                    title="Profili Düzenle"
                  >
                    ✏️
                  </button>
                </div>

                <div className="profile-summary-grid">
                  <div className="profile-summary-item full">
                    <span className="profile-summary-label">E-posta</span>
                    <span className="profile-summary-value">{coach.email}</span>
                  </div>
                  <div className="profile-summary-item full">
                    <span className="profile-summary-label">Uzmanlık Alanı</span>
                    <span className="profile-summary-value">{coach.specialization ?? '—'}</span>
                  </div>
                  <div className="profile-summary-item">
                    <span className="profile-summary-label">Üyelik</span>
                    <span className="profile-summary-value">{formatDate(coach.createdAt)}</span>
                  </div>
                  <div className="profile-summary-item">
                    <span className="profile-summary-label">Durum</span>
                    <span className="profile-summary-value">{coach.isActive ? '✅ Aktif' : '⏸️ Pasif'}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        <BottomNav />
      </div>
    </div>
  )
}
