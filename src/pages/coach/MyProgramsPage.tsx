import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/shared/Header'
import { Sidebar, BottomNav } from '../../components/shared/Navigation'
import { getCoachPrograms } from '../../services/coach'
import { getStoredUser } from '../../services/auth'
import { parseApiError } from '../../utils/errorHandler'
import type { CoachProgramListItemDto } from '../../types/api.types'
import '../../styles/dashboard.css'

const DIFFICULTY_TR: Record<string, string> = { Beginner: 'Başlangıç', Intermediate: 'Orta', Advanced: 'İleri' }
const GENDER_TR: Record<string, string> = { Male: 'Erkek', Female: 'Kadın', Other: 'Diğer' }

function userMetaText(p: CoachProgramListItemDto): string {
  const parts: string[] = []
  if (p.userAge != null) parts.push(`${p.userAge} yaş`)
  if (p.userGender) parts.push(GENDER_TR[p.userGender] ?? p.userGender)
  if (p.userHeight != null) parts.push(`${p.userHeight} cm`)
  if (p.userWeight != null) parts.push(`${p.userWeight} kg`)
  return parts.join(' · ')
}

export default function MyProgramsPage() {
  const navigate = useNavigate()
  const user = getStoredUser()

  const [programs, setPrograms] = useState<CoachProgramListItemDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'InProgress' | 'Completed'>('InProgress')

  useEffect(() => {
    if (!user?.userId) return
    fetchPrograms()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchPrograms() {
    if (!user?.userId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getCoachPrograms(user.userId)
      setPrograms(data)
    } catch (err) {
      setError(parseApiError(err, 'Programlar yüklenemedi.'))
    } finally {
      setLoading(false)
    }
  }

  const filtered = programs.filter((p) => (tab === 'InProgress' ? !p.isCompleted : p.isCompleted))
  const inProgressCount = programs.filter((p) => !p.isCompleted).length
  const completedCount = programs.filter((p) => p.isCompleted).length

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header />
        <div className="page-content">
          <div className="section-header" style={{ marginBottom: 16 }}>
            <span className="section-title">Programlarım</span>
          </div>

          {/* Tabs */}
          <div className="tab-bar">
            <button
              className={`tab-item ${tab === 'InProgress' ? 'active' : ''}`}
              onClick={() => setTab('InProgress')}
            >
              Aktif {inProgressCount > 0 && `(${inProgressCount})`}
            </button>
            <button
              className={`tab-item ${tab === 'Completed' ? 'active' : ''}`}
              onClick={() => setTab('Completed')}
            >
              Tamamlanan {completedCount > 0 && `(${completedCount})`}
            </button>
          </div>

          {error && (
            <div className="error-banner">
              ⚠️ {error}
              <button className="btn-retry" onClick={fetchPrograms} style={{ marginLeft: 12 }}>Tekrar Dene</button>
            </div>
          )}

          {loading ? (
            <div className="card-list">
              {[1, 2].map((i) => (
                <div key={i} className="skeleton skeleton-card" style={{ height: 140 }} />
              ))}
            </div>
          ) : programs.length === 0 ? (
            <div className="placeholder-card">
              <div className="placeholder-icon">📋</div>
              <h3 className="placeholder-title">Henüz program yok</h3>
              <p className="placeholder-desc">
                Bekleyen sporculara program atadıkça burada listelenecek.
              </p>
              <div style={{ marginTop: 12 }}>
                <button className="btn-primary" onClick={() => navigate('/coach/waiting-users')}>
                  Bekleyenlere Git →
                </button>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">📋</span>
              <p className="empty-state-text">
                {tab === 'InProgress' ? 'Aktif program yok' : 'Tamamlanan program yok'}
              </p>
            </div>
          ) : (
            <div className="card-list">
              {filtered.map((p) => {
                const meta = userMetaText(p)
                const progress = Math.max(0, Math.min(100, Math.round(p.progressPercentage)))
                return (
                  <div key={p.id} className="program-card">
                    <div className="program-card-header">
                      <div>
                        <div className="program-card-title">{p.name}</div>
                        {meta && <div className="program-card-coach">{meta}</div>}
                      </div>
                      <span className={`program-status-badge ${p.isCompleted ? 'completed' : 'in-progress'}`}>
                        {p.isCompleted ? 'Tamamlandı' : 'Devam Ediyor'}
                      </span>
                    </div>

                    {p.difficulty && (
                      <span className={`program-difficulty-badge ${p.difficulty.toLowerCase()}`}>
                        {DIFFICULTY_TR[p.difficulty] ?? p.difficulty}
                      </span>
                    )}

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
