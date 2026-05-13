import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/shared/Header'
import { Sidebar, BottomNav } from '../../components/shared/Navigation'
import DashboardCard from '../../components/cards/DashboardCard'
import Skeleton from '../../components/shared/Skeleton'
import { getStoredUser } from '../../services/auth'
import { getUserDashboard } from '../../services/users'
import { parseApiError } from '../../utils/errorHandler'
import type {
  ActiveProgramDetailDto,
  NutritionPlanDetailDto,
  UserDashboardDto,
  UserDashboardProfileDto,
  WaitingUserStatusDto,
} from '../../types/api.types'
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

const GENDER_TR: Record<string, string> = { Male: 'Erkek', Female: 'Kadın', Other: 'Diğer' }
const LEVEL_TR: Record<string, string> = {
  Beginner: 'Başlangıç', Intermediate: 'Orta', Advanced: 'İleri',
}
const DIFFICULTY_TR: Record<string, string> = {
  Beginner: 'Başlangıç', Intermediate: 'Orta Seviye', Advanced: 'İleri Seviye',
}

function fmtNum(n: number): string {
  return n >= 100 ? Math.round(n).toString() : (Math.round(n * 10) / 10).toString()
}

export default function Dashboard() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const quote = MOTIVATIONAL_QUOTES[new Date().getDay() % MOTIVATIONAL_QUOTES.length]

  const [data, setData] = useState<UserDashboardDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    getUserDashboard(user.userId)
      .then(setData)
      .catch((err) => setError(parseApiError(err, 'Dashboard yüklenemedi.')))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!user) return null

  const profile = data?.profile
  const firstName = profile?.firstName || user.email.split('@')[0]

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header />
        <div className="page-content">
          {/* Welcome */}
          <div className="welcome-banner">
            <div className="welcome-banner-label">Hoş Geldin</div>
            <div className="welcome-banner-title">Merhaba, {firstName} 👋</div>
            <div className="welcome-banner-sub">{quote}</div>
          </div>

          {error && <div className="error-banner">⚠️ {error}</div>}

          {/* Profil + Durum */}
          <div className="section-header">
            <span className="section-title">Özet</span>
          </div>
          {loading ? (
            <div className="dashboard-summary-grid">
              <Skeleton variant="card" height={180} />
              <Skeleton variant="card" height={180} />
            </div>
          ) : profile ? (
            <div className="dashboard-summary-grid">
              <ProfileCard profile={profile} onEdit={() => navigate('/profile/edit')} />
              <StatusCard
                waiting={data?.waitingStatus ?? null}
                onPackages={() => navigate('/packages')}
              />
            </div>
          ) : null}

          {/* Aktif Antrenman */}
          <div className="section-header">
            <span className="section-title">🏋️ Aktif Antrenman</span>
            {data?.activeTrainingProgram && (
              <button className="btn-link" onClick={() => navigate('/programs')}>Detay →</button>
            )}
          </div>
          {loading ? (
            <Skeleton variant="card" height={120} />
          ) : (
            <TrainingSummaryCard
              program={data?.activeTrainingProgram ?? null}
              onPackages={() => navigate('/packages')}
            />
          )}

          {/* Aktif Beslenme */}
          <div className="section-header">
            <span className="section-title">🥗 Aktif Beslenme</span>
            {data?.activeNutritionPlan && (
              <button className="btn-link" onClick={() => navigate('/programs')}>Detay →</button>
            )}
          </div>
          {loading ? (
            <Skeleton variant="card" height={120} />
          ) : (
            <NutritionSummaryCard plan={data?.activeNutritionPlan ?? null} />
          )}

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

// ─── Sub-components ──────────────────────────────────────────────────

function ProfileCard({ profile, onEdit }: { profile: UserDashboardProfileDto; onEdit: () => void }) {
  const bmi = profile.height && profile.weight
    ? Math.round((profile.weight / ((profile.height / 100) ** 2)) * 10) / 10
    : null

  return (
    <div className="dashboard-summary-card">
      <div className="dashboard-summary-card-title">👤 Profil</div>
      <div className="dashboard-summary-rows">
        {profile.age && <div><span className="muted">Yaş:</span> {profile.age}</div>}
        {profile.gender && <div><span className="muted">Cinsiyet:</span> {GENDER_TR[profile.gender] ?? profile.gender}</div>}
        {profile.height && <div><span className="muted">Boy:</span> {profile.height} cm</div>}
        {profile.weight && <div><span className="muted">Kilo:</span> {profile.weight} kg</div>}
        {profile.fitnessLevel && (
          <div><span className="muted">Seviye:</span> {LEVEL_TR[profile.fitnessLevel] ?? profile.fitnessLevel}</div>
        )}
        {bmi && <div><span className="muted">BMI:</span> <strong>{bmi}</strong></div>}
      </div>
      {!profile.isCompletedProfile && (
        <button className="btn-primary" style={{ marginTop: 12 }} onClick={onEdit}>
          Profili Tamamla →
        </button>
      )}
      {profile.isCompletedProfile && (
        <button className="btn-link" style={{ marginTop: 8 }} onClick={onEdit}>
          ✎ Profili Düzenle
        </button>
      )}
    </div>
  )
}

function StatusCard({
  waiting,
  onPackages,
}: { waiting: WaitingUserStatusDto | null; onPackages: () => void }) {
  if (!waiting) {
    return (
      <div className="dashboard-summary-card">
        <div className="dashboard-summary-card-title">⏳ Durum</div>
        <p className="placeholder-desc" style={{ margin: 0 }}>
          Henüz bir paket almadın. Antrenör atanması için paket satın al.
        </p>
        <button className="btn-primary" style={{ marginTop: 12 }} onClick={onPackages}>
          Paket Satın Al →
        </button>
      </div>
    )
  }

  const isWaiting = waiting.isWaitingForAssignment
  const hasTraining = waiting.hasTrainingProgram
  const hasNutrition = waiting.hasNutritionPlan

  return (
    <div className="dashboard-summary-card">
      <div className="dashboard-summary-card-title">⏳ Durum</div>
      {isWaiting ? (
        <>
          <p className="dashboard-status-text">Koçundan program bekliyorsun:</p>
          <div className="dashboard-status-badges">
            <span className={`assigned-badge ${hasTraining ? 'has' : 'missing'}`}>
              🏋️ {hasTraining === undefined ? '?' : hasTraining ? 'Atandı' : 'Bekleniyor'}
            </span>
            <span className={`assigned-badge ${hasNutrition ? 'has' : 'missing'}`}>
              🥗 {hasNutrition === undefined ? '?' : hasNutrition ? 'Atandı' : 'Bekleniyor'}
            </span>
          </div>
        </>
      ) : (
        <>
          <p className="dashboard-status-text">✓ Tüm programların atanmış. Antrenmanlara devam!</p>
          <div className="dashboard-status-badges">
            <span className="assigned-badge has">🏋️ Atandı</span>
            <span className="assigned-badge has">🥗 Atandı</span>
          </div>
        </>
      )}
    </div>
  )
}

function TrainingSummaryCard({
  program,
  onPackages,
}: { program: ActiveProgramDetailDto | null; onPackages: () => void }) {
  if (!program) {
    return (
      <div className="placeholder-card" style={{ padding: '24px 16px' }}>
        <div className="placeholder-icon">🏋️</div>
        <p className="placeholder-desc">Henüz aktif bir antrenman programın yok.</p>
        <button className="btn-link" style={{ marginTop: 8 }} onClick={onPackages}>
          Paket Satın Al →
        </button>
      </div>
    )
  }

  const dayCount = program.dailyExercises ? Object.keys(program.dailyExercises).length : 0

  return (
    <div className="program-card">
      <div className="program-card-header">
        <div>
          <div className="program-card-title">{program.name}</div>
          <div className="program-card-coach">Antrenör: {program.coachName}</div>
        </div>
        <span className={`program-status-badge ${program.status === 'InProgress' ? 'in-progress' : 'completed'}`}>
          {program.status === 'InProgress' ? 'Devam Ediyor' : 'Tamamlandı'}
        </span>
      </div>
      <div className="program-card-meta">
        <span>{program.durationWeeks} hafta</span>
        <span>·</span>
        <span>{DIFFICULTY_TR[program.difficulty] ?? program.difficulty}</span>
        {dayCount > 0 && <><span>·</span><span>{dayCount} gün/hafta</span></>}
      </div>
    </div>
  )
}

function NutritionSummaryCard({ plan }: { plan: NutritionPlanDetailDto | null }) {
  if (!plan) {
    return (
      <div className="placeholder-card" style={{ padding: '24px 16px' }}>
        <div className="placeholder-icon">🥗</div>
        <p className="placeholder-desc">Henüz aktif bir beslenme programın yok.</p>
      </div>
    )
  }

  const firstDay = plan.days[0]

  return (
    <div className="program-card">
      <div className="program-card-header">
        <div>
          <div className="program-card-title">{plan.title}</div>
          <div className="program-card-coach">Antrenör: {plan.coachName}</div>
        </div>
      </div>
      {firstDay && (
        <div className="dashboard-macro-row">
          <span className="macro-kcal">{fmtNum(firstDay.totalCalories)} kcal</span>
          <span className="macro-p">{fmtNum(firstDay.totalProtein)}P</span>
          <span className="macro-c">{fmtNum(firstDay.totalCarbs)}C</span>
          <span className="macro-f">{fmtNum(firstDay.totalFat)}F</span>
          <span className="muted" style={{ marginLeft: 'auto' }}>
            {plan.days.length === 2 ? 'Antrenman + Off günü' : 'Tek gün'}
          </span>
        </div>
      )}
    </div>
  )
}
