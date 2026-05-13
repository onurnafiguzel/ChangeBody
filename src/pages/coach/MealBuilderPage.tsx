import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Header from '../../components/shared/Header'
import { Sidebar, BottomNav } from '../../components/shared/Navigation'
import { listFoods } from '../../services/foods'
import FoodFormModal from '../../components/foods/FoodFormModal'
import {
  activateNutritionPlan,
  createNutritionPlan,
  getNutritionPlan,
  updateNutritionPlan,
} from '../../services/nutritionPlans'
import { parseApiError } from '../../utils/errorHandler'
import { useToast } from '../../components/shared/Toast'
import type {
  CreateNutritionPlanRequest,
  FoodDto,
  MealInput,
  NutritionDayType,
  UpdateNutritionPlanRequest,
} from '../../types/api.types'
import '../../styles/dashboard.css'
import '../../styles/exercises.css'

type PlanMode = 'single' | 'two'

interface BuilderState {
  title: string
  description?: string
  mode: PlanMode
}

interface UiMealItem {
  foodId: string
  /** unit === "Grams" → gram cinsinden; unit === "Piece" → adet cinsinden */
  qty: number
  // UI lookup
  _food: FoodDto
}

interface UiMeal {
  id: string
  name: string
  items: UiMealItem[]
}

interface UiDay {
  type: NutritionDayType
  meals: UiMeal[]
}

const GRAM_PRESETS = [50, 100, 150, 200, 250] as const
const PIECE_PRESETS = [1, 2, 3] as const

interface FoodMacros {
  calories: number
  protein: number
  carbs: number
  fat: number
}

function foodMacrosForQty(food: FoodDto, qty: number): FoodMacros {
  if (food.unit === 'Piece') {
    return {
      calories: (food.caloriesPerPiece ?? 0) * qty,
      protein: (food.proteinPerPiece ?? 0) * qty,
      carbs: (food.carbsPerPiece ?? 0) * qty,
      fat: (food.fatPerPiece ?? 0) * qty,
    }
  }
  const k = qty / 100
  return {
    calories: (food.caloriesPer100g ?? 0) * k,
    protein: (food.proteinPer100g ?? 0) * k,
    carbs: (food.carbsPer100g ?? 0) * k,
    fat: (food.fatPer100g ?? 0) * k,
  }
}

function foodBaseMacros(food: FoodDto): FoodMacros {
  if (food.unit === 'Piece') {
    return {
      calories: food.caloriesPerPiece ?? 0,
      protein: food.proteinPerPiece ?? 0,
      carbs: food.carbsPerPiece ?? 0,
      fat: food.fatPerPiece ?? 0,
    }
  }
  return {
    calories: food.caloriesPer100g ?? 0,
    protein: food.proteinPer100g ?? 0,
    carbs: food.carbsPer100g ?? 0,
    fat: food.fatPer100g ?? 0,
  }
}

function foodBaseLabel(food: FoodDto): string {
  if (food.unit === 'Piece') return `/ ${food.pieceLabel ?? '1 adet'}`
  return '/ 100 g'
}

function qtyUnitLabel(food: FoodDto): string {
  return food.unit === 'Piece' ? 'adet' : 'g'
}

const DAY_TR: Record<NutritionDayType, string> = {
  WorkoutDay: 'Antrenman Günü',
  OffDay: 'Dinlenme Günü',
}

const DAY_ICON: Record<NutritionDayType, string> = {
  WorkoutDay: '💪',
  OffDay: '🛌',
}

let _mealIdSeq = 0
const nextMealId = () => `m-${++_mealIdSeq}`

function defaultMeals(): UiMeal[] {
  return [
    { id: nextMealId(), name: 'Kahvaltı', items: [] },
    { id: nextMealId(), name: 'Öğle', items: [] },
    { id: nextMealId(), name: 'Akşam', items: [] },
  ]
}

function fmt(n: number): string {
  return n >= 100 ? Math.round(n).toString() : (Math.round(n * 10) / 10).toString()
}

type MealMacros = FoodMacros

function mealMacros(meal: UiMeal): MealMacros {
  let calories = 0, protein = 0, carbs = 0, fat = 0
  for (const it of meal.items) {
    const m = foodMacrosForQty(it._food, it.qty)
    calories += m.calories
    protein += m.protein
    carbs += m.carbs
    fat += m.fat
  }
  return { calories, protein, carbs, fat }
}

function dayMacros(day: UiDay): MealMacros {
  return day.meals.reduce<MealMacros>(
    (acc, m) => {
      const mm = mealMacros(m)
      return {
        calories: acc.calories + mm.calories,
        protein: acc.protein + mm.protein,
        carbs: acc.carbs + mm.carbs,
        fat: acc.fat + mm.fat,
      }
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )
}

export default function MealBuilderPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { userId: routeUserId, planId } = useParams<{ userId?: string; planId?: string }>()
  const location = useLocation()
  const initialMeta = (location.state as BuilderState | null) ?? null
  const isEdit = !!planId

  // Edit modunda meta/userId/days plan response'undan hidrate edilir
  const [meta, setMeta] = useState<BuilderState | null>(initialMeta)
  const [editUserId, setEditUserId] = useState<string | undefined>(undefined)
  const [planActive, setPlanActive] = useState<boolean>(false)
  const [hydrating, setHydrating] = useState<boolean>(isEdit)
  const [hydrateError, setHydrateError] = useState<string | null>(null)

  const userId = isEdit ? editUserId : routeUserId

  // Redirect if create-mode with no meta (deep-link with no state)
  useEffect(() => {
    if (isEdit) return
    if (!initialMeta) {
      navigate(`/coach/nutrition-plans/new/${routeUserId}`, { replace: true })
    }
  }, [isEdit, initialMeta, navigate, routeUserId])

  // Food library state
  const [foods, setFoods] = useState<FoodDto[]>([])
  const [foodLoading, setFoodLoading] = useState(true)
  const [foodError, setFoodError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [defaultGrams, setDefaultGrams] = useState<number>(100)
  const [defaultPieces, setDefaultPieces] = useState<number>(1)

  // Days — create modunda meta'dan, edit modunda boş başlar + hidrasyonda doldurulur
  const [days, setDays] = useState<UiDay[]>(() => {
    if (isEdit || !initialMeta) return []
    if (initialMeta.mode === 'single') return [{ type: 'WorkoutDay', meals: defaultMeals() }]
    return [
      { type: 'WorkoutDay', meals: defaultMeals() },
      { type: 'OffDay', meals: defaultMeals() },
    ]
  })

  // Drag/drop state
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)
  // Inline qty editor (when "Sor" preset seçili)
  const [pendingDrop, setPendingDrop] = useState<{
    dayType: NutritionDayType
    mealId: string
    food: FoodDto
    qty: number
  } | null>(null)

  const [saving, setSaving] = useState(false)
  const [newFoodModalOpen, setNewFoodModalOpen] = useState(false)

  async function reloadFoods() {
    try {
      const list = await listFoods()
      setFoods(list.filter((f) => f.isActive))
    } catch (err) {
      setFoodError(parseApiError(err, 'Besinler yenilenemedi.'))
    }
  }

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        if (isEdit && planId) {
          // Plan + foods paralel
          const [foodsList, plan] = await Promise.all([listFoods(), getNutritionPlan(planId)])
          if (cancelled) return
          const activeFoods = foodsList.filter((f) => f.isActive)
          // Hidrasyon: gerekirse pasif/eksik foods'u da ekleyelim ki plan içindeki kayıt kaybolmasın
          const foodMap = new Map<string, FoodDto>(foodsList.map((f) => [f.id, f]))
          setFoods(activeFoods)

          setEditUserId(plan.userId)
          setPlanActive(plan.isActive)
          setMeta({
            title: plan.title,
            description: plan.description ?? undefined,
            mode: plan.days.length === 2 ? 'two' : 'single',
          })

          // Günleri & öğünleri & item'ları UI shape'ine çevir
          const hydratedDays: UiDay[] = plan.days.map((d) => ({
            type: d.dayType,
            meals: d.meals.map((meal) => ({
              id: nextMealId(),
              name: meal.name,
              items: meal.items
                .map((it) => {
                  const food = foodMap.get(it.foodId)
                  if (!food) return null
                  return { foodId: it.foodId, qty: it.quantity, _food: food }
                })
                .filter((x): x is { foodId: string; qty: number; _food: FoodDto } => x != null),
            })),
          }))
          setDays(hydratedDays)
        } else {
          const list = await listFoods()
          if (cancelled) return
          setFoods(list.filter((f) => f.isActive))
        }
      } catch (err) {
        if (cancelled) return
        if (isEdit) setHydrateError(parseApiError(err, 'Plan yüklenemedi.'))
        else setFoodError(parseApiError(err, 'Besinler yüklenemedi.'))
      } finally {
        if (!cancelled) {
          setFoodLoading(false)
          setHydrating(false)
        }
      }
    }

    bootstrap()
    return () => { cancelled = true }
  }, [isEdit, planId])

  const filteredFoods = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return foods
    return foods.filter((f) => f.name.toLowerCase().includes(q))
  }, [foods, search])

  // ─── Drag handlers ──────────────────────────────────────────────────
  function handleDragStart(e: React.DragEvent, food: FoodDto) {
    e.dataTransfer.setData('application/json', JSON.stringify(food))
    e.dataTransfer.effectAllowed = 'copy'
  }
  function handleDragOver(e: React.DragEvent, key: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    if (dragOverKey !== key) setDragOverKey(key)
  }
  function handleDragLeave(key: string) {
    if (dragOverKey === key) setDragOverKey(null)
  }
  function handleDrop(e: React.DragEvent, dayType: NutritionDayType, mealId: string) {
    e.preventDefault()
    setDragOverKey(null)
    try {
      const raw = e.dataTransfer.getData('application/json')
      if (!raw) return
      const food = JSON.parse(raw) as FoodDto
      const presetQty = food.unit === 'Piece' ? defaultPieces : defaultGrams
      if (presetQty > 0) {
        appendItem(dayType, mealId, food, presetQty)
      } else {
        setPendingDrop({ dayType, mealId, food, qty: food.unit === 'Piece' ? 1 : 100 })
      }
    } catch {
      toast.error('Besin eklenirken bir hata oluştu.')
    }
  }

  function appendItem(dayType: NutritionDayType, mealId: string, food: FoodDto, qty: number) {
    if (!qty || qty <= 0) {
      toast.warning(`${food.unit === 'Piece' ? 'Adet' : 'Gram'} değeri 0'dan büyük olmalı.`)
      return
    }
    setDays((prev) =>
      prev.map((d) =>
        d.type !== dayType
          ? d
          : {
              ...d,
              meals: d.meals.map((m) =>
                m.id !== mealId ? m : { ...m, items: [...m.items, { foodId: food.id, qty, _food: food }] },
              ),
            },
      ),
    )
  }

  function updateItemQty(dayType: NutritionDayType, mealId: string, idx: number, qty: number) {
    setDays((prev) =>
      prev.map((d) =>
        d.type !== dayType
          ? d
          : {
              ...d,
              meals: d.meals.map((m) =>
                m.id !== mealId
                  ? m
                  : { ...m, items: m.items.map((it, i) => (i === idx ? { ...it, qty } : it)) },
              ),
            },
      ),
    )
  }

  function removeItem(dayType: NutritionDayType, mealId: string, idx: number) {
    setDays((prev) =>
      prev.map((d) =>
        d.type !== dayType
          ? d
          : {
              ...d,
              meals: d.meals.map((m) =>
                m.id !== mealId ? m : { ...m, items: m.items.filter((_, i) => i !== idx) },
              ),
            },
      ),
    )
  }

  // ─── Meal management ────────────────────────────────────────────────
  function renameMeal(dayType: NutritionDayType, mealId: string, name: string) {
    setDays((prev) =>
      prev.map((d) =>
        d.type !== dayType
          ? d
          : { ...d, meals: d.meals.map((m) => (m.id === mealId ? { ...m, name } : m)) },
      ),
    )
  }
  function addMeal(dayType: NutritionDayType) {
    setDays((prev) =>
      prev.map((d) =>
        d.type !== dayType
          ? d
          : { ...d, meals: [...d.meals, { id: nextMealId(), name: 'Yeni Öğün', items: [] }] },
      ),
    )
  }
  function removeMeal(dayType: NutritionDayType, mealId: string) {
    if (!confirm('Bu öğün ve içindeki tüm besinler silinsin mi?')) return
    setDays((prev) =>
      prev.map((d) =>
        d.type !== dayType ? d : { ...d, meals: d.meals.filter((m) => m.id !== mealId) },
      ),
    )
  }

  // ─── Save / Publish ─────────────────────────────────────────────────
  function buildPayload(): CreateNutritionPlanRequest | null {
    if (!userId || !meta) return null
    const daysPayload: Partial<Record<NutritionDayType, MealInput[]>> = {}
    for (const d of days) {
      const meals: MealInput[] = d.meals
        .filter((m) => m.items.length > 0)
        .map((m) => ({
          name: m.name.trim() || 'Öğün',
          items: m.items.map((it) =>
            it._food.unit === 'Piece'
              ? { foodId: it.foodId, pieces: it.qty }
              : { foodId: it.foodId, grams: it.qty },
          ),
        }))
      if (meals.length > 0) daysPayload[d.type] = meals
    }
    return {
      userId,
      title: meta.title,
      description: meta.description,
      days: daysPayload,
    }
  }

  async function handleSave(activate: boolean) {
    const payload = buildPayload()
    if (!payload) return
    const hasItems = Object.values(payload.days).some((meals) => (meals?.length ?? 0) > 0)
    if (!hasItems) {
      toast.warning('En az bir öğüne besin ekle.')
      return
    }
    setSaving(true)
    try {
      let resolvedPlanId: string
      if (isEdit && planId) {
        const updatePayload: UpdateNutritionPlanRequest = {
          title: payload.title,
          description: payload.description,
          days: payload.days,
        }
        await updateNutritionPlan(planId, updatePayload)
        resolvedPlanId = planId
        if (activate && !planActive) {
          await activateNutritionPlan(resolvedPlanId)
          toast.success('Plan güncellendi ve aktifleştirildi.')
        } else {
          toast.success('Değişiklikler kaydedildi.')
        }
      } else {
        resolvedPlanId = await createNutritionPlan(payload)
        if (activate) {
          await activateNutritionPlan(resolvedPlanId)
          toast.success('Plan oluşturuldu ve aktifleştirildi.')
        } else {
          toast.success('Plan taslak olarak kaydedildi.')
        }
      }
      navigate(-1)
    } catch (err) {
      toast.error(parseApiError(err, 'Kaydedilemedi.'))
    } finally {
      setSaving(false)
    }
  }

  if (isEdit && hydrating) {
    return (
      <div className="app-shell">
        <Sidebar />
        <div className="app-main">
          <Header />
          <div className="page-content">
            <div className="skeleton" style={{ height: 60, borderRadius: 12, marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 400, borderRadius: 12 }} />
          </div>
          <BottomNav />
        </div>
      </div>
    )
  }
  if (isEdit && hydrateError) {
    return (
      <div className="app-shell">
        <Sidebar />
        <div className="app-main">
          <Header />
          <div className="page-content">
            <div className="error-banner">⚠️ {hydrateError}</div>
            <button className="btn-back" onClick={() => navigate(-1)}>← Geri</button>
          </div>
          <BottomNav />
        </div>
      </div>
    )
  }
  if (!meta) return null

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header />
        <div className="page-content">
          <div className="section-header" style={{ marginBottom: 16 }}>
            <button className="btn-back" onClick={() => navigate(-1)}>← Geri</button>
            <span className="section-title">
              {isEdit ? `Düzenle · ${meta.title}` : `${meta.title} · Öğünleri Oluştur`}
            </span>
          </div>

          <div className="schedule-builder-layout">
            {/* ─── Sol: Besin Havuzu ─── */}
            <aside className="exercise-pool-panel">
              <div className="exercise-pool-header">
                <div>
                  <div className="exercise-pool-title">🥗 Besin Havuzu</div>
                  <div className="exercise-pool-hint">Sürükleyip öğüne bırak</div>
                </div>
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => setNewFoodModalOpen(true)}
                  style={{ marginLeft: 'auto' }}
                >
                  + Yeni Besin
                </button>
              </div>

              <div className="filter-bar" style={{ marginBottom: 12 }}>
                <div className="filter-search">
                  <span className="filter-search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Besin ara…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {foodError && (
                <div className="error-banner" style={{ fontSize: '0.82rem' }}>⚠️ {foodError}</div>
              )}

              <div className="exercise-pool-list">
                {foodLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="skeleton" style={{ height: 72, borderRadius: 10, marginBottom: 8 }} />
                  ))
                ) : filteredFoods.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px 8px' }}>
                    <span className="empty-state-icon">🔍</span>
                    <p className="empty-state-text">Sonuç bulunamadı</p>
                  </div>
                ) : (
                  filteredFoods.map((f) => {
                    const base = foodBaseMacros(f)
                    return (
                    <div
                      key={f.id}
                      className="food-pool-card"
                      draggable
                      onDragStart={(e) => handleDragStart(e, f)}
                    >
                      <span className="exercise-pool-handle" aria-hidden>⋮⋮</span>
                      <div className="food-pool-text">
                        <div className="food-pool-name">
                          {f.name}
                          {f.unit === 'Piece' && (
                            <span className="food-pool-unit-badge">adet</span>
                          )}
                        </div>
                        <div className="food-pool-macros">
                          <span className="macro-kcal">{fmt(base.calories)} kcal</span>
                          <span className="macro-p">{fmt(base.protein)}P</span>
                          <span className="macro-c">{fmt(base.carbs)}C</span>
                          <span className="macro-f">{fmt(base.fat)}F</span>
                        </div>
                        <div className="food-pool-base">
                          {foodBaseLabel(f)}
                          {f.unit === 'Piece' && f.gramsPerPiece != null && (
                            <> · ~{fmt(f.gramsPerPiece)} g</>
                          )}
                        </div>
                      </div>
                    </div>
                    )
                  })
                )}
              </div>

              <div className="np-presets">
                <div className="np-presets-label">Varsayılan miktar · gram</div>
                <div className="np-presets-row">
                  {GRAM_PRESETS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={`np-preset-chip ${defaultGrams === g ? 'selected' : ''}`}
                      onClick={() => setDefaultGrams(g)}
                    >
                      {g}g
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`np-preset-chip ${defaultGrams === 0 ? 'selected' : ''}`}
                    onClick={() => setDefaultGrams(0)}
                    title="Her bırakışta gram sor"
                  >
                    Sor
                  </button>
                </div>
                <div className="np-presets-label" style={{ marginTop: 10 }}>
                  Varsayılan miktar · adet
                </div>
                <div className="np-presets-row">
                  {PIECE_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`np-preset-chip ${defaultPieces === p ? 'selected' : ''}`}
                      onClick={() => setDefaultPieces(p)}
                    >
                      {p} adet
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`np-preset-chip ${defaultPieces === 0 ? 'selected' : ''}`}
                    onClick={() => setDefaultPieces(0)}
                    title="Her bırakışta adet sor"
                  >
                    Sor
                  </button>
                </div>
              </div>
            </aside>

            {/* ─── Sağ: Günler ─── */}
            <section className="day-columns">
              <div className="np-days-grid" data-cols={days.length}>
                {days.map((day) => {
                  const dm = dayMacros(day)
                  return (
                    <div key={day.type} className="np-day-card">
                      <div className="np-day-header">
                        <span className="np-day-icon">{DAY_ICON[day.type]}</span>
                        <span className="np-day-title">{DAY_TR[day.type]}</span>
                      </div>

                      <div className="np-meals">
                        {day.meals.map((meal) => {
                          const mm = mealMacros(meal)
                          const dropKey = `${day.type}:${meal.id}`
                          return (
                            <div
                              key={meal.id}
                              className={`np-meal-card ${dragOverKey === dropKey ? 'drop-active' : ''}`}
                              onDragOver={(e) => handleDragOver(e, dropKey)}
                              onDragLeave={() => handleDragLeave(dropKey)}
                              onDrop={(e) => handleDrop(e, day.type, meal.id)}
                            >
                              <div className="np-meal-head">
                                <input
                                  className="np-meal-name"
                                  value={meal.name}
                                  onChange={(e) => renameMeal(day.type, meal.id, e.target.value)}
                                />
                                <button
                                  className="day-column-remove"
                                  onClick={() => removeMeal(day.type, meal.id)}
                                  aria-label="Öğünü sil"
                                >
                                  ×
                                </button>
                              </div>

                              {meal.items.length === 0 ? (
                                <div className="day-column-empty">Buraya besin sürükle</div>
                              ) : (
                                <ul className="np-item-list">
                                  {meal.items.map((it, idx) => {
                                    const m = foodMacrosForQty(it._food, it.qty)
                                    return (
                                      <li key={`${meal.id}-${idx}`} className="np-item-row">
                                        <div className="np-item-text">
                                          <strong>{it._food.name}</strong>
                                          <div className="np-item-macros">
                                            <span className="macro-kcal">{fmt(m.calories)} kcal</span>
                                            <span className="macro-p">{fmt(m.protein)}P</span>
                                            <span className="macro-c">{fmt(m.carbs)}C</span>
                                            <span className="macro-f">{fmt(m.fat)}F</span>
                                          </div>
                                        </div>
                                        <div className="np-item-grams">
                                          <input
                                            type="number"
                                            min={1}
                                            step={it._food.unit === 'Piece' ? 1 : 5}
                                            value={it.qty}
                                            onChange={(e) =>
                                              updateItemQty(
                                                day.type,
                                                meal.id,
                                                idx,
                                                Math.max(0, parseInt(e.target.value) || 0),
                                              )
                                            }
                                          />
                                          <span>{qtyUnitLabel(it._food)}</span>
                                        </div>
                                        <button
                                          className="day-row-remove"
                                          onClick={() => removeItem(day.type, meal.id, idx)}
                                          aria-label="Besini çıkar"
                                        >
                                          ×
                                        </button>
                                      </li>
                                    )
                                  })}
                                </ul>
                              )}

                              {meal.items.length > 0 && (
                                <div className="np-meal-subtotal">
                                  Ara toplam ·{' '}
                                  <span className="macro-kcal">{fmt(mm.calories)} kcal</span>{' '}
                                  · <span className="macro-p">{fmt(mm.protein)}P</span>{' '}
                                  · <span className="macro-c">{fmt(mm.carbs)}C</span>{' '}
                                  · <span className="macro-f">{fmt(mm.fat)}F</span>
                                </div>
                              )}
                            </div>
                          )
                        })}

                        <button
                          type="button"
                          className="btn-secondary np-add-meal"
                          onClick={() => addMeal(day.type)}
                        >
                          + Öğün Ekle
                        </button>
                      </div>

                      <div className="np-day-total">
                        <div className="np-day-total-label">Günlük Toplam</div>
                        <div className="np-day-total-row">
                          <span className="np-day-total-kcal">{fmt(dm.calories)} kcal</span>
                          <span className="macro-p">{fmt(dm.protein)}P</span>
                          <span className="macro-c">{fmt(dm.carbs)}C</span>
                          <span className="macro-f">{fmt(dm.fat)}F</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>

          <div className="profile-edit-actions" style={{ marginTop: 24 }}>
            <button
              className="btn-secondary"
              onClick={() => navigate(-1)}
              disabled={saving}
            >
              İptal
            </button>
            <button
              className="btn-secondary"
              onClick={() => handleSave(false)}
              disabled={saving}
            >
              {saving
                ? 'Kaydediliyor…'
                : (isEdit ? 'Değişiklikleri Kaydet' : 'Taslak Kaydet')}
            </button>
            {(!isEdit || !planActive) && (
              <button
                className="btn-primary"
                onClick={() => handleSave(true)}
                disabled={saving}
              >
                {saving && <span className="loading-spinner" />}
                {saving
                  ? 'Yayınlanıyor…'
                  : (isEdit ? 'Kaydet & Yeniden Aktifleştir →' : 'Yayınla & Aktifleştir →')}
              </button>
            )}
          </div>
        </div>
        <BottomNav />
      </div>

      <FoodFormModal
        open={newFoodModalOpen}
        food={null}
        onClose={() => setNewFoodModalOpen(false)}
        onSaved={() => {
          setNewFoodModalOpen(false)
          setSearch('')
          reloadFoods()
        }}
      />

      {/* ─── Inline-fallback Qty Modal (only when "Sor" preset) ─── */}
      {pendingDrop && (
        <div className="payment-modal-overlay" onClick={() => setPendingDrop(null)}>
          <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="payment-modal-title">Besin Ekle · {pendingDrop.food.name}</div>
            <div className="ob-form-group">
              <label className="ob-label">
                {pendingDrop.food.unit === 'Piece'
                  ? `Adet${pendingDrop.food.pieceLabel ? ` (${pendingDrop.food.pieceLabel})` : ''}`
                  : 'Gram'}
              </label>
              <input
                className="ob-input"
                type="number"
                min={1}
                step={pendingDrop.food.unit === 'Piece' ? 1 : 5}
                autoFocus
                value={pendingDrop.qty}
                onChange={(e) =>
                  setPendingDrop((p) =>
                    p ? { ...p, qty: Math.max(0, parseInt(e.target.value) || 0) } : p,
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && pendingDrop.qty > 0) {
                    appendItem(pendingDrop.dayType, pendingDrop.mealId, pendingDrop.food, pendingDrop.qty)
                    setPendingDrop(null)
                  }
                }}
              />
            </div>
            <div className="payment-modal-actions">
              <button className="btn-pay-cancel" onClick={() => setPendingDrop(null)}>İptal</button>
              <button
                className="btn-pay"
                onClick={() => {
                  appendItem(pendingDrop.dayType, pendingDrop.mealId, pendingDrop.food, pendingDrop.qty)
                  setPendingDrop(null)
                }}
              >
                Ekle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
