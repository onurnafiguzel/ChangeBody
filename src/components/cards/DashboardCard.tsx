import { useNavigate } from 'react-router-dom'
import '../../styles/dashboard.css'

interface DashboardCardProps {
  icon: string
  label: string
  path: string
}

export default function DashboardCard({ icon, label, path }: DashboardCardProps) {
  const navigate = useNavigate()
  return (
    <button className="quick-card" onClick={() => navigate(path)}>
      <span className="quick-card-icon">{icon}</span>
      <span className="quick-card-label">{label}</span>
    </button>
  )
}
