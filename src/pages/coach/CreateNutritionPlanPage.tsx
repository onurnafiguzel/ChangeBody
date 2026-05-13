import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '../../components/shared/Header'
import { Sidebar, BottomNav } from '../../components/shared/Navigation'
import { getUserProfile } from '../../services/users'
import { useToast } from '../../components/shared/Toast'
import type { UserDto } from '../../types/api.types'
import '../../styles/dashboard.css'
import '../../styles/onboarding.css'

type PlanMode = 'single' | 'two'

interface MetaForm {
  title: string
  description: string
  mode: PlanMode
}

export default function CreateNutritionPlanPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { userId } = useParams<{ userId: string }>()

  const [athlete, setAthlete] = useState<UserDto | null>(null)
  const [form, setForm] = useState<MetaForm>({ title: '', description: '', mode: 'single' })
  const [errors, setErrors] = useState<Partial<Record<keyof MetaForm, string>>>({})

  useEffect(() => {
    if (!userId) return
    getUserProfile(userId)
      .then(setAthlete)
      .catch(() => {/* başlık placeholder kalır */})
  }, [userId])

  function setField<K extends keyof MetaForm>(key: K, value: MetaForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    const next: Partial<Record<keyof MetaForm, string>> = {}
    if (!form.title.trim()) next.title = 'Başlık zorunludur.'
    if (form.title.trim().length > 200) next.title = 'Başlık en fazla 200 karakter olabilir.'
    if (form.description.length > 1000) next.description = 'Açıklama en fazla 1000 karakter olabilir.'
    if (Object.keys(next).length > 0) {
      setErrors(next)
      return
    }
    toast.success('Şimdi öğünleri oluştur.')
    navigate(`/coach/nutrition-plans/new/${userId}/builder`, {
      state: {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        mode: form.mode,
      },
    })
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
            <span className="section-title">Yeni Beslenme Programı · {athleteName}</span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="profile-edit-section">
              <div className="profile-edit-section-title">🥗 Plan Bilgileri</div>

              <div className="ob-form-group">
                <label className="ob-label">Başlık</label>
                <input
                  className={`ob-input ${errors.title ? 'error' : ''}`}
                  type="text"
                  placeholder="Örn. Cutting Planı — 1. Hafta"
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                  autoFocus
                />
                {errors.title && <span className="ob-field-error">{errors.title}</span>}
              </div>

              <div className="ob-form-group">
                <label className="ob-label">Açıklama (opsiyonel)</label>
                <textarea
                  className={`ob-input ${errors.description ? 'error' : ''}`}
                  rows={3}
                  placeholder="Hedef kalori, makro dağılımı, özel notlar…"
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                />
                {errors.description && <span className="ob-field-error">{errors.description}</span>}
              </div>

              <div className="profile-edit-section-title" style={{ marginTop: 8 }}>📅 Plan Yapısı</div>

              <div className="np-mode-grid">
                <button
                  type="button"
                  className={`np-mode-card ${form.mode === 'single' ? 'selected' : ''}`}
                  onClick={() => setField('mode', 'single')}
                >
                  <div className="np-mode-icon">🍽️</div>
                  <div className="np-mode-title">Tek Gün</div>
                  <div className="np-mode-desc">Her gün aynı öğünler — sabit beslenme şablonu.</div>
                </button>
                <button
                  type="button"
                  className={`np-mode-card ${form.mode === 'two' ? 'selected' : ''}`}
                  onClick={() => setField('mode', 'two')}
                >
                  <div className="np-mode-icon">💪🛌</div>
                  <div className="np-mode-title">İki Gün</div>
                  <div className="np-mode-desc">Antrenman günü + dinlenme günü ayrı makrolar.</div>
                </button>
              </div>

              <div className="np-mode-hint">
                İki gün modunda antrenman günü genelde daha fazla karbonhidrat ve kalori içerir;
                dinlenme günü bu değerleri düşürür.
              </div>
            </div>

            <div className="profile-edit-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate(-1)}
              >
                İptal
              </button>
              <button type="submit" className="btn-primary">
                Devam et: Öğünler →
              </button>
            </div>
          </form>
        </div>
        <BottomNav />
      </div>
    </div>
  )
}
