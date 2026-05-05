import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/shared/Header'
import { Sidebar, BottomNav } from '../../components/shared/Navigation'
import ActiveProgramCard from '../../components/cards/ActiveProgramCard'
import ProfileCompletionPrompt from '../../components/cards/ProfileCompletionPrompt'
import DashboardCard from '../../components/cards/DashboardCard'
import { getStoredUser } from '../../services/auth'
import '../../styles/dashboard.css'

const QUICK_CARDS = [
  { icon: '💪', label: 'Egzersizler', path: '/exercises' },
  { icon: '📦', label: 'Paketler', path: '/packages' },
  { icon: '📋', label: 'Programlar', path: '/programs' },
  { icon: '👤', label: 'Profilim', path: '/profile' },
]

const MOTIVATIONAL_QUOTES = [
  'Her antrenman, dünün senden daha güçlü olduğuna dair bir kanıt.',
  'Limitlerin senin kararın.',
  'Bugün zor, yarın alışkanlık.',
  'Disiplin, motivasyonun bittiği yerde başlar.',
]

export default function Dashboard() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const quote = MOTIVATIONAL_QUOTES[new Date().getDay() % MOTIVATIONAL_QUOTES.length]

  useEffect(() => {
    if (!user) navigate('/login')
  }, [user, navigate])

  if (!user) return null

  const firstName = user.email.split('@')[0]

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header />
        <div className="page-content">
          {/* Welcome Banner */}
          <div className="welcome-banner">
            <div className="welcome-banner-label">Hoş Geldin</div>
            <div className="welcome-banner-title">Merhaba, {firstName} 👋</div>
            <div className="welcome-banner-sub">{quote}</div>
          </div>

          {/* Profile Completion Prompt */}
          <ProfileCompletionPrompt />

          {/* Active Program */}
          <div className="section-header">
            <span className="section-title">Aktif Program</span>
          </div>
          <ActiveProgramCard />

          {/* Quick Access */}
          <div className="section-header">
            <span className="section-title">Hızlı Erişim</span>
          </div>
          <div className="quick-grid">
            {QUICK_CARDS.map((card) => (
              <DashboardCard key={card.path} icon={card.icon} label={card.label} path={card.path} />
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    </div>
  )
}
