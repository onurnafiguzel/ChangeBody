import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import Dashboard from './pages/dashboard/Dashboard'
import ProfileCompletion from './pages/onboarding/ProfileCompletion'
import ExercisesPage from './pages/exercises/ExercisesPage'
import PackagesPage from './pages/packages/PackagesPage'
import { getStoredUser } from './services/auth'
import { getProfileCompletionStatus } from './services/users'

function AuthGate() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  if (getStoredUser()) return <Navigate to="/dashboard" replace />

  if (mode === 'login') {
    return <LoginPage onSwitchToSignup={() => setMode('signup')} />
  }
  return <SignupPage onSwitchToLogin={() => setMode('login')} />
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!getStoredUser()) return <Navigate to="/login" replace />
  return <>{children}</>
}

function ProfileGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'complete' | 'incomplete'>('loading')
  const user = getStoredUser()

  useEffect(() => {
    if (!user?.userId) return
    getProfileCompletionStatus(user.userId)
      .then((done) => setStatus(done ? 'complete' : 'incomplete'))
      .catch(() => setStatus('complete'))
  }, [user?.userId])

  if (status === 'loading') {
    return (
      <div className="page-loading">
        <span className="loading-spinner" />
      </div>
    )
  }
  if (status === 'incomplete') return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthGate />} />
        <Route path="/signup" element={<AuthGate />} />
        <Route
          path="/onboarding"
          element={
            <RequireAuth>
              <ProfileCompletion />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <ProfileGuard>
                <Dashboard />
              </ProfileGuard>
            </RequireAuth>
          }
        />
        <Route
          path="/exercises"
          element={
            <RequireAuth>
              <ProfileGuard>
                <ExercisesPage />
              </ProfileGuard>
            </RequireAuth>
          }
        />
        <Route
          path="/packages"
          element={
            <RequireAuth>
              <ProfileGuard>
                <PackagesPage />
              </ProfileGuard>
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
