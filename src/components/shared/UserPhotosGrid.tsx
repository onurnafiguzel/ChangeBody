import { useEffect, useMemo, useState } from 'react'
import { getUserPhotos } from '../../services/userPhotos'
import { parseApiError } from '../../utils/errorHandler'
import PoseSilhouette from '../onboarding/PoseSilhouettes'
import Skeleton from './Skeleton'
import type { PhotoViewType, UserPhotoDto } from '../../types/api.types'
import { API_BASE_URL } from '../../types/api.types'

/** BE imageUrl'ı "/uploads/..." gibi relative dönüyor; absolute URL'e çevir. */
function absolutize(imageUrl: string): string {
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl
  const base = API_BASE_URL.replace(/\/$/, '')
  const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`
  return `${base}${path}`
}

const VIEW_ORDER: PhotoViewType[] = ['Front', 'Back', 'Left', 'Right']
const VIEW_LABEL: Record<PhotoViewType, string> = {
  Front: 'Ön', Back: 'Arka', Left: 'Sol', Right: 'Sağ',
}

interface Props {
  userId: string
}

export default function UserPhotosGrid({ userId }: Props) {
  const [photos, setPhotos] = useState<UserPhotoDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<PhotoViewType | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getUserPhotos(userId)
      .then((list) => { if (!cancelled) setPhotos(list) })
      .catch((err) => {
        if (cancelled) return
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 404) {
          setPhotos([]) // hiç yüklenmemiş — boş kabul et
        } else {
          setError(parseApiError(err, 'Fotoğraflar yüklenemedi.'))
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [userId])

  // Lightbox: ESC ile kapat
  useEffect(() => {
    if (!activeView) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setActiveView(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeView])

  const byView = useMemo(() => {
    const m = new Map<PhotoViewType, UserPhotoDto>()
    for (const p of photos) m.set(p.viewType, p)
    return m
  }, [photos])

  if (loading) {
    return (
      <div className="user-photos-grid">
        {VIEW_ORDER.map((v) => (
          <Skeleton key={v} variant="card" height={undefined} style={{ aspectRatio: '3 / 4' }} />
        ))}
      </div>
    )
  }

  if (error) {
    return <p className="placeholder-desc" style={{ margin: '0 0 16px' }}>⚠️ {error}</p>
  }

  const activePhoto = activeView ? byView.get(activeView) : null

  return (
    <>
      <div className="user-photos-grid">
        {VIEW_ORDER.map((v) => {
          const photo = byView.get(v)
          return (
            <div
              key={v}
              className="user-photo-tile"
              onClick={() => photo && setActiveView(v)}
              role={photo ? 'button' : undefined}
              tabIndex={photo ? 0 : undefined}
              onKeyDown={(e) => {
                if (photo && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  setActiveView(v)
                }
              }}
              style={!photo ? { cursor: 'default' } : undefined}
            >
              {photo ? (
                <img src={absolutize(photo.imageUrl)} alt={VIEW_LABEL[v]} loading="lazy" />
              ) : (
                <div className="user-photo-tile-placeholder">
                  <PoseSilhouette view={v} />
                  <span style={{ fontSize: '0.72rem', marginTop: 4 }}>Henüz yok</span>
                </div>
              )}
              <span className="user-photo-tile-label">{VIEW_LABEL[v]}</span>
            </div>
          )
        })}
      </div>

      {activePhoto && activeView && (
        <div className="modal-overlay" onClick={() => setActiveView(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: 720, maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-group">
                <div className="modal-title">{VIEW_LABEL[activeView]}</div>
              </div>
              <button className="btn-modal-close" onClick={() => setActiveView(null)}>✕</button>
            </div>
            <img
              src={absolutize(activePhoto.imageUrl)}
              alt={VIEW_LABEL[activeView]}
              className="user-photo-lightbox-img"
            />
            <div className="user-photo-lightbox-tabs">
              {VIEW_ORDER.map((v) => {
                const has = byView.has(v)
                return (
                  <button
                    key={v}
                    type="button"
                    className={`user-photo-lightbox-tab ${activeView === v ? 'active' : ''}`}
                    onClick={() => setActiveView(v)}
                    disabled={!has}
                  >
                    {VIEW_LABEL[v]}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
