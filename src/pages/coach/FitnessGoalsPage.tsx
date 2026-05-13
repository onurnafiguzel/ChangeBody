import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/shared/Header'
import { Sidebar, BottomNav } from '../../components/shared/Navigation'
import FitnessGoalFormModal from '../../components/fitnessGoals/FitnessGoalFormModal'
import { deleteFitnessGoal, listFitnessGoals } from '../../services/fitnessGoals'
import { parseApiError } from '../../utils/errorHandler'
import { useToast } from '../../components/shared/Toast'
import type { FitnessGoalDto } from '../../types/api.types'
import '../../styles/dashboard.css'

export default function FitnessGoalsPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [goals, setGoals] = useState<FitnessGoalDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<FitnessGoalDto | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchGoals()
  }, [])

  async function fetchGoals() {
    setLoading(true)
    setError(null)
    try {
      const list = await listFitnessGoals()
      setGoals(list.filter((g) => g.isActive))
    } catch (err) {
      setError(parseApiError(err, 'Hedefler yüklenemedi.'))
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR')
    if (!q) return goals
    return goals.filter((g) => g.name.toLocaleLowerCase('tr-TR').includes(q))
  }, [goals, search])

  function openCreate() {
    setEditing(null)
    setModalOpen(true)
  }
  function openEdit(goal: FitnessGoalDto) {
    setEditing(goal)
    setModalOpen(true)
  }
  function handleSaved() {
    setModalOpen(false)
    setEditing(null)
    fetchGoals()
  }

  async function handleDelete(goal: FitnessGoalDto) {
    if (!confirm(`"${goal.name}" silinsin mi? (Pasifleştirilir)`)) return
    setDeletingId(goal.id)
    try {
      await deleteFitnessGoal(goal.id)
      toast.success('Hedef silindi.')
      setGoals((prev) => prev.filter((g) => g.id !== goal.id))
    } catch (err) {
      toast.error(parseApiError(err, 'Silinemedi.'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header />
        <div className="page-content">
          <div className="section-header" style={{ marginBottom: 16 }}>
            <button className="btn-back" onClick={() => navigate('/coach/dashboard')}>← Geri</button>
            <span className="section-title">
              Hedefler {!loading && `(${filtered.length})`}
            </span>
            <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={openCreate}>
              + Yeni Hedef
            </button>
          </div>

          <div className="filter-bar">
            <div className="filter-search">
              <span className="filter-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Hedef ara…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="error-banner">
              ⚠️ {error}
              <button className="btn-retry" onClick={fetchGoals} style={{ marginLeft: 12 }}>Tekrar Dene</button>
            </div>
          )}

          {loading ? (
            <div className="foods-grid">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton" style={{ height: 140, borderRadius: 12 }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">🎯</span>
              <p className="empty-state-text">
                {search ? 'Filtrelere uyan hedef yok' : 'Henüz hedef yok'}
              </p>
              {!search && (
                <p className="empty-state-sub">Sağ üstteki "+ Yeni Hedef" ile başlayın.</p>
              )}
            </div>
          ) : (
            <div className="foods-grid">
              {filtered.map((g) => (
                <div key={g.id} className="food-pool-card" style={{ cursor: 'default' }}>
                  <div className="food-pool-text">
                    <div className="food-pool-name">🎯 {g.name}</div>
                    {g.description && (
                      <div className="goal-description">{g.description}</div>
                    )}
                    <div className="food-card-actions">
                      <button
                        className="food-card-action"
                        onClick={() => openEdit(g)}
                        aria-label={`${g.name} düzenle`}
                      >
                        ✎ Düzenle
                      </button>
                      <button
                        className="food-card-action danger"
                        onClick={() => handleDelete(g)}
                        disabled={deletingId === g.id}
                        aria-label={`${g.name} sil`}
                      >
                        🗑 Sil
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <BottomNav />
      </div>

      <FitnessGoalFormModal
        open={modalOpen}
        goal={editing}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  )
}
