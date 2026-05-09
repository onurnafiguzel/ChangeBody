// RFC 7807 ProblemDetails / ValidationProblemDetails parser.
// Backend 400 yanıtlarında `errors` alanını döndürdüğünde, kullanıcıya
// `detail` yerine alan-bazlı validasyon mesajları gösterilmelidir.

interface ProblemDetailsLike {
  detail?: string
  title?: string
  errors?: Record<string, string[]>
}

interface AxiosLikeError {
  response?: {
    status?: number
    data?: ProblemDetailsLike | string
  }
  message?: string
}

const DEFAULT_FALLBACK = 'Bir hata oluştu. Lütfen tekrar deneyin.'

export function parseApiError(err: unknown, fallback: string = DEFAULT_FALLBACK): string {
  const axiosErr = err as AxiosLikeError
  const data = axiosErr?.response?.data

  if (data && typeof data === 'object') {
    if (data.errors && typeof data.errors === 'object') {
      const messages: string[] = []
      for (const fieldMessages of Object.values(data.errors)) {
        if (Array.isArray(fieldMessages)) {
          for (const m of fieldMessages) {
            if (typeof m === 'string' && m.trim()) messages.push(m)
          }
        }
      }
      if (messages.length > 0) return messages.join(' • ')
    }
    if (data.detail && typeof data.detail === 'string') return data.detail
    if (data.title && typeof data.title === 'string') return data.title
  }

  if (typeof data === 'string' && data.trim()) return data
  return fallback
}

// Validasyon hatalarını alan-bazlı haritaya dönüştürür (form input'larının altında göstermek için).
// Örn. { Email: ['Required'], Password: ['Too short'] } → { email: 'Required', password: 'Too short' }
export function parseFieldErrors(err: unknown): Record<string, string> {
  const axiosErr = err as AxiosLikeError
  const data = axiosErr?.response?.data
  const out: Record<string, string> = {}
  if (data && typeof data === 'object' && data.errors) {
    for (const [key, msgs] of Object.entries(data.errors)) {
      if (Array.isArray(msgs) && msgs.length > 0) {
        out[key.charAt(0).toLowerCase() + key.slice(1)] = msgs[0]
      }
    }
  }
  return out
}
