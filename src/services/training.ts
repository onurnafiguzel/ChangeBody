import api from './api'
import type {
  ActiveProgramDetailDto,
  CreateTrainingProgramRequest,
  UpdateDailyProgramRequest,
  UpdateProgressRequest,
} from '../types/api.types'
import { API_ENDPOINTS } from '../types/api.types'

export async function getTrainingProgram(programId: string): Promise<ActiveProgramDetailDto> {
  const { data } = await api.get<ActiveProgramDetailDto>(API_ENDPOINTS.PROGRAM_DETAIL(programId))
  return data
}

export async function createTrainingProgram(payload: CreateTrainingProgramRequest): Promise<string> {
  // BE response: oluşturulan programın UUID'si (raw string)
  const { data } = await api.post<string>(API_ENDPOINTS.PROGRAMS_CREATE, payload)
  return data
}

export async function updateDailyProgram(
  programId: string,
  payload: UpdateDailyProgramRequest,
): Promise<void> {
  await api.put(API_ENDPOINTS.PROGRAM_UPDATE_DAILY(programId), payload)
}

export async function updateProgress(programId: string, completedWeeks: number): Promise<void> {
  const payload: UpdateProgressRequest = { completedWeeks }
  await api.put(API_ENDPOINTS.PROGRAM_UPDATE_PROGRESS(programId), payload)
}

export async function activateProgram(programId: string): Promise<void> {
  await api.post(API_ENDPOINTS.PROGRAM_ACTIVATE(programId))
}

export async function deactivateProgram(programId: string): Promise<void> {
  await api.post(API_ENDPOINTS.PROGRAM_DEACTIVATE(programId))
}

export async function completeProgram(programId: string): Promise<void> {
  await api.post(API_ENDPOINTS.PROGRAM_COMPLETE(programId))
}
