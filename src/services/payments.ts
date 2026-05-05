import api from './api'
import type { ProcessPaymentRequest, PaymentProcessResponse } from '../types/api.types'
import { API_ENDPOINTS } from '../types/api.types'

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export async function processPayment(
  userId: string,
  packageId: string,
  amount: number,
  description?: string
): Promise<PaymentProcessResponse> {
  const idempotencyKey = generateUUID()
  const payload: ProcessPaymentRequest = { userId, packageId, amount, description }

  try {
    const { data } = await api.post<PaymentProcessResponse>(
      API_ENDPOINTS.PAYMENTS_PROCESS,
      payload,
      { headers: { 'Idempotency-Key': idempotencyKey } }
    )
    return data
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status?: number; headers?: Record<string, string>; data?: unknown } }
    if (axiosErr.response?.status === 409) {
      const retryAfter = Number(axiosErr.response.headers?.['retry-after'] ?? 5)
      await new Promise((res) => setTimeout(res, retryAfter * 1000))
      const { data } = await api.post<PaymentProcessResponse>(
        API_ENDPOINTS.PAYMENTS_PROCESS,
        payload,
        { headers: { 'Idempotency-Key': idempotencyKey } }
      )
      return data
    }
    throw err
  }
}
