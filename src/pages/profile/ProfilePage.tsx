import Header from '../../components/shared/Header'
import { Sidebar, BottomNav } from '../../components/shared/Navigation'
import ProfileSummary from '../../components/cards/ProfileSummary'
import '../../styles/dashboard.css'

export default function ProfilePage() {
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
        </div>
        <BottomNav />
      </div>
    </div>
  )
}
