import api from './api'
import type { FoodDto } from '../types/api.types'
import { API_ENDPOINTS } from '../types/api.types'

export async function listFoods(): Promise<FoodDto[]> {
  const { data } = await api.get<FoodDto[]>(API_ENDPOINTS.FOODS_LIST)
  return data
}
