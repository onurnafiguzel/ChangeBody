import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/shared/Header'
import { Sidebar, BottomNav } from '../../components/shared/Navigation'
import { changeCoachPassword, getCoachProfile, updateCoach } from '../../services/coach'
import { getStoredUser } from '../../services/auth'
import { breakdownApiError, parseApiError } from '../../utils/errorHandler'
import { useToast } from '../../components/shared/Toast'
import type { CoachDto, UpdateCoachRequest } from '../../types/api.types'
import '../../styles/dashboard.css'
import '../../styles/onboarding.css'

type CoachForm = Partial<UpdateCoachRequest>
type CoachErrors = Partial<Record<keyof UpdateCoachRequest, string>>

interface PasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}
type PasswordErrors = Partial<Record<keyof PasswordForm, string>>

export default function CoachProfileEditPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const user = getStoredUser()

  // Profile state
  const [original, setOriginal] = useState<CoachDto | null>(null)
  const [form, setForm] = useState<CoachForm>({})
  const [errors, setErrors] = useState<CoachErrors>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  // Password state
  const [pwOpen, setPwOpen] = useState(false)
  const [pwForm, setPwForm] = useState<PasswordForm>({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwErrors, setPwErrors] = useState<PasswordErrors>({})
  const [pwGlobal, setPwGlobal] = useState<string | null>(null)
  const [pwLoading, setPwLoading] = useState(false)

  useEffect(() => {
    if (!user?.userId) { navigate('/login'); return }
    getCoachProfile(user.userId)
      .then((c) => setOriginal(c))
      .catch((err) => setGlobalError(parseApiError(err, 'Profil yüklenemedi.')))
      .finally(() => setPageLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function setField<K extends keyof UpdateCoachRequest>(key: K, value: UpdateCoachRequest[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
    setGlobalError(null)
  }

  function setPwField<K extends keyof PasswordForm>(key: K, value: PasswordForm[K]) {
    setPwForm((prev) => ({ ...prev, [key]: value }))
    setPwErrors((prev) => ({ ...prev, [key]: undefined }))
    setPwGlobal(null)
  }

  function buildPayload(): UpdateCoachRequest {
    if (!original) return {}
    return {
      firstName: form.firstName !== undefined ? form.firstName.trim() : (original.firstName ?? ''),
      lastName: form.lastName !== undefined ? form.lastName.trim() : (original.lastName ?? ''),
      specialization: form.specialization !== undefined ? form.specialization.trim() : (original.specialization ?? ''),
    }
  }

  function validateProfile(payload: UpdateCoachRequest): CoachErrors {
    const e: CoachErrors = {}
    if (payload.firstName !== undefined && !payload.firstName.trim()) e.firstName = 'Ad boş olamaz.'
    if (payload.lastName !== undefined && !payload.lastName.trim()) e.lastName = 'Soyad boş olamaz.'
    return e
  }

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
      await updateCoach(user.userId, payload)
      toast.success('Profil güncellendi.')
      setTimeout(() => navigate('/coach/profile'), 1000)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401) { navigate('/login'); return }
      if (status === 400) {
        const { fieldErrors, globalMessage } = breakdownApiError(err)
        setErrors(fieldErrors as CoachErrors)
        setGlobalError(globalMessage)
      } else {
        setGlobalError(parseApiError(err))
      }
    } finally {
      setLoading(false)
    }
  }

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
      await changeCoachPassword(user.userId, {
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
            <button className="btn-back" onClick={() => navigate('/coach/profile')}>← Profile dön</button>
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
            <button className="btn-back" onClick={() => navigate('/coach/profile')}>← Geri</button>
            <span className="section-title">Profili Düzenle</span>
          </div>

          {globalError && <div className="error-banner">⚠️ {globalError}</div>}

          {/* Bilgiler */}
          <div className="profile-edit-section">
            <div className="profile-edit-section-title">📝 Bilgilerim</div>

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

            <div className="ob-form-group">
              <label className="ob-label">E-posta</label>
              <input
                className="ob-input readonly"
                type="email"
                value={original.email}
                disabled
                readOnly
              />
              <span className="field-help">E-posta değiştirilemez. İletişim için yöneticinizle görüşün.</span>
            </div>

            <div className="ob-form-group">
              <label className="ob-label">Uzmanlık Alanı</label>
              <input
                className={`ob-input ${errors.specialization ? 'error' : ''}`}
                type="text"
                placeholder="Örn. Strength & Conditioning, Cardio, Yoga"
                value={form.specialization ?? original.specialization ?? ''}
                onChange={(e) => setField('specialization', e.target.value)}
              />
              {errors.specialization && <span className="ob-field-error">{errors.specialization}</span>}
            </div>
          </div>

          {/* Şifre Değiştir Accordion */}
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

          {/* Actions */}
          <div className="profile-edit-actions">
            <button className="btn-secondary" onClick={() => navigate('/coach/profile')} disabled={loading}>
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
