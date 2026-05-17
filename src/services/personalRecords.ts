import api from './api'
import type {
  AddPersonalRecordRequest,
  PersonalRecordCurrentDto,
  PersonalRecordDto,
  PersonalRecordLift,
} from '../types/api.types'
import { API_ENDPOINTS } from '../types/api.types'

export async function addPersonalRecord(
  userId: string,
  payload: AddPersonalRecordRequest,
): Promise<string> {
  const { data } = await api.post<string>(API_ENDPOINTS.USER_PERSONAL_RECORDS(userId), payload)
  return data
}

export async function getCurrentPersonalRecords(
  userId: string,
): Promise<PersonalRecordCurrentDto[]> {
  const { data } = await api.get<PersonalRecordCurrentDto[]>(
    API_ENDPOINTS.USER_PERSONAL_RECORDS(userId),
  )
  return data
}

export async function getPersonalRecordHistory(
  userId: string,
  lift: PersonalRecordLift,
): Promise<PersonalRecordDto[]> {
  const { data } = await api.get<PersonalRecordDto[]>(
    API_ENDPOINTS.USER_PERSONAL_RECORDS_HISTORY(userId),
    { params: { lift } },
  )
  return data
}
