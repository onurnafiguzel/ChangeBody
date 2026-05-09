import Header from '../../components/shared/Header'
import { Sidebar, BottomNav } from '../../components/shared/Navigation'
import ActiveProgramCard from '../../components/cards/ActiveProgramCard'
import '../../styles/dashboard.css'

export default function ProgramsPage() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header />
        <div className="page-content">
          <div className="section-header">
            <span className="section-title">Programlarım</span>
          </div>
          <ActiveProgramCard />
        </div>
        <BottomNav />
      </div>
    </div>
  )
}
