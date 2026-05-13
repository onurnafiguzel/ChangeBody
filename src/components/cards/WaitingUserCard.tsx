import type { UserAssignmentDto } from '../../types/api.types'
import '../../styles/dashboard.css'

const GENDER_TR: Record<string, string> = { Male: 'Erkek', Female: 'Kadın', Other: 'Diğer' }
const LEVEL_TR: Record<string, string> = { Beginner: 'Başlangıç', Intermediate: 'Orta', Advanced: 'İleri' }

function relativeTime(iso?: string): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'şimdi'
  if (min < 60) return `${min} dk önce`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} saat önce`
  const day = Math.floor(hr / 24)
  return `${day} gün önce`
}

interface Props {
  user: UserAssignmentDto
  onSelect: (userId: string) => void
  // Yeni iki-aksiyon API
  onStartTraining?: (userId: string) => void
  onStartNutrition?: (userId: string) => void
  // Eski tek-aksiyon API (geriye dönük uyumluluk)
  onPrimaryAction?: (userId: string) => void
  primaryLabel?: string
  compact?: boolean
}

export default function WaitingUserCard({
  user,
  onSelect,
  onStartTraining,
  onStartNutrition,
  onPrimaryAction,
  primaryLabel,
  compact,
}: Props) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
  const hasTraining = user.hasTrainingProgram === true
  const hasNutrition = user.hasNutritionPlan === true
  const useDualButtons = !!(onStartTraining || onStartNutrition)

  return (
    <div className={`waiting-user-card ${compact ? 'compact' : ''}`}>
      <button className="waiting-user-card-body" onClick={() => onSelect(user.id)}>
        <div className="waiting-user-card-header">
          <span className="waiting-user-card-icon">👤</span>
          <div className="waiting-user-card-name">{fullName}</div>
          <span className="waiting-user-card-time">{relativeTime(user.createdAt)}</span>
        </div>

        <div className="waiting-user-card-meta">
          {user.age && <span>{user.age} yaş</span>}
          {user.gender && <span>{GENDER_TR[user.gender] ?? user.gender}</span>}
          {user.height && <span>{user.height} cm</span>}
          {user.weight && <span>{user.weight} kg</span>}
        </div>

        {!compact && (
          <div className="waiting-user-card-tags">
            {user.fitnessGoal && <span className="badge badge-muscle">🎯 {user.fitnessGoal}</span>}
            {user.fitnessLevel && (
              <span className={`badge badge-${user.fitnessLevel.toLowerCase()}`}>
                💪 {LEVEL_TR[user.fitnessLevel] ?? user.fitnessLevel}
              </span>
            )}
            {useDualButtons && (user.hasTrainingProgram !== undefined || user.hasNutritionPlan !== undefined) && (
              <>
                {!hasTraining && <span className="badge badge-waiting">🏋️ Antrenman bekliyor</span>}
                {!hasNutrition && <span className="badge badge-waiting">🥗 Beslenme bekliyor</span>}
              </>
            )}
          </div>
        )}
      </button>

      {!compact && useDualButtons && (
        <div className="waiting-user-card-actions dual">
          {hasTraining ? (
            <button className="btn-assigned" disabled>🏋️ Antrenman Atandı ✓</button>
          ) : (
            <button
              className="btn-primary"
              onClick={() => onStartTraining?.(user.id)}
              disabled={!onStartTraining}
            >
              🏋️ Antrenmana Başla →
            </button>
          )}
          {hasNutrition ? (
            <button className="btn-assigned" disabled>🥗 Beslenme Atandı ✓</button>
          ) : (
            <button
              className="btn-primary"
              onClick={() => onStartNutrition?.(user.id)}
              disabled={!onStartNutrition}
            >
              🥗 Beslenmeye Başla →
            </button>
          )}
        </div>
      )}

      {!compact && !useDualButtons && onPrimaryAction && (
        <div className="waiting-user-card-actions">
          <button className="btn-primary" onClick={() => onPrimaryAction(user.id)}>
            {primaryLabel ?? 'Programa Başla →'}
          </button>
        </div>
      )}
    </div>
  )
}
