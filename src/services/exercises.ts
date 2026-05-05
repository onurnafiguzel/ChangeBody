import api from './api'
import type { ExerciseDto } from '../types/api.types'
import { API_ENDPOINTS } from '../types/api.types'

interface ExerciseListResponse {
  data: ExerciseDto[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ExerciseParams {
  muscleGroup?: string
  difficultyLevel?: string
  search?: string
  sortBy?: string
  page?: number
  pageSize?: number
}

export interface ExerciseListResult {
  exercises: ExerciseDto[]
  total: number
  totalPages: number
  page: number
}

export async function getExercises(params: ExerciseParams = {}): Promise<ExerciseListResult> {
  const query = new URLSearchParams()
  query.set('isActiveOnly', 'true')
  query.set('page', String(params.page ?? 1))
  query.set('pageSize', String(params.pageSize ?? 20))
  if (params.muscleGroup) query.set('muscleGroup', params.muscleGroup)
  if (params.difficultyLevel) query.set('difficultyLevel', params.difficultyLevel)
  if (params.search) query.set('search', params.search)
  if (params.sortBy) query.set('sortBy', params.sortBy)

  const { data } = await api.get<ExerciseListResponse>(
    `${API_ENDPOINTS.EXERCISES_LIST}?${query.toString()}`
  )
  return {
    exercises: data.data,
    total: data.total,
    totalPages: data.totalPages,
    page: data.page,
  }
}

export async function getExerciseById(id: string): Promise<ExerciseDto> {
  const { data } = await api.get<ExerciseDto>(API_ENDPOINTS.EXERCISE_DETAIL(id))
  return data
}

export async function getMuscleGroups(): Promise<string[]> {
  const { data } = await api.get<string[]>('/api/exercises/muscle-groups')
  return data
}
