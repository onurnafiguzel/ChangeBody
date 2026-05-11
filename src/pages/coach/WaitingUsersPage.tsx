import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/shared/Header'
import { Sidebar, BottomNav } from '../../components/shared/Navigation'
import WaitingUserCard from '../../components/cards/WaitingUserCard'
import { getWaitingUsers } from '../../services/waitingUsers'
import { parseApiError } from '../../utils/errorHandler'
import type { UserAssignmentDto } from '../../types/api.types'
import '../../styles/dashboard.css'

type GenderFilter = '' | 'Male' | 'Female' | 'Other'
type LevelFilter = '' | 'Beginner' | 'Intermediate' | 'Advanced'

export default function WaitingUsersPage() {
  const navigate = useNavigate()

  const [users, setUsers] = useState<UserAssignmentDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [gender, setGender] = useState<GenderFilter>('')
  const [level, setLevel] = useState<LevelFilter>('')

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    setLoading(true)
    setError(null)
    try {
      const data = await getWaitingUsers()
      setUsers(data)
    } catch (err) {
      setError(parseApiError(err, 'Bekleyen sporcular yüklenemedi.'))
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR')
    return users.filter((u) => {
      if (gender && u.gender !== gender) return false
      if (level && u.fitnessLevel !== level) return false
      if (q) {
        const fullName = `${u.firstName ?? ''} ${u.lastName ?? ''} ${u.email ?? ''}`.toLocaleLowerCase('tr-TR')
        if (!fullName.includes(q)) return false
      }
      return true
    })
  }, [users, search, gender, level])

  const hasFilters = !!search || !!gender || !!level

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header />
        <div className="page-content">
          <div className="section-header" style={{ marginBottom: 16 }}>
            <button className="btn-back" onClick={() => navigate('/coach/dashboard')}>← Geri</button>
            <span className="section-title">Bekleyen Sporcular {!loading && `(${filtered.length})`}</span>
          </div>

          {/* Filters */}
          <div className="filter-bar">
            <div className="filter-search">
              <span className="filter-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Ad veya e-posta ara…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className={`filter-select ${gender ? 'active' : ''}`}
              value={gender}
              onChange={(e) => setGender(e.target.value as GenderFilter)}
            >
              <option value="">Tüm Cinsiyet</option>
              <option value="Male">Erkek</option>
              <option value="Female">Kadın</option>
              <option value="Other">Diğer</option>
            </select>
            <select
              className={`filter-select ${level ? 'active' : ''}`}
              value={level}
              onChange={(e) => setLevel(e.target.value as LevelFilter)}
            >
              <option value="">Tüm Seviyeler</option>
              <option value="Beginner">Başlangıç</option>
              <option value="Intermediate">Orta</option>
              <option value="Advanced">İleri</option>
            </select>
            {hasFilters && (
              <button
                className="btn-clear-filters"
                onClick={() => { setSearch(''); setGender(''); setLevel('') }}
              >
                ✕ Temizle
              </button>
            )}
          </div>

          {error && (
            <div className="error-banner">
              ⚠️ {error}
              <button className="btn-retry" onClick={fetchUsers} style={{ marginLeft: 12 }}>Tekrar Dene</button>
            </div>
          )}

          {loading ? (
            <div className="card-list">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton skeleton-card" style={{ height: 140 }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">⏳</span>
              <p className="empty-state-text">
                {hasFilters ? 'Filtrelere uyan sporcu yok' : 'Şu an bekleyen sporcu yok'}
              </p>
              {hasFilters && (
                <p className="empty-state-sub">Filtreleri değiştirmeyi veya temizlemeyi deneyin.</p>
              )}
            </div>
          ) : (
            <div className="card-list">
              {filtered.map((u) => (
                <WaitingUserCard
                  key={u.id}
                  user={u}
                  onSelect={(id) => navigate(`/coach/users/${id}`)}
                  onPrimaryAction={(id) => navigate(`/coach/programs/new/${id}`)}
                  primaryLabel="Programa Başla →"
                />
              ))}
            </div>
          )}
        </div>
        <BottomNav />
      </div>
    </div>
  )
}
