import Header from '../../components/shared/Header'
import { Sidebar, BottomNav } from '../../components/shared/Navigation'
import ProfileSummary from '../../components/cards/ProfileSummary'
import UserPhotosGrid from '../../components/shared/UserPhotosGrid'
import { getStoredUser } from '../../services/auth'
import '../../styles/dashboard.css'

export default function ProfilePage() {
  const user = getStoredUser()
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header />
        <div className="page-content">
          <div className="section-header">
            <span className="section-title">Profilim</span>
          </div>
          <ProfileSummary />

          {user?.userId && (
            <>
              <div className="section-header">
                <span className="section-title">📷 Fotoğraflarım</span>
              </div>
              <UserPhotosGrid userId={user.userId} />
            </>
          )}
        </div>
        <BottomNav />
      </div>
    </div>
  )
}
