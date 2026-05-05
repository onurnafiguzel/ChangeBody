import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProfileCompletionStatus } from '../../services/users'
import { getStoredUser } from '../../services/auth'
import '../../styles/dashboard.css'

export default function ProfileCompletionPrompt() {
  const [isComplete, setIsComplete] = useState(true)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const user = getStoredUser()

  useEffect(() => {
    if (!user?.userId) {
      setLoading(false)
      return
    }

    getProfileCompletionStatus(user.userId)
      .then((isCompleted) => {
        setIsComplete(isCompleted)
      })
      .catch(() => {
        setIsComplete(true)
      })
      .finally(() => setLoading(false))
  }, [user?.userId])

  if (loading || isComplete) return null

  return (
    <div className="profile-completion-banner">
      <div className="profile-completion-icon">👤</div>
      <div className="profile-completion-content">
        <div className="profile-completion-title">Profilini Tamamla</div>
        <div className="profile-completion-desc">
          Antrenman programına başlamadan önce kişisel bilgilerini ve fitness hedeflerini belirtmek gerekli.
        </div>
      </div>
      <button
        className="profile-completion-btn"
        onClick={() => navigate('/onboarding')}
      >
        Tamamla →
      </button>
    </div>
  )
}
