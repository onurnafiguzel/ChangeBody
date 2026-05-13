import api from './api'
import type {
  CreateFitnessGoalRequest,
  FitnessGoalDto,
  UpdateFitnessGoalRequest,
} from '../types/api.types'
import { API_ENDPOINTS } from '../types/api.types'

export async function listFitnessGoals(): Promise<FitnessGoalDto[]> {
  const { data } = await api.get<FitnessGoalDto[]>(API_ENDPOINTS.FITNESS_GOALS_LIST)
  return data
}

export async function createFitnessGoal(payload: CreateFitnessGoalRequest): Promise<string> {
  const { data } = await api.post<string>(API_ENDPOINTS.FITNESS_GOALS_LIST, payload)
  return data
}

export async function updateFitnessGoal(
  id: string,
  payload: UpdateFitnessGoalRequest,
): Promise<void> {
  await api.put(API_ENDPOINTS.FITNESS_GOAL_DETAIL(id), payload)
}

export async function deleteFitnessGoal(id: string): Promise<void> {
  await api.delete(API_ENDPOINTS.FITNESS_GOAL_DETAIL(id))
}
