import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '../../components/shared/Header'
import { Sidebar, BottomNav } from '../../components/shared/Navigation'
import {
  activateProgram,
  completeProgram,
  deactivateProgram,
  getTrainingProgram,
  updateProgress,
} from '../../services/training'
import { parseApiError } from '../../utils/errorHandler'
import type { ActiveProgramDetailDto } from '../../types/api.types'
import '../../styles/dashboard.css'

const DIFFICULTY_TR: Record<string, string> = { Beginner: 'Başlangıç', Intermediate: 'Orta', Advanced: 'İleri' }
const GENDER_TR: Record<string, string> = { Male: 'Erkek', Female: 'Kadın', Other: 'Diğer' }

function formatDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function dayOrder(key: string): number {
  const m = key.match(/(\d+)/)
  return m ? parseInt(m[1], 10) : 9999
}

export default function ProgramDetailPage() {
  const navigate = useNavigate()
  const { programId } = useParams<{ programId: string }>()

  const [program, setProgram] = useState<ActiveProgramDetailDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  // Progress modal state
  const [pmOpen, setPmOpen] = useState(false)
  const [pmWeeks, setPmWeeks] = useState<number>(0)
  const [pmLoading, setPmLoading] = useState(false)
  const [pmError, setPmError] = useState<string | null>(null)

  useEffect(() => {
    if (!programId) return
    fetchProgram()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId])

  async function fetchProgram() {
    if (!programId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getTrainingProgram(programId)
      setProgram(data)
      // İlerleme modal default'u: program.dailyExercises'tan tahmini hafta hesabı
      const days = data.dailyExercises ? Object.keys(data.dailyExercises).length : 0
      setPmWeeks(Math.min(data.durationWeeks, Math.floor(days / 7)))
    } catch (err) {
      setError(parseApiError(err, 'Program yüklenemedi.'))
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusAction(action: 'activate' | 'deactivate' | 'complete') {
    if (!programId) return
    setActionMsg(null)
    try {
      if (action === 'activate') await activateProgram(programId)
      else if (action === 'deactivate') await deactivateProgram(programId)
      else await completeProgram(programId)
      const labels = { activate: 'aktifleştirildi', deactivate: 'deaktifleştirildi', complete: 'tamamlandı' }
      setActionMsg(`Program ${labels[action]}.`)
      await fetchProgram()
    } catch (err) {
      setActionMsg(parseApiError(err, 'İşlem başarısız.'))
    }
  }

  async function handleSaveProgress() {
    if (!programId || !program) return
    if (pmWeeks < 0 || pmWeeks > program.durationWeeks) {
      setPmError(`Tamamlanan hafta 0 ile ${program.durationWeeks} arasında olmalı.`)
      return
    }
    setPmLoading(true)
    setPmError(null)
    try {
      await updateProgress(programId, pmWeeks)
      setPmOpen(false)
      setActionMsg('İlerleme kaydedildi.')
      await fetchProgram()
    } catch (err) {
      setPmError(parseApiError(err, 'İlerleme kaydedilemedi.'))
    } finally {
      setPmLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="app-shell">
        <Sidebar />
        <div className="app-main">
          <Header />
          <div className="page-content">
            <div className="skeleton" style={{ height: 60, borderRadius: 12, marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 320, borderRadius: 12 }} />
          </div>
          <BottomNav />
        </div>
      </div>
    )
  }

  if (error || !program) {
    return (
      <div className="app-shell">
        <Sidebar />
        <div className="app-main">
          <Header />
          <div className="page-content">
            <div className="error-banner">⚠️ {error ?? 'Program bulunamadı.'}</div>
            <button className="btn-back" onClick={() => navigate('/coach/programs')}>← Programlara Dön</button>
          </div>
          <BottomNav />
        </div>
      </div>
    )
  }

  const sortedDays = program.dailyExercises
    ? Object.entries(program.dailyExercises).sort(([a], [b]) => dayOrder(a) - dayOrder(b))
    : []

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header />
        <div className="page-content">
          <div className="section-header" style={{ marginBottom: 16 }}>
            <button className="btn-back" onClick={() => navigate('/coach/programs')}>← Programlar</button>
            <span className="section-title">{program.name}</span>
          </div>

          {actionMsg && <div className="success-banner">✓ {actionMsg}</div>}

          {/* Program Info */}
          <div className="profile-edit-section">
            <div className="profile-edit-section-title">📋 Program Bilgileri</div>
            <div className="profile-summary-grid">
              <div className="profile-summary-item">
                <span className="profile-summary-label">Antrenör</span>
                <span className="profile-summary-value">{program.coachName}</span>
              </div>
              <div className="profile-summary-item">
                <span className="profile-summary-label">Süre</span>
                <span className="profile-summary-value">{program.durationWeeks} hafta</span>
              </div>
              <div className="profile-summary-item">
                <span className="profile-summary-label">Zorluk</span>
                <span className="profile-summary-value">{DIFFICULTY_TR[program.difficulty] ?? program.difficulty}</span>
              </div>
              <div className="profile-summary-item">
                <span className="profile-summary-label">Durum</span>
                <span className="profile-summary-value">
                  {program.status === 'InProgress' ? 'Devam Ediyor' : 'Tamamlandı'}
                </span>
              </div>
              <div className="profile-summary-item">
                <span className="profile-summary-label">Başlangıç</span>
                <span className="profile-summary-value">{formatDate(program.startDate)}</span>
              </div>
              <div className="profile-summary-item">
                <span className="profile-summary-label">Bitiş</span>
                <span className="profile-summary-value">{formatDate(program.endDate)}</span>
              </div>
              {program.description && (
                <div className="profile-summary-item full">
                  <span className="profile-summary-label">Açıklama</span>
                  <span className="profile-summary-value">{program.description}</span>
                </div>
              )}
            </div>
          </div>

          {/* Atanan Sporcu (BE artık programın user fitness profilini de döndürüyor) */}
          {(program.userId || program.userAge != null || program.userHeight != null || program.userWeight != null || program.userGender) && (
            <div className="profile-edit-section">
              <div className="profile-edit-section-title">👤 Atanan Sporcu</div>
              <div className="profile-summary-grid">
                {program.userAge != null && (
                  <div className="profile-summary-item">
                    <span className="profile-summary-label">Yaş</span>
                    <span className="profile-summary-value">{program.userAge}</span>
                  </div>
                )}
                {program.userGender && (
                  <div className="profile-summary-item">
                    <span className="profile-summary-label">Cinsiyet</span>
                    <span className="profile-summary-value">{GENDER_TR[program.userGender] ?? program.userGender}</span>
                  </div>
                )}
                {program.userHeight != null && (
                  <div className="profile-summary-item">
                    <span className="profile-summary-label">Boy</span>
                    <span className="profile-summary-value">{program.userHeight} cm</span>
                  </div>
                )}
                {program.userWeight != null && (
                  <div className="profile-summary-item">
                    <span className="profile-summary-label">Kilo</span>
                    <span className="profile-summary-value">{program.userWeight} kg</span>
                  </div>
                )}
                {program.userId && (
                  <div className="profile-summary-item full">
                    <button className="btn-link" onClick={() => navigate(`/coach/users/${program.userId}`)}>
                      Sporcu Profilini Gör →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Daily Schedule (read-only) */}
          <div className="profile-edit-section">
            <div className="profile-edit-section-title">📅 Haftalık Schedule</div>
            {sortedDays.length === 0 ? (
              <p className="placeholder-desc">Bu program için henüz egzersiz programı oluşturulmamış.</p>
            ) : (
              <div className="schedule-readonly">
                {sortedDays.map(([day, exercises]) => (
                  <div key={day} className="schedule-day-block">
                    <div className="schedule-day-title">{day}</div>
                    {exercises.length === 0 ? (
                      <div className="schedule-rest">Dinlenme Günü</div>
                    ) : (
                      <ul className="schedule-exercise-list">
                        {exercises.map((ex, idx) => (
                          <li key={`${day}-${idx}`}>
                            <span className="schedule-exercise-meta">
                              {ex.sets} set · {ex.reps} tekrar
                            </span>
                            <span className="schedule-exercise-id">#{ex.exerciseId.slice(0, 8)}</span>
                            {ex.explanation && <div className="schedule-exercise-note">💬 {ex.explanation}</div>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="profile-edit-actions">
            <button className="btn-secondary" onClick={() => alert('Schedule düzenleme akışı yakında.')}>
              Programı Düzenle
            </button>
            <button className="btn-primary" onClick={() => setPmOpen(true)}>
              İlerleme Güncelle
            </button>
          </div>

          <div className="profile-edit-section" style={{ marginTop: 16 }}>
            <div className="profile-edit-section-title">⚙️ Program Durumu</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {program.status === 'Completed' ? (
                <button className="btn-secondary" onClick={() => handleStatusAction('activate')}>
                  Yeniden Aktifleştir
                </button>
              ) : (
                <>
                  <button className="btn-secondary" onClick={() => handleStatusAction('deactivate')}>
                    Deaktifleştir
                  </button>
                  <button className="btn-secondary" onClick={() => handleStatusAction('complete')}>
                    Tamamla
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        <BottomNav />
      </div>

      {/* Progress Modal */}
      {pmOpen && (
        <div className="payment-modal-overlay" onClick={() => !pmLoading && setPmOpen(false)}>
          <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="payment-modal-title">İlerleme Güncelle</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 12 }}>
              Tamamlanan hafta sayısını girin (0 – {program.durationWeeks}).
            </p>
            <div className="ob-form-group">
              <label className="ob-label">Tamamlanan Hafta</label>
              <input
                className="ob-input"
                type="number"
                min={0}
                max={program.durationWeeks}
                value={pmWeeks}
                onChange={(e) => setPmWeeks(parseInt(e.target.value) || 0)}
              />
            </div>
            {pmError && <div className="error-banner">⚠️ {pmError}</div>}
            <div className="payment-modal-actions">
              <button className="btn-pay-cancel" onClick={() => setPmOpen(false)} disabled={pmLoading}>İptal</button>
              <button className="btn-pay" onClick={handleSaveProgress} disabled={pmLoading}>
                {pmLoading ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
