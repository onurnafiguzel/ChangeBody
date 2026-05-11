import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '../../components/shared/Header'
import { Sidebar, BottomNav } from '../../components/shared/Navigation'
import { getUserActiveProgram } from '../../services/users'
import { getExercises } from '../../services/exercises'
import { createWorkoutSession, getUserWorkoutSessionsByDay } from '../../services/workoutSessions'
import { getStoredUser } from '../../services/auth'
import { breakdownApiError, parseApiError } from '../../utils/errorHandler'
import { useToast } from '../../components/shared/Toast'
import { MUSCLE_TR } from '../../components/exercises/ExerciseCard'
import type {
  ActiveProgramDetailDto,
  CreateWorkoutSessionRequest,
  ExerciseDto,
  ProgramExerciseDetail,
  WorkoutSessionDto,
} from '../../types/api.types'
import '../../styles/dashboard.css'

const DAY_N_REGEX = /^Day-\d+$/i
const PAST_LIMIT = 4

interface SetInputValue {
  weight: string  // string olarak tutuluyor (boş input desteği)
  reps: string
}

type TodayInput = Record<string, Record<number, SetInputValue>>
// { [exerciseId]: { [setNumber]: { weight, reps } } }

function todayDateISO(): string {
  return new Date().toISOString().split('T')[0]
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

function formatToday(): string {
  return new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Geçmiş bir session'da bir exercise+set için kayıt
function findPastSet(
  session: WorkoutSessionDto,
  exerciseId: string,
  setNumber: number,
): { weight: number; reps: number } | null {
  const ex = session.exercises.find((e) => e.exerciseId === exerciseId)
  if (!ex) return null
  const s = ex.sets.find((x) => x.setNumber === setNumber)
  if (!s) return null
  return { weight: s.weight, reps: s.reps }
}

export default function WorkoutSessionPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { dayKey: rawDayKey } = useParams<{ dayKey: string }>()
  const dayKey = rawDayKey ?? ''

  const [program, setProgram] = useState<ActiveProgramDetailDto | null>(null)
  const [exerciseMap, setExerciseMap] = useState<Map<string, ExerciseDto>>(new Map())
  const [sessions, setSessions] = useState<WorkoutSessionDto[]>([])
  const [todayInput, setTodayInput] = useState<TodayInput>({})

  const [pageLoading, setPageLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const user = getStoredUser()

  // ─── dayKey validate ──────────────────────────────────────────────────
  useEffect(() => {
    if (!DAY_N_REGEX.test(dayKey)) {
      setPageError(`Geçersiz gün anahtarı: "${dayKey}". Sadece "Day-1", "Day-2"... formatı destekleniyor.`)
      setPageLoading(false)
      return
    }
    if (!user?.userId) {
      navigate('/login')
      return
    }
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey])

  async function fetchAll() {
    if (!user?.userId) return
    setPageLoading(true)
    setPageError(null)
    try {
      const [prog, exResult, sessionsResult] = await Promise.all([
        getUserActiveProgram(user.userId),
        getExercises({ page: 1, pageSize: 200 }),
        getUserWorkoutSessionsByDay(user.userId, dayKey, PAST_LIMIT),
      ])
      setProgram(prog)
      setExerciseMap(new Map(exResult.exercises.map((e) => [e.id, e])))
      setSessions(sessionsResult)
    } catch (err) {
      setPageError(parseApiError(err, 'Veri yüklenemedi.'))
    } finally {
      setPageLoading(false)
    }
  }

  // ─── Schedule egzersizleri ────────────────────────────────────────────
  const scheduleExercises: ProgramExerciseDetail[] = useMemo(() => {
    if (!program?.dailyExercises) return []
    return program.dailyExercises[dayKey] ?? []
  }, [program, dayKey])

  // ─── Past sessions sorted DESC (en yeni başta) ────────────────────────
  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => b.recordDate.localeCompare(a.recordDate)),
    [sessions],
  )

  // ─── Input update ─────────────────────────────────────────────────────
  function updateSet(
    exerciseId: string,
    setNumber: number,
    field: keyof SetInputValue,
    value: string,
  ) {
    setTodayInput((prev) => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        [setNumber]: {
          weight: prev[exerciseId]?.[setNumber]?.weight ?? '',
          reps: prev[exerciseId]?.[setNumber]?.reps ?? '',
          [field]: value,
        },
      },
    }))
  }

  // ─── Önceki performansı kopyala ───────────────────────────────────────
  function copyLastSession() {
    if (sortedSessions.length === 0) {
      toast.info('Kopyalanacak önceki kayıt yok.')
      return
    }
    const last = sortedSessions[0]
    const seed: TodayInput = {}
    for (const ex of last.exercises) {
      seed[ex.exerciseId] = {}
      for (const s of ex.sets) {
        seed[ex.exerciseId][s.setNumber] = {
          weight: String(s.weight),
          reps: String(s.reps),
        }
      }
    }
    setTodayInput(seed)
    toast.success(`${formatShortDate(last.recordDate)} oturumu kopyalandı.`)
  }

  // ─── Submit ───────────────────────────────────────────────────────────
  function buildPayload(): CreateWorkoutSessionRequest | null {
    if (!user?.userId || !program) return null

    const exercises = Object.entries(todayInput)
      .map(([exerciseId, setsMap]) => {
        const sets = Object.entries(setsMap)
          .map(([n, { weight, reps }]) => {
            const w = Number(weight)
            const r = Number(reps)
            return { setNumber: parseInt(n, 10), weight: w, reps: r, _w: weight, _r: reps }
          })
          .filter((s) =>
            s._w !== '' && s._r !== '' &&
            !Number.isNaN(s.weight) && !Number.isNaN(s.reps) &&
            s.weight >= 0 && s.reps >= 1,
          )
          .sort((a, b) => a.setNumber - b.setNumber)
          .map(({ setNumber, weight, reps }) => ({ setNumber, weight, reps }))
        return { exerciseId, sets }
      })
      .filter((ex) => ex.sets.length > 0)

    if (exercises.length === 0) return null

    return {
      userId: user.userId,
      trainingProgramId: program.id,
      dayKey,
      recordDate: todayDateISO(),
      exercises,
    }
  }

  async function handleSave() {
    setGlobalError(null)
    const payload = buildPayload()
    if (!payload) {
      toast.warning('En az 1 egzersizin en az 1 setini doldur.')
      return
    }

    setSaving(true)
    try {
      await createWorkoutSession(payload)
      toast.success('Antrenmanın kaydedildi.')
      navigate('/programs', { replace: true })
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401) { navigate('/login'); return }
      if (status === 400) {
        const { globalMessage } = breakdownApiError(err)
        setGlobalError(globalMessage)
        toast.error(globalMessage ?? 'Kayıt başarısız.')
      } else {
        const msg = parseApiError(err, 'Kayıt başarısız.')
        setGlobalError(msg)
        toast.error(msg)
      }
    } finally {
      setSaving(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────
  if (pageLoading) {
    return (
      <div className="app-shell">
        <Sidebar />
        <div className="app-main">
          <Header />
          <div className="page-content">
            <div className="skeleton" style={{ height: 60, borderRadius: 12, marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 320, borderRadius: 12 }} />
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
            <button className="btn-back" onClick={() => navigate('/programs')}>← Programlarıma dön</button>
          </div>
          <BottomNav />
        </div>
      </div>
    )
  }

  if (scheduleExercises.length === 0) {
    return (
      <div className="app-shell">
        <Sidebar />
        <div className="app-main">
          <Header />
          <div className="page-content">
            <div className="placeholder-card">
              <div className="placeholder-icon">📅</div>
              <h3 className="placeholder-title">{dayKey}: Egzersiz Yok</h3>
              <p className="placeholder-desc">
                Bu gün için program'da tanımlanmış egzersiz bulunmuyor (dinlenme günü olabilir).
              </p>
              <button className="btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/programs')}>
                Programıma Dön
              </button>
            </div>
          </div>
          <BottomNav />
        </div>
      </div>
    )
  }

  const pastCols = sortedSessions.length

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header />
        <div className="page-content">
          <div className="section-header" style={{ marginBottom: 16 }}>
            <button className="btn-back" onClick={() => navigate('/programs')}>← Geri</button>
            <span className="section-title">{dayKey} · İdman Kaydı</span>
          </div>

          <div className="workout-meta-bar">
            <span>📅 Bugün: <strong>{formatToday()}</strong></span>
            {sortedSessions.length > 0 && (
              <button className="btn-link" onClick={copyLastSession}>
                ⤺ Önceki Performansı Kopyala
              </button>
            )}
          </div>

          {globalError && <div className="error-banner">⚠️ {globalError}</div>}

          {/* Egzersiz blokları */}
          {scheduleExercises.map((ex, exIdx) => {
            const lookup = exerciseMap.get(ex.exerciseId)
            const setCount = Math.max(1, ex.sets)
            const setNumbers = Array.from({ length: setCount }, (_, i) => i + 1)

            return (
              <div key={`${ex.exerciseId}-${exIdx}`} className="workout-day-block">
                <div className="workout-day-title">
                  {lookup?.name ?? '(Bilinmeyen egzersiz)'}
                  {lookup?.muscleGroup && (
                    <span className="workout-day-subtitle">
                      {' · '}{MUSCLE_TR[lookup.muscleGroup] ?? lookup.muscleGroup}
                      {' · Plan: '}{ex.sets} set × {ex.reps}
                    </span>
                  )}
                </div>

                <div
                  className="workout-set-grid"
                  style={{ ['--past-cols' as string]: pastCols } as React.CSSProperties}
                >
                  {/* Header row */}
                  <div className="workout-set-header">Set</div>
                  {sortedSessions.map((s) => (
                    <div key={s.id} className="workout-set-header">
                      {formatShortDate(s.recordDate)}
                    </div>
                  ))}
                  <div className="workout-set-header today">Bugün</div>

                  {/* Set rows */}
                  {setNumbers.map((n) => {
                    const todayWeight = todayInput[ex.exerciseId]?.[n]?.weight ?? ''
                    const todayReps = todayInput[ex.exerciseId]?.[n]?.reps ?? ''
                    return (
                      <FragmentRow
                        key={`${ex.exerciseId}-set-${n}`}
                        setNumber={n}
                        pastSessions={sortedSessions}
                        exerciseId={ex.exerciseId}
                        todayWeight={todayWeight}
                        todayReps={todayReps}
                        onWeightChange={(v) => updateSet(ex.exerciseId, n, 'weight', v)}
                        onRepsChange={(v) => updateSet(ex.exerciseId, n, 'reps', v)}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}

          <div className="profile-edit-actions" style={{ marginTop: 16 }}>
            <button
              className="btn-secondary"
              onClick={() => navigate('/programs')}
              disabled={saving}
            >
              İptal
            </button>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving && <span className="loading-spinner" />}
              {saving ? 'Kaydediliyor…' : 'Bugünü Kaydet →'}
            </button>
          </div>
        </div>
        <BottomNav />
      </div>
    </div>
  )
}

interface FragmentRowProps {
  setNumber: number
  exerciseId: string
  pastSessions: WorkoutSessionDto[]
  todayWeight: string
  todayReps: string
  onWeightChange: (v: string) => void
  onRepsChange: (v: string) => void
}

function FragmentRow({
  setNumber,
  exerciseId,
  pastSessions,
  todayWeight,
  todayReps,
  onWeightChange,
  onRepsChange,
}: FragmentRowProps) {
  return (
    <>
      <div className="workout-set-cell setnum">{setNumber}</div>
      {pastSessions.map((s) => {
        const past = findPastSet(s, exerciseId, setNumber)
        return (
          <div key={s.id} className={`workout-set-cell past ${past ? '' : 'empty'}`}>
            {past ? `${past.weight}kg × ${past.reps}` : '—'}
          </div>
        )
      })}
      <div className="workout-set-cell today">
        <input
          className="workout-set-input"
          type="number"
          inputMode="decimal"
          min={0}
          step={0.5}
          placeholder="kg"
          value={todayWeight}
          onChange={(e) => onWeightChange(e.target.value)}
        />
        <span className="workout-set-x">×</span>
        <input
          className="workout-set-input"
          type="number"
          inputMode="numeric"
          min={1}
          placeholder="tekrar"
          value={todayReps}
          onChange={(e) => onRepsChange(e.target.value)}
        />
      </div>
    </>
  )
}
