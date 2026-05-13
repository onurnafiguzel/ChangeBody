import { useEffect, useState } from 'react'
import { getNutritionPlan } from '../../services/nutritionPlans'
import { parseApiError } from '../../utils/errorHandler'
import type { NutritionDayType, NutritionPlanDetailDto } from '../../types/api.types'

interface Props {
  open: boolean
  planId: string | null
  onClose: () => void
}

const DAY_TR: Record<NutritionDayType, string> = {
  WorkoutDay: 'Antrenman Günü',
  OffDay: 'Dinlenme Günü',
}
const DAY_ICON: Record<NutritionDayType, string> = {
  WorkoutDay: '💪',
  OffDay: '🛌',
}

function fmt(n: number): string {
  return n >= 100 ? Math.round(n).toString() : (Math.round(n * 10) / 10).toString()
}

export default function NutritionPlanViewModal({ open, planId, onClose }: Props) {
  const [plan, setPlan] = useState<NutritionPlanDetailDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !planId) return
    setLoading(true)
    setError(null)
    setPlan(null)
    getNutritionPlan(planId)
      .then(setPlan)
      .catch((err) => setError(parseApiError(err, 'Plan yüklenemedi.')))
      .finally(() => setLoading(false))
  }, [open, planId])

  if (!open) return null

  return (
    <div className="payment-modal-overlay" onClick={onClose}>
      <div
        className="payment-modal"
        style={{ maxWidth: 760, maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="payment-modal-title">
          {plan ? `🥗 ${plan.title}` : 'Beslenme Planı'}
        </div>

        {loading && (
          <div style={{ padding: 16 }}>
            <div className="skeleton" style={{ height: 80, borderRadius: 10, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 80, borderRadius: 10 }} />
          </div>
        )}

        {error && <div className="error-banner">⚠️ {error}</div>}

        {plan && (
          <>
            <div className="payment-summary" style={{ marginBottom: 12 }}>
              <div className="payment-summary-row">
                <span>Antrenör</span>
                <span className="val">{plan.coachName}</span>
              </div>
              <div className="payment-summary-row">
                <span>Durum</span>
                <span className="val">{plan.isActive ? 'Aktif' : 'Pasif'}</span>
              </div>
              {plan.description && (
                <div className="payment-summary-row">
                  <span>Açıklama</span>
                  <span className="val">{plan.description}</span>
                </div>
              )}
            </div>

            <div className="np-days-grid" data-cols={plan.days.length}>
              {plan.days.map((d) => (
                <div key={d.dayType} className="np-day-card">
                  <div className="np-day-header">
                    <span className="np-day-icon">{DAY_ICON[d.dayType]}</span>
                    <span className="np-day-title">{DAY_TR[d.dayType]}</span>
                  </div>

                  <div className="np-meals">
                    {d.meals.map((meal, mi) => (
                      <div key={`${d.dayType}-${mi}`} className="np-meal-card readonly">
                        <div className="np-meal-head">
                          <span className="np-meal-name" style={{ pointerEvents: 'none' }}>
                            {meal.name}
                          </span>
                        </div>

                        {meal.items.length === 0 ? (
                          <div className="day-column-empty">Bu öğünde besin yok</div>
                        ) : (
                          <ul className="np-item-list">
                            {meal.items.map((it, ii) => (
                              <li key={`${d.dayType}-${mi}-${ii}`} className="np-item-row">
                                <div className="np-item-text">
                                  <strong>{it.foodName}</strong>
                                  <div className="np-item-macros">
                                    <span className="macro-kcal">{fmt(it.calories)} kcal</span>
                                    <span className="macro-p">{fmt(it.protein)}P</span>
                                    <span className="macro-c">{fmt(it.carbs)}C</span>
                                    <span className="macro-f">{fmt(it.fat)}F</span>
                                  </div>
                                </div>
                                <div className="np-item-grams">
                                  <span>{fmt(it.quantity)} {it.quantityUnit}</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}

                        {meal.items.length > 0 && (
                          <div className="np-meal-subtotal">
                            Ara toplam ·{' '}
                            <span className="macro-kcal">{fmt(meal.totalCalories)} kcal</span>{' '}
                            · <span className="macro-p">{fmt(meal.totalProtein)}P</span>{' '}
                            · <span className="macro-c">{fmt(meal.totalCarbs)}C</span>{' '}
                            · <span className="macro-f">{fmt(meal.totalFat)}F</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="np-day-total">
                    <div className="np-day-total-label">Günlük Toplam</div>
                    <div className="np-day-total-row">
                      <span className="np-day-total-kcal">{fmt(d.totalCalories)} kcal</span>
                      <span className="macro-p">{fmt(d.totalProtein)}P</span>
                      <span className="macro-c">{fmt(d.totalCarbs)}C</span>
                      <span className="macro-f">{fmt(d.totalFat)}F</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="payment-modal-actions">
          <button className="btn-pay" onClick={onClose}>Kapat</button>
        </div>
      </div>
    </div>
  )
}
