import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '../../components/shared/Header'
import { Sidebar, BottomNav } from '../../components/shared/Navigation'
import { createTrainingProgram } from '../../services/training'
import { getUserProfile } from '../../services/users'
import AthleteProfileSummary from '../../components/coach/AthleteProfileSummary'
import Skeleton from '../../components/shared/Skeleton'
import { getStoredUser } from '../../services/auth'
import { breakdownApiError, parseApiError } from '../../utils/errorHandler'
import { useToast } from '../../components/shared/Toast'
import { DifficultyLevel } from '../../types/api.types'
import type { CreateTrainingProgramRequest, UserDto } from '../../types/api.types'
import '../../styles/dashboard.css'
import '../../styles/onboarding.css'

type FormErrors = Partial<Record<keyof CreateTrainingProgramRequest, string>>

export default function CreateProgramPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { userId } = useParams<{ userId: string }>()

  const [athlete, setAthlete] = useState<UserDto | null>(null)
  const [form, setForm] = useState<Partial<CreateTrainingProgramRequest>>({
    name: '',
    description: '',
    durationWeeks: 12,
    difficulty: DifficultyLevel.Intermediate,
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!userId) return
    getUserProfile(userId)
      .then(setAthlete)
      .catch(() => {/* başlık placeholder kalır */})
  }, [userId])

  function setField<K extends keyof CreateTrainingProgramRequest>(
    key: K,
    value: CreateTrainingProgramRequest[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
    setGlobalError(null)
  }

  function validate(): FormErrors {
    const e: FormErrors = {}
    if (!form.name || !form.name.trim()) e.name = 'Program adı zorunludur.'
    if (form.durationWeeks == null || form.durationWeeks < 1 || form.durationWeeks > 52) {
      e.durationWeeks = 'Süre 1 ile 52 hafta arasında olmalı.'
    }
    if (!form.difficulty) e.difficulty = 'Zorluk seçiniz.'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    const coach = getStoredUser()
    if (!coach?.userId) { navigate('/login'); return }
    setGlobalError(null)

    const validation = validate()
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      return
    }

    const payload: CreateTrainingProgramRequest = {
      name: form.name!.trim(),
      description: form.description?.trim() ? form.description.trim() : undefined,
      userId,
      coachId: coach.userId,
      durationWeeks: form.durationWeeks!,
      difficulty: form.difficulty as CreateTrainingProgramRequest['difficulty'],
    }

    setSubmitting(true)
    try {
      const programId = await createTrainingProgram(payload)
      toast.success('Program oluşturuldu. Şimdi haftalık programı oluştur.')
      navigate(`/coach/programs/${programId}/schedule`, { replace: true })
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401) { navigate('/login'); return }
      if (status === 400) {
        const { fieldErrors, globalMessage } = breakdownApiError(err)
        setErrors(fieldErrors as FormErrors)
        setGlobalError(globalMessage)
      } else {
        const msg = parseApiError(err, 'Program oluşturulamadı.')
        setGlobalError(msg)
        toast.error(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const athleteName = athlete
    ? [athlete.firstName, athlete.lastName].filter(Boolean).join(' ') || athlete.email
    : 'Sporcu'

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header />
        <div className="page-content">
          <div className="section-header" style={{ marginBottom: 16 }}>
            <button className="btn-back" onClick={() => navigate(-1)}>← Geri</button>
            <span className="section-title">Yeni Program · {athleteName}</span>
          </div>

          {globalError && <div className="error-banner">⚠️ {globalError}</div>}

          {athlete ? (
            <AthleteProfileSummary user={athlete} />
          ) : (
            <Skeleton variant="card" height={180} style={{ marginBottom: 20 }} />
          )}

          <form onSubmit={handleSubmit}>
            <div className="profile-edit-section">
              <div className="profile-edit-section-title">📋 Program Bilgileri</div>

              <div className="ob-form-group">
                <label className="ob-label">Program Adı</label>
                <input
                  className={`ob-input ${errors.name ? 'error' : ''}`}
                  type="text"
                  placeholder="Örn. 12 Haftalık Kas Kazanım Programı"
                  value={form.name ?? ''}
                  onChange={(e) => setField('name', e.target.value)}
                  autoFocus
                />
                {errors.name && <span className="ob-field-error">{errors.name}</span>}
              </div>

              <div className="ob-form-group">
                <label className="ob-label">Açıklama (opsiyonel)</label>
                <textarea
                  className={`ob-input ${errors.description ? 'error' : ''}`}
                  rows={3}
                  placeholder="Programın amacını, odak alanlarını yaz..."
                  value={form.description ?? ''}
                  onChange={(e) => setField('description', e.target.value)}
                />
                {errors.description && <span className="ob-field-error">{errors.description}</span>}
              </div>

              <div className="ob-form-row">
                <div className="ob-form-group">
                  <label className="ob-label">Süre (hafta)</label>
                  <input
                    className={`ob-input ${errors.durationWeeks ? 'error' : ''}`}
                    type="number"
                    min={1}
                    max={52}
                    value={form.durationWeeks ?? ''}
                    onChange={(e) => setField('durationWeeks', parseInt(e.target.value) || 0)}
                  />
                  {errors.durationWeeks && <span className="ob-field-error">{errors.durationWeeks}</span>}
                </div>
                <div className="ob-form-group">
                  <label className="ob-label">Zorluk</label>
                  <select
                    className={`ob-select ${errors.difficulty ? 'error' : ''}`}
                    value={form.difficulty ?? ''}
                    onChange={(e) => setField('difficulty', e.target.value as CreateTrainingProgramRequest['difficulty'])}
                  >
                    <option value="">Seçiniz</option>
                    <option value="Beginner">Başlangıç</option>
                    <option value="Intermediate">Orta Seviye</option>
                    <option value="Advanced">İleri Seviye</option>
                  </select>
                  {errors.difficulty && <span className="ob-field-error">{errors.difficulty}</span>}
                </div>
              </div>
            </div>

            <div className="profile-edit-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate(-1)}
                disabled={submitting}
              >
                İptal
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting && <span className="loading-spinner" />}
                {submitting ? 'Oluşturuluyor…' : 'Devam et: Schedule →'}
              </button>
            </div>
          </form>
        </div>
        <BottomNav />
      </div>
    </div>
  )
}
