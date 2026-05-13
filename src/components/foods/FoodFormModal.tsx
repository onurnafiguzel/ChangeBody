import { useEffect, useMemo, useState } from 'react'
import { createFood, updateFood } from '../../services/foods'
import { parseApiError } from '../../utils/errorHandler'
import { useToast } from '../shared/Toast'
import type { CreateFoodRequest, FoodDto, FoodUnit } from '../../types/api.types'

interface Props {
  open: boolean
  food?: FoodDto | null   // null/undefined → create modu; dolu → edit modu
  onClose: () => void
  onSaved: (foodId: string) => void
}

interface FormState {
  name: string
  unit: FoodUnit
  caloriesPer100g: string
  proteinPer100g: string
  carbsPer100g: string
  fatPer100g: string
  caloriesPerPiece: string
  proteinPerPiece: string
  carbsPerPiece: string
  fatPerPiece: string
  pieceLabel: string
  gramsPerPiece: string
}

function emptyForm(): FormState {
  return {
    name: '', unit: 'Grams',
    caloriesPer100g: '', proteinPer100g: '', carbsPer100g: '', fatPer100g: '',
    caloriesPerPiece: '', proteinPerPiece: '', carbsPerPiece: '', fatPerPiece: '',
    pieceLabel: '', gramsPerPiece: '',
  }
}

function nStr(n: number | null | undefined): string {
  return n == null ? '' : String(n)
}

function fromFood(f: FoodDto): FormState {
  return {
    name: f.name,
    unit: f.unit,
    caloriesPer100g: nStr(f.caloriesPer100g),
    proteinPer100g: nStr(f.proteinPer100g),
    carbsPer100g: nStr(f.carbsPer100g),
    fatPer100g: nStr(f.fatPer100g),
    caloriesPerPiece: nStr(f.caloriesPerPiece),
    proteinPerPiece: nStr(f.proteinPerPiece),
    carbsPerPiece: nStr(f.carbsPerPiece),
    fatPerPiece: nStr(f.fatPerPiece),
    pieceLabel: f.pieceLabel ?? '',
    gramsPerPiece: nStr(f.gramsPerPiece),
  }
}

function parseNum(s: string): number | null {
  if (!s.trim()) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export default function FoodFormModal({ open, food, onClose, onSaved }: Props) {
  const toast = useToast()
  const isEdit = !!food
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(food ? fromFood(food) : emptyForm())
      setErrors({})
      setGlobalError(null)
    }
  }, [open, food])

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((p) => ({ ...p, [k]: v }))
    setErrors((p) => ({ ...p, [k]: undefined }))
    setGlobalError(null)
  }

  // Önizleme (özet)
  const previewKcal = useMemo(() => {
    if (form.unit === 'Grams') return parseNum(form.caloriesPer100g)
    return parseNum(form.caloriesPerPiece)
  }, [form])

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {}
    const name = form.name.trim()
    if (!name) e.name = 'Ad zorunlu.'
    else if (name.length > 200) e.name = 'En fazla 200 karakter.'

    const numOk = (s: string, key: keyof FormState) => {
      if (!s.trim()) { e[key] = 'Zorunlu.'; return false }
      const n = Number(s)
      if (!Number.isFinite(n) || n < 0) { e[key] = '≥ 0 olmalı.'; return false }
      return true
    }

    if (form.unit === 'Grams') {
      numOk(form.caloriesPer100g, 'caloriesPer100g')
      numOk(form.proteinPer100g, 'proteinPer100g')
      numOk(form.carbsPer100g, 'carbsPer100g')
      numOk(form.fatPer100g, 'fatPer100g')
    } else {
      const lbl = form.pieceLabel.trim()
      if (!lbl) e.pieceLabel = 'Birim adı zorunlu (örn. "1 adet").'
      else if (lbl.length > 100) e.pieceLabel = 'En fazla 100 karakter.'
      numOk(form.caloriesPerPiece, 'caloriesPerPiece')
      numOk(form.proteinPerPiece, 'proteinPerPiece')
      numOk(form.carbsPerPiece, 'carbsPerPiece')
      numOk(form.fatPerPiece, 'fatPerPiece')
      if (form.gramsPerPiece.trim()) {
        const g = Number(form.gramsPerPiece)
        if (!Number.isFinite(g) || g < 0) e.gramsPerPiece = '≥ 0 olmalı.'
      }
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function buildPayload(): CreateFoodRequest {
    const base: CreateFoodRequest = { name: form.name.trim(), unit: form.unit }
    if (form.unit === 'Grams') {
      base.caloriesPer100g = parseNum(form.caloriesPer100g)
      base.proteinPer100g = parseNum(form.proteinPer100g)
      base.carbsPer100g = parseNum(form.carbsPer100g)
      base.fatPer100g = parseNum(form.fatPer100g)
    } else {
      base.caloriesPerPiece = parseNum(form.caloriesPerPiece)
      base.proteinPerPiece = parseNum(form.proteinPerPiece)
      base.carbsPerPiece = parseNum(form.carbsPerPiece)
      base.fatPerPiece = parseNum(form.fatPerPiece)
      base.pieceLabel = form.pieceLabel.trim()
      const g = parseNum(form.gramsPerPiece)
      if (g != null) base.gramsPerPiece = g
    }
    return base
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setGlobalError(null)
    try {
      const payload = buildPayload()
      let id: string
      if (isEdit && food) {
        await updateFood(food.id, payload)
        id = food.id
        toast.success('Besin güncellendi.')
      } else {
        id = await createFood(payload)
        toast.success('Besin eklendi.')
      }
      onSaved(id)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 409) {
        setErrors((p) => ({ ...p, name: 'Bu isimde bir besin zaten var.' }))
      } else {
        const msg = parseApiError(err, 'Kaydedilemedi.')
        setGlobalError(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="payment-modal-overlay" onClick={onClose}>
      <div className="payment-modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="payment-modal-title">
          {isEdit ? `Düzenle · ${food?.name}` : 'Yeni Besin'}
        </div>

        <form onSubmit={handleSubmit}>
          {globalError && <div className="error-banner">⚠️ {globalError}</div>}

          <div className="ob-form-group">
            <label className="ob-label">Ad</label>
            <input
              className={`ob-input ${errors.name ? 'error' : ''}`}
              type="text"
              placeholder="Örn. Tavuk Göğsü"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              autoFocus
            />
            {errors.name && <span className="ob-field-error">{errors.name}</span>}
          </div>

          <div className="ob-form-group">
            <label className="ob-label">Birim</label>
            <div className="unit-segmented">
              <button
                type="button"
                className={form.unit === 'Grams' ? 'active' : ''}
                onClick={() => setField('unit', 'Grams')}
                disabled={isEdit}
                title={isEdit ? 'Mevcut besinin birimi değiştirilemez' : ''}
              >
                Gram
              </button>
              <button
                type="button"
                className={form.unit === 'Piece' ? 'active' : ''}
                onClick={() => setField('unit', 'Piece')}
                disabled={isEdit}
                title={isEdit ? 'Mevcut besinin birimi değiştirilemez' : ''}
              >
                Adet
              </button>
            </div>
            {isEdit && (
              <span className="ob-field-hint" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Birim değiştirmek için besini sil, yenisini oluştur.
              </span>
            )}
          </div>

          {form.unit === 'Grams' ? (
            <>
              <div className="profile-edit-section-title" style={{ fontSize: '0.85rem', marginTop: 8 }}>
                Makrolar (100 g başına)
              </div>
              <div className="ob-form-row">
                <div className="ob-form-group">
                  <label className="ob-label">Kalori (kcal)</label>
                  <input
                    className={`ob-input ${errors.caloriesPer100g ? 'error' : ''}`}
                    type="number" min={0} step="any"
                    value={form.caloriesPer100g}
                    onChange={(e) => setField('caloriesPer100g', e.target.value)}
                  />
                  {errors.caloriesPer100g && <span className="ob-field-error">{errors.caloriesPer100g}</span>}
                </div>
                <div className="ob-form-group">
                  <label className="ob-label">Protein (g)</label>
                  <input
                    className={`ob-input ${errors.proteinPer100g ? 'error' : ''}`}
                    type="number" min={0} step="any"
                    value={form.proteinPer100g}
                    onChange={(e) => setField('proteinPer100g', e.target.value)}
                  />
                  {errors.proteinPer100g && <span className="ob-field-error">{errors.proteinPer100g}</span>}
                </div>
              </div>
              <div className="ob-form-row">
                <div className="ob-form-group">
                  <label className="ob-label">Karbonhidrat (g)</label>
                  <input
                    className={`ob-input ${errors.carbsPer100g ? 'error' : ''}`}
                    type="number" min={0} step="any"
                    value={form.carbsPer100g}
                    onChange={(e) => setField('carbsPer100g', e.target.value)}
                  />
                  {errors.carbsPer100g && <span className="ob-field-error">{errors.carbsPer100g}</span>}
                </div>
                <div className="ob-form-group">
                  <label className="ob-label">Yağ (g)</label>
                  <input
                    className={`ob-input ${errors.fatPer100g ? 'error' : ''}`}
                    type="number" min={0} step="any"
                    value={form.fatPer100g}
                    onChange={(e) => setField('fatPer100g', e.target.value)}
                  />
                  {errors.fatPer100g && <span className="ob-field-error">{errors.fatPer100g}</span>}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="profile-edit-section-title" style={{ fontSize: '0.85rem', marginTop: 8 }}>
                Makrolar (1 adet başına)
              </div>
              <div className="ob-form-group">
                <label className="ob-label">Birim adı</label>
                <input
                  className={`ob-input ${errors.pieceLabel ? 'error' : ''}`}
                  type="text"
                  placeholder='Örn. "1 adet (orta)", "1 dilim", "1 avuç"'
                  value={form.pieceLabel}
                  onChange={(e) => setField('pieceLabel', e.target.value)}
                />
                {errors.pieceLabel && <span className="ob-field-error">{errors.pieceLabel}</span>}
              </div>
              <div className="ob-form-row">
                <div className="ob-form-group">
                  <label className="ob-label">Kalori (kcal)</label>
                  <input
                    className={`ob-input ${errors.caloriesPerPiece ? 'error' : ''}`}
                    type="number" min={0} step="any"
                    value={form.caloriesPerPiece}
                    onChange={(e) => setField('caloriesPerPiece', e.target.value)}
                  />
                  {errors.caloriesPerPiece && <span className="ob-field-error">{errors.caloriesPerPiece}</span>}
                </div>
                <div className="ob-form-group">
                  <label className="ob-label">Protein (g)</label>
                  <input
                    className={`ob-input ${errors.proteinPerPiece ? 'error' : ''}`}
                    type="number" min={0} step="any"
                    value={form.proteinPerPiece}
                    onChange={(e) => setField('proteinPerPiece', e.target.value)}
                  />
                  {errors.proteinPerPiece && <span className="ob-field-error">{errors.proteinPerPiece}</span>}
                </div>
              </div>
              <div className="ob-form-row">
                <div className="ob-form-group">
                  <label className="ob-label">Karbonhidrat (g)</label>
                  <input
                    className={`ob-input ${errors.carbsPerPiece ? 'error' : ''}`}
                    type="number" min={0} step="any"
                    value={form.carbsPerPiece}
                    onChange={(e) => setField('carbsPerPiece', e.target.value)}
                  />
                  {errors.carbsPerPiece && <span className="ob-field-error">{errors.carbsPerPiece}</span>}
                </div>
                <div className="ob-form-group">
                  <label className="ob-label">Yağ (g)</label>
                  <input
                    className={`ob-input ${errors.fatPerPiece ? 'error' : ''}`}
                    type="number" min={0} step="any"
                    value={form.fatPerPiece}
                    onChange={(e) => setField('fatPerPiece', e.target.value)}
                  />
                  {errors.fatPerPiece && <span className="ob-field-error">{errors.fatPerPiece}</span>}
                </div>
              </div>
              <div className="ob-form-group">
                <label className="ob-label">Yaklaşık gram (opsiyonel)</label>
                <input
                  className={`ob-input ${errors.gramsPerPiece ? 'error' : ''}`}
                  type="number" min={0} step="any"
                  placeholder="Örn. 50"
                  value={form.gramsPerPiece}
                  onChange={(e) => setField('gramsPerPiece', e.target.value)}
                />
                {errors.gramsPerPiece && <span className="ob-field-error">{errors.gramsPerPiece}</span>}
              </div>
            </>
          )}

          {previewKcal != null && (
            <div className="food-form-preview">
              {form.unit === 'Grams'
                ? <>📊 100 g başına <strong>{previewKcal}</strong> kcal</>
                : <>📊 {form.pieceLabel || 'Bir birim'} başına <strong>{previewKcal}</strong> kcal</>}
            </div>
          )}

          <div className="payment-modal-actions">
            <button type="button" className="btn-pay-cancel" onClick={onClose} disabled={submitting}>
              İptal
            </button>
            <button type="submit" className="btn-pay" disabled={submitting}>
              {submitting ? 'Kaydediliyor…' : (isEdit ? 'Güncelle' : 'Kaydet')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
