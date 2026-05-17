import { useEffect, useState } from 'react'
import {
  addBodyMeasurement,
  getBodyMeasurementComparison,
  listBodyMeasurements,
} from '../../services/bodyMeasurements'
import {
  addPersonalRecord,
  getCurrentPersonalRecords,
  getPersonalRecordHistory,
} from '../../services/personalRecords'
import { parseApiError } from '../../utils/errorHandler'
import { useToast } from '../shared/Toast'
import type {
  AddBodyMeasurementRequest,
  AddPersonalRecordRequest,
  BodyMeasurementComparisonDto,
  BodyMeasurementDto,
  PersonalRecordCurrentDto,
  PersonalRecordDto,
  PersonalRecordLift,
} from '../../types/api.types'

interface Props {
  userId: string
  canEdit: boolean
  /** Female ise step 5'te kalça da gösterilmişti — burada da satırı ekle. Belirsizse undefined geç. */
  gender?: 'Male' | 'Female' | 'Other' | null
}

const LIFT_LABEL: Record<PersonalRecordLift, string> = {
  BenchPress: 'Bench Press',
  Squat: 'Squat',
  Deadlift: 'Deadlift',
  OverheadPress: 'Overhead Press',
  BarbellRow: 'Barbell Row',
  PullUp: 'Pull-Up',
}

const ALL_LIFTS: PersonalRecordLift[] = [
  'BenchPress', 'Squat', 'Deadlift', 'OverheadPress', 'BarbellRow', 'PullUp',
]

// Bir field için "azalış iyidir" mi yoksa "artış iyidir" mi?
// waist + bodyFat: azalış iyi (yağ kaybı). arm/leg: artış iyi (kas). weight/neck/hip: nötr (yön gösterme).
type Direction = 'lower-better' | 'higher-better' | 'neutral'
const FIELD_DIR: Record<string, Direction> = {
  waistCm: 'lower-better',
  bodyFatPercent: 'lower-better',
  armCm: 'higher-better',
  legCm: 'higher-better',
  weightKg: 'neutral',
  neckCm: 'neutral',
  hipCm: 'neutral',
}

function fmtNum(n: number | null | undefined, suffix = ''): string {
  if (n == null) return '—'
  return `${Math.round(n * 10) / 10}${suffix}`
}

function fmtDelta(n: number | null | undefined, suffix = ''): string {
  if (n == null) return '—'
  const r = Math.round(n * 10) / 10
  const sign = r > 0 ? '+' : ''
  return `${sign}${r}${suffix}`
}

function deltaClass(field: string, value: number | null | undefined): string {
  if (value == null || value === 0) return 'neutral'
  const dir = FIELD_DIR[field] ?? 'neutral'
  if (dir === 'neutral') return 'neutral'
  const good = (dir === 'lower-better' && value < 0) || (dir === 'higher-better' && value > 0)
  return good ? 'positive' : 'negative'
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysSince(iso?: string | null): number | null {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

export default function ProgressView({ userId, canEdit, gender }: Props) {
  const toast = useToast()

  const [comparison, setComparison] = useState<BodyMeasurementComparisonDto | null>(null)
  const [history, setHistory] = useState<BodyMeasurementDto[]>([])
  const [prs, setPrs] = useState<PersonalRecordCurrentDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showAddMeasurement, setShowAddMeasurement] = useState(false)
  const [showAddPr, setShowAddPr] = useState<PersonalRecordLift | null>(null)
  const [historyLift, setHistoryLift] = useState<PersonalRecordLift | null>(null)

  async function fetchAll() {
    setLoading(true)
    setError(null)
    try {
      const [cmp, hist, prList] = await Promise.allSettled([
        getBodyMeasurementComparison(userId),
        listBodyMeasurements(userId, 12),
        getCurrentPersonalRecords(userId),
      ])
      // comparison & history için 404 = "henüz veri yok" — boş state
      if (cmp.status === 'fulfilled') setComparison(cmp.value)
      else setComparison({ previous: null, current: null, delta: null })

      if (hist.status === 'fulfilled') setHistory(hist.value)
      else setHistory([])

      if (prList.status === 'fulfilled') setPrs(prList.value)
      else setPrs([])
    } catch (err) {
      setError(parseApiError(err, 'Veriler yüklenemedi.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!userId) return
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const showHip = gender === 'Female'
  const currentRecordedAt = comparison?.current?.recordedAt ?? null
  const since = daysSince(currentRecordedAt)
  const showReminder = canEdit && (since == null || since >= 30)

  if (loading) {
    return (
      <div className="page-loading">
        <span className="loading-spinner" />
      </div>
    )
  }

  if (error) {
    return <div className="global-error">⚠️ {error}</div>
  }

  return (
    <>
      {showReminder && (
        <div className="error-banner" style={{ marginBottom: 16, background: '#fff7e6', color: '#8a5300', border: '1px solid #ffd591' }}>
          📅 {since == null
            ? 'Henüz ölçüm girmedin — başlangıç değerlerini ekleyebilirsin.'
            : `Son ölçümünden ${since} gün geçti. Bu ay yeni bir ölçüm gir.`}
        </div>
      )}

      {/* ─── Karşılaştırma ─── */}
      <div className="profile-edit-section">
        <div className="profile-edit-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span>📊 Karşılaştırma — Önceki vs. Bugün</span>
          {canEdit && (
            <button className="btn-primary" onClick={() => setShowAddMeasurement(true)}>
              + Yeni Ölçüm
            </button>
          )}
        </div>

        {!comparison?.current ? (
          <div style={{ padding: '24px 8px', color: 'var(--text-muted)' }}>
            {canEdit
              ? 'Henüz ölçümün yok. "Yeni Ölçüm" ile başlangıç değerlerini kaydet.'
              : 'Bu kullanıcı henüz ölçüm girmemiş.'}
          </div>
        ) : (
          <ComparisonTable
            cmp={comparison}
            showHip={showHip}
          />
        )}
      </div>

      {/* ─── Ölçüm Geçmişi ─── */}
      {history.length > 0 && (
        <div className="profile-edit-section">
          <div className="profile-edit-section-title">📜 Ölçüm Geçmişi</div>
          <div className="profile-summary-grid">
            {history.map((m) => (
              <div className="profile-summary-item" key={m.id}>
                <span className="profile-summary-label">{formatDate(m.recordedAt)}</span>
                <span className="profile-summary-value">
                  {fmtNum(m.weightKg, ' kg')} · Yağ: {fmtNum(m.bodyFatPercent, '%')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Personal Records ─── */}
      <div className="profile-edit-section">
        <div className="profile-edit-section-title">🏋️ Personal Records</div>
        <div className="profile-summary-grid">
          {ALL_LIFTS.map((lift) => {
            const cur = prs.find((p) => p.lift === lift)
            return (
              <div
                className="profile-summary-item"
                key={lift}
                style={{ cursor: 'pointer' }}
                onClick={() => setHistoryLift(lift)}
                title="Geçmişi gör"
              >
                <span className="profile-summary-label">{LIFT_LABEL[lift]}</span>
                <span className="profile-summary-value">
                  {cur?.weightKg != null ? `${cur.weightKg} kg` : '—'}
                </span>
                {canEdit && (
                  <button
                    className="btn-secondary"
                    style={{ marginTop: 6, padding: '4px 10px', fontSize: 12 }}
                    onClick={(e) => { e.stopPropagation(); setShowAddPr(lift) }}
                  >
                    + PR Ekle
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {showAddMeasurement && canEdit && (
        <AddMeasurementModal
          gender={gender}
          onClose={() => setShowAddMeasurement(false)}
          onSubmit={async (payload) => {
            try {
              await addBodyMeasurement(userId, payload)
              toast.success('Ölçüm kaydedildi.')
              setShowAddMeasurement(false)
              await fetchAll()
            } catch (err) {
              toast.error(parseApiError(err, 'Ölçüm kaydedilemedi.'))
            }
          }}
        />
      )}

      {showAddPr && canEdit && (
        <AddPrModal
          lift={showAddPr}
          onClose={() => setShowAddPr(null)}
          onSubmit={async (payload) => {
            try {
              await addPersonalRecord(userId, payload)
              toast.success('PR kaydedildi.')
              setShowAddPr(null)
              await fetchAll()
            } catch (err) {
              toast.error(parseApiError(err, 'PR kaydedilemedi.'))
            }
          }}
        />
      )}

      {historyLift && (
        <PrHistoryModal
          userId={userId}
          lift={historyLift}
          onClose={() => setHistoryLift(null)}
        />
      )}
    </>
  )
}

// ─── Comparison Table ────────────────────────────────────────────────

function ComparisonTable({ cmp, showHip }: { cmp: BodyMeasurementComparisonDto; showHip: boolean }) {
  const rows: Array<{ field: keyof BodyMeasurementDto; label: string; suffix: string }> = [
    { field: 'weightKg',       label: 'Kilo',         suffix: ' kg' },
    { field: 'bodyFatPercent', label: 'Vücut Yağı',   suffix: '%' },
    { field: 'waistCm',        label: 'Bel',          suffix: ' cm' },
    { field: 'armCm',          label: 'Kol',          suffix: ' cm' },
    { field: 'legCm',          label: 'Bacak',        suffix: ' cm' },
    { field: 'neckCm',         label: 'Boyun',        suffix: ' cm' },
  ]
  if (showHip) rows.push({ field: 'hipCm', label: 'Kalça', suffix: ' cm' })

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
            <th style={{ padding: '8px 6px' }}>Ölçü</th>
            <th style={{ padding: '8px 6px' }}>Önceki ({formatDate(cmp.previous?.recordedAt)})</th>
            <th style={{ padding: '8px 6px' }}>Bugün ({formatDate(cmp.current?.recordedAt)})</th>
            <th style={{ padding: '8px 6px' }}>Değişim</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const prev = cmp.previous ? (cmp.previous[r.field] as number | null | undefined) : null
            const cur = cmp.current ? (cmp.current[r.field] as number | null | undefined) : null
            const delta = cmp.delta ? (cmp.delta[r.field as keyof typeof cmp.delta] as number | null | undefined) : null
            return (
              <tr key={r.field} style={{ borderTop: '1px solid var(--border-color, #eee)' }}>
                <td style={{ padding: '8px 6px', fontWeight: 600 }}>{r.label}</td>
                <td style={{ padding: '8px 6px' }}>{fmtNum(prev, r.suffix)}</td>
                <td style={{ padding: '8px 6px' }}>{fmtNum(cur, r.suffix)}</td>
                <td style={{ padding: '8px 6px' }}>
                  <DeltaChip field={r.field as string} value={delta} suffix={r.suffix} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function DeltaChip({ field, value, suffix }: { field: string; value: number | null | undefined; suffix: string }) {
  if (value == null || value === 0) {
    return <span style={{ color: 'var(--text-muted)' }}>—</span>
  }
  const cls = deltaClass(field, value)
  const bg = cls === 'positive' ? '#d4edda' : cls === 'negative' ? '#f8d7da' : '#e2e3e5'
  const fg = cls === 'positive' ? '#155724' : cls === 'negative' ? '#721c24' : '#383d41'
  return (
    <span style={{
      background: bg, color: fg, padding: '2px 8px', borderRadius: 12, fontWeight: 600, fontSize: 13,
    }}>
      {fmtDelta(value, suffix)}
    </span>
  )
}

// ─── Add Measurement Modal ───────────────────────────────────────────

function AddMeasurementModal({
  gender, onClose, onSubmit,
}: {
  gender?: 'Male' | 'Female' | 'Other' | null
  onClose: () => void
  onSubmit: (p: AddBodyMeasurementRequest) => Promise<void>
}) {
  const [form, setForm] = useState<AddBodyMeasurementRequest>({})
  const [submitting, setSubmitting] = useState(false)

  function numField(key: keyof AddBodyMeasurementRequest, label: string) {
    return (
      <div className="ob-form-group" key={key}>
        <label className="ob-label">{label}</label>
        <input
          className="ob-input" type="number" step="0.1" placeholder="—"
          value={(form[key] as number | null | undefined) ?? ''}
          onChange={(e) => setForm((p) => ({
            ...p, [key]: e.target.value ? parseFloat(e.target.value) : null,
          }))}
        />
      </div>
    )
  }

  return (
    <ModalShell title="Yeni Ölçüm Ekle" onClose={onClose}>
      <div className="ob-form-row">
        {numField('weightKg', 'Kilo (kg)')}
        {numField('waistCm', 'Bel (cm)')}
      </div>
      <div className="ob-form-row">
        {numField('neckCm', 'Boyun (cm)')}
        {numField('armCm', 'Kol (cm)')}
      </div>
      <div className="ob-form-row">
        {numField('legCm', 'Bacak (cm)')}
        {gender === 'Female' ? numField('hipCm', 'Kalça (cm)') : <div className="ob-form-group" />}
      </div>
      <div className="ob-form-group">
        <label className="ob-label">Not <span className="ob-optional">(opsiyonel)</span></label>
        <textarea
          className="ob-input" rows={2} maxLength={500}
          value={form.notes ?? ''}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
        />
      </div>
      <div className="ob-nav">
        <button className="ob-btn-back" onClick={onClose} disabled={submitting}>İptal</button>
        <button
          className="ob-btn-next"
          disabled={submitting}
          onClick={async () => {
            setSubmitting(true)
            try { await onSubmit(form) } finally { setSubmitting(false) }
          }}
        >
          {submitting ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
    </ModalShell>
  )
}

// ─── Add PR Modal ────────────────────────────────────────────────────

function AddPrModal({
  lift, onClose, onSubmit,
}: {
  lift: PersonalRecordLift
  onClose: () => void
  onSubmit: (p: AddPersonalRecordRequest) => Promise<void>
}) {
  const [weight, setWeight] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <ModalShell title={`${LIFT_LABEL[lift]} — Yeni PR`} onClose={onClose}>
      <div className="ob-form-group">
        <label className="ob-label">Ağırlık (kg)</label>
        <input
          className={`ob-input ${error ? 'error' : ''}`}
          type="number" step="0.5" placeholder="100"
          value={weight}
          onChange={(e) => { setWeight(e.target.value); setError(null) }}
        />
        {error && <span className="ob-field-error">{error}</span>}
      </div>
      <div className="ob-form-group">
        <label className="ob-label">Not <span className="ob-optional">(opsiyonel)</span></label>
        <input
          className="ob-input" type="text" maxLength={200}
          value={notes} onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <div className="ob-nav">
        <button className="ob-btn-back" onClick={onClose} disabled={submitting}>İptal</button>
        <button
          className="ob-btn-next"
          disabled={submitting}
          onClick={async () => {
            const w = parseFloat(weight)
            if (!w || w <= 0) { setError('Pozitif bir sayı girin.'); return }
            setSubmitting(true)
            try {
              await onSubmit({ lift, weightKg: w, notes: notes.trim() || null })
            } finally {
              setSubmitting(false)
            }
          }}
        >
          {submitting ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
    </ModalShell>
  )
}

// ─── PR History Modal ────────────────────────────────────────────────

function PrHistoryModal({
  userId, lift, onClose,
}: {
  userId: string
  lift: PersonalRecordLift
  onClose: () => void
}) {
  const [items, setItems] = useState<PersonalRecordDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    getPersonalRecordHistory(userId, lift)
      .then((r) => setItems(r.slice().sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))))
      .catch((err) => setError(parseApiError(err, 'Geçmiş yüklenemedi.')))
      .finally(() => setLoading(false))
  }, [userId, lift])

  return (
    <ModalShell title={`${LIFT_LABEL[lift]} — Geçmiş`} onClose={onClose}>
      {loading ? (
        <div className="page-loading"><span className="loading-spinner" /></div>
      ) : error ? (
        <div className="global-error">⚠️ {error}</div>
      ) : items.length === 0 ? (
        <div style={{ padding: 24, color: 'var(--text-muted)', textAlign: 'center' }}>
          Henüz kayıt yok.
        </div>
      ) : (
        <div className="profile-summary-grid">
          {items.map((r) => (
            <div className="profile-summary-item" key={r.id}>
              <span className="profile-summary-label">{formatDate(r.recordedAt)}</span>
              <span className="profile-summary-value">{r.weightKg} kg</span>
              {r.notes && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.notes}</span>}
            </div>
          ))}
        </div>
      )}
      <div className="ob-nav">
        <button className="ob-btn-next" onClick={onClose}>Kapat</button>
      </div>
    </ModalShell>
  )
}

// ─── Modal Shell ─────────────────────────────────────────────────────

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card, #fff)', borderRadius: 12, padding: 24,
          width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button onClick={onClose} aria-label="Kapat" style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
