import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/shared/Header'
import { Sidebar, BottomNav } from '../../components/shared/Navigation'
import { getUserActiveProgram, getWaitingUserStatus } from '../../services/users'
import { getExercises } from '../../services/exercises'
import { exportTrainingProgram } from '../../services/training'
import { exportNutritionPlan, getUserActiveNutritionPlan } from '../../services/nutritionPlans'
import { getStoredUser } from '../../services/auth'
import { useToast } from '../../components/shared/Toast'
import { parseApiError } from '../../utils/errorHandler'
import { MUSCLE_TR, DIFFICULTY_TR, MUSCLE_ICONS } from '../../components/exercises/ExerciseCard'
import ScheduleView from '../../components/programs/ScheduleView'
import type {
  ActiveProgramDetailDto,
  ExerciseDto,
  NutritionPlanDetailDto,
  NutritionDayType,
} from '../../types/api.types'
import '../../styles/dashboard.css'
import '../../styles/exercises.css'

const DIFFICULTY_LABEL: Record<string, string> = { Beginner: 'Başlangıç', Intermediate: 'Orta Seviye', Advanced: 'İleri Seviye' }

const WEEKDAY_ORDER: Record<string, number> = {
  Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7,
  Pazartesi: 1, Salı: 2, Çarşamba: 3, Perşembe: 4, Cuma: 5, Cumartesi: 6, Pazar: 7,
}

const NUTRITION_DAY_TR: Record<NutritionDayType, string> = {
  WorkoutDay: 'Antrenman Günü',
  OffDay: 'Dinlenme Günü',
}
const NUTRITION_DAY_ICON: Record<NutritionDayType, string> = {
  WorkoutDay: '💪',
  OffDay: '🛌',
}

function fmtNum(n: number): string {
  return n >= 100 ? Math.round(n).toString() : (Math.round(n * 10) / 10).toString()
}

function dayOrder(key: string): number {
  const dayMatch = key.match(/Day-(\d+)/i)
  if (dayMatch) return parseInt(dayMatch[1], 10)
  if (WEEKDAY_ORDER[key] != null) return 100 + WEEKDAY_ORDER[key]
  return 1000
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ownerBadge(createdByType: 'Self' | 'Coach', coachName?: string | null) {
  if (createdByType === 'Self') return { icon: '🧍', label: 'Sen' }
  return { icon: '👨‍🏫', label: coachName ?? 'Koç' }
}

export default function ProgramsPage() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const toast = useToast()

  const [program, setProgram] = useState<ActiveProgramDetailDto | null>(null)
  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlanDetailDto | null>(null)
  const [exerciseMap, setExerciseMap] = useState<Map<string, ExerciseDto>>(new Map())
  const [selected, setSelected] = useState<ExerciseDto | null>(null)
  const [isWaiting, setIsWaiting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'training' | 'nutrition'>('training')
  const [exportingProgramId, setExportingProgramId] = useState<string | null>(null)
  const [exportingPlanId, setExportingPlanId] = useState<string | null>(null)

  async function handleExportProgram(program: ActiveProgramDetailDto) {
    if (exportingProgramId) return
    setExportingProgramId(program.id)
    try {
      const blob = await exportTrainingProgram(program.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${program.name || 'antrenman-programi'}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Excel indirilemedi. Lütfen tekrar deneyin.')
    } finally {
      setExportingProgramId(null)
    }
  }

  async function handleExportPlan(plan: NutritionPlanDetailDto) {
    if (exportingPlanId) return
    setExportingPlanId(plan.id)
    try {
      const blob = await exportNutritionPlan(plan.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${plan.title || 'beslenme-plani'}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Excel indirilemedi. Lütfen tekrar deneyin.')
    } finally {
      setExportingPlanId(null)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      const [progRes, planRes, exercisesRes] = await Promise.allSettled([
        getUserActiveProgram(user.userId),
        getUserActiveNutritionPlan(user.userId),
        getExercises({ page: 1, pageSize: 200 }),
      ])

      const prog = progRes.status === 'fulfilled' ? progRes.value : null
      const plan = planRes.status === 'fulfilled' ? planRes.value : null
      setProgram(prog)
      setNutritionPlan(plan)

      if (!prog && plan) setActiveTab('nutrition')
      else setActiveTab('training')

      if (exercisesRes.status === 'fulfilled') {
        setExerciseMap(new Map(exercisesRes.value.exercises.map((e) => [e.id, e])))
      }

      if (!prog && !plan) {
        const ws = await getWaitingUserStatus(user.userId).catch(() => null)
        setIsWaiting(ws?.isWaitingForAssignment === true)
      }
    } catch (err: unknown) {
      setError(parseApiError(err, 'Program bilgisi yüklenemedi.'))
    } finally {
      setLoading(false)
    }
  }

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

  const sortedDays = program
    ? Object.entries(program.dailyExercises ?? {}).sort(([a], [b]) => dayOrder(a) - dayOrder(b))
    : []
  const programBadge = program ? ownerBadge(program.createdByType, program.coachName) : null
  const planBadge = nutritionPlan ? ownerBadge(nutritionPlan.createdByType, nutritionPlan.coachName) : null

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header />
        <div className="page-content">
          <div className="section-header">
            <span className="section-title">Programlarım</span>
          </div>

          {/* ─── Özet Bandı ─── */}
          <div className="programs-summary-bar">
            <button
              type="button"
              className={`programs-summary-chip ${activeTab === 'training' ? 'active' : ''} ${!program ? 'muted' : ''}`}
              onClick={() => setActiveTab('training')}
            >
              <span className="programs-summary-icon">🏋️</span>
              <div className="programs-summary-text">
                <div className="programs-summary-label">Antrenman</div>
                <div className="programs-summary-value">
                  {program ? program.name : 'Henüz yok'}
                </div>
                {program && (
                  <div className="programs-summary-sub">
                    {programBadge?.icon} {programBadge?.label} · {program.durationWeeks} hafta
                  </div>
                )}
              </div>
            </button>
            <button
              type="button"
              className={`programs-summary-chip ${activeTab === 'nutrition' ? 'active' : ''} ${!nutritionPlan ? 'muted' : ''}`}
              onClick={() => setActiveTab('nutrition')}
            >
              <span className="programs-summary-icon">🥗</span>
              <div className="programs-summary-text">
                <div className="programs-summary-label">Beslenme</div>
                <div className="programs-summary-value">
                  {nutritionPlan ? nutritionPlan.title : 'Henüz yok'}
                </div>
                {nutritionPlan && (
                  <div className="programs-summary-sub">
                    {planBadge?.icon} {planBadge?.label}
                  </div>
                )}
              </div>
            </button>
          </div>

          {/* ─── Tab Bar ─── */}
          <div className="programs-tabs">
            <button
              type="button"
              className={`programs-tab ${activeTab === 'training' ? 'active' : ''}`}
              onClick={() => setActiveTab('training')}
            >
              🏋️ Antrenman
            </button>
            <button
              type="button"
              className={`programs-tab ${activeTab === 'nutrition' ? 'active' : ''}`}
              onClick={() => setActiveTab('nutrition')}
            >
              🥗 Beslenme
            </button>
          </div>

          {/* ─── Antrenman ─── */}
          {activeTab === 'training' && (
            !program ? (
              <div className="placeholder-card">
                <div className="placeholder-icon">🏋️</div>
                <h3 className="placeholder-title">Henüz aktif bir antrenman programın yok</h3>
                <p className="placeholder-desc">
                  Kendi başına ücretsiz bir program oluşturabilir ya da paket alarak koçundan plan isteyebilirsin.
                </p>
                <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button className="btn-primary" onClick={() => navigate('/programs/self/training/new')}>
                    + Kendine Program Oluştur
                  </button>
                  {isWaiting ? (
                    <span className="placeholder-desc" style={{ margin: 0 }}>
                      ⏳ Koçun en kısa sürede sana özel program hazırlayacak.
                    </span>
                  ) : (
                    <button className="btn-secondary" onClick={() => navigate('/packages')}>
                      Paket Satın Al →
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="program-card">
                  <div className="program-card-header">
                    <div>
                      <div className="program-card-title">{program.name}</div>
                      <div className="program-card-coach">
                        {programBadge?.icon} {programBadge?.label}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => handleExportProgram(program)}
                        disabled={exportingProgramId === program.id}
                        title="Programı Excel olarak indir"
                      >
                        {exportingProgramId === program.id ? '⏳ Hazırlanıyor…' : '📥 Excel'}
                      </button>
                      <span className={`program-status-badge ${program.status === 'InProgress' ? 'in-progress' : 'completed'}`}>
                        {program.status === 'InProgress' ? 'Devam Ediyor' : 'Tamamlandı'}
                      </span>
                    </div>
                  </div>
                  <span className={`program-difficulty-badge ${program.difficulty.toLowerCase()}`}>
                    {DIFFICULTY_LABEL[program.difficulty] ?? program.difficulty}
                  </span>
                </div>

                <div className="profile-edit-section">
                  <div className="profile-edit-section-title">📋 Program Bilgileri ({sortedDays.length} gün)</div>
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

                <div className="profile-edit-section">
                  <div className="profile-edit-section-title">📅 Haftalık Program</div>
                  <ScheduleView
                    dailyExercises={program.dailyExercises}
                    exerciseMap={exerciseMap}
                    onExerciseSelect={setSelected}
                    onStartDay={(day) => navigate(`/programs/workout/${day}`)}
                  />
                </div>

                {program.createdByType === 'Self' && (
                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn-secondary" onClick={() => navigate('/programs/self/training/new')}>
                      + Yeni Self Program (mevcut deaktive olur)
                    </button>
                  </div>
                )}
              </>
            )
          )}

          {/* ─── Beslenme ─── */}
          {activeTab === 'nutrition' && (
            !nutritionPlan ? (
              <div className="placeholder-card">
                <div className="placeholder-icon">🥗</div>
                <h3 className="placeholder-title">Henüz aktif bir beslenme planın yok</h3>
                <p className="placeholder-desc">
                  Kendi başına ücretsiz bir beslenme planı oluşturabilir ya da paket alarak koçundan plan isteyebilirsin.
                </p>
                <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button className="btn-primary" onClick={() => navigate('/programs/self/nutrition/new')}>
                    + Kendine Plan Oluştur
                  </button>
                  {!isWaiting && (
                    <button className="btn-secondary" onClick={() => navigate('/packages')}>
                      Paket Satın Al →
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="profile-edit-section">
                  <div className="profile-edit-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span>🥗 {nutritionPlan.title} <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>({planBadge?.icon} {planBadge?.label})</span></span>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleExportPlan(nutritionPlan)}
                      disabled={exportingPlanId === nutritionPlan.id}
                      title="Beslenme planını Excel olarak indir"
                    >
                      {exportingPlanId === nutritionPlan.id ? '⏳ Hazırlanıyor…' : '📥 Excel'}
                    </button>
                  </div>
                  <div className="profile-summary-grid" style={{ marginBottom: 12 }}>
                    <div className="profile-summary-item">
                      <span className="profile-summary-label">Oluşturan</span>
                      <span className="profile-summary-value">{planBadge?.icon} {planBadge?.label}</span>
                    </div>
                    <div className="profile-summary-item">
                      <span className="profile-summary-label">Başlangıç</span>
                      <span className="profile-summary-value">{formatDate(nutritionPlan.createdAt)}</span>
                    </div>
                    {nutritionPlan.description && (
                      <div className="profile-summary-item full">
                        <span className="profile-summary-label">Açıklama</span>
                        <span className="profile-summary-value">{nutritionPlan.description}</span>
                      </div>
                    )}
                  </div>

                  <div className="np-days-grid" data-cols={nutritionPlan.days.length}>
                    {nutritionPlan.days.map((d) => (
                          <div key={d.dayType} className="np-day-card">
                            <div className="np-day-header">
                              <span className="np-day-icon">{NUTRITION_DAY_ICON[d.dayType]}</span>
                              <span className="np-day-title">{NUTRITION_DAY_TR[d.dayType]}</span>
                            </div>

                            <div className="np-meals">
                              {d.meals.map((meal, mi) => (
                                <div key={`${d.dayType}-${mi}`} className="np-meal-card readonly">
                                  <div className="np-meal-head">
                                    <span className="np-meal-name" style={{ pointerEvents: 'none' }}>
                                      {meal.name}
                                    </span>
                                  </div>

                                  {meal.items.length === 0 ? (
                                    <div className="day-column-empty">Bu öğünde besin yok</div>
                                  ) : (
                                    <ul className="np-item-list">
                                      {meal.items.map((it, ii) => (
                                        <li key={`${d.dayType}-${mi}-${ii}`} className="np-item-row">
                                          <div className="np-item-text">
                                            <strong>{it.foodName}</strong>
                                            <div className="np-item-macros">
                                              <span className="macro-kcal">{fmtNum(it.calories)} kcal</span>
                                              <span className="macro-p">{fmtNum(it.protein)}P</span>
                                              <span className="macro-c">{fmtNum(it.carbs)}C</span>
                                              <span className="macro-f">{fmtNum(it.fat)}F</span>
                                            </div>
                                          </div>
                                          <div className="np-item-grams">
                                            <span>{fmtNum(it.quantity)} {it.quantityUnit}</span>
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  )}

                                  {meal.items.length > 0 && (
                                    <div className="np-meal-subtotal">
                                      Ara toplam ·{' '}
                                      <span className="macro-kcal">{fmtNum(meal.totalCalories)} kcal</span>{' '}
                                      · <span className="macro-p">{fmtNum(meal.totalProtein)}P</span>{' '}
                                      · <span className="macro-c">{fmtNum(meal.totalCarbs)}C</span>{' '}
                                      · <span className="macro-f">{fmtNum(meal.totalFat)}F</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>

                            <div className="np-day-total">
                              <div className="np-day-total-label">Günlük Toplam</div>
                              <div className="np-day-total-row">
                                <span className="np-day-total-kcal">{fmtNum(d.totalCalories)} kcal</span>
                                <span className="macro-p">{fmtNum(d.totalProtein)}P</span>
                                <span className="macro-c">{fmtNum(d.totalCarbs)}C</span>
                                <span className="macro-f">{fmtNum(d.totalFat)}F</span>
                              </div>
                            </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )
          )}
        </div>
        <BottomNav />
      </div>

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
