import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CompleteProfileRequest, FitnessGoalDto } from '../../types/api.types'
import { completeProfile, getFitnessGoals, getUserProfile } from '../../services/users'
import { getStoredUser } from '../../services/auth'
import { parseApiError } from '../../utils/errorHandler'
import '../../styles/onboarding.css'

// ─── Icon Mapping ───────────────────────────────────────────────────────────

const GOAL_ICONS: Record<string, string> = {
  'Muscle Gain': '💪',
  'Fat Loss': '🔥',
  'Strength': '🏋️',
  'Endurance': '🏃',
  'Flexibility': '🧘',
  'General Fitness': '❤️',
  'Weight Loss': '⚖️',
  'Toning': '✨',
  'Athletic': '🏅',
}

function getGoalIcon(goalName: string): string {
  return GOAL_ICONS[goalName] || '🎯'
}

const LEVELS: { value: CompleteProfileRequest['fitnessLevel']; icon: string; name: string; desc: string; bars: number }[] = [
  { value: 'Beginner',     icon: '🌱', name: 'Başlangıç',  desc: 'Yeni başlıyorum, temel alışkanlıklar kazanıyorum', bars: 1 },
  { value: 'Intermediate', icon: '🌿', name: 'Orta Seviye', desc: 'Düzenli antrenman yapıyorum, ilerliyorum',         bars: 2 },
  { value: 'Advanced',     icon: '🔥', name: 'İleri Seviye', desc: 'Deneyimliyim, yoğun programlara hazırım',        bars: 3 },
]

// ─── BMI ────────────────────────────────────────────────────────────────────

function calcBMI(height: number, weight: number) {
  if (!height || !weight || height <= 0 || weight <= 0) return null
  const h = height / 100
  return Math.round((weight / (h * h)) * 10) / 10
}

function bmiCategory(bmi: number): { cls: string; label: string } {
  if (bmi < 18.5) return { cls: 'underweight', label: 'Zayıf' }
  if (bmi < 25)   return { cls: 'normal',      label: 'Normal' }
  if (bmi < 30)   return { cls: 'overweight',  label: 'Kilolu' }
  return              { cls: 'obese',       label: 'Obez' }
}

function bmiThumbPercent(bmi: number): number {
  // Clamp between 10–45 → map to 0–100%
  return Math.min(100, Math.max(0, ((bmi - 10) / (45 - 10)) * 100))
}

// ─── Validation ─────────────────────────────────────────────────────────────

type FormErrors = Partial<Record<keyof CompleteProfileRequest, string>>

function validateStep1(f: Partial<CompleteProfileRequest>): FormErrors {
  const e: FormErrors = {}
  if (!f.firstName?.trim()) e.firstName = 'Ad zorunludur.'
  if (!f.lastName?.trim())  e.lastName  = 'Soyad zorunludur.'
  if (!f.age) {
    e.age = 'Yaş zorunludur.'
  } else if (f.age < 13 || f.age > 120) {
    e.age = 'Yaş 13–120 arasında olmalı.'
  }
  if (!f.gender) e.gender = 'Cinsiyet seçiniz.'
  return e
}

function validateStep2(f: Partial<CompleteProfileRequest>): FormErrors {
  const e: FormErrors = {}
  if (!f.height || f.height <= 0) e.height = 'Boy pozitif bir sayı olmalı.'
  if (!f.weight || f.weight <= 0) e.weight = 'Kilo pozitif bir sayı olmalı.'
  return e
}

function validateStep3(f: Partial<CompleteProfileRequest>): FormErrors {
  const e: FormErrors = {}
  if (!f.fitnessGoal)  e.fitnessGoal  = 'Bir hedef seçiniz.'
  if (!f.fitnessLevel) e.fitnessLevel = 'Bir seviye seçiniz.'
  return e
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ProfileCompletion() {
  const navigate = useNavigate()
  const user = getStoredUser()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [form, setForm] = useState<Partial<CompleteProfileRequest>>({})
  const [errors, setErrors] = useState<FormErrors>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [goals, setGoals] = useState<FitnessGoalDto[]>([])
  const [goalsLoading, setGoalsLoading] = useState(true)
  const [goalsError, setGoalsError] = useState<string | null>(null)

  useEffect(() => {
    async function loadProfile() {
      if (!user?.userId) return
      try {
        const profile = await getUserProfile(user.userId)
        setForm({
          firstName: profile.firstName ?? '',
          lastName: profile.lastName ?? '',
          age: profile.age ?? undefined,
          height: profile.height ?? undefined,
          weight: profile.weight ?? undefined,
          gender: profile.gender ?? undefined,
          fitnessLevel: profile.fitnessLevel ?? undefined,
        })
      } catch {
        // Fail silently - if no profile exists, form starts empty
      }
    }
    loadProfile()
  }, [user?.userId])

  useEffect(() => {
    async function loadGoals() {
      try {
        setGoalsLoading(true)
        setGoalsError(null)
        const data = await getFitnessGoals()
        setGoals(data.filter(g => g.isActive))
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { detail?: string } } }
        setGoalsError(axiosErr?.response?.data?.detail ?? 'Hedefler yüklenemedi')
      } finally {
        setGoalsLoading(false)
      }
    }
    loadGoals()
  }, [])

  function set<K extends keyof CompleteProfileRequest>(key: K, value: CompleteProfileRequest[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function goNext() {
    const errs = step === 1 ? validateStep1(form) : step === 2 ? validateStep2(form) : {}
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setStep((s) => (s < 3 ? ((s + 1) as 2 | 3) : s))
  }

  function goBack() {
    setErrors({})
    setStep((s) => (s > 1 ? ((s - 1) as 1 | 2) : s))
  }

  async function handleSubmit() {
    const errs = validateStep3(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    if (!user?.userId) { navigate('/login'); return }

    setLoading(true)
    setGlobalError(null)
    try {
      await completeProfile(user.userId, form as CompleteProfileRequest)
      navigate('/dashboard')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status: number } }
      if (axiosErr?.response?.status === 401) {
        navigate('/login')
      } else {
        setGlobalError(parseApiError(err))
      }
    } finally {
      setLoading(false)
    }
  }

  const bmi = calcBMI(form.height ?? 0, form.weight ?? 0)
  const bmiInfo = bmi ? bmiCategory(bmi) : null

  return (
    <div className="onboarding-bg">
      <div className="onboarding-card">

        {/* ── Progress ── */}
        <div className="ob-steps">
          {([1, 2, 3] as const).map((n, i) => (
            <>
              <div key={n} className={`ob-step ${step === n ? 'active' : step > n ? 'done' : ''}`}>
                <div className="ob-step-dot">
                  {step > n ? '✓' : n}
                </div>
                <div className="ob-step-label">
                  {n === 1 ? 'Kişisel' : n === 2 ? 'Vücut' : 'Hedef'}
                </div>
              </div>
              {i < 2 && <div key={`line-${n}`} className={`ob-step-line ${step > n ? 'done' : ''}`} />}
            </>
          ))}
        </div>

        {globalError && <div className="global-error">⚠️ {globalError}</div>}

        {/* ══════════════════════════════════════════ STEP 1 */}
        {step === 1 && (
          <>
            <div className="ob-step-header">
              <div className="ob-step-icon">👤</div>
              <div className="ob-step-title">Seni tanıyalım</div>
              <div className="ob-step-desc">Koçunun seni daha iyi tanıması için temel bilgilerini paylaş.</div>
            </div>

            <div className="ob-form-row">
              <div className="ob-form-group">
                <label className="ob-label">Ad</label>
                <input
                  className={`ob-input ${errors.firstName ? 'error' : ''}`}
                  type="text"
                  placeholder="Adın"
                  value={form.firstName ?? ''}
                  onChange={(e) => set('firstName', e.target.value)}
                />
                {errors.firstName && <span className="ob-field-error">{errors.firstName}</span>}
              </div>
              <div className="ob-form-group">
                <label className="ob-label">Soyad</label>
                <input
                  className={`ob-input ${errors.lastName ? 'error' : ''}`}
                  type="text"
                  placeholder="Soyadın"
                  value={form.lastName ?? ''}
                  onChange={(e) => set('lastName', e.target.value)}
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
                  placeholder="25"
                  min={13}
                  max={120}
                  value={form.age ?? ''}
                  onChange={(e) => set('age', parseInt(e.target.value) || 0)}
                />
                {errors.age && <span className="ob-field-error">{errors.age}</span>}
              </div>
              <div className="ob-form-group">
                <label className="ob-label">Cinsiyet</label>
                <select
                  className={`ob-select ${errors.gender ? 'error' : ''}`}
                  value={form.gender ?? ''}
                  onChange={(e) => set('gender', e.target.value as CompleteProfileRequest['gender'])}
                >
                  <option value="">Seçiniz</option>
                  <option value="Male">Erkek</option>
                  <option value="Female">Kadın</option>
                  <option value="Other">Diğer</option>
                </select>
                {errors.gender && <span className="ob-field-error">{errors.gender}</span>}
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════ STEP 2 */}
        {step === 2 && (
          <>
            <div className="ob-step-header">
              <div className="ob-step-icon">📏</div>
              <div className="ob-step-title">Vücut ölçülerin</div>
              <div className="ob-step-desc">Boy ve kilonu girerek sana özel program parametreleri hesaplayalım.</div>
            </div>

            <div className="ob-form-row">
              <div className="ob-form-group">
                <label className="ob-label">Boy (cm)</label>
                <input
                  className={`ob-input ${errors.height ? 'error' : ''}`}
                  type="number"
                  placeholder="175"
                  step="0.1"
                  value={form.height ?? ''}
                  onChange={(e) => set('height', parseFloat(e.target.value) || 0)}
                />
                {errors.height && <span className="ob-field-error">{errors.height}</span>}
              </div>
              <div className="ob-form-group">
                <label className="ob-label">Kilo (kg)</label>
                <input
                  className={`ob-input ${errors.weight ? 'error' : ''}`}
                  type="number"
                  placeholder="70"
                  step="0.1"
                  value={form.weight ?? ''}
                  onChange={(e) => set('weight', parseFloat(e.target.value) || 0)}
                />
                {errors.weight && <span className="ob-field-error">{errors.weight}</span>}
              </div>
            </div>

            {bmi && bmiInfo && (
              <div className="bmi-panel">
                <div className={`bmi-score ${bmiInfo.cls}`}>{bmi}</div>
                <div className="bmi-info">
                  <div className={`bmi-label ${bmiInfo.cls}`}>VKİ — {bmiInfo.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Sağlıklı aralık: 18.5 – 24.9
                  </div>
                  <div className="bmi-range-bar">
                    <div
                      className="bmi-range-thumb"
                      style={{ left: `${bmiThumbPercent(bmi)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════ STEP 3 */}
        {step === 3 && (
          <>
            <div className="ob-step-header">
              <div className="ob-step-icon">🎯</div>
              <div className="ob-step-title">Hedefin & Seviyeni</div>
              <div className="ob-step-desc">Hangi hedefe ulaşmak istediğini ve mevcut seviyeni seç.</div>
            </div>

            <div className="ob-label" style={{ marginBottom: 8 }}>Fitness Hedefi</div>
            {goalsError && <div className="global-error" style={{ marginBottom: 12 }}>⚠️ {goalsError}</div>}
            {goalsLoading ? (
              <div className="ob-card-grid" style={{ marginBottom: errors.fitnessGoal ? 4 : 20 }}>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="skeleton" style={{ height: '100px', borderRadius: '12px' }} />
                ))}
              </div>
            ) : goals.length === 0 ? (
              <div style={{ marginBottom: 20, padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Hedef seçenekleri yüklenemedi
              </div>
            ) : (
              <div className="ob-card-grid" style={{ marginBottom: errors.fitnessGoal ? 4 : 20 }}>
                {goals.map((g) => (
                  <div
                    key={g.id}
                    className={`ob-goal-card ${form.fitnessGoal === g.id ? 'selected' : ''}`}
                    onClick={() => set('fitnessGoal', g.id)}
                  >
                    <span className="ob-goal-card-icon">{getGoalIcon(g.name)}</span>
                    <span className="ob-goal-card-name">{g.name}</span>
                    <span className="ob-goal-card-desc">{g.description || ''}</span>
                  </div>
                ))}
              </div>
            )}
            {errors.fitnessGoal && <span className="ob-field-error" style={{ display: 'block', marginBottom: 12 }}>{errors.fitnessGoal}</span>}

            <div className="ob-label" style={{ marginBottom: 8 }}>Fitness Seviyesi</div>
            <div className="ob-level-cards">
              {LEVELS.map((l) => (
                <div
                  key={l.value}
                  className={`ob-level-card ${form.fitnessLevel === l.value ? 'selected' : ''}`}
                  onClick={() => set('fitnessLevel', l.value)}
                >
                  <span className="ob-level-icon">{l.icon}</span>
                  <div className="ob-level-info">
                    <div className="ob-level-name">{l.name}</div>
                    <div className="ob-level-desc">{l.desc}</div>
                  </div>
                  <div className="ob-level-bars">
                    {[1, 2, 3].map((b) => (
                      <div key={b} className={`ob-level-bar ${b <= l.bars ? 'filled' : ''}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {errors.fitnessLevel && <span className="ob-field-error">{errors.fitnessLevel}</span>}
          </>
        )}

        {/* ── Nav ── */}
        <div className="ob-nav">
          {step > 1 && (
            <button className="ob-btn-back" onClick={goBack}>← Geri</button>
          )}
          {step < 3 ? (
            <button className="ob-btn-next" onClick={goNext}>
              Devam Et →
            </button>
          ) : (
            <button className="ob-btn-next" onClick={handleSubmit} disabled={loading}>
              {loading && <span className="loading-spinner" />}
              {loading ? 'Kaydediliyor...' : 'Profili Tamamla ✓'}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
