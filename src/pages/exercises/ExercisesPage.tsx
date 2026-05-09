import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/shared/Header'
import { Sidebar, BottomNav } from '../../components/shared/Navigation'
import ExerciseCard from '../../components/exercises/ExerciseCard'
import ExerciseFilters, { type FilterState } from '../../components/exercises/ExerciseFilters'
import { getExercises, getMuscleGroups } from '../../services/exercises'
import { getStoredUser } from '../../services/auth'
import type { ExerciseDto } from '../../types/api.types'
import { MUSCLE_TR, DIFFICULTY_TR, MUSCLE_ICONS } from '../../components/exercises/ExerciseCard'
import '../../styles/dashboard.css'
import '../../styles/exercises.css'

const PAGE_SIZE = 20

export default function ExercisesPage() {
  const navigate = useNavigate()
  const user = getStoredUser()

  const [exercises, setExercises] = useState<ExerciseDto[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<ExerciseDto | null>(null)

  const [filters, setFilters] = useState<FilterState>({
    search: '', muscleGroup: '', difficultyLevel: '',
  })
  const [muscleGroups, setMuscleGroups] = useState<string[]>([])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mount'ta TEK istek — user her render'da yeni object literal döndüğü için [user] dep'i sonsuz tekrara yol açıyordu.
  useEffect(() => {
    if (!user) { navigate('/login'); return }
    getMuscleGroups().then(setMuscleGroups).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Tek useEffect: page veya filter değişince debounce'lu fetch (mount dahil yalnızca 1 istek).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchExercises(page)
    }, filters.search ? 400 : 0)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters.search, filters.muscleGroup, filters.difficultyLevel])

  async function fetchExercises(p: number) {
    setLoading(true)
    setError(null)
    try {
      const result = await getExercises({
        page: p,
        pageSize: PAGE_SIZE,
        muscleGroup: filters.muscleGroup || undefined,
        difficultyLevel: filters.difficultyLevel || undefined,
        search: filters.search || undefined,
      })
      setExercises(result.exercises)
      setTotal(result.total)
      setTotalPages(result.totalPages)
    } catch {
      setError('Egzersizler yüklenemedi. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  function handleFilterChange(f: FilterState) {
    setFilters(f)
    setPage(1) // Filter değişince ilk sayfaya dön (page === 1 ise React state set'i no-op'tur, ekstra istek yok)
  }

  if (!user) return null

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header />
        <div className="page-content">
          <div className="section-header" style={{ marginBottom: 16 }}>
            <span className="section-title">Egzersizler</span>
            {!loading && <span className="results-info"><strong>{total}</strong> egzersiz</span>}
          </div>

          <ExerciseFilters filters={filters} muscleGroups={muscleGroups} onChange={handleFilterChange} />

          {error && <div className="error-banner">⚠️ {error}</div>}

          <div className="exercise-grid">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="exercise-card-skeleton" />
                ))
              : exercises.length === 0
              ? (
                <div className="empty-state">
                  <span className="empty-state-icon">🔍</span>
                  <p className="empty-state-text">Egzersiz bulunamadı</p>
                  <p className="empty-state-sub">Filtrelerinizi değiştirmeyi deneyin</p>
                </div>
              )
              : exercises.map((ex) => (
                  <ExerciseCard key={ex.id} exercise={ex} onClick={setSelected} />
                ))
            }
          </div>

          {!loading && totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn-page"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Önceki
              </button>
              <span className="pagination-info">{page} / {totalPages}</span>
              <button
                className="btn-page"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Sonraki →
              </button>
            </div>
          )}
        </div>
        <BottomNav />
      </div>

      {/* Detail Modal */}
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
