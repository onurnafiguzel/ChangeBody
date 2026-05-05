import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ActiveProgramDetailDto } from '../../types/api.types'
import { getUserActiveProgram } from '../../services/users'
import { getStoredUser } from '../../services/auth'
import '../../styles/dashboard.css'

function formatDate(dateStr?: string) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function calcProgress(program: ActiveProgramDetailDto): number {
  if (!program.dailyExercises) return 0
  const completedDays = Object.keys(program.dailyExercises).length
  const totalDays = program.durationWeeks * 7
  return Math.min(100, Math.round((completedDays / totalDays) * 100))
}

export default function ActiveProgramCard() {
  const [program, setProgram] = useState<ActiveProgramDetailDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const user = getStoredUser()

  useEffect(() => {
    if (!user?.userId) return
    getUserActiveProgram(user.userId)
      .then(setProgram)
      .catch((err) => {
        if (err?.response?.status === 404) {
          setProgram(null)
        } else {
          setError('Program bilgisi yüklenemedi.')
        }
      })
      .finally(() => setLoading(false))
  }, [user?.userId])

  if (loading) return <div className="skeleton skeleton-card" />

  if (error) return (
    <div className="program-card">
      <div className="error-banner">⚠️ {error}</div>
    </div>
  )

  if (!program) return (
    <div className="program-card">
      <div className="program-card-empty">
        <span className="program-card-empty-icon">🏋️</span>
        <p className="program-card-empty-text">
          Henüz aktif bir antrenman programın yok.
        </p>
        <button className="program-card-empty-cta" onClick={() => navigate('/packages')}>
          Paket satın al ve başla →
        </button>
      </div>
    </div>
  )

  const progress = calcProgress(program)
  const difficultyClass = program.difficulty.toLowerCase()

  return (
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

      <span className={`program-difficulty-badge ${difficultyClass}`}>
        {program.difficulty === 'Beginner' ? 'Başlangıç' : program.difficulty === 'Intermediate' ? 'Orta' : 'İleri'}
      </span>

      <div className="program-progress-label">
        <span>İlerleme</span>
        <strong>{progress}%</strong>
      </div>
      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="program-card-footer">
        <span className="program-dates">
          {formatDate(program.startDate)} → {formatDate(program.endDate)}
        </span>
        <button className="btn-view-details" onClick={() => navigate(`/programs/${program.id}`)}>
          Detayları Gör
        </button>
      </div>
    </div>
  )
}
