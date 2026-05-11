import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/shared/Header'
import { Sidebar, BottomNav } from '../../components/shared/Navigation'
import { getUserActiveProgram, getWaitingUserStatus } from '../../services/users'
import { getExercises } from '../../services/exercises'
import { getStoredUser } from '../../services/auth'
import { parseApiError } from '../../utils/errorHandler'
import { MUSCLE_TR, DIFFICULTY_TR, MUSCLE_ICONS } from '../../components/exercises/ExerciseCard'
import type { ActiveProgramDetailDto, ExerciseDto } from '../../types/api.types'
import '../../styles/dashboard.css'
import '../../styles/exercises.css'

const DIFFICULTY_LABEL: Record<string, string> = { Beginner: 'Başlangıç', Intermediate: 'Orta Seviye', Advanced: 'İleri Seviye' }
const DAY_N_REGEX = /^Day-\d+$/i

const WEEKDAY_ORDER: Record<string, number> = {
  Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7,
  Pazartesi: 1, Salı: 2, Çarşamba: 3, Perşembe: 4, Cuma: 5, Cumartesi: 6, Pazar: 7,
}

const DAY_TR: Record<string, string> = {
  Monday: 'Pazartesi', Tuesday: 'Salı', Wednesday: 'Çarşamba',
  Thursday: 'Perşembe', Friday: 'Cuma', Saturday: 'Cumartesi', Sunday: 'Pazar',
}

function dayOrder(key: string): number {
  const dayMatch = key.match(/Day-(\d+)/i)
  if (dayMatch) return parseInt(dayMatch[1], 10)
  if (WEEKDAY_ORDER[key] != null) return 100 + WEEKDAY_ORDER[key]
  return 1000
}

function displayDay(key: string): string {
  const dayMatch = key.match(/Day-(\d+)/i)
  if (dayMatch) return `Gün ${dayMatch[1]}`
  return DAY_TR[key] ?? key
}

function formatDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ProgramsPage() {
  const navigate = useNavigate()
  const user = getStoredUser()

  const [program, setProgram] = useState<ActiveProgramDetailDto | null>(null)
  const [exerciseMap, setExerciseMap] = useState<Map<string, ExerciseDto>>(new Map())
  const [selected, setSelected] = useState<ExerciseDto | null>(null)
  const [isWaiting, setIsWaiting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ESC ile modal kapatma
  useEffect(() => {
    if (!selected) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

  async function fetchData() {
    if (!user?.userId) return
    setLoading(true)
    setError(null)
    setIsWaiting(false)
    try {
      const [p, exResult] = await Promise.all([
        getUserActiveProgram(user.userId),
        getExercises({ page: 1, pageSize: 200 }),
      ])
      setProgram(p)
      setExerciseMap(new Map(exResult.exercises.map((e) => [e.id, e])))
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 404) {
        setProgram(null)
        const ws = await getWaitingUserStatus(user.userId).catch(() => null)
        setIsWaiting(ws?.isWaitingForAssignment === true)
        // 404 dahi olsa egzersiz lookup'ı yine de güzel olur ama programsız anlamsız — geç
      } else {
        setError(parseApiError(err, 'Program bilgisi yüklenemedi.'))
      }
    } finally {
      setLoading(false)
    }
  }

  // ─── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="app-shell">
        <Sidebar />
        <div className="app-main">
          <Header />
          <div className="page-content">
            <div className="section-header"><span className="section-title">Programlarım</span></div>
            <div className="skeleton skeleton-card" style={{ height: 120, marginBottom: 12 }} />
            <div className="skeleton skeleton-card" style={{ height: 200 }} />
          </div>
          <BottomNav />
        </div>
      </div>
    )
  }

  // ─── Error ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="app-shell">
        <Sidebar />
        <div className="app-main">
          <Header />
          <div className="page-content">
            <div className="section-header"><span className="section-title">Programlarım</span></div>
            <div className="error-banner">
              ⚠️ {error}
              <button className="btn-retry" onClick={fetchData} style={{ marginLeft: 12 }}>Tekrar Dene</button>
            </div>
          </div>
          <BottomNav />
        </div>
      </div>
    )
  }

  // ─── Empty (404) ──────────────────────────────────────────────────────
  if (!program) {
    return (
      <div className="app-shell">
        <Sidebar />
        <div className="app-main">
          <Header />
          <div className="page-content">
            <div className="section-header"><span className="section-title">Programlarım</span></div>
            <div className="placeholder-card">
              {isWaiting ? (
                <>
                  <div className="placeholder-icon">⏳</div>
                  <h3 className="placeholder-title">Ödemeniz başarıyla alındı!</h3>
                  <p className="placeholder-desc">
                    Koçunuz en kısa sürede size özel bir antrenman programı hazırlayacak.
                  </p>
                </>
              ) : (
                <>
                  <div className="placeholder-icon">🏋️</div>
                  <h3 className="placeholder-title">Henüz aktif bir programın yok</h3>
                  <p className="placeholder-desc">
                    Bir paket satın alarak antrenman yolculuğuna başlayabilirsin.
                  </p>
                  <div style={{ marginTop: 12 }}>
                    <button className="btn-primary" onClick={() => navigate('/packages')}>
                      Paket Satın Al →
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          <BottomNav />
        </div>
      </div>
    )
  }

  // ─── Program Detail ───────────────────────────────────────────────────
  const sortedDays = Object.entries(program.dailyExercises ?? {}).sort(([a], [b]) => dayOrder(a) - dayOrder(b))

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header />
        <div className="page-content">
          <div className="section-header">
            <span className="section-title">Programlarım</span>
          </div>

          {/* Header Block */}
          <div className="program-card">
            <div className="program-card-header">
              <div>
                <div className="program-card-title">{program.name}</div>
                <div className="program-card-coach">Antrenör: {program.coachName}</div>
              </div>
              <span className={`program-status-badge ${program.status === 'InProgress' ? 'in-progress' : 'completed'}`}>
                {program.status === 'InProgress' ? 'Devam Ediyor' : 'Tamamlandı'}
              </span>
            </div>

            <span className={`program-difficulty-badge ${program.difficulty.toLowerCase()}`}>
              {DIFFICULTY_LABEL[program.difficulty] ?? program.difficulty}
            </span>
          </div>

          {/* Program Bilgileri */}
          <div className="profile-edit-section">
            <div className="profile-edit-section-title">📋 Program Bilgileri</div>
            <div className="profile-summary-grid">
              <div className="profile-summary-item">
                <span className="profile-summary-label">Süre</span>
                <span className="profile-summary-value">{program.durationWeeks} hafta</span>
              </div>
              <div className="profile-summary-item">
                <span className="profile-summary-label">Zorluk</span>
                <span className="profile-summary-value">{DIFFICULTY_LABEL[program.difficulty] ?? program.difficulty}</span>
              </div>
              <div className="profile-summary-item">
                <span className="profile-summary-label">Başlangıç</span>
                <span className="profile-summary-value">{formatDate(program.startDate)}</span>
              </div>
              <div className="profile-summary-item">
                <span className="profile-summary-label">Bitiş</span>
                <span className="profile-summary-value">{formatDate(program.endDate)}</span>
              </div>
              {program.description && (
                <div className="profile-summary-item full">
                  <span className="profile-summary-label">Açıklama</span>
                  <span className="profile-summary-value">{program.description}</span>
                </div>
              )}
            </div>
          </div>

          {/* Haftalık Schedule */}
          <div className="profile-edit-section">
            <div className="profile-edit-section-title">📅 Haftalık Program</div>
            {sortedDays.length === 0 ? (
              <p className="placeholder-desc">Bu program için henüz egzersiz programı oluşturulmamış.</p>
            ) : (
              <div className="schedule-readonly">
                {sortedDays.map(([day, exercises]) => {
                  const canStart = DAY_N_REGEX.test(day) && exercises.length > 0
                  return (
                  <div key={day} className="schedule-day-block">
                    <div className="schedule-day-header-row">
                      <div className="schedule-day-title">{displayDay(day)}</div>
                      <button
                        className="btn-workout-start"
                        disabled={!canStart}
                        onClick={() => canStart && navigate(`/programs/workout/${day}`)}
                        title={canStart ? 'İdman kaydını başlat' : 'Bu gün için kayıt formatı uygun değil (Day-N gerekli)'}
                      >
                        🏋️ Başlat
                      </button>
                    </div>
                    {exercises.length === 0 ? (
                      <div className="schedule-rest">Dinlenme Günü</div>
                    ) : (
                      <ul className="schedule-exercise-list">
                        {exercises.map((ex, idx) => {
                          const lookup = exerciseMap.get(ex.exerciseId)
                          return (
                            <li
                              key={`${day}-${idx}`}
                              onClick={() => lookup && setSelected(lookup)}
                              style={{ cursor: lookup ? 'pointer' : 'default' }}
                              role={lookup ? 'button' : undefined}
                              tabIndex={lookup ? 0 : undefined}
                              onKeyDown={(e) => {
                                if (lookup && (e.key === 'Enter' || e.key === ' ')) {
                                  e.preventDefault()
                                  setSelected(lookup)
                                }
                              }}
                            >
                              <span className="schedule-exercise-meta">
                                <strong>{lookup?.name ?? '(Bilinmeyen egzersiz)'}</strong>
                                {lookup?.muscleGroup && <> · {MUSCLE_TR[lookup.muscleGroup] ?? lookup.muscleGroup}</>}
                                <> · {ex.sets} set · {ex.reps} tekrar</>
                              </span>
                              {ex.explanation && <div className="schedule-exercise-note">💬 {ex.explanation}</div>}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        <BottomNav />
      </div>

      {/* Egzersiz Detay Modal (ExercisesPage stiliyle aynı) */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <span className="modal-icon">
                  {MUSCLE_ICONS[selected.muscleGroup] ?? '🏋️'}
                </span>
                <div>
                  <div className="modal-title">{selected.name}</div>
                  <div className="modal-subtitle">
                    {MUSCLE_TR[selected.muscleGroup] ?? selected.muscleGroup}
                  </div>
                </div>
              </div>
              <button className="btn-modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>

            <div className="modal-badges">
              {selected.difficultyLevel && (
                <span className={`badge badge-${selected.difficultyLevel.toLowerCase()}`}>
                  {DIFFICULTY_TR[selected.difficultyLevel] ?? selected.difficultyLevel}
                </span>
              )}
              <span className="badge badge-muscle">
                {MUSCLE_TR[selected.muscleGroup] ?? selected.muscleGroup}
              </span>
            </div>

            {selected.description && (
              <p className="modal-desc">{selected.description}</p>
            )}

            {selected.videoUrl && (
              <a
                className="modal-video-link"
                href={selected.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                ▶ Video İzle
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
