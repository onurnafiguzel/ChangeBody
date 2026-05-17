import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import Dashboard from './pages/dashboard/Dashboard'
import ProfileCompletion from './pages/onboarding/ProfileCompletion'
import ExercisesPage from './pages/exercises/ExercisesPage'
import PackagesPage from './pages/packages/PackagesPage'
import ProgramsPage from './pages/programs/ProgramsPage'
import WorkoutSessionPage from './pages/programs/WorkoutSessionPage'
import ProfilePage from './pages/profile/ProfilePage'
import ProfileEditPage from './pages/profile/ProfileEditPage'
import ProgressPage from './pages/progress/ProgressPage'
import CoachDashboard from './pages/coach/CoachDashboard'
import WaitingUsersPage from './pages/coach/WaitingUsersPage'
import UserDetailForCoach from './pages/coach/UserDetailForCoach'
import MyProgramsPage from './pages/coach/MyProgramsPage'
import ProgramDetailPage from './pages/coach/ProgramDetailPage'
import CreateProgramPage from './pages/coach/CreateProgramPage'
import ScheduleBuilderPage from './pages/coach/ScheduleBuilderPage'
import CreateNutritionPlanPage from './pages/coach/CreateNutritionPlanPage'
import MealBuilderPage from './pages/coach/MealBuilderPage'
import FoodLibraryPage from './pages/coach/FoodLibraryPage'
import FitnessGoalsPage from './pages/coach/FitnessGoalsPage'
import CoachProfilePage from './pages/coach/CoachProfilePage'
import CoachProfileEditPage from './pages/coach/CoachProfileEditPage'
import AccessDenied from './pages/AccessDenied'
import { getStoredUser } from './services/auth'
import { getProfileCompletionStatus } from './services/users'

type Role = 'User' | 'Coach' | 'Admin'

function homeForRole(role?: Role): string {
  if (role === 'Coach') return '/coach/dashboard'
  if (role === 'Admin') return '/admin/dashboard' // future
  return '/dashboard'
}

function AuthGate() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const user = getStoredUser()

  if (user) return <Navigate to={homeForRole(user.role)} replace />

  if (mode === 'login') {
    return <LoginPage onSwitchToSignup={() => setMode('signup')} />
  }
  return <SignupPage onSwitchToLogin={() => setMode('login')} />
}

function RequireRole({ role, children }: { role: Role; children: React.ReactNode }) {
  const user = getStoredUser()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to="/access-denied" replace />
  return <>{children}</>
}

function ProfileGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'complete' | 'incomplete'>('loading')
  const user = getStoredUser()

  useEffect(() => {
    // Sadece User rolü için profile-complete kontrolü yap; Coach/Admin'in fitness profili yok.
    if (!user?.userId || user.role !== 'User') {
      setStatus('complete')
      return
    }
    getProfileCompletionStatus(user.userId)
      .then((done) => setStatus(done ? 'complete' : 'incomplete'))
      .catch(() => setStatus('complete'))
  }, [user?.userId, user?.role])

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
        <Route path="/access-denied" element={<AccessDenied />} />

        {/* User onboarding (User-only) */}
        <Route
          path="/onboarding"
          element={
            <RequireRole role="User">
              <ProfileCompletion />
            </RequireRole>
          }
        />

        {/* User-only routes */}
        <Route
          path="/dashboard"
          element={
            <RequireRole role="User">
              <ProfileGuard>
                <Dashboard />
              </ProfileGuard>
            </RequireRole>
          }
        />
        <Route
          path="/exercises"
          element={
            <RequireRole role="User">
              <ProfileGuard>
                <ExercisesPage />
              </ProfileGuard>
            </RequireRole>
          }
        />
        <Route
          path="/packages"
          element={
            <RequireRole role="User">
              <ProfileGuard>
                <PackagesPage />
              </ProfileGuard>
            </RequireRole>
          }
        />
        <Route
          path="/programs"
          element={
            <RequireRole role="User">
              <ProfileGuard>
                <ProgramsPage />
              </ProfileGuard>
            </RequireRole>
          }
        />
        <Route
          path="/programs/workout/:dayKey"
          element={
            <RequireRole role="User">
              <ProfileGuard>
                <WorkoutSessionPage />
              </ProfileGuard>
            </RequireRole>
          }
        />
        <Route
          path="/programs/self/training/new"
          element={
            <RequireRole role="User">
              <ProfileGuard>
                <CreateProgramPage />
              </ProfileGuard>
            </RequireRole>
          }
        />
        <Route
          path="/programs/self/training/new/schedule"
          element={
            <RequireRole role="User">
              <ProfileGuard>
                <ScheduleBuilderPage />
              </ProfileGuard>
            </RequireRole>
          }
        />
        <Route
          path="/programs/self/nutrition/new"
          element={
            <RequireRole role="User">
              <ProfileGuard>
                <CreateNutritionPlanPage />
              </ProfileGuard>
            </RequireRole>
          }
        />
        <Route
          path="/programs/self/nutrition/new/builder"
          element={
            <RequireRole role="User">
              <ProfileGuard>
                <MealBuilderPage />
              </ProfileGuard>
            </RequireRole>
          }
        />
        <Route
          path="/progress"
          element={
            <RequireRole role="User">
              <ProfileGuard>
                <ProgressPage />
              </ProfileGuard>
            </RequireRole>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireRole role="User">
              <ProfileGuard>
                <ProfilePage />
              </ProfileGuard>
            </RequireRole>
          }
        />
        <Route
          path="/profile/edit"
          element={
            <RequireRole role="User">
              <ProfileGuard>
                <ProfileEditPage />
              </ProfileGuard>
            </RequireRole>
          }
        />

        {/* Coach-only routes */}
        <Route
          path="/coach/dashboard"
          element={<RequireRole role="Coach"><CoachDashboard /></RequireRole>}
        />
        <Route
          path="/coach/waiting-users"
          element={<RequireRole role="Coach"><WaitingUsersPage /></RequireRole>}
        />
        <Route
          path="/coach/users/:userId"
          element={<RequireRole role="Coach"><UserDetailForCoach /></RequireRole>}
        />
        <Route
          path="/coach/programs"
          element={<RequireRole role="Coach"><MyProgramsPage /></RequireRole>}
        />
        <Route
          path="/coach/programs/new/:userId"
          element={<RequireRole role="Coach"><CreateProgramPage /></RequireRole>}
        />
        <Route
          path="/coach/programs/:programId/schedule"
          element={<RequireRole role="Coach"><ScheduleBuilderPage /></RequireRole>}
        />
        <Route
          path="/coach/programs/:programId"
          element={<RequireRole role="Coach"><ProgramDetailPage /></RequireRole>}
        />
        <Route
          path="/coach/foods"
          element={<RequireRole role="Coach"><FoodLibraryPage /></RequireRole>}
        />
        <Route
          path="/coach/fitness-goals"
          element={<RequireRole role="Coach"><FitnessGoalsPage /></RequireRole>}
        />
        <Route
          path="/coach/nutrition-plans/new/:userId"
          element={<RequireRole role="Coach"><CreateNutritionPlanPage /></RequireRole>}
        />
        <Route
          path="/coach/nutrition-plans/new/:userId/builder"
          element={<RequireRole role="Coach"><MealBuilderPage /></RequireRole>}
        />
        <Route
          path="/coach/nutrition-plans/:planId/edit"
          element={<RequireRole role="Coach"><MealBuilderPage /></RequireRole>}
        />
        <Route
          path="/coach/profile"
          element={<RequireRole role="Coach"><CoachProfilePage /></RequireRole>}
        />
        <Route
          path="/coach/profile/edit"
          element={<RequireRole role="Coach"><CoachProfileEditPage /></RequireRole>}
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
