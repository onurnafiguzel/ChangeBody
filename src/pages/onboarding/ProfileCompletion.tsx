import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CompleteProfileRequest, FitnessGoalDto, PhotoViewType } from '../../types/api.types'
import { completeProfile, getFitnessGoals, getUserProfile } from '../../services/users'
import { uploadUserPhotos } from '../../services/userPhotos'
import { getStoredUser } from '../../services/auth'
import { parseApiError } from '../../utils/errorHandler'
import PhotoUploadSlot from '../../components/onboarding/PhotoUploadSlot'
import '../../styles/onboarding.css'

interface PhotoFiles {
  Front: File | null
  Back: File | null
  Left: File | null
  Right: File | null
}

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
  if (!f.fitnessGoalId)  e.fitnessGoalId  = 'Bir hedef seçiniz.'
  if (!f.fitnessLevel) e.fitnessLevel = 'Bir seviye seçiniz.'
  return e
}

function validateStep4(f: Partial<CompleteProfileRequest>): FormErrors {
  const e: FormErrors = {}
  const tooLong = (s?: string | null) => (s ? s.length > 2000 : false)
  if (tooLong(f.dailyWorkLifestyle))  e.dailyWorkLifestyle  = 'En fazla 2000 karakter.'
  if (tooLong(f.healthConditions))    e.healthConditions    = 'En fazla 2000 karakter.'
  if (tooLong(f.foodAllergies))       e.foodAllergies       = 'En fazla 2000 karakter.'
  if (tooLong(f.supplementInterest))  e.supplementInterest  = 'En fazla 2000 karakter.'
  return e
}

const MEASUREMENT_FIELDS: Array<keyof CompleteProfileRequest> = [
  'waistCm', 'armCm', 'legCm', 'neckCm', 'hipCm',
]
const PR_FIELDS: Array<keyof CompleteProfileRequest> = [
  'benchPressPR', 'squatPR', 'deadliftPR', 'overheadPressPR', 'barbellRowPR', 'pullUpPR',
]

function validatePositiveNumbers(
  f: Partial<CompleteProfileRequest>,
  keys: Array<keyof CompleteProfileRequest>,
): FormErrors {
  const e: FormErrors = {}
  for (const k of keys) {
    const v = f[k] as number | null | undefined
    if (v != null && (typeof v !== 'number' || isNaN(v) || v <= 0)) {
      e[k] = 'Pozitif bir sayı girin veya boş bırakın.'
    }
  }
  return e
}

const SUPP_DAYS = [0, 1, 2, 3, 4, 5, 6, 7] as const

// Submit payload builder: trim ile boş string'leri undefined yap;
// supplementInterest yalnızca wantsSupplementSupport=true ise gönderilir.
function buildPayload(f: Partial<CompleteProfileRequest>): CompleteProfileRequest {
  const trimText = (s?: string | null): string | undefined => {
    const t = s?.trim()
    return t ? t : undefined
  }
  return {
    firstName: (f.firstName ?? '').trim(),
    lastName: (f.lastName ?? '').trim(),
    age: f.age ?? undefined,
    height: f.height ?? undefined,
    weight: f.weight ?? undefined,
    gender: f.gender ?? undefined,
    fitnessGoalId: f.fitnessGoalId ?? undefined,
    fitnessLevel: f.fitnessLevel ?? undefined,
    dailyWorkLifestyle: trimText(f.dailyWorkLifestyle),
    gymDaysPerWeek: f.gymDaysPerWeek ?? undefined,
    healthConditions: trimText(f.healthConditions),
    foodAllergies: trimText(f.foodAllergies),
    supplementInterest:
      f.wantsSupplementSupport === true ? trimText(f.supplementInterest) : undefined,
    wantsSupplementSupport: f.wantsSupplementSupport ?? undefined,
    waistCm: f.waistCm ?? undefined,
    armCm: f.armCm ?? undefined,
    legCm: f.legCm ?? undefined,
    neckCm: f.neckCm ?? undefined,
    hipCm: f.gender === 'Female' ? (f.hipCm ?? undefined) : undefined,
    benchPressPR: f.benchPressPR ?? undefined,
    squatPR: f.squatPR ?? undefined,
    deadliftPR: f.deadliftPR ?? undefined,
    overheadPressPR: f.overheadPressPR ?? undefined,
    barbellRowPR: f.barbellRowPR ?? undefined,
    pullUpPR: f.pullUpPR ?? undefined,
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ProfileCompletion() {
  const navigate = useNavigate()
  const user = getStoredUser()

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1)
  const [photos, setPhotos] = useState<PhotoFiles>({
    Front: null, Back: null, Left: null, Right: null,
  })
  const [photoWarning, setPhotoWarning] = useState<string | null>(null)
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
    const errs =
      step === 1 ? validateStep1(form) :
      step === 2 ? validateStep2(form) :
      step === 3 ? validateStep3(form) :
      step === 4 ? validateStep4(form) :
      step === 5 ? validatePositiveNumbers(form, MEASUREMENT_FIELDS) :
      step === 6 ? validatePositiveNumbers(form, PR_FIELDS) : {}
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setStep((s) => (s < 7 ? ((s + 1) as 2 | 3 | 4 | 5 | 6 | 7) : s))
  }

  function goBack() {
    setErrors({})
    setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4 | 5 | 6) : s))
  }

  function skipStep() {
    // Yeni opsiyonel adımlar (5, 6) için: validasyon olmadan field'ları temizleyip ilerle.
    if (step === 5) {
      setForm((p) => ({ ...p, waistCm: undefined, armCm: undefined, legCm: undefined, neckCm: undefined, hipCm: undefined }))
    } else if (step === 6) {
      setForm((p) => ({
        ...p, benchPressPR: undefined, squatPR: undefined, deadliftPR: undefined,
        overheadPressPR: undefined, barbellRowPR: undefined, pullUpPR: undefined,
      }))
    }
    setErrors({})
    setStep((s) => (s < 7 ? ((s + 1) as 2 | 3 | 4 | 5 | 6 | 7) : s))
  }

  const photosReady = !!(photos.Front && photos.Back && photos.Left && photos.Right)

  function setPhoto(view: PhotoViewType, file: File | null) {
    setPhotos((prev) => ({ ...prev, [view]: file }))
    setPhotoWarning(null)
  }

  async function handleSubmit() {
    if (!photosReady) {
      setGlobalError('Lütfen 4 fotoğrafı da seçin.')
      return
    }
    if (!user?.userId) { navigate('/login'); return }

    setLoading(true)
    setGlobalError(null)
    setPhotoWarning(null)
    try {
      // 1) Profil kaydı
      await completeProfile(user.userId, buildPayload(form))
      // 2) Fotoğraflar
      try {
        await uploadUserPhotos(user.userId, {
          front: photos.Front!,
          back: photos.Back!,
          left: photos.Left!,
          right: photos.Right!,
        })
        navigate('/dashboard')
      } catch (photoErr: unknown) {
        const status = (photoErr as { response?: { status?: number } })?.response?.status
        // Profil zaten kaydedildi — kullanıcıya bunu anlat, kaybı engelle
        if (status === 401) { navigate('/login'); return }
        setPhotoWarning(
          parseApiError(photoErr, 'Profil kaydedildi ama fotoğraflar yüklenemedi. Dashboard üzerinden tekrar deneyebilirsin.'),
        )
      }
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
          {([1, 2, 3, 4, 5, 6, 7] as const).map((n, i) => (
            <>
              <div key={n} className={`ob-step ${step === n ? 'active' : step > n ? 'done' : ''}`}>
                <div className="ob-step-dot">
                  {step > n ? '✓' : n}
                </div>
                <div className="ob-step-label">
                  {n === 1 ? 'Kişisel'
                    : n === 2 ? 'Vücut'
                    : n === 3 ? 'Hedef'
                    : n === 4 ? 'Sağlık'
                    : n === 5 ? 'Ölçüm'
                    : n === 6 ? 'PR'
                    : 'Fotoğraf'}
                </div>
              </div>
              {i < 6 && <div key={`line-${n}`} className={`ob-step-line ${step > n ? 'done' : ''}`} />}
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
              <div className="ob-card-grid" style={{ marginBottom: errors.fitnessGoalId ? 4 : 20 }}>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="skeleton" style={{ height: '100px', borderRadius: '12px' }} />
                ))}
              </div>
            ) : goals.length === 0 ? (
              <div style={{ marginBottom: 20, padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Hedef seçenekleri yüklenemedi
              </div>
            ) : (
              <div className="ob-card-grid" style={{ marginBottom: errors.fitnessGoalId ? 4 : 20 }}>
                {goals.map((g) => (
                  <div
                    key={g.id}
                    className={`ob-goal-card ${form.fitnessGoalId === g.id ? 'selected' : ''}`}
                    onClick={() => set('fitnessGoalId', g.id)}
                  >
                    <span className="ob-goal-card-icon">{getGoalIcon(g.name)}</span>
                    <span className="ob-goal-card-name">{g.name}</span>
                    <span className="ob-goal-card-desc">{g.description || ''}</span>
                  </div>
                ))}
              </div>
            )}
            {errors.fitnessGoalId && <span className="ob-field-error" style={{ display: 'block', marginBottom: 12 }}>{errors.fitnessGoalId}</span>}

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

        {/* ══════════════════════════════════════════ STEP 4 — Yaşam Tarzı & Sağlık */}
        {step === 4 && (
          <>
            <div className="ob-step-header">
              <div className="ob-step-icon">⚕️</div>
              <div className="ob-step-title">Yaşam Tarzı & Sağlık</div>
              <div className="ob-step-desc">
                Bu sorular opsiyoneldir, koçunun sana daha uygun program hazırlamasına yardımcı olur.
              </div>
            </div>

            <div className="ob-form-group">
              <label className="ob-label">💼 Günlük iş yaşantın <span className="ob-optional">(opsiyonel)</span></label>
              <textarea
                className={`ob-input ${errors.dailyWorkLifestyle ? 'error' : ''}`}
                rows={2}
                placeholder="Örn. Masa başı 8 saat, ayakta çalışıyorum..."
                maxLength={2000}
                value={form.dailyWorkLifestyle ?? ''}
                onChange={(e) => set('dailyWorkLifestyle', e.target.value)}
              />
              <div className="ob-char-counter">{(form.dailyWorkLifestyle ?? '').length}/2000</div>
              {errors.dailyWorkLifestyle && <span className="ob-field-error">{errors.dailyWorkLifestyle}</span>}
            </div>

            <div className="ob-form-group">
              <label className="ob-label">🏋️ Haftada kaç gün gym'e erişimin var?</label>
              <div className="ob-segmented">
                {SUPP_DAYS.map((d) => (
                  <button
                    type="button"
                    key={d}
                    className={form.gymDaysPerWeek === d ? 'active' : ''}
                    onClick={() => set('gymDaysPerWeek', d)}
                  >
                    {d}
                  </button>
                ))}
                {form.gymDaysPerWeek != null && (
                  <button
                    type="button"
                    className="ob-segmented-clear"
                    onClick={() => set('gymDaysPerWeek', undefined)}
                    title="Seçimi temizle"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="ob-form-group">
              <label className="ob-label">⚕️ Sağlık problemlerin <span className="ob-optional">(opsiyonel)</span></label>
              <textarea
                className={`ob-input ${errors.healthConditions ? 'error' : ''}`}
                rows={2}
                placeholder="Örn. Sırt ağrısı, diz problemi..."
                maxLength={2000}
                value={form.healthConditions ?? ''}
                onChange={(e) => set('healthConditions', e.target.value)}
              />
              <div className="ob-char-counter">{(form.healthConditions ?? '').length}/2000</div>
              {errors.healthConditions && <span className="ob-field-error">{errors.healthConditions}</span>}
            </div>

            <div className="ob-form-group">
              <label className="ob-label">🥜 Besin alerjilerin <span className="ob-optional">(opsiyonel)</span></label>
              <textarea
                className={`ob-input ${errors.foodAllergies ? 'error' : ''}`}
                rows={2}
                placeholder="Örn. Laktoz, fındık, gluten..."
                maxLength={2000}
                value={form.foodAllergies ?? ''}
                onChange={(e) => set('foodAllergies', e.target.value)}
              />
              <div className="ob-char-counter">{(form.foodAllergies ?? '').length}/2000</div>
              {errors.foodAllergies && <span className="ob-field-error">{errors.foodAllergies}</span>}
            </div>

            <div className="ob-form-group">
              <label className="ob-label">💊 Supplement desteği almak ister misin?</label>
              <div className="ob-radio-group">
                {([
                  { val: true, label: 'Evet, ilgilenirim' },
                  { val: false, label: 'Hayır, gerekmez' },
                  { val: null, label: 'Belirtmek istemiyorum' },
                ] as const).map((opt) => {
                  const isSel =
                    (opt.val === null && (form.wantsSupplementSupport === null || form.wantsSupplementSupport === undefined)) ||
                    (opt.val !== null && form.wantsSupplementSupport === opt.val)
                  return (
                    <button
                      type="button"
                      key={String(opt.val)}
                      className={`ob-radio-item ${isSel ? 'selected' : ''}`}
                      onClick={() => set('wantsSupplementSupport', opt.val as unknown as CompleteProfileRequest['wantsSupplementSupport'])}
                    >
                      <span className="ob-radio-dot">{isSel ? '●' : '○'}</span>
                      <span>{opt.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {form.wantsSupplementSupport === true && (
              <div className="ob-form-group">
                <label className="ob-label">Hangi supplement'lere ilgilisin?</label>
                <textarea
                  className={`ob-input ${errors.supplementInterest ? 'error' : ''}`}
                  rows={2}
                  placeholder="Örn. Whey protein, kreatin, omega-3..."
                  maxLength={2000}
                  value={form.supplementInterest ?? ''}
                  onChange={(e) => set('supplementInterest', e.target.value)}
                />
                <div className="ob-char-counter">{(form.supplementInterest ?? '').length}/2000</div>
                {errors.supplementInterest && <span className="ob-field-error">{errors.supplementInterest}</span>}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════ STEP 5 — Vücut Ölçüleri */}
        {step === 5 && (
          <>
            <div className="ob-step-header">
              <div className="ob-step-icon">📐</div>
              <div className="ob-step-title">Başlangıç Ölçülerin</div>
              <div className="ob-step-desc">
                Aylık ilerlemeni görebilmen için başlangıç değerlerini paylaş. Hepsi opsiyonel.
              </div>
            </div>

            <div className="ob-form-row">
              <div className="ob-form-group">
                <label className="ob-label">Bel çevresi (cm) <span className="ob-optional">(opsiyonel)</span></label>
                <input
                  className={`ob-input ${errors.waistCm ? 'error' : ''}`}
                  type="number" step="0.1" placeholder="80"
                  value={form.waistCm ?? ''}
                  onChange={(e) => set('waistCm', e.target.value ? parseFloat(e.target.value) : null)}
                />
                {errors.waistCm && <span className="ob-field-error">{errors.waistCm}</span>}
              </div>
              <div className="ob-form-group">
                <label className="ob-label">Boyun çevresi (cm) <span className="ob-optional">(opsiyonel)</span></label>
                <input
                  className={`ob-input ${errors.neckCm ? 'error' : ''}`}
                  type="number" step="0.1" placeholder="38"
                  value={form.neckCm ?? ''}
                  onChange={(e) => set('neckCm', e.target.value ? parseFloat(e.target.value) : null)}
                />
                {errors.neckCm && <span className="ob-field-error">{errors.neckCm}</span>}
              </div>
            </div>

            <div className="ob-form-row">
              <div className="ob-form-group">
                <label className="ob-label">Kol çevresi (cm) <span className="ob-optional">(opsiyonel)</span></label>
                <input
                  className={`ob-input ${errors.armCm ? 'error' : ''}`}
                  type="number" step="0.1" placeholder="35"
                  value={form.armCm ?? ''}
                  onChange={(e) => set('armCm', e.target.value ? parseFloat(e.target.value) : null)}
                />
                {errors.armCm && <span className="ob-field-error">{errors.armCm}</span>}
              </div>
              <div className="ob-form-group">
                <label className="ob-label">Bacak çevresi (cm) <span className="ob-optional">(opsiyonel)</span></label>
                <input
                  className={`ob-input ${errors.legCm ? 'error' : ''}`}
                  type="number" step="0.1" placeholder="55"
                  value={form.legCm ?? ''}
                  onChange={(e) => set('legCm', e.target.value ? parseFloat(e.target.value) : null)}
                />
                {errors.legCm && <span className="ob-field-error">{errors.legCm}</span>}
              </div>
            </div>

            {form.gender === 'Female' && (
              <div className="ob-form-row">
                <div className="ob-form-group">
                  <label className="ob-label">Kalça çevresi (cm) <span className="ob-optional">(opsiyonel)</span></label>
                  <input
                    className={`ob-input ${errors.hipCm ? 'error' : ''}`}
                    type="number" step="0.1" placeholder="95"
                    value={form.hipCm ?? ''}
                    onChange={(e) => set('hipCm', e.target.value ? parseFloat(e.target.value) : null)}
                  />
                  {errors.hipCm && <span className="ob-field-error">{errors.hipCm}</span>}
                </div>
              </div>
            )}

            <div className="ob-tips-card">
              <div className="ob-tips-title">💡 Bilgi</div>
              <ul className="ob-tips-list">
                <li>Bel + Boyun {form.gender === 'Female' ? '+ Kalça ' : ''}girersen sistem otomatik <strong>vücut yağ oranını</strong> hesaplar (US Navy formülü).</li>
                <li>Aynı ölçüleri her ay yenileyerek ilerlemeni görebilirsin.</li>
              </ul>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════ STEP 6 — Personal Records */}
        {step === 6 && (
          <>
            <div className="ob-step-header">
              <div className="ob-step-icon">🏋️</div>
              <div className="ob-step-title">Personal Record'ların</div>
              <div className="ob-step-desc">
                Şu an kaldırabildiğin maksimum ağırlıkları (1RM) gir. Hepsi opsiyonel — bilmediklerini boş bırakabilirsin.
              </div>
            </div>

            {([
              { key: 'benchPressPR',    label: 'Bench Press' },
              { key: 'squatPR',         label: 'Squat' },
              { key: 'deadliftPR',      label: 'Deadlift' },
              { key: 'overheadPressPR', label: 'Overhead Press' },
              { key: 'barbellRowPR',    label: 'Barbell Row' },
              { key: 'pullUpPR',        label: 'Pull-Up (toplam yük)' },
            ] as const).map((lift) => (
              <div className="ob-form-group" key={lift.key}>
                <label className="ob-label">{lift.label} (kg) <span className="ob-optional">(opsiyonel)</span></label>
                <input
                  className={`ob-input ${errors[lift.key] ? 'error' : ''}`}
                  type="number" step="0.5" placeholder="—"
                  value={(form[lift.key] as number | null | undefined) ?? ''}
                  onChange={(e) => set(lift.key, (e.target.value ? parseFloat(e.target.value) : null) as never)}
                />
                {errors[lift.key] && <span className="ob-field-error">{errors[lift.key]}</span>}
              </div>
            ))}
          </>
        )}

        {/* ══════════════════════════════════════════ STEP 7 — Vücut Fotoğrafları */}
        {step === 7 && (
          <>
            <div className="ob-step-header">
              <div className="ob-step-icon">📷</div>
              <div className="ob-step-title">Vücut Fotoğrafları</div>
              <div className="ob-step-desc">
                Koçunun seni daha iyi tanıması için 4 farklı yönden fotoğraf çek.
              </div>
            </div>

            <div className="ob-privacy-note">
              🔒 <strong>Gizlilik:</strong> Bu fotoğrafları yalnızca atandığın koç ve sen görebilirsin.
            </div>

            <div className="ob-photo-grid">
              {(['Front', 'Back', 'Left', 'Right'] as const).map((v) => (
                <PhotoUploadSlot
                  key={v}
                  view={v}
                  file={photos[v]}
                  onChange={(f) => setPhoto(v, f)}
                />
              ))}
            </div>

            <div className="ob-tips-card">
              <div className="ob-tips-title">💡 Daha iyi fotoğraflar için ipuçları</div>
              <ul className="ob-tips-list">
                <li>Düz ve sade arka plan (beyaz duvar idealdir)</li>
                <li>Doğal ışık veya iyi aydınlatılmış oda</li>
                <li>Kollar yanda, doğal duruş</li>
                <li>Yakın takip eden kıyafet (spor şort/tişört)</li>
                <li>Telefon göz hizasında, 2-3 metre uzaklıkta</li>
              </ul>
            </div>

            {photoWarning && (
              <div className="error-banner" style={{ marginBottom: 12 }}>
                ⚠️ {photoWarning}
                <button
                  className="ob-btn-back"
                  style={{ marginLeft: 12 }}
                  onClick={() => navigate('/dashboard')}
                >
                  Dashboard'a Git
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Nav ── */}
        <div className="ob-nav">
          {step > 1 && (
            <button className="ob-btn-back" onClick={goBack} disabled={loading}>← Geri</button>
          )}
          {(step === 5 || step === 6) && (
            <button className="ob-btn-back" onClick={skipStep} disabled={loading}>
              Bu adımı atla
            </button>
          )}
          {step < 7 ? (
            <button className="ob-btn-next" onClick={goNext}>
              Devam Et →
            </button>
          ) : (
            <button
              className="ob-btn-next"
              onClick={handleSubmit}
              disabled={loading || !photosReady}
              title={!photosReady ? '4 fotoğrafı da seçmelisin' : undefined}
            >
              {loading && <span className="loading-spinner" />}
              {loading ? 'Yükleniyor...' : 'Tamamla & Yükle ✓'}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
