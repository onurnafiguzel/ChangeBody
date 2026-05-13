import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/shared/Header'
import { Sidebar, BottomNav } from '../../components/shared/Navigation'
import Skeleton from '../../components/shared/Skeleton'
import { getStoredUser } from '../../services/auth'
import { getCoachDashboard } from '../../services/coach'
import { parseApiError } from '../../utils/errorHandler'
import type {
  CoachDashboardDto,
  CoachDashboardAssignedUserDto,
  CoachProgramListItemDto,
} from '../../types/api.types'
import '../../styles/dashboard.css'

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

  const [data, setData] = useState<CoachDashboardDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.userId) return
    getCoachDashboard(user.userId)
      .then(setData)
      .catch((err) => setError(parseApiError(err, 'Dashboard yüklenemedi.')))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const greeting = data
    ? `${data.coach.firstName} ${data.coach.lastName}`
    : (user?.email?.split('@')[0] ?? 'Antrenör')
  const specialization = data?.coach.specialization

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header />
        <div className="page-content">
          {/* Welcome */}
          <div className="welcome-banner">
            <div className="welcome-banner-label">Hoş Geldin</div>
            <div className="welcome-banner-title">Merhaba, Antrenör {greeting} 👋</div>
            <div className="welcome-banner-sub">
              {specialization ? `Uzmanlık: ${specialization}` : 'Bugün de sporcularına ilham ver!'}
            </div>
          </div>

          {error && <div className="error-banner">⚠️ {error}</div>}

          {/* KPI Cards */}
          <div className="section-header">
            <span className="section-title">Özet</span>
          </div>
          {loading ? (
            <div className="kpi-grid">
              <Skeleton variant="card" height={110} />
              <Skeleton variant="card" height={110} />
              <Skeleton variant="card" height={110} />
            </div>
          ) : data ? (
            <div className="kpi-grid">
              <div className="kpi-card">
                <span className="kpi-icon">👥</span>
                <span className="kpi-value">{data.assignedUserCount}</span>
                <span className="kpi-label">Atanan Sporcu</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-icon">🏋️</span>
                <span className="kpi-value">{data.activeProgramCount}</span>
                <span className="kpi-label">Aktif Program</span>
              </div>
              <button
                type="button"
                className="kpi-card clickable"
                onClick={() => navigate('/coach/waiting-users')}
              >
                <span className="kpi-icon">⏳</span>
                <span className="kpi-value">{data.pendingWaitingUserCount}</span>
                <span className="kpi-label">Bekleyen →</span>
              </button>
            </div>
          ) : null}

          {/* Recent Active Programs */}
          <div className="section-header">
            <span className="section-title">Son Aktif Programlar</span>
            {data && data.recentPrograms.length > 0 && (
              <button className="btn-link" onClick={() => navigate('/coach/programs')}>
                Tümünü Gör →
              </button>
            )}
          </div>
          {loading ? (
            <Skeleton variant="card" height={120} />
          ) : !data || data.recentPrograms.length === 0 ? (
            <div className="placeholder-card" style={{ padding: '24px 16px' }}>
              <div className="placeholder-icon">📋</div>
              <p className="placeholder-desc">Henüz aktif programın yok.</p>
            </div>
          ) : (
            <div className="card-list">
              {data.recentPrograms.map((p) => {
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

          {/* Assigned Users */}
          <div className="section-header">
            <span className="section-title">Atanan Sporcular</span>
          </div>
          {loading ? (
            <Skeleton variant="row" count={3} />
          ) : !data || data.assignedUsers.length === 0 ? (
            <div className="placeholder-card" style={{ padding: '24px 16px' }}>
              <div className="placeholder-icon">👥</div>
              <p className="placeholder-desc">Henüz atanmış sporcun yok.</p>
            </div>
          ) : (
            <ul className="assigned-users-list">
              {data.assignedUsers.map((u) => (
                <AssignedUserRow
                  key={u.userId}
                  user={u}
                  onOpen={(id) => navigate(`/coach/users/${id}`)}
                  onCreateTraining={(id) => navigate(`/coach/programs/new/${id}`)}
                  onCreateNutrition={(id) => navigate(`/coach/nutrition-plans/new/${id}`)}
                />
              ))}
            </ul>
          )}
        </div>
        <BottomNav />
      </div>
    </div>
  )
}

interface AssignedUserRowProps {
  user: CoachDashboardAssignedUserDto
  onOpen: (id: string) => void
  onCreateTraining: (id: string) => void
  onCreateNutrition: (id: string) => void
}

function AssignedUserRow({ user, onOpen, onCreateTraining, onCreateNutrition }: AssignedUserRowProps) {
  return (
    <li className="assigned-user-row">
      <button className="assigned-user-name" onClick={() => onOpen(user.userId)}>
        👤 {user.fullName}
      </button>
      <div className="assigned-user-badges">
        <span className={`assigned-badge ${user.hasTrainingProgram ? 'has' : 'missing'}`}>
          🏋️ {user.hasTrainingProgram ? '✓' : '✗'}
        </span>
        <span className={`assigned-badge ${user.hasNutritionPlan ? 'has' : 'missing'}`}>
          🥗 {user.hasNutritionPlan ? '✓' : '✗'}
        </span>
      </div>
      <div className="assigned-user-actions">
        {!user.hasTrainingProgram && (
          <button
            type="button"
            className="food-card-action"
            onClick={() => onCreateTraining(user.userId)}
          >
            🏋️ Programa Başla →
          </button>
        )}
        {!user.hasNutritionPlan && (
          <button
            type="button"
            className="food-card-action"
            onClick={() => onCreateNutrition(user.userId)}
          >
            🥗 Beslenmeye Başla →
          </button>
        )}
      </div>
    </li>
  )
}
