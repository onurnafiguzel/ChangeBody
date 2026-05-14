import { useEffect, useRef, useState } from 'react'
import PoseSilhouette from './PoseSilhouettes'
import type { PhotoViewType } from '../../types/api.types'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const ACCEPTED = ['image/png', 'image/jpeg']

const LABELS: Record<PhotoViewType, string> = {
  Front: 'Ön',
  Back: 'Arka',
  Left: 'Sol Yan',
  Right: 'Sağ Yan',
}

interface Props {
  view: PhotoViewType
  file: File | null
  onChange: (file: File | null) => void
}

export default function PhotoUploadSlot({ view, file, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Create + revoke preview URL when file changes
  useEffect(() => {
    if (!file) { setPreviewUrl(null); return }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function pickFile() {
    setError(null)
    inputRef.current?.click()
  }

  function handleSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = '' // izin ver: aynı dosyayı tekrar seçme
    if (!f) return
    if (!ACCEPTED.includes(f.type)) {
      setError('PNG veya JPEG olmalı')
      return
    }
    if (f.size > MAX_BYTES) {
      setError('En fazla 10 MB')
      return
    }
    setError(null)
    onChange(f)
  }

  function clearFile() {
    setError(null)
    onChange(null)
  }

  const filled = !!file && !error

  return (
    <div className={`ob-photo-slot ${filled ? 'filled' : ''} ${error ? 'error' : ''}`}>
      {filled && <div className="ob-photo-slot-badge">✓</div>}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        style={{ display: 'none' }}
        onChange={handleSelected}
      />

      {previewUrl ? (
        <img src={previewUrl} alt={LABELS[view]} className="ob-photo-slot-thumb" />
      ) : (
        <PoseSilhouette view={view} active={false} />
      )}

      <div className="ob-photo-slot-label">{LABELS[view]}</div>

      {!filled && (
        <button type="button" className="ob-btn-secondary" onClick={pickFile}>
          + Fotoğraf Seç
        </button>
      )}
      {filled && (
        <div className="ob-photo-actions">
          <button type="button" onClick={pickFile}>✎ Değiştir</button>
          <button type="button" className="danger" onClick={clearFile}>🗑 Kaldır</button>
        </div>
      )}

      {error && <div className="ob-photo-slot-error">{error}</div>}
      {!filled && !error && (
        <div className="ob-photo-slot-help">PNG/JPEG · max 10 MB</div>
      )}
    </div>
  )
}
