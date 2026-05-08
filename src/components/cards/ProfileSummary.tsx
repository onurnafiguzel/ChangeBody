import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserProfile } from '../../services/users'
import { getStoredUser } from '../../services/auth'
import type { UserDto } from '../../types/api.types'
import '../../styles/dashboard.css'

const GENDER_TR: Record<string, string> = {
  'Male': 'Erkek',
  'Female': 'Kadın',
  'Other': 'Diğer',
}

const FITNESS_LEVEL_TR: Record<string, string> = {
  'Beginner': 'Başlangıç',
  'Intermediate': 'Orta Seviye',
  'Advanced': 'İleri Seviye',
}

export default function ProfileSummary() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const [profile, setProfile] = useState<UserDto | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      if (!user?.userId) return
      try {
        const data = await getUserProfile(user.userId)
        setProfile(data)
      } catch {
        // Fail silently
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [user?.userId])

  if (loading) {
    return (
      <div className="profile-summary-card">
        <div className="skeleton" style={{ height: '120px' }} />
      </div>
    )
  }

  if (!profile) return null

  const isComplete = profile.firstName && profile.lastName && profile.age && profile.height &&
                     profile.weight && profile.gender && profile.fitnessLevel && profile.fitnessGoal
  const bmi = profile.height && profile.weight
    ? Math.round((profile.weight / ((profile.height / 100) ** 2)) * 10) / 10
    : null

  return (
    <>
      {!isComplete && (
        <div className="profile-completion-banner">
          <div className="profile-completion-icon">👤</div>
          <div className="profile-completion-content">
            <div className="profile-completion-title">Profilini Tamamla</div>
            <div className="profile-completion-desc">
              Antrenman programına başlamadan önce tüm bilgilerini doldurmak gerekli.
            </div>
          </div>
          <button
            className="profile-completion-btn"
            onClick={() => navigate('/onboarding')}
          >
            Tamamla →
          </button>
        </div>
      )}
    <div className="profile-summary-card">
      <div className="profile-summary-header">
        <div className="profile-summary-title">Bilgilerim</div>
        <button
          className="profile-summary-edit"
          onClick={() => navigate('/onboarding')}
          title="Profili Düzenle"
        >
          ✏️
        </button>
      </div>

      <div className="profile-summary-grid">
        {profile.firstName && profile.lastName && (
          <div className="profile-summary-item">
            <span className="profile-summary-label">Ad Soyad</span>
            <span className="profile-summary-value">{profile.firstName} {profile.lastName}</span>
          </div>
        )}

        {profile.age && (
          <div className="profile-summary-item">
            <span className="profile-summary-label">Yaş</span>
            <span className="profile-summary-value">{profile.age}</span>
          </div>
        )}

        {profile.gender && (
          <div className="profile-summary-item">
            <span className="profile-summary-label">Cinsiyet</span>
            <span className="profile-summary-value">{GENDER_TR[profile.gender]}</span>
          </div>
        )}

        {profile.height && (
          <div className="profile-summary-item">
            <span className="profile-summary-label">Boy</span>
            <span className="profile-summary-value">{profile.height} cm</span>
          </div>
        )}

        {profile.weight && (
          <div className="profile-summary-item">
            <span className="profile-summary-label">Kilo</span>
            <span className="profile-summary-value">{profile.weight} kg</span>
          </div>
        )}

        {bmi && (
          <div className="profile-summary-item">
            <span className="profile-summary-label">BMI</span>
            <span className="profile-summary-value">{bmi}</span>
          </div>
        )}

        {profile.fitnessLevel && (
          <div className="profile-summary-item">
            <span className="profile-summary-label">Fitness Seviyesi</span>
            <span className="profile-summary-value">{FITNESS_LEVEL_TR[profile.fitnessLevel]}</span>
          </div>
        )}

        {profile.fitnessGoal && (
          <div className="profile-summary-item full">
            <span className="profile-summary-label">Fitness Hedefi</span>
            <span className="profile-summary-value">{profile.fitnessGoal}</span>
          </div>
        )}
      </div>
    </div>
    </>
  )
}
