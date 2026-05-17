import api from './api'
import type {
  AddBodyMeasurementRequest,
  BodyMeasurementComparisonDto,
  BodyMeasurementDto,
} from '../types/api.types'
import { API_ENDPOINTS } from '../types/api.types'

export async function addBodyMeasurement(
  userId: string,
  payload: AddBodyMeasurementRequest,
): Promise<string> {
  const { data } = await api.post<string>(API_ENDPOINTS.USER_BODY_MEASUREMENTS(userId), payload)
  return data
}

export async function listBodyMeasurements(
  userId: string,
  take = 20,
): Promise<BodyMeasurementDto[]> {
  const { data } = await api.get<BodyMeasurementDto[]>(
    API_ENDPOINTS.USER_BODY_MEASUREMENTS(userId),
    { params: { take } },
  )
  return data
}

export async function getBodyMeasurementComparison(
  userId: string,
): Promise<BodyMeasurementComparisonDto> {
  const { data } = await api.get<BodyMeasurementComparisonDto>(
    API_ENDPOINTS.USER_BODY_MEASUREMENTS_COMPARISON(userId),
  )
  return data
}

export async function getBodyMeasurementById(
  userId: string,
  measurementId: string,
): Promise<BodyMeasurementDto> {
  const { data } = await api.get<BodyMeasurementDto>(
    API_ENDPOINTS.USER_BODY_MEASUREMENT_BY_ID(userId, measurementId),
  )
  return data
}
