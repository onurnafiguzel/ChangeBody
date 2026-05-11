import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/shared/Header'
import { Sidebar, BottomNav } from '../../components/shared/Navigation'
import { changePassword, getFitnessGoals, getUserProfile, updateUser } from '../../services/users'
import { getStoredUser } from '../../services/auth'
import { breakdownApiError, parseApiError } from '../../utils/errorHandler'
import { useToast } from '../../components/shared/Toast'
import type { FitnessGoalDto, UpdateUserRequest, UserDto } from '../../types/api.types'
import '../../styles/dashboard.css'
import '../../styles/onboarding.css'

type ProfileForm = Partial<UpdateUserRequest>
type ProfileErrors = Partial<Record<keyof UpdateUserRequest, string>>

interface PasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}
type PasswordErrors = Partial<Record<keyof PasswordForm, string>>

export default function ProfileEditPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const user = getStoredUser()

  // ─── Profile state ──────────────────────────────────────────────────────
  const [original, setOriginal] = useState<UserDto | null>(null)
  const [form, setForm] = useState<ProfileForm>({})
  const [errors, setErrors] = useState<ProfileErrors>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  // ─── Goals dropdown ─────────────────────────────────────────────────────
  const [goals, setGoals] = useState<FitnessGoalDto[]>([])

  // ─── Password accordion ─────────────────────────────────────────────────
  const [pwOpen, setPwOpen] = useState(false)
  const [pwForm, setPwForm] = useState<PasswordForm>({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwErrors, setPwErrors] = useState<PasswordErrors>({})
  const [pwGlobal, setPwGlobal] = useState<string | null>(null)
  const [pwLoading, setPwLoading] = useState(false)

  // ─── Mount: profil + hedefler ───────────────────────────────────────────
  useEffect(() => {
    if (!user?.userId) { navigate('/login'); return }
    Promise.all([getUserProfile(user.userId), getFitnessGoals()])
      .then(([profile, goalsList]) => {
        setOriginal(profile)
        setGoals(goalsList.filter((g) => g.isActive))
      })
      .catch((err) => setGlobalError(parseApiError(err, 'Profil yüklenemedi.')))
      .finally(() => setPageLoading(false))
  }, [user?.userId])

  // ─── Set field helpers ──────────────────────────────────────────────────
  function setField<K extends keyof UpdateUserRequest>(key: K, value: UpdateUserRequest[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
    setGlobalError(null)
  }

  function setPwField<K extends keyof PasswordForm>(key: K, value: PasswordForm[K]) {
    setPwForm((prev) => ({ ...prev, [key]: value }))
    setPwErrors((prev) => ({ ...prev, [key]: undefined }))
    setPwGlobal(null)
  }

  // ─── UUID Helpers ───────────────────────────────────────────────────────
  // openapi.json: UserDto.fitnessGoal = "description string", UpdateUserRequest.fitnessGoal = UUID
  // → API'ye GUID göndermek için goal listesinden eşleşen ada göre id'yi çözümle
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  function resolveFitnessGoalId(): string | undefined {
    // 1) Kullanıcı dropdown'dan seçtiyse zaten UUID
    if (form.fitnessGoal && UUID_RE.test(form.fitnessGoal)) return form.fitnessGoal
    // 2) Original.fitnessGoal description ise, listeden ad eşleştirmesiyle UUID bul
    const goalName = original?.fitnessGoal
    if (!goalName) return undefined
    if (UUID_RE.test(goalName)) return goalName // yine de güvence (BE değişirse)
    const matched = goals.find((g) => g.name === goalName || g.description === goalName)
    return matched?.id
  }

  // ─── Tam payload (mevcut model + form değişiklikleri birleştirilmiş) ────
  function buildPayload(): UpdateUserRequest {
    if (!original) return {}
    return {
      firstName: form.firstName !== undefined ? form.firstName.trim() : (original.firstName ?? ''),
      lastName: form.lastName !== undefined ? form.lastName.trim() : (original.lastName ?? ''),
      age: form.age ?? original.age ?? undefined,
      height: form.height ?? original.height ?? undefined,
      weight: form.weight ?? original.weight ?? undefined,
      gender: form.gender ?? original.gender ?? undefined,
      fitnessGoal: resolveFitnessGoalId(),
      fitnessLevel: form.fitnessLevel ?? original.fitnessLevel ?? undefined,
    }
  }

  // ─── Profile validate ───────────────────────────────────────────────────
  function validateProfile(payload: UpdateUserRequest): ProfileErrors {
    const e: ProfileErrors = {}
    if (payload.firstName !== undefined && !payload.firstName.trim()) e.firstName = 'Ad boş olamaz.'
    if (payload.lastName !== undefined && !payload.lastName.trim()) e.lastName = 'Soyad boş olamaz.'
    if (payload.age !== undefined && (payload.age < 13 || payload.age > 120)) e.age = 'Yaş 13–120 arasında olmalı.'
    if (payload.height !== undefined && payload.height <= 0) e.height = 'Boy pozitif bir sayı olmalı.'
    if (payload.weight !== undefined && payload.weight <= 0) e.weight = 'Kilo pozitif bir sayı olmalı.'
    return e
  }

  // ─── Submit profile ─────────────────────────────────────────────────────
  async function handleSaveProfile() {
    if (!user?.userId || !original) return
    setGlobalError(null)

    const payload = buildPayload()

    const validation = validateProfile(payload)
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      return
    }

    setLoading(true)
    try {
      await updateUser(user.userId, payload)
      toast.success('Profil güncellendi.')
      setTimeout(() => navigate('/profile'), 1000)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401) { navigate('/login'); return }
      if (status === 400) {
        const { fieldErrors, globalMessage } = breakdownApiError(err)
        setErrors(fieldErrors as ProfileErrors)
        setGlobalError(globalMessage)
      } else {
        setGlobalError(parseApiError(err))
      }
    } finally {
      setLoading(false)
    }
  }

  // ─── Submit password ────────────────────────────────────────────────────
  function validatePassword(): PasswordErrors {
    const e: PasswordErrors = {}
    if (!pwForm.currentPassword) e.currentPassword = 'Mevcut şifre gerekli.'
    if (!pwForm.newPassword) e.newPassword = 'Yeni şifre gerekli.'
    else if (pwForm.newPassword.length < 8) e.newPassword = 'Yeni şifre en az 8 karakter olmalı.'
    if (!pwForm.confirmPassword) e.confirmPassword = 'Yeni şifreyi tekrar girin.'
    else if (pwForm.newPassword !== pwForm.confirmPassword) e.confirmPassword = 'Şifreler eşleşmiyor.'
    return e
  }

  async function handleChangePassword() {
    if (!user?.userId) return
    setPwGlobal(null)

    const validation = validatePassword()
    if (Object.keys(validation).length > 0) {
      setPwErrors(validation)
      return
    }

    setPwLoading(true)
    try {
      await changePassword(user.userId, {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      })
      toast.success('Şifreniz güncellendi.')
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPwOpen(false)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401) {
        setPwErrors({ currentPassword: 'Mevcut şifre hatalı.' })
      } else if (status === 400) {
        const { fieldErrors, globalMessage } = breakdownApiError(err)
        setPwErrors(fieldErrors as PasswordErrors)
        setPwGlobal(globalMessage)
      } else {
        setPwGlobal(parseApiError(err))
      }
    } finally {
      setPwLoading(false)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  if (pageLoading) {
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

  if (!original) {
    return (
      <div className="app-shell">
        <Sidebar />
        <div className="app-main">
          <Header />
          <div className="page-content">
            <div className="error-banner">⚠️ {globalError ?? 'Profil yüklenemedi.'}</div>
            <button className="btn-retry" onClick={() => navigate('/profile')}>← Profile dön</button>
          </div>
          <BottomNav />
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header />
        <div className="page-content">
          <div className="section-header" style={{ marginBottom: 16 }}>
            <button className="btn-back" onClick={() => navigate('/profile')}>← Geri</button>
            <span className="section-title">Profili Düzenle</span>
          </div>

          {globalError && <div className="error-banner">⚠️ {globalError}</div>}

          {/* ── KİŞİSEL BİLGİLER ── */}
          <div className="profile-edit-section">
            <div className="profile-edit-section-title">📝 Kişisel Bilgiler</div>

            <div className="ob-form-row">
              <div className="ob-form-group">
                <label className="ob-label">Ad</label>
                <input
                  className={`ob-input ${errors.firstName ? 'error' : ''}`}
                  type="text"
                  value={form.firstName ?? original.firstName ?? ''}
                  onChange={(e) => setField('firstName', e.target.value)}
                />
                {errors.firstName && <span className="ob-field-error">{errors.firstName}</span>}
              </div>
              <div className="ob-form-group">
                <label className="ob-label">Soyad</label>
                <input
                  className={`ob-input ${errors.lastName ? 'error' : ''}`}
                  type="text"
                  value={form.lastName ?? original.lastName ?? ''}
                  onChange={(e) => setField('lastName', e.target.value)}
                />
                {errors.lastName && <span className="ob-field-error">{errors.lastName}</span>}
              </div>
            </div>

            <div className="ob-form-row">
              <div className="ob-form-group">
                <label className="ob-label">Yaş</label>
                <input
                  className={`ob-input ${errors.age ? 'error' : ''}`}
                  type="number"
                  min={13}
                  max={120}
                  value={form.age ?? original.age ?? ''}
                  onChange={(e) => setField('age', parseInt(e.target.value) || 0)}
                />
                {errors.age && <span className="ob-field-error">{errors.age}</span>}
              </div>
              <div className="ob-form-group">
                <label className="ob-label">Cinsiyet</label>
                <select
                  className={`ob-select ${errors.gender ? 'error' : ''}`}
                  value={form.gender ?? original.gender ?? ''}
                  onChange={(e) => setField('gender', e.target.value as UpdateUserRequest['gender'])}
                >
                  <option value="">Seçiniz</option>
                  <option value="Male">Erkek</option>
                  <option value="Female">Kadın</option>
                  <option value="Other">Diğer</option>
                </select>
                {errors.gender && <span className="ob-field-error">{errors.gender}</span>}
              </div>
            </div>

            <div className="ob-form-row">
              <div className="ob-form-group">
                <label className="ob-label">Boy (cm)</label>
                <input
                  className={`ob-input ${errors.height ? 'error' : ''}`}
                  type="number"
                  step="0.1"
                  value={form.height ?? original.height ?? ''}
                  onChange={(e) => setField('height', parseFloat(e.target.value) || 0)}
                />
                {errors.height && <span className="ob-field-error">{errors.height}</span>}
              </div>
              <div className="ob-form-group">
                <label className="ob-label">Kilo (kg)</label>
                <input
                  className={`ob-input ${errors.weight ? 'error' : ''}`}
                  type="number"
                  step="0.1"
                  value={form.weight ?? original.weight ?? ''}
                  onChange={(e) => setField('weight', parseFloat(e.target.value) || 0)}
                />
                {errors.weight && <span className="ob-field-error">{errors.weight}</span>}
              </div>
            </div>

            <div className="ob-form-row">
              <div className="ob-form-group">
                <label className="ob-label">Fitness Hedefi</label>
                <select
                  className={`ob-select ${errors.fitnessGoal ? 'error' : ''}`}
                  value={form.fitnessGoal ?? ''}
                  onChange={(e) => setField('fitnessGoal', e.target.value)}
                >
                  <option value="">{original.fitnessGoal ? `Mevcut: ${original.fitnessGoal}` : 'Seçiniz'}</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                {errors.fitnessGoal && <span className="ob-field-error">{errors.fitnessGoal}</span>}
                <span className="field-help">Değiştirmek istemiyorsanız boş bırakın.</span>
              </div>
              <div className="ob-form-group">
                <label className="ob-label">Fitness Seviyesi</label>
                <select
                  className={`ob-select ${errors.fitnessLevel ? 'error' : ''}`}
                  value={form.fitnessLevel ?? original.fitnessLevel ?? ''}
                  onChange={(e) => setField('fitnessLevel', e.target.value as UpdateUserRequest['fitnessLevel'])}
                >
                  <option value="">Seçiniz</option>
                  <option value="Beginner">Başlangıç</option>
                  <option value="Intermediate">Orta Seviye</option>
                  <option value="Advanced">İleri Seviye</option>
                </select>
                {errors.fitnessLevel && <span className="ob-field-error">{errors.fitnessLevel}</span>}
              </div>
            </div>
          </div>

          {/* ── ŞİFRE DEĞİŞTİR ── */}
          <div className="password-accordion">
            <button
              className="password-accordion-header"
              onClick={() => setPwOpen((o) => !o)}
              type="button"
            >
              <span>🔒 Şifre Değiştir</span>
              <span className="password-accordion-chevron">{pwOpen ? '▲' : '▼'}</span>
            </button>

            {pwOpen && (
              <div className="password-accordion-body">
                {pwGlobal && <div className="error-banner">⚠️ {pwGlobal}</div>}

                <div className="ob-form-group">
                  <label className="ob-label">Mevcut Şifre</label>
                  <input
                    className={`ob-input ${pwErrors.currentPassword ? 'error' : ''}`}
                    type="password"
                    value={pwForm.currentPassword}
                    onChange={(e) => setPwField('currentPassword', e.target.value)}
                    autoComplete="current-password"
                  />
                  {pwErrors.currentPassword && <span className="ob-field-error">{pwErrors.currentPassword}</span>}
                </div>

                <div className="ob-form-row">
                  <div className="ob-form-group">
                    <label className="ob-label">Yeni Şifre</label>
                    <input
                      className={`ob-input ${pwErrors.newPassword ? 'error' : ''}`}
                      type="password"
                      value={pwForm.newPassword}
                      onChange={(e) => setPwField('newPassword', e.target.value)}
                      autoComplete="new-password"
                    />
                    {pwErrors.newPassword && <span className="ob-field-error">{pwErrors.newPassword}</span>}
                  </div>
                  <div className="ob-form-group">
                    <label className="ob-label">Yeni Şifre (Tekrar)</label>
                    <input
                      className={`ob-input ${pwErrors.confirmPassword ? 'error' : ''}`}
                      type="password"
                      value={pwForm.confirmPassword}
                      onChange={(e) => setPwField('confirmPassword', e.target.value)}
                      autoComplete="new-password"
                    />
                    {pwErrors.confirmPassword && <span className="ob-field-error">{pwErrors.confirmPassword}</span>}
                  </div>
                </div>

                <button
                  className="ob-btn-next"
                  style={{ width: 'auto', marginTop: 8 }}
                  onClick={handleChangePassword}
                  disabled={pwLoading}
                >
                  {pwLoading && <span className="loading-spinner" />}
                  {pwLoading ? 'Güncelleniyor…' : 'Şifreyi Güncelle'}
                </button>
              </div>
            )}
          </div>

          {/* ── ACTIONS ── */}
          <div className="profile-edit-actions">
            <button className="btn-secondary" onClick={() => navigate('/profile')} disabled={loading}>
              İptal
            </button>
            <button className="btn-primary" onClick={handleSaveProfile} disabled={loading}>
              {loading && <span className="loading-spinner" />}
              {loading ? 'Kaydediliyor…' : 'Bilgileri Kaydet'}
            </button>
          </div>
        </div>
        <BottomNav />
      </div>
    </div>
  )
}
