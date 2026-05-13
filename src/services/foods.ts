import api from './api'
import type { CreateFoodRequest, FoodDto, UpdateFoodRequest } from '../types/api.types'
import { API_ENDPOINTS } from '../types/api.types'

export async function listFoods(): Promise<FoodDto[]> {
  const { data } = await api.get<FoodDto[]>(API_ENDPOINTS.FOODS_LIST)
  return data
}

export async function getFoodById(foodId: string): Promise<FoodDto> {
  const { data } = await api.get<FoodDto>(API_ENDPOINTS.FOOD_DETAIL(foodId))
  return data
}

export async function createFood(payload: CreateFoodRequest): Promise<string> {
  const { data } = await api.post<string>(API_ENDPOINTS.FOODS_LIST, payload)
  return data
}

export async function updateFood(foodId: string, payload: UpdateFoodRequest): Promise<void> {
  await api.put(API_ENDPOINTS.FOOD_DETAIL(foodId), payload)
}

export async function deleteFood(foodId: string): Promise<void> {
  await api.delete(API_ENDPOINTS.FOOD_DETAIL(foodId))
}
