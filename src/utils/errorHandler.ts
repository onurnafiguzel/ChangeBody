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

// Model-level (form-genelinde) hata anahtarları — input'a bağlı değil, global gösterilir.
// ASP.NET Core ValidationProblemDetails bu hataları `""` veya `"$"` anahtarıyla döndürür.
function isModelLevelKey(key: string): boolean {
  const k = key.trim()
  return k === '' || k === '$'
}

export function parseApiError(err: unknown, fallback: string = DEFAULT_FALLBACK): string {
  const axiosErr = err as AxiosLikeError
  const data = axiosErr?.response?.data

  if (data && typeof data === 'object') {
    if (data.errors && typeof data.errors === 'object') {
      const modelLevel: string[] = []
      const fieldLevel: string[] = []
      for (const [key, msgs] of Object.entries(data.errors)) {
        if (!Array.isArray(msgs)) continue
        for (const m of msgs) {
          if (typeof m !== 'string' || !m.trim()) continue
          if (isModelLevelKey(key)) modelLevel.push(m)
          else fieldLevel.push(m)
        }
      }
      // Model-level mesajlar açık kullanıcı uyarılarıdır → öncelikli göster.
      if (modelLevel.length > 0) return modelLevel.join(' • ')
      if (fieldLevel.length > 0) return fieldLevel.join(' • ')
    }
    if (data.detail && typeof data.detail === 'string') return data.detail
    if (data.title && typeof data.title === 'string') return data.title
  }

  if (typeof data === 'string' && data.trim()) return data
  return fallback
}

// Validasyon hatalarını alan-bazlı haritaya dönüştürür (form input'larının altında göstermek için).
// Örn. { Email: ['Required'], Password: ['Too short'] } → { email: 'Required', password: 'Too short' }
// Model-level hatalar (boş "" veya "$" anahtarı) burada SKIP edilir — onlar parseApiError ile global gösterilir.
export function parseFieldErrors(err: unknown): Record<string, string> {
  const axiosErr = err as AxiosLikeError
  const data = axiosErr?.response?.data
  const out: Record<string, string> = {}
  if (data && typeof data === 'object' && data.errors) {
    for (const [key, msgs] of Object.entries(data.errors)) {
      if (isModelLevelKey(key)) continue
      if (Array.isArray(msgs) && msgs.length > 0) {
        out[key.charAt(0).toLowerCase() + key.slice(1)] = msgs[0]
      }
    }
  }
  return out
}

// Hem alan-bazlı hem global mesajı tek geçişte üretir. Tüm 400 handler'ları için tek API.
// - fieldErrors: input'ların altında gösterilecek alan-bazlı mesajlar
// - globalMessage: form üstünde banner olarak gösterilecek mesaj (null → banner gizli)
//
// Mantık:
// - Model-level error varsa → global olarak göster (önemli; alan altında yer alamaz)
// - Field-level error varsa ve model-level yoksa → sadece inline göster, banner null (duplikasyon önleme)
// - Hiç field-level yok + hiç model-level yok → fallback (detail/title) global olarak göster
export function breakdownApiError(err: unknown): { fieldErrors: Record<string, string>; globalMessage: string | null } {
  const fieldErrors = parseFieldErrors(err)

  const data = (err as AxiosLikeError)?.response?.data
  let modelLevelMessage: string | null = null
  if (data && typeof data === 'object' && data.errors) {
    const msgs: string[] = []
    for (const [key, list] of Object.entries(data.errors)) {
      if (!isModelLevelKey(key) || !Array.isArray(list)) continue
      for (const m of list) {
        if (typeof m === 'string' && m.trim()) msgs.push(m)
      }
    }
    if (msgs.length > 0) modelLevelMessage = msgs.join(' • ')
  }

  if (modelLevelMessage) {
    return { fieldErrors, globalMessage: modelLevelMessage }
  }
  if (Object.keys(fieldErrors).length === 0) {
    // Hiç validasyon detayı yok → detail/title fallback
    return { fieldErrors, globalMessage: parseApiError(err) }
  }
  // Sadece field-level errors → banner gerek yok, inline göster
  return { fieldErrors, globalMessage: null }
}
