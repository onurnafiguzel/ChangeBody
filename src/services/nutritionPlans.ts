import api from './api'
import type {
  CreateNutritionPlanRequest,
  NutritionPlanDetailDto,
  UpdateNutritionPlanRequest,
} from '../types/api.types'
import { API_ENDPOINTS } from '../types/api.types'

export async function createNutritionPlan(payload: CreateNutritionPlanRequest): Promise<string> {
  const { data } = await api.post<string>(API_ENDPOINTS.NUTRITION_PLANS_CREATE, payload)
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

export async function getUserActiveNutritionPlan(userId: string): Promise<NutritionPlanDetailDto> {
  const { data } = await api.get<NutritionPlanDetailDto>(API_ENDPOINTS.USER_ACTIVE_NUTRITION_PLAN(userId))
  return data
}
