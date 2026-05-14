import type { UserDto } from '../../types/api.types'

const GENDER_TR: Record<string, string> = { Male: 'Erkek', Female: 'Kadın', Other: 'Diğer' }
const LEVEL_TR: Record<string, string> = {
  Beginner: 'Başlangıç',
  Intermediate: 'Orta Seviye',
  Advanced: 'İleri Seviye',
}

function calcBMI(h?: number | null, w?: number | null): number | null {
  if (!h || !w || h <= 0 || w <= 0) return null
  return Math.round((w / ((h / 100) ** 2)) * 10) / 10
}

interface Props {
  user: UserDto
}

export default function AthleteProfileSummary({ user }: Props) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
  const bmi = calcBMI(user.height, user.weight)
  const h = user.healthProfile

  // Sağlık bloğunda render edilecek bir veri var mı?
  const hasHealthData = !!(
    h && (
      (h.dailyWorkLifestyle && h.dailyWorkLifestyle.trim()) ||
      h.gymDaysPerWeek != null ||
      (h.healthConditions && h.healthConditions.trim()) ||
      (h.foodAllergies && h.foodAllergies.trim()) ||
      h.wantsSupplementSupport != null
    )
  )

  return (
    <div className="athlete-summary">
      <div className="athlete-summary-head">
        <div>
          <div className="athlete-summary-name">👤 {fullName}</div>
          <div className="athlete-summary-email">{user.email}</div>
        </div>
        <div className="athlete-summary-tag">📋 Sporcu Bilgileri</div>
      </div>

      <div className="athlete-summary-stats">
        {user.age != null && <span>🎂 {user.age} yaş</span>}
        {user.gender && <span>⚧ {GENDER_TR[user.gender] ?? user.gender}</span>}
        {user.height != null && <span>📏 {user.height} cm</span>}
        {user.weight != null && <span>⚖️ {user.weight} kg</span>}
        {bmi != null && <span>📊 BMI {bmi}</span>}
        {user.fitnessGoal && <span>🎯 {user.fitnessGoal}</span>}
        {user.fitnessLevel && <span>💪 {LEVEL_TR[user.fitnessLevel] ?? user.fitnessLevel}</span>}
      </div>

      {hasHealthData && h && (
        <div className="athlete-summary-health">
          <div className="athlete-summary-health-title">Yaşam Tarzı & Sağlık</div>

          {h.dailyWorkLifestyle && h.dailyWorkLifestyle.trim() && (
            <div className="athlete-summary-health-row">
              <span className="label">💼 Günlük iş yaşantısı:</span>
              <span className="value">{h.dailyWorkLifestyle}</span>
            </div>
          )}
          {h.gymDaysPerWeek != null && (
            <div className="athlete-summary-health-row">
              <span className="label">🏋️ Gym günü:</span>
              <span className="value">{h.gymDaysPerWeek} gün/hafta</span>
            </div>
          )}
          {h.healthConditions && h.healthConditions.trim() && (
            <div className="athlete-summary-health-row">
              <span className="label">⚕️ Sağlık problemleri:</span>
              <span className="value">{h.healthConditions}</span>
            </div>
          )}
          {h.foodAllergies && h.foodAllergies.trim() && (
            <div className="athlete-summary-health-row">
              <span className="label">🥜 Besin alerjileri:</span>
              <span className="value">{h.foodAllergies}</span>
            </div>
          )}
          {h.wantsSupplementSupport != null && (
            <div className="athlete-summary-health-row">
              <span className="label">💊 Supplement desteği:</span>
              <span className="value">
                {h.wantsSupplementSupport
                  ? (h.supplementInterest && h.supplementInterest.trim()
                      ? `Evet · ${h.supplementInterest}`
                      : 'Evet')
                  : 'Hayır'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
