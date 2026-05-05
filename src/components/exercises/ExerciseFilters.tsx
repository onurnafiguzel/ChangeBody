import { DIFFICULTY_LEVELS } from '../../types/api.types'
import { MUSCLE_TR, DIFFICULTY_TR } from './ExerciseCard'
import '../../styles/exercises.css'

export interface FilterState {
  search: string
  muscleGroup: string
  difficultyLevel: string
}

interface Props {
  filters: FilterState
  muscleGroups: string[]
  onChange: (filters: FilterState) => void
}

export default function ExerciseFilters({ filters, muscleGroups, onChange }: Props) {
  const hasActive = filters.muscleGroup !== '' || filters.difficultyLevel !== '' || filters.search !== ''

  return (
    <div className="filter-bar">
      {/* Search */}
      <div className="filter-search">
        <span className="filter-search-icon">🔍</span>
        <input
          type="text"
          placeholder="Egzersiz ara..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </div>

      {/* Muscle Group */}
      <select
        className={`filter-select ${filters.muscleGroup ? 'active' : ''}`}
        value={filters.muscleGroup}
        onChange={(e) => onChange({ ...filters, muscleGroup: e.target.value, page: 1 } as FilterState & { page: number })}
      >
        <option value="">Tüm Kaslar</option>
        {muscleGroups.map((m) => (
          <option key={m} value={m}>{MUSCLE_TR[m] ?? m}</option>
        ))}
      </select>

      {/* Difficulty */}
      <select
        className={`filter-select ${filters.difficultyLevel ? 'active' : ''}`}
        value={filters.difficultyLevel}
        onChange={(e) => onChange({ ...filters, difficultyLevel: e.target.value, page: 1 } as FilterState & { page: number })}
      >
        <option value="">Tüm Seviyeler</option>
        {DIFFICULTY_LEVELS.map((d) => (
          <option key={d} value={d}>{DIFFICULTY_TR[d] ?? d}</option>
        ))}
      </select>

      {/* Clear */}
      {hasActive && (
        <button
          className="btn-clear-filters"
          onClick={() => onChange({ search: '', muscleGroup: '', difficultyLevel: '' })}
        >
          ✕ Temizle
        </button>
      )}
    </div>
  )
}
