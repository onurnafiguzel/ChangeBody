import api from './api'
import type {
  CoachDashboardDto,
  CoachDto,
  CoachProgramListItemDto,
  UpdateCoachRequest,
  ChangePasswordRequest,
} from '../types/api.types'
import { API_ENDPOINTS } from '../types/api.types'

export async function getCoachProfile(coachId: string): Promise<CoachDto> {
  const { data } = await api.get<CoachDto>(API_ENDPOINTS.COACH_DETAIL(coachId))
  return data
}

export async function updateCoach(coachId: string, payload: UpdateCoachRequest): Promise<void> {
  await api.put(API_ENDPOINTS.COACH_UPDATE(coachId), payload)
}

export async function changeCoachPassword(coachId: string, payload: ChangePasswordRequest): Promise<void> {
  await api.post(API_ENDPOINTS.COACH_CHANGE_PASSWORD(coachId), payload)
}

export async function getCoachPrograms(coachId: string): Promise<CoachProgramListItemDto[]> {
  const { data } = await api.get<CoachProgramListItemDto[]>(API_ENDPOINTS.COACH_PROGRAMS_LIST(coachId))
  return data
}

export async function getCoachDashboard(coachId: string): Promise<CoachDashboardDto> {
  const { data } = await api.get<CoachDashboardDto>(API_ENDPOINTS.COACH_DASHBOARD(coachId))
  return data
}
