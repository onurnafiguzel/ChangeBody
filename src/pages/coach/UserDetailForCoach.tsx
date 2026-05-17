import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '../../components/shared/Header'
import { Sidebar, BottomNav } from '../../components/shared/Navigation'
import NutritionPlanViewModal from '../../components/nutrition/NutritionPlanViewModal'
import ProgressView from '../../components/progress/ProgressView'
import { getUserProfile, getWaitingUserStatus } from '../../services/users'
import {
  activateNutritionPlan,
  deactivateNutritionPlan,
  getUserNutritionPlans,
} from '../../services/nutritionPlans'
import { parseApiError } from '../../utils/errorHandler'
import { useToast } from '../../components/shared/Toast'
import type { NutritionPlanListItemDto, UserDto, WaitingUserStatusDto } from '../../types/api.types'
import '../../styles/dashboard.css'

const GENDER_TR: Record<string, string> = { Male: 'Erkek', Female: 'Kadın', Other: 'Diğer' }
const LEVEL_TR: Record<string, string> = { Beginner: 'Başlangıç', Intermediate: 'Orta Seviye', Advanced: 'İleri Seviye' }

function formatDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function UserDetailForCoach() {
  const navigate = useNavigate()
  const toast = useToast()
  const { userId } = useParams<{ userId: string }>()

  const [profile, setProfile] = useState<UserDto | null>(null)
  const [waitStatus, setWaitStatus] = useState<WaitingUserStatusDto | null>(null)
  const [plans, setPlans] = useState<NutritionPlanListItemDto[]>([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [plansError, setPlansError] = useState<string | null>(null)
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null)
  const [viewPlanId, setViewPlanId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    setError(null)
    Promise.all([
      getUserProfile(userId),
      getWaitingUserStatus(userId).catch(() => null),
    ])
      .then(([p, w]) => {
        setProfile(p)
        setWaitStatus(w)
      })
      .catch((err) => setError(parseApiError(err, 'Sporcu bilgileri yüklenemedi.')))
      .finally(() => setLoading(false))

    fetchPlans()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function fetchPlans() {
    if (!userId) return
    setPlansLoading(true)
    setPlansError(null)
    try {
      const list = await getUserNutritionPlans(userId)
      setPlans([...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
    } catch (err) {
      setPlansError(parseApiError(err, 'Beslenme planları yüklenemedi.'))
    } finally {
      setPlansLoading(false)
    }
  }

  async function handleActivate(plan: NutritionPlanListItemDto) {
    setBusyPlanId(plan.id)
    try {
      await activateNutritionPlan(plan.id)
      toast.success('Plan aktifleştirildi.')
      await fetchPlans()
    } catch (err) {
      toast.error(parseApiError(err, 'Aktifleştirilemedi.'))
    } finally {
      setBusyPlanId(null)
    }
  }

  async function handleDeactivate(plan: NutritionPlanListItemDto) {
    if (!confirm(`"${plan.title}" planı pasifleştirilsin mi?`)) return
    setBusyPlanId(plan.id)
    try {
      await deactivateNutritionPlan(plan.id)
      toast.success('Plan pasifleştirildi.')
      await fetchPlans()
    } catch (err) {
      toast.error(parseApiError(err, 'Pasifleştirilemedi.'))
    } finally {
      setBusyPlanId(null)
    }
  }

  if (loading) {
    return (
      <div className="app-shell">
        <Sidebar />
        <div className="app-main">
          <Header />
          <div className="page-content">
            <div className="skeleton" style={{ height: 60, borderRadius: 12, marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 320, borderRadius: 12 }} />
          </div>
          <BottomNav />
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="app-shell">
        <Sidebar />
        <div className="app-main">
          <Header />
          <div className="page-content">
            <div className="error-banner">⚠️ {error ?? 'Sporcu bulunamadı.'}</div>
            <button className="btn-back" onClick={() => navigate('/coach/waiting-users')}>← Bekleyenlere Dön</button>
          </div>
          <BottomNav />
        </div>
      </div>
    )
  }

  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.email
  const bmi = profile.height && profile.weight
    ? Math.round((profile.weight / ((profile.height / 100) ** 2)) * 10) / 10
    : null

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header />
        <div className="page-content">
          <div className="section-header" style={{ marginBottom: 16 }}>
            <button className="btn-back" onClick={() => navigate('/coach/waiting-users')}>← Bekleyenler</button>
            <span className="section-title">{fullName}</span>
          </div>

          {/* Profile Bilgileri */}
          <div className="profile-edit-section">
            <div className="profile-edit-section-title">👤 Profil Bilgileri</div>
            <div className="profile-summary-grid">
              <div className="profile-summary-item">
                <span className="profile-summary-label">E-posta</span>
                <span className="profile-summary-value">{profile.email}</span>
              </div>
              {profile.age && (
                <div className="profile-summary-item">
                  <span className="profile-summary-label">Yaş</span>
                  <span className="profile-summary-value">{profile.age}</span>
                </div>
              )}
              {profile.gender && (
                <div className="profile-summary-item">
                  <span className="profile-summary-label">Cinsiyet</span>
                  <span className="profile-summary-value">{GENDER_TR[profile.gender] ?? profile.gender}</span>
                </div>
              )}
              {profile.height && (
                <div className="profile-summary-item">
                  <span className="profile-summary-label">Boy</span>
                  <span className="profile-summary-value">{profile.height} cm</span>
                </div>
              )}
              {profile.weight && (
                <div className="profile-summary-item">
                  <span className="profile-summary-label">Kilo</span>
                  <span className="profile-summary-value">{profile.weight} kg</span>
                </div>
              )}
              {bmi && (
                <div className="profile-summary-item">
                  <span className="profile-summary-label">BMI</span>
                  <span className="profile-summary-value">{bmi}</span>
                </div>
              )}
            </div>
          </div>

          {/* Hedef & Seviye */}
          <div className="profile-edit-section">
            <div className="profile-edit-section-title">🎯 Hedef & Seviye</div>
            <div className="profile-summary-grid">
              {profile.fitnessGoal && (
                <div className="profile-summary-item full">
                  <span className="profile-summary-label">Fitness Hedefi</span>
                  <span className="profile-summary-value">{profile.fitnessGoal}</span>
                </div>
              )}
              {profile.fitnessLevel && (
                <div className="profile-summary-item">
                  <span className="profile-summary-label">Seviye</span>
                  <span className="profile-summary-value">{LEVEL_TR[profile.fitnessLevel] ?? profile.fitnessLevel}</span>
                </div>
              )}
            </div>
          </div>

          {/* Bekleme Durumu */}
          {waitStatus && (
            <div className="profile-edit-section">
              <div className="profile-edit-section-title">⏳ Bekleme Durumu</div>
              <div className="profile-summary-grid">
                <div className="profile-summary-item">
                  <span className="profile-summary-label">Durum</span>
                  <span className="profile-summary-value">
                    {waitStatus.isWaitingForAssignment ? 'Atama Bekliyor' : 'Atanmış'}
                  </span>
                </div>
                <div className="profile-summary-item">
                  <span className="profile-summary-label">Kayıt Tarihi</span>
                  <span className="profile-summary-value">{formatDate(waitStatus.createdAt)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Beslenme Plan Geçmişi */}
          <div className="profile-edit-section">
            <div className="profile-edit-section-title">🥗 Beslenme Plan Geçmişi</div>
            {plansLoading ? (
              <>
                <div className="skeleton" style={{ height: 60, borderRadius: 10, marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 60, borderRadius: 10 }} />
              </>
            ) : plansError ? (
              <div className="error-banner">
                ⚠️ {plansError}
                <button className="btn-retry" onClick={fetchPlans} style={{ marginLeft: 12 }}>Tekrar Dene</button>
              </div>
            ) : plans.length === 0 ? (
              <p className="placeholder-desc" style={{ margin: 0 }}>
                Bu sporcu için henüz beslenme planı yok.
              </p>
            ) : (
              <ul className="np-history-list">
                {plans.map((plan) => (
                  <li key={plan.id} className="np-history-item">
                    <div className="np-history-text">
                      <div className="np-history-title">
                        {plan.title}
                        {plan.isActive
                          ? <span className="np-history-badge active">Aktif</span>
                          : <span className="np-history-badge inactive">Pasif</span>}
                      </div>
                      <div className="np-history-meta">
                        Antrenör: {plan.coachName} · {formatDate(plan.createdAt)}
                      </div>
                    </div>
                    <div className="np-history-actions">
                      <button
                        className="food-card-action"
                        onClick={() => setViewPlanId(plan.id)}
                        disabled={busyPlanId === plan.id}
                      >
                        🔍 Görüntüle
                      </button>
                      <button
                        className="food-card-action"
                        onClick={() => navigate(`/coach/nutrition-plans/${plan.id}/edit`)}
                        disabled={busyPlanId === plan.id}
                      >
                        ✎ Düzenle
                      </button>
                      {plan.isActive ? (
                        <button
                          className="food-card-action danger"
                          onClick={() => handleDeactivate(plan)}
                          disabled={busyPlanId === plan.id}
                        >
                          ⏸ Deaktive Et
                        </button>
                      ) : (
                        <button
                          className="food-card-action"
                          onClick={() => handleActivate(plan)}
                          disabled={busyPlanId === plan.id}
                        >
                          ▶ Aktifleştir
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Gelişim (read-only) */}
          {userId && (
            <ProgressView userId={userId} canEdit={false} gender={profile.gender ?? null} />
          )}

          {/* Action */}
          <div className="profile-edit-actions">
            <button className="btn-secondary" onClick={() => navigate('/coach/waiting-users')}>
              İptal
            </button>
            <button
              className="btn-primary"
              onClick={() => navigate(`/coach/programs/new/${userId}`)}
            >
              💪 Bu Sporcu için Program Oluştur →
            </button>
          </div>
        </div>
        <BottomNav />
      </div>

      <NutritionPlanViewModal
        open={viewPlanId != null}
        planId={viewPlanId}
        onClose={() => setViewPlanId(null)}
      />
    </div>
  )
}
