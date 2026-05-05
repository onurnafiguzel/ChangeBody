import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredUser, logout } from '../services/auth'

export default function DashboardPage() {
  const navigate = useNavigate()
  const user = getStoredUser()

  useEffect(() => {
    if (!user) navigate('/login')
  }, [user, navigate])

  if (!user) return null

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, system-ui, sans-serif',
      gap: '1rem',
    }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Hoş geldin 👋</h1>
      <p style={{ color: '#888' }}>{user.email} — {user.role}</p>
      <button
        onClick={logout}
        style={{
          marginTop: '1rem',
          background: '#f97316',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '0.6rem 1.5rem',
          fontWeight: 700,
          cursor: 'pointer',
          fontSize: '0.9rem',
        }}
      >
        Çıkış Yap
      </button>
    </div>
  )
}
