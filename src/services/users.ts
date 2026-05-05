import api from './api'
import type { UserDto, CompleteProfileRequest, ActiveProgramDetailDto, WaitingUserStatusDto, FitnessGoalDto } from '../types/api.types'
import { API_ENDPOINTS } from '../types/api.types'

export async function getUserProfile(userId: string): Promise<UserDto> {
  const { data } = await api.get<UserDto>(API_ENDPOINTS.USER_DETAIL(userId))
  return data
}

export async function completeProfile(userId: string, payload: CompleteProfileRequest): Promise<void> {
  await api.post(API_ENDPOINTS.USER_COMPLETE_PROFILE(userId), payload)
}

export async function getUserActiveProgram(userId: string): Promise<ActiveProgramDetailDto> {
  const { data } = await api.get<ActiveProgramDetailDto>(API_ENDPOINTS.USER_ACTIVE_PROGRAM(userId))
  return data
}

export async function getWaitingUserStatus(userId: string): Promise<WaitingUserStatusDto | null> {
  try {
    const { data } = await api.get<WaitingUserStatusDto>(API_ENDPOINTS.WAITING_USER_STATUS(userId))
    return data
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status?: number } }
    if (axiosErr.response?.status === 404) return null
    throw err
  }
}

export async function getFitnessGoals(): Promise<FitnessGoalDto[]> {
  const { data } = await api.get<FitnessGoalDto[]>(API_ENDPOINTS.FITNESS_GOALS_LIST)
  return data
}

export async function getProfileCompletionStatus(userId: string): Promise<boolean> {
  try {
    const { data } = await api.get<boolean>(API_ENDPOINTS.PROFILE_COMPLETE_CHECK(userId))
    return data
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status?: number } }
    if (axiosErr.response?.status === 404) return false
    throw err
  }
}
