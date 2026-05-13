import { useEffect, useState } from 'react'
import { createFitnessGoal, updateFitnessGoal } from '../../services/fitnessGoals'
import { parseApiError } from '../../utils/errorHandler'
import { useToast } from '../shared/Toast'
import type { FitnessGoalDto } from '../../types/api.types'

interface Props {
  open: boolean
  goal?: FitnessGoalDto | null   // null/undefined → create modu
  onClose: () => void
  onSaved: (goalId: string) => void
}

export default function FitnessGoalFormModal({ open, goal, onClose, onSaved }: Props) {
  const toast = useToast()
  const isEdit = !!goal
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName(goal?.name ?? '')
      setDescription(goal?.description ?? '')
      setErrors({})
      setGlobalError(null)
    }
  }, [open, goal])

  function validate(): boolean {
    const e: { name?: string; description?: string } = {}
    const n = name.trim()
    if (!n) e.name = 'Ad zorunlu.'
    else if (n.length > 200) e.name = 'En fazla 200 karakter.'
    if (description.length > 1000) e.description = 'En fazla 1000 karakter.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setGlobalError(null)
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
      }
      let id: string
      if (isEdit && goal) {
        await updateFitnessGoal(goal.id, payload)
        id = goal.id
        toast.success('Hedef güncellendi.')
      } else {
        id = await createFitnessGoal(payload)
        toast.success('Hedef eklendi.')
      }
      onSaved(id)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 409) {
        setErrors((p) => ({ ...p, name: 'Bu isimde bir hedef zaten var.' }))
      } else {
        setGlobalError(parseApiError(err, 'Kaydedilemedi.'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="payment-modal-overlay" onClick={onClose}>
      <div className="payment-modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="payment-modal-title">
          {isEdit ? `Düzenle · ${goal?.name}` : 'Yeni Hedef'}
        </div>

        <form onSubmit={handleSubmit}>
          {globalError && <div className="error-banner">⚠️ {globalError}</div>}

          <div className="ob-form-group">
            <label className="ob-label">Ad</label>
            <input
              className={`ob-input ${errors.name ? 'error' : ''}`}
              type="text"
              placeholder="Örn. Kas Kazanımı"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); setGlobalError(null) }}
              autoFocus
            />
            {errors.name && <span className="ob-field-error">{errors.name}</span>}
          </div>

          <div className="ob-form-group">
            <label className="ob-label">Açıklama (opsiyonel)</label>
            <textarea
              className={`ob-input ${errors.description ? 'error' : ''}`}
              rows={4}
              placeholder="Bu hedefin kısa açıklaması…"
              value={description}
              onChange={(e) => { setDescription(e.target.value); setErrors((p) => ({ ...p, description: undefined })) }}
            />
            {errors.description && <span className="ob-field-error">{errors.description}</span>}
          </div>

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
