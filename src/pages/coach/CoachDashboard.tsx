import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/shared/Header'
import { Sidebar, BottomNav } from '../../components/shared/Navigation'
import WaitingUserCard from '../../components/cards/WaitingUserCard'
import { getStoredUser } from '../../services/auth'
import { getWaitingUsers } from '../../services/waitingUsers'
import { getCoachProfile, getCoachPrograms } from '../../services/coach'
import { parseApiError } from '../../utils/errorHandler'
import type { CoachDto, CoachProgramListItemDto, UserAssignmentDto } from '../../types/api.types'
import '../../styles/dashboard.css'

const PREVIEW_LIMIT = 3
const GENDER_TR: Record<string, string> = { Male: 'Erkek', Female: 'Kadın', Other: 'Diğer' }

function userMetaText(p: CoachProgramListItemDto): string {
  const parts: string[] = []
  if (p.userAge != null) parts.push(`${p.userAge} yaş`)
  if (p.userGender) parts.push(GENDER_TR[p.userGender] ?? p.userGender)
  return parts.join(' · ')
}

export default function CoachDashboard() {
  const navigate = useNavigate()
  const user = getStoredUser()

  const [coach, setCoach] = useState<CoachDto | null>(null)
  const [waiting, setWaiting] = useState<UserAssignmentDto[]>([])
  const [programs, setPrograms] = useState<CoachProgramListItemDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.userId) return
    Promise.all([
      getCoachProfile(user.userId).catch(() => null),
      getWaitingUsers().catch(() => [] as UserAssignmentDto[]),
      getCoachPrograms(user.userId).catch(() => [] as CoachProgramListItemDto[]),
    ])
      .then(([c, w, p]) => {
        setCoach(c)
        setWaiting(w)
        setPrograms(p)
      })
      .catch((err) => setError(parseApiError(err, 'Bilgiler yüklenemedi.')))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const greeting = coach ? `${coach.firstName} ${coach.lastName}` : (user?.email?.split('@')[0] ?? 'Antrenör')
  const activePrograms = programs.filter((p) => !p.isCompleted)
  const completedPrograms = programs.filter((p) => p.isCompleted)

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header />
        <div className="page-content">
          {/* Welcome Banner */}
          <div className="welcome-banner">
            <div className="welcome-banner-label">Hoş Geldin</div>
            <div className="welcome-banner-title">Merhaba, Antrenör {greeting} 👋</div>
            <div className="welcome-banner-sub">
              {waiting.length > 0
                ? `${waiting.length} sporcu seni bekliyor.`
                : 'Şu an bekleyen sporcu yok.'}
            </div>
          </div>

          {error && <div className="error-banner">⚠️ {error}</div>}

          {/* KPI Cards */}
          <div className="section-header">
            <span className="section-title">Özet</span>
          </div>
          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="kpi-icon">⏳</span>
              <span className="kpi-value">{loading ? '—' : waiting.length}</span>
              <span className="kpi-label">Bekleyen</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-icon">📋</span>
              <span className="kpi-value">{loading ? '—' : activePrograms.length}</span>
              <span className="kpi-label">Aktif Program</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-icon">✅</span>
              <span className="kpi-value">{loading ? '—' : completedPrograms.length}</span>
              <span className="kpi-label">Tamamlanan</span>
            </div>
          </div>

          {/* Waiting Users Preview */}
          <div className="section-header">
            <span className="section-title">Bekleyen Sporcular</span>
            {waiting.length > PREVIEW_LIMIT && (
              <button className="btn-link" onClick={() => navigate('/coach/waiting-users')}>
                Tümünü Gör →
              </button>
            )}
          </div>
          {loading ? (
            <div className="skeleton skeleton-card" style={{ height: 100 }} />
          ) : waiting.length === 0 ? (
            <div className="placeholder-card" style={{ padding: '24px 16px' }}>
              <div className="placeholder-icon">⏳</div>
              <p className="placeholder-desc">Şu an bekleyen sporcu bulunmuyor.</p>
            </div>
          ) : (
            <div className="card-list">
              {waiting.slice(0, PREVIEW_LIMIT).map((u) => (
                <WaitingUserCard
                  key={u.id}
                  user={u}
                  compact
                  onSelect={(id) => navigate(`/coach/users/${id}`)}
                />
              ))}
            </div>
          )}

          {/* Active Programs Preview */}
          <div className="section-header">
            <span className="section-title">Aktif Programlarım</span>
            {activePrograms.length > PREVIEW_LIMIT && (
              <button className="btn-link" onClick={() => navigate('/coach/programs')}>
                Tümünü Gör →
              </button>
            )}
          </div>
          {loading ? (
            <div className="skeleton skeleton-card" style={{ height: 100 }} />
          ) : activePrograms.length === 0 ? (
            <div className="placeholder-card" style={{ padding: '24px 16px' }}>
              <div className="placeholder-icon">📋</div>
              <p className="placeholder-desc">Henüz aktif programın yok.</p>
            </div>
          ) : (
            <div className="card-list">
              {activePrograms.slice(0, PREVIEW_LIMIT).map((p) => {
                const progress = Math.max(0, Math.min(100, Math.round(p.progressPercentage)))
                const meta = userMetaText(p)
                return (
                  <div key={p.id} className="program-card">
                    <div className="program-card-header">
                      <div>
                        <div className="program-card-title">{p.name}</div>
                        {meta && <div className="program-card-coach">{meta}</div>}
                      </div>
                    </div>
                    <div className="program-progress-label">
                      <span>İlerleme</span>
                      <strong>{progress}% · {p.completedWeeks}/{p.durationWeeks} hafta</strong>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="program-card-footer">
                      <span className="program-dates">{p.durationWeeks} hafta</span>
                      <button className="btn-view-details" onClick={() => navigate(`/coach/programs/${p.id}`)}>
                        Detay →
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <BottomNav />
      </div>
    </div>
  )
}
