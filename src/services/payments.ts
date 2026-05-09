import api from './api'
import type { ProcessPaymentRequest, PaymentProcessResponse } from '../types/api.types'
import { API_ENDPOINTS } from '../types/api.types'
import { parseApiError } from '../utils/errorHandler'

export type PaymentErrorKind = 'unauthorized' | 'validation' | 'conflict' | 'network' | 'unknown'

export class PaymentError extends Error {
  kind: PaymentErrorKind
  status?: number
  detail?: string
  constructor(kind: PaymentErrorKind, status?: number, detail?: string) {
    super(detail ?? kind)
    this.kind = kind
    this.status = status
    this.detail = detail
  }
}

const MAX_409_RETRIES = 3

function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback (eski tarayıcılar)
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
  description?: string,
): Promise<PaymentProcessResponse> {
  const idempotencyKey = newIdempotencyKey()
  const payload: ProcessPaymentRequest = { userId, packageId, amount, description }

  let attempt = 0
  while (true) {
    try {
      const { data } = await api.post<PaymentProcessResponse>(
        API_ENDPOINTS.PAYMENTS_PROCESS,
        payload,
        { headers: { 'Idempotency-Key': idempotencyKey } },
      )
      return data
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { status?: number; headers?: Record<string, string> }
      }
      const status = axiosErr.response?.status
      const message = parseApiError(err)

      if (status === 409 && attempt < MAX_409_RETRIES) {
        const retryAfter = Number(axiosErr.response?.headers?.['retry-after'] ?? 5)
        await new Promise((res) => setTimeout(res, retryAfter * 1000))
        attempt += 1
        continue
      }

      if (status === 409) throw new PaymentError('conflict', 409, message)
      if (status === 401) throw new PaymentError('unauthorized', 401, message)
      if (status === 400) throw new PaymentError('validation', 400, message)
      if (!status) throw new PaymentError('network', undefined, 'Bağlantı hatası')
      throw new PaymentError('unknown', status, message)
    }
  }
}
