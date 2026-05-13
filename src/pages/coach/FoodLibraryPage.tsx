import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/shared/Header'
import { Sidebar, BottomNav } from '../../components/shared/Navigation'
import FoodFormModal from '../../components/foods/FoodFormModal'
import { deleteFood, listFoods } from '../../services/foods'
import { parseApiError } from '../../utils/errorHandler'
import { useToast } from '../../components/shared/Toast'
import type { FoodDto, FoodUnit } from '../../types/api.types'
import '../../styles/dashboard.css'

type UnitFilter = '' | FoodUnit

function fmt(n: number | null | undefined): string {
  if (n == null) return '—'
  return n >= 100 ? Math.round(n).toString() : (Math.round(n * 10) / 10).toString()
}

export default function FoodLibraryPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [foods, setFoods] = useState<FoodDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [unitFilter, setUnitFilter] = useState<UnitFilter>('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<FoodDto | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchFoods()
  }, [])

  async function fetchFoods() {
    setLoading(true)
    setError(null)
    try {
      const list = await listFoods()
      setFoods(list.filter((f) => f.isActive))
    } catch (err) {
      setError(parseApiError(err, 'Besinler yüklenemedi.'))
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR')
    return foods.filter((f) => {
      if (unitFilter && f.unit !== unitFilter) return false
      if (q && !f.name.toLocaleLowerCase('tr-TR').includes(q)) return false
      return true
    })
  }, [foods, search, unitFilter])

  function openCreate() {
    setEditing(null)
    setModalOpen(true)
  }
  function openEdit(food: FoodDto) {
    setEditing(food)
    setModalOpen(true)
  }
  function handleSaved() {
    setModalOpen(false)
    setEditing(null)
    fetchFoods()
  }

  async function handleDelete(food: FoodDto) {
    if (!confirm(`"${food.name}" silinsin mi? (Pasifleştirilir)`)) return
    setDeletingId(food.id)
    try {
      await deleteFood(food.id)
      toast.success('Besin silindi.')
      setFoods((prev) => prev.filter((f) => f.id !== food.id))
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
              Besin Kütüphanesi {!loading && `(${filtered.length})`}
            </span>
            <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={openCreate}>
              + Yeni Besin
            </button>
          </div>

          <div className="filter-bar">
            <div className="filter-search">
              <span className="filter-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Besin ara…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className={`filter-select ${unitFilter ? 'active' : ''}`}
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value as UnitFilter)}
            >
              <option value="">Tüm Birimler</option>
              <option value="Grams">Gram</option>
              <option value="Piece">Adet</option>
            </select>
          </div>

          {error && (
            <div className="error-banner">
              ⚠️ {error}
              <button className="btn-retry" onClick={fetchFoods} style={{ marginLeft: 12 }}>Tekrar Dene</button>
            </div>
          )}

          {loading ? (
            <div className="foods-grid">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="skeleton" style={{ height: 140, borderRadius: 12 }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">🥗</span>
              <p className="empty-state-text">
                {search || unitFilter ? 'Filtrelere uyan besin yok' : 'Henüz besin yok'}
              </p>
              {!search && !unitFilter && (
                <p className="empty-state-sub">Sağ üstteki "+ Yeni Besin" ile başlayın.</p>
              )}
            </div>
          ) : (
            <div className="foods-grid">
              {filtered.map((f) => {
                const isPiece = f.unit === 'Piece'
                const kcal = isPiece ? f.caloriesPerPiece : f.caloriesPer100g
                const p = isPiece ? f.proteinPerPiece : f.proteinPer100g
                const c = isPiece ? f.carbsPerPiece : f.carbsPer100g
                const fat = isPiece ? f.fatPerPiece : f.fatPer100g
                return (
                  <div key={f.id} className="food-pool-card" style={{ cursor: 'default' }}>
                    <div className="food-pool-text">
                      <div className="food-pool-name">
                        {f.name}
                        {isPiece && <span className="food-pool-unit-badge">adet</span>}
                      </div>
                      <div className="food-pool-macros">
                        <span className="macro-kcal">{fmt(kcal)} kcal</span>
                        <span className="macro-p">{fmt(p)}P</span>
                        <span className="macro-c">{fmt(c)}C</span>
                        <span className="macro-f">{fmt(fat)}F</span>
                      </div>
                      <div className="food-pool-base">
                        {isPiece ? `/ ${f.pieceLabel ?? '1 adet'}` : '/ 100 g'}
                        {isPiece && f.gramsPerPiece != null && <> · ~{fmt(f.gramsPerPiece)} g</>}
                      </div>
                      <div className="food-card-actions">
                        <button
                          className="food-card-action"
                          onClick={() => openEdit(f)}
                          aria-label={`${f.name} düzenle`}
                        >
                          ✎ Düzenle
                        </button>
                        <button
                          className="food-card-action danger"
                          onClick={() => handleDelete(f)}
                          disabled={deletingId === f.id}
                          aria-label={`${f.name} sil`}
                        >
                          🗑 Sil
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <BottomNav />
      </div>

      <FoodFormModal
        open={modalOpen}
        food={editing}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  )
}
