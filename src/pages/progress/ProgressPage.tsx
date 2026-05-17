import { useEffect, useState } from 'react'
import Header from '../../components/shared/Header'
import { Sidebar, BottomNav } from '../../components/shared/Navigation'
import ProgressView from '../../components/progress/ProgressView'
import { getStoredUser } from '../../services/auth'
import { getUserProfile } from '../../services/users'
import type { UserDto } from '../../types/api.types'
import '../../styles/dashboard.css'

export default function ProgressPage() {
  const user = getStoredUser()
  const [profile, setProfile] = useState<UserDto | null>(null)

  useEffect(() => {
    if (!user?.userId) return
    getUserProfile(user.userId).then(setProfile).catch(() => {})
  }, [user?.userId])

  if (!user?.userId) return null

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header />
        <div className="page-content">
          <div className="section-header">
            <span className="section-title">📈 Gelişimim</span>
          </div>
          <ProgressView userId={user.userId} canEdit={true} gender={profile?.gender ?? null} />
        </div>
        <BottomNav />
      </div>
    </div>
  )
}
