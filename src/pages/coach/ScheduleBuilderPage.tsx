import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '../../components/shared/Header'
import { Sidebar, BottomNav } from '../../components/shared/Navigation'
import { activateProgram, getTrainingProgram, updateDailyProgram } from '../../services/training'
import { getExercises, getMuscleGroups } from '../../services/exercises'
import { parseApiError } from '../../utils/errorHandler'
import { useToast } from '../../components/shared/Toast'
import { MUSCLE_TR, DIFFICULTY_TR, MUSCLE_ICONS } from '../../components/exercises/ExerciseCard'
import type {
  ActiveProgramDetailDto,
  ExerciseDetail,
  ExerciseDto,
  UpdateDailyProgramRequest,
} from '../../types/api.types'
import '../../styles/dashboard.css'
import '../../styles/exercises.css'

const POOL_PAGE_SIZE = 20

interface ScheduledExercise extends ExerciseDetail {
  // UI lookup için tutulur — payload göndermeden önce temizlenir
  _ui: { name: string; muscleGroup: string; difficultyLevel?: string | null }
}

interface DayBlock {
  key: string
  exercises: ScheduledExercise[]
}

interface DropPayload {
  dayKey: string
  exercise: ExerciseDto
}

function nextDayKey(existing: DayBlock[]): string {
  const used = new Set(
    existing
      .map((d) => d.key.match(/Day-(\d+)/i)?.[1])
      .filter((n): n is string => !!n)
      .map((n) => parseInt(n, 10)),
  )
  let i = 1
  while (used.has(i)) i++
  return `Day-${i}`
}

function dayOrder(key: string): number {
  const m = key.match(/Day-(\d+)/i)
  return m ? parseInt(m[1], 10) : 9999
}

export default function ScheduleBuilderPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { programId } = useParams<{ programId: string }>()

  // Program meta
  const [program, setProgram] = useState<ActiveProgramDetailDto | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)

  // Schedule state
  const [days, setDays] = useState<DayBlock[]>([])
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)

  // Pool (sol panel) state
  const [muscleGroups, setMuscleGroups] = useState<string[]>([])
  const [pool, setPool] = useState<ExerciseDto[]>([])
  const [poolTotalPages, setPoolTotalPages] = useState(1)
  const [poolPage, setPoolPage] = useState(1)
  const [poolLoading, setPoolLoading] = useState(false)
  const [poolError, setPoolError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMuscle, setFilterMuscle] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState('')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Drop modal
  const [pendingDrop, setPendingDrop] = useState<DropPayload | null>(null)
  const [dropForm, setDropForm] = useState<{ sets: number; reps: string; explanation: string }>({
    sets: 3,
    reps: '8-10',
    explanation: '',
  })
  const [dropError, setDropError] = useState<string | null>(null)

  // Save state
  const [saving, setSaving] = useState(false)

  // Sıralı günler (erken return'lerden önce hook çağrılmalı)
  const sortedDays = useMemo(
    () => [...days].sort((a, b) => dayOrder(a.key) - dayOrder(b.key)),
    [days],
  )

  // ─── Mount ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!programId) return
    setPageLoading(true)
    Promise.all([
      getTrainingProgram(programId),
      getMuscleGroups().catch(() => [] as string[]),
    ])
      .then(([prog, mg]) => {
        setProgram(prog)
        setMuscleGroups(mg)
        // Mevcut günleri seed et (program zaten schedule içeriyorsa)
        if (prog.dailyExercises) {
          const existing = Object.entries(prog.dailyExercises)
            .map(([key, list]) => ({
              key,
              exercises: list.map((e) => ({
                exerciseId: e.exerciseId,
                sets: e.sets,
                reps: e.reps,
                explanation: e.explanation ?? undefined,
                _ui: { name: '(yüklenecek)', muscleGroup: '', difficultyLevel: null },
              })),
            }))
            .sort((a, b) => dayOrder(a.key) - dayOrder(b.key))
          setDays(existing)
        }
      })
      .catch((err) => setPageError(parseApiError(err, 'Program yüklenemedi.')))
      .finally(() => setPageLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId])

  // ─── Pool fetch (debounced) ──────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchPool(poolPage), searchTerm ? 400 : 0)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolPage, searchTerm, filterMuscle, filterDifficulty])

  async function fetchPool(p: number) {
    setPoolLoading(true)
    setPoolError(null)
    try {
      const result = await getExercises({
        page: p,
        pageSize: POOL_PAGE_SIZE,
        search: searchTerm || undefined,
        muscleGroup: filterMuscle || undefined,
        difficultyLevel: filterDifficulty || undefined,
      })
      setPool(result.exercises)
      setPoolTotalPages(result.totalPages)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 429) {
        setPoolError('Çok fazla istek atıldı. Lütfen birkaç saniye bekleyin.')
      } else {
        setPoolError(parseApiError(err, 'Egzersizler yüklenemedi.'))
      }
    } finally {
      setPoolLoading(false)
    }
  }

  // ─── Filter change resets page ────────────────────────────────────────
  function setFilter(key: 'search' | 'muscle' | 'difficulty', value: string) {
    if (key === 'search') setSearchTerm(value)
    if (key === 'muscle') setFilterMuscle(value)
    if (key === 'difficulty') setFilterDifficulty(value)
    setPoolPage(1)
  }

  // ─── Day management ───────────────────────────────────────────────────
  const maxDays = program ? program.durationWeeks * 7 : 7
  function addDay() {
    if (days.length >= maxDays) {
      toast.warning(`Bu program için maksimum ${maxDays} gün eklenebilir.`)
      return
    }
    setDays((prev) => [...prev, { key: nextDayKey(prev), exercises: [] }])
  }
  function removeDay(key: string) {
    if (!confirm(`${key} ve içindeki tüm egzersizler silinsin mi?`)) return
    setDays((prev) => prev.filter((d) => d.key !== key))
  }

  // ─── Drag/Drop ────────────────────────────────────────────────────────
  function handleDragStart(e: React.DragEvent, exercise: ExerciseDto) {
    e.dataTransfer.setData('application/json', JSON.stringify(exercise))
    e.dataTransfer.effectAllowed = 'copy'
  }
  function handleDragOver(e: React.DragEvent, dayKey: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    if (dragOverKey !== dayKey) setDragOverKey(dayKey)
  }
  function handleDragLeave(dayKey: string) {
    if (dragOverKey === dayKey) setDragOverKey(null)
  }
  function handleDrop(e: React.DragEvent, dayKey: string) {
    e.preventDefault()
    setDragOverKey(null)
    try {
      const raw = e.dataTransfer.getData('application/json')
      if (!raw) return
      const exercise = JSON.parse(raw) as ExerciseDto
      setPendingDrop({ dayKey, exercise })
      setDropForm({ sets: 3, reps: '8-10', explanation: '' })
      setDropError(null)
    } catch {
      toast.error('Egzersiz eklenirken bir hata oluştu.')
    }
  }

  // ─── Drop modal save ──────────────────────────────────────────────────
  function confirmAddExercise() {
    if (!pendingDrop) return
    if (!dropForm.sets || dropForm.sets < 1) { setDropError('Set sayısı en az 1 olmalı.'); return }
    if (!dropForm.reps.trim()) { setDropError('Tekrar bilgisi zorunlu.'); return }

    const row: ScheduledExercise = {
      exerciseId: pendingDrop.exercise.id,
      sets: dropForm.sets,
      reps: dropForm.reps.trim(),
      explanation: dropForm.explanation.trim() || undefined,
      _ui: {
        name: pendingDrop.exercise.name,
        muscleGroup: pendingDrop.exercise.muscleGroup,
        difficultyLevel: pendingDrop.exercise.difficultyLevel ?? null,
      },
    }

    setDays((prev) =>
      prev.map((d) => (d.key === pendingDrop.dayKey ? { ...d, exercises: [...d.exercises, row] } : d)),
    )
    setPendingDrop(null)
  }

  function removeExercise(dayKey: string, idx: number) {
    setDays((prev) =>
      prev.map((d) =>
        d.key === dayKey ? { ...d, exercises: d.exercises.filter((_, i) => i !== idx) } : d,
      ),
    )
  }

  // ─── Save / Publish ───────────────────────────────────────────────────
  function buildPayload(): UpdateDailyProgramRequest {
    const out: UpdateDailyProgramRequest = {}
    for (const d of days) {
      out[d.key] = d.exercises.map(({ exerciseId, sets, reps, explanation }) => ({
        exerciseId,
        sets,
        reps,
        explanation: explanation ?? undefined,
      }))
    }
    return out
  }

  async function handleSaveDraft() {
    if (!programId) return
    setSaving(true)
    try {
      await updateDailyProgram(programId, buildPayload())
      toast.success('Taslak kaydedildi.')
    } catch (err) {
      toast.error(parseApiError(err, 'Kaydedilemedi.'))
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish() {
    if (!programId) return
    const totalExercises = days.reduce((sum, d) => sum + d.exercises.length, 0)
    if (days.length === 0 || totalExercises === 0) {
      toast.warning('En az 1 gün ve 1 egzersiz eklemelisin.')
      return
    }
    setSaving(true)
    try {
      await updateDailyProgram(programId, buildPayload())
      await activateProgram(programId)
      toast.success('Program yayınlandı ve aktifleştirildi.')
      navigate('/coach/programs', { replace: true })
    } catch (err) {
      toast.error(parseApiError(err, 'Yayınlama başarısız.'))
    } finally {
      setSaving(false)
    }
  }

  // ─── Renders ──────────────────────────────────────────────────────────
  if (pageLoading) {
    return (
      <div className="app-shell">
        <Sidebar />
        <div className="app-main">
          <Header />
          <div className="page-content">
            <div className="skeleton" style={{ height: 60, borderRadius: 12, marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 400, borderRadius: 12 }} />
          </div>
          <BottomNav />
        </div>
      </div>
    )
  }

  if (pageError || !program) {
    return (
      <div className="app-shell">
        <Sidebar />
        <div className="app-main">
          <Header />
          <div className="page-content">
            <div className="error-banner">⚠️ {pageError ?? 'Program bulunamadı.'}</div>
            <button className="btn-back" onClick={() => navigate('/coach/programs')}>← Programlara dön</button>
          </div>
          <BottomNav />
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header />
        <div className="page-content">
          <div className="section-header" style={{ marginBottom: 16 }}>
            <button className="btn-back" onClick={() => navigate(-1)}>← Geri</button>
            <span className="section-title">{program.name} · Schedule Oluştur</span>
          </div>

          <div className="schedule-builder-layout">
            {/* ─── Sol Panel: Egzersiz Havuzu ─── */}
            <aside className="exercise-pool-panel">
              <div className="exercise-pool-header">
                <div className="exercise-pool-title">💪 Egzersiz Havuzu</div>
                <div className="exercise-pool-hint">Sürükleyip günlere bırak</div>
              </div>

              <div className="filter-bar" style={{ marginBottom: 12 }}>
                <div className="filter-search">
                  <span className="filter-search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Egzersiz ara…"
                    value={searchTerm}
                    onChange={(e) => setFilter('search', e.target.value)}
                  />
                </div>
                <select
                  className={`filter-select ${filterMuscle ? 'active' : ''}`}
                  value={filterMuscle}
                  onChange={(e) => setFilter('muscle', e.target.value)}
                >
                  <option value="">Tüm Kaslar</option>
                  {muscleGroups.map((m) => (
                    <option key={m} value={m}>{MUSCLE_TR[m] ?? m}</option>
                  ))}
                </select>
                <select
                  className={`filter-select ${filterDifficulty ? 'active' : ''}`}
                  value={filterDifficulty}
                  onChange={(e) => setFilter('difficulty', e.target.value)}
                >
                  <option value="">Tüm Seviyeler</option>
                  <option value="Beginner">Başlangıç</option>
                  <option value="Intermediate">Orta</option>
                  <option value="Advanced">İleri</option>
                </select>
              </div>

              {poolError && (
                <div className="error-banner" style={{ fontSize: '0.82rem' }}>⚠️ {poolError}</div>
              )}

              <div className="exercise-pool-list">
                {poolLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="skeleton" style={{ height: 60, borderRadius: 10, marginBottom: 8 }} />
                  ))
                ) : pool.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px 8px' }}>
                    <span className="empty-state-icon">🔍</span>
                    <p className="empty-state-text">Sonuç bulunamadı</p>
                  </div>
                ) : (
                  pool.map((ex) => (
                    <div
                      key={ex.id}
                      className="exercise-pool-card"
                      draggable
                      onDragStart={(e) => handleDragStart(e, ex)}
                    >
                      <span className="exercise-pool-handle" aria-hidden>⋮⋮</span>
                      <span className="exercise-pool-icon">{MUSCLE_ICONS[ex.muscleGroup] ?? '🏋️'}</span>
                      <div className="exercise-pool-text">
                        <div className="exercise-pool-name">{ex.name}</div>
                        <div className="exercise-pool-meta">
                          {MUSCLE_TR[ex.muscleGroup] ?? ex.muscleGroup}
                          {ex.difficultyLevel && (
                            <> · {DIFFICULTY_TR[ex.difficultyLevel] ?? ex.difficultyLevel}</>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {!poolLoading && poolTotalPages > 1 && (
                <div className="pagination" style={{ marginTop: 12 }}>
                  <button
                    className="btn-page"
                    disabled={poolPage <= 1}
                    onClick={() => setPoolPage((p) => p - 1)}
                  >
                    ←
                  </button>
                  <span className="pagination-info">{poolPage} / {poolTotalPages}</span>
                  <button
                    className="btn-page"
                    disabled={poolPage >= poolTotalPages}
                    onClick={() => setPoolPage((p) => p + 1)}
                  >
                    →
                  </button>
                </div>
              )}
            </aside>

            {/* ─── Sağ: Günler ─── */}
            <section className="day-columns">
              <div className="day-columns-header">
                <button className="btn-secondary day-add-btn" onClick={addDay}>
                  + Gün Ekle
                </button>
                <span className="day-columns-info">
                  {days.length} gün · {days.reduce((s, d) => s + d.exercises.length, 0)} egzersiz
                </span>
              </div>

              {days.length === 0 ? (
                <div className="placeholder-card" style={{ padding: '32px 16px' }}>
                  <div className="placeholder-icon">📅</div>
                  <h3 className="placeholder-title">Henüz gün yok</h3>
                  <p className="placeholder-desc">
                    Haftalık programa başlamak için "+ Gün Ekle" butonunu kullan.
                  </p>
                </div>
              ) : (
                <div className="day-columns-grid">
                  {sortedDays.map((d) => (
                    <div
                      key={d.key}
                      className={`day-column ${dragOverKey === d.key ? 'drop-active' : ''}`}
                      onDragOver={(e) => handleDragOver(e, d.key)}
                      onDragLeave={() => handleDragLeave(d.key)}
                      onDrop={(e) => handleDrop(e, d.key)}
                    >
                      <div className="day-column-header">
                        <span className="day-column-title">{d.key}</span>
                        <button
                          className="day-column-remove"
                          onClick={() => removeDay(d.key)}
                          aria-label={`${d.key} sil`}
                        >
                          ×
                        </button>
                      </div>

                      {d.exercises.length === 0 ? (
                        <div className="day-column-empty">Buraya sürükleyip bırak</div>
                      ) : (
                        <ul className="day-row-list">
                          {d.exercises.map((row, idx) => (
                            <li key={`${d.key}-${idx}`} className="day-row-item">
                              <div className="day-row-text">
                                <strong>{row._ui.name}</strong>
                                <span className="day-row-meta">
                                  {row.sets} set · {row.reps}
                                </span>
                                {row.explanation && (
                                  <span className="day-row-note">💬 {row.explanation}</span>
                                )}
                              </div>
                              <button
                                className="day-row-remove"
                                onClick={() => removeExercise(d.key, idx)}
                                aria-label="Egzersizi çıkar"
                              >
                                ×
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* ─── Bottom Actions ─── */}
          <div className="profile-edit-actions" style={{ marginTop: 24 }}>
            <button
              className="btn-secondary"
              onClick={() => navigate('/coach/programs')}
              disabled={saving}
            >
              İptal
            </button>
            <button
              className="btn-secondary"
              onClick={handleSaveDraft}
              disabled={saving}
            >
              {saving ? 'Kaydediliyor…' : 'Taslak Kaydet'}
            </button>
            <button
              className="btn-primary"
              onClick={handlePublish}
              disabled={saving}
            >
              {saving && <span className="loading-spinner" />}
              {saving ? 'Yayınlanıyor…' : 'Yayınla & Aktifleştir →'}
            </button>
          </div>
        </div>
        <BottomNav />
      </div>

      {/* ─── Drop Modal: Set / Reps / Açıklama ─── */}
      {pendingDrop && (
        <div className="payment-modal-overlay" onClick={() => setPendingDrop(null)}>
          <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="payment-modal-title">Egzersiz Ekle · {pendingDrop.dayKey}</div>
            <div className="payment-summary" style={{ marginBottom: 12 }}>
              <div className="payment-summary-row">
                <span>Egzersiz</span>
                <span className="val">{pendingDrop.exercise.name}</span>
              </div>
              <div className="payment-summary-row">
                <span>Kas Grubu</span>
                <span className="val">{MUSCLE_TR[pendingDrop.exercise.muscleGroup] ?? pendingDrop.exercise.muscleGroup}</span>
              </div>
            </div>

            <div className="ob-form-row">
              <div className="ob-form-group">
                <label className="ob-label">Set Sayısı</label>
                <input
                  className="ob-input"
                  type="number"
                  min={1}
                  value={dropForm.sets}
                  onChange={(e) => setDropForm((p) => ({ ...p, sets: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="ob-form-group">
                <label className="ob-label">Tekrar</label>
                <input
                  className="ob-input"
                  type="text"
                  placeholder="8-10, 12, AMRAP…"
                  value={dropForm.reps}
                  onChange={(e) => setDropForm((p) => ({ ...p, reps: e.target.value }))}
                />
              </div>
            </div>

            <div className="ob-form-group">
              <label className="ob-label">Açıklama (opsiyonel)</label>
              <textarea
                className="ob-input"
                rows={2}
                placeholder="Form ipucu, hız, dinlenme süresi…"
                value={dropForm.explanation}
                onChange={(e) => setDropForm((p) => ({ ...p, explanation: e.target.value }))}
              />
            </div>

            {dropError && <div className="error-banner">⚠️ {dropError}</div>}

            <div className="payment-modal-actions">
              <button className="btn-pay-cancel" onClick={() => setPendingDrop(null)}>İptal</button>
              <button className="btn-pay" onClick={confirmAddExercise}>Programa Ekle</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

