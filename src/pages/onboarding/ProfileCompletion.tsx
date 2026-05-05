import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CompleteProfileRequest, FitnessGoal } from '../../types/api.types'
import { completeProfile } from '../../services/users'
import { getStoredUser } from '../../services/auth'
import '../../styles/dashboard.css'

type FormErrors = Partial<Record<keyof CompleteProfileRequest, string>>

const FITNESS_GOALS: FitnessGoal[] = [
  'Muscle Gain', 'Fat Loss', 'General Health', 'Strength', 'Endurance', 'Flexibility',
]

const GOAL_LABELS: Record<FitnessGoal, string> = {
  'Muscle Gain': 'Kas Kazanımı',
  'Fat Loss': 'Yağ Yakımı',
  'General Health': 'Genel Sağlık',
  'Strength': 'Güç Antrenmanı',
  'Endurance': 'Dayanıklılık',
  'Flexibility': 'Esneklik',
}

function validate(form: Partial<CompleteProfileRequest>): FormErrors {
  const errors: FormErrors = {}
  if (!form.firstName?.trim()) errors.firstName = 'Ad zorunludur.'
  if (!form.lastName?.trim()) errors.lastName = 'Soyad zorunludur.'
  if (!form.age) {
    errors.age = 'Yaş zorunludur.'
  } else if (form.age < 13 || form.age > 120) {
    errors.age = 'Yaş 13 ile 120 arasında olmalıdır.'
  }
  if (!form.height || form.height <= 0) errors.height = 'Boy pozitif bir sayı olmalıdır.'
  if (!form.weight || form.weight <= 0) errors.weight = 'Kilo pozitif bir sayı olmalıdır.'
  if (!form.gender) errors.gender = 'Cinsiyet seçiniz.'
  if (!form.fitnessGoal) errors.fitnessGoal = 'Hedef seçiniz.'
  if (!form.fitnessLevel) errors.fitnessLevel = 'Seviye seçiniz.'
  return errors
}

export default function ProfileCompletion() {
  const navigate = useNavigate()
  const user = getStoredUser()

  const [form, setForm] = useState<Partial<CompleteProfileRequest>>({})
  const [errors, setErrors] = useState<FormErrors>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<keyof CompleteProfileRequest, boolean>>>({})

  function handleChange<K extends keyof CompleteProfileRequest>(key: K, value: CompleteProfileRequest[K]) {
    const updated = { ...form, [key]: value }
    setForm(updated)
    if (touched[key]) {
      const newErrors = validate(updated)
      setErrors((prev) => ({ ...prev, [key]: newErrors[key] }))
    }
  }

  function handleBlur(key: keyof CompleteProfileRequest) {
    setTouched((prev) => ({ ...prev, [key]: true }))
    const newErrors = validate(form)
    setErrors((prev) => ({ ...prev, [key]: newErrors[key] }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const allTouched = Object.fromEntries(
      ['firstName', 'lastName', 'age', 'height', 'weight', 'gender', 'fitnessGoal', 'fitnessLevel'].map((k) => [k, true])
    ) as typeof touched
    setTouched(allTouched)

    const validationErrors = validate(form)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    if (!user?.userId) {
      navigate('/login')
      return
    }

    setLoading(true)
    setGlobalError(null)
    try {
      await completeProfile(user.userId, form as CompleteProfileRequest)
      navigate('/dashboard')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status: number; data?: { detail?: string } } }
      if (axiosErr?.response?.status === 400) {
        setGlobalError(axiosErr.response.data?.detail ?? 'Giriş bilgilerini kontrol edin.')
      } else if (axiosErr?.response?.status === 401) {
        navigate('/login')
      } else {
        setGlobalError('Bir hata oluştu. Lütfen tekrar deneyin.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="onboarding-bg">
      <div className="onboarding-card">
        <div className="onboarding-header">
          <div className="onboarding-icon">🏋️</div>
          <h1 className="onboarding-title">Profilini Tamamla</h1>
          <p className="onboarding-subtitle">
            Sana özel antrenman programı oluşturabilmemiz için bu bilgilere ihtiyacımız var.
          </p>
        </div>

        {globalError && <div className="global-error">⚠️ {globalError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          {/* Ad / Soyad */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Ad</label>
              <input
                className={`form-input ${errors.firstName ? 'error' : ''}`}
                type="text"
                placeholder="Adın"
                value={form.firstName ?? ''}
                onChange={(e) => handleChange('firstName', e.target.value)}
                onBlur={() => handleBlur('firstName')}
              />
              {errors.firstName && <div className="form-error">{errors.firstName}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Soyad</label>
              <input
                className={`form-input ${errors.lastName ? 'error' : ''}`}
                type="text"
                placeholder="Soyadın"
                value={form.lastName ?? ''}
                onChange={(e) => handleChange('lastName', e.target.value)}
                onBlur={() => handleBlur('lastName')}
              />
              {errors.lastName && <div className="form-error">{errors.lastName}</div>}
            </div>
          </div>

          {/* Yaş / Cinsiyet */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Yaş</label>
              <input
                className={`form-input ${errors.age ? 'error' : ''}`}
                type="number"
                placeholder="25"
                min={13}
                max={120}
                value={form.age ?? ''}
                onChange={(e) => handleChange('age', parseInt(e.target.value) || 0)}
                onBlur={() => handleBlur('age')}
              />
              {errors.age && <div className="form-error">{errors.age}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Cinsiyet</label>
              <select
                className={`form-select ${errors.gender ? 'error' : ''}`}
                value={form.gender ?? ''}
                onChange={(e) => handleChange('gender', e.target.value as CompleteProfileRequest['gender'])}
                onBlur={() => handleBlur('gender')}
              >
                <option value="">Seçiniz</option>
                <option value="Male">Erkek</option>
                <option value="Female">Kadın</option>
                <option value="Other">Diğer</option>
              </select>
              {errors.gender && <div className="form-error">{errors.gender}</div>}
            </div>
          </div>

          {/* Boy / Kilo */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Boy (cm)</label>
              <input
                className={`form-input ${errors.height ? 'error' : ''}`}
                type="number"
                placeholder="175"
                step="0.1"
                value={form.height ?? ''}
                onChange={(e) => handleChange('height', parseFloat(e.target.value) || 0)}
                onBlur={() => handleBlur('height')}
              />
              {errors.height && <div className="form-error">{errors.height}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Kilo (kg)</label>
              <input
                className={`form-input ${errors.weight ? 'error' : ''}`}
                type="number"
                placeholder="70"
                step="0.1"
                value={form.weight ?? ''}
                onChange={(e) => handleChange('weight', parseFloat(e.target.value) || 0)}
                onBlur={() => handleBlur('weight')}
              />
              {errors.weight && <div className="form-error">{errors.weight}</div>}
            </div>
          </div>

          {/* Fitness Hedefi */}
          <div className="form-group">
            <label className="form-label">Fitness Hedefi</label>
            <select
              className={`form-select ${errors.fitnessGoal ? 'error' : ''}`}
              value={form.fitnessGoal ?? ''}
              onChange={(e) => handleChange('fitnessGoal', e.target.value)}
              onBlur={() => handleBlur('fitnessGoal')}
            >
              <option value="">Hedefini seç</option>
              {FITNESS_GOALS.map((goal) => (
                <option key={goal} value={goal}>{GOAL_LABELS[goal]}</option>
              ))}
            </select>
            {errors.fitnessGoal && <div className="form-error">{errors.fitnessGoal}</div>}
          </div>

          {/* Fitness Seviyesi */}
          <div className="form-group">
            <label className="form-label">Fitness Seviyesi</label>
            <select
              className={`form-select ${errors.fitnessLevel ? 'error' : ''}`}
              value={form.fitnessLevel ?? ''}
              onChange={(e) => handleChange('fitnessLevel', e.target.value as CompleteProfileRequest['fitnessLevel'])}
              onBlur={() => handleBlur('fitnessLevel')}
            >
              <option value="">Seviyeni seç</option>
              <option value="Beginner">Başlangıç — Yeni başlıyorum</option>
              <option value="Intermediate">Orta — Düzenli antrenman yapıyorum</option>
              <option value="Advanced">İleri — Deneyimliyim</option>
            </select>
            {errors.fitnessLevel && <div className="form-error">{errors.fitnessLevel}</div>}
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading && <span className="loading-spinner" />}
            {loading ? 'Kaydediliyor...' : 'Devam Et →'}
          </button>
        </form>
      </div>
    </div>
  )
}
