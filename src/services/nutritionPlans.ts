import api from './api'
import type {
  CreateNutritionPlanRequest,
  CreateSelfNutritionPlanRequest,
  NutritionPlanDetailDto,
  NutritionPlanListItemDto,
  UpdateNutritionPlanRequest,
} from '../types/api.types'
import { API_ENDPOINTS } from '../types/api.types'

export async function createNutritionPlan(payload: CreateNutritionPlanRequest): Promise<string> {
  const { data } = await api.post<string>(API_ENDPOINTS.NUTRITION_PLANS_CREATE, payload)
  return data
}

export async function createSelfNutritionPlan(
  userId: string,
  payload: CreateSelfNutritionPlanRequest,
): Promise<string> {
  const { data } = await api.post<string>(
    API_ENDPOINTS.USER_NUTRITION_PLANS_SELF(userId),
    payload,
  )
  return data
}

export async function getNutritionPlan(planId: string): Promise<NutritionPlanDetailDto> {
  const { data } = await api.get<NutritionPlanDetailDto>(API_ENDPOINTS.NUTRITION_PLAN_DETAIL(planId))
  return data
}

export async function updateNutritionPlan(
  planId: string,
  payload: UpdateNutritionPlanRequest,
): Promise<void> {
  await api.put(API_ENDPOINTS.NUTRITION_PLAN_DETAIL(planId), payload)
}

export async function activateNutritionPlan(planId: string): Promise<void> {
  await api.post(API_ENDPOINTS.NUTRITION_PLAN_ACTIVATE(planId))
}

export async function deactivateNutritionPlan(planId: string): Promise<void> {
  await api.post(API_ENDPOINTS.NUTRITION_PLAN_DEACTIVATE(planId))
}

// BE: tek plan döner — Coach varsa Coach, yoksa Self. Hiçbiri yoksa 404.
export async function getUserActiveNutritionPlan(userId: string): Promise<NutritionPlanDetailDto | null> {
  try {
    const { data } = await api.get<NutritionPlanDetailDto>(API_ENDPOINTS.USER_ACTIVE_NUTRITION_PLAN(userId))
    return data
  } catch (err: unknown) {
    if ((err as { response?: { status?: number } })?.response?.status === 404) return null
    throw err
  }
}

export async function exportNutritionPlan(planId: string): Promise<Blob> {
  const { data } = await api.get<Blob>(
    API_ENDPOINTS.NUTRITION_PLAN_EXPORT(planId),
    { responseType: 'blob' },
  )
  return data
}

export async function getUserNutritionPlans(userId: string): Promise<NutritionPlanListItemDto[]> {
  const { data } = await api.get<NutritionPlanListItemDto[]>(API_ENDPOINTS.USER_NUTRITION_PLANS(userId))
  return data
}
