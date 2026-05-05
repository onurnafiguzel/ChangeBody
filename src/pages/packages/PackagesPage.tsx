import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/shared/Header'
import { Sidebar, BottomNav } from '../../components/shared/Navigation'
import PackageCard from '../../components/cards/PackageCard'
import { getPackages } from '../../services/packages'
import { processPayment } from '../../services/payments'
import { getWaitingUserStatus } from '../../services/users'
import { getStoredUser } from '../../services/auth'
import type { PackageDto } from '../../types/api.types'
import '../../styles/dashboard.css'
import '../../styles/packages.css'

type PaymentState = 'idle' | 'loading' | 'success' | 'error'

export default function PackagesPage() {
  const navigate = useNavigate()
  const user = getStoredUser()

  const [packages, setPackages] = useState<PackageDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isWaiting, setIsWaiting] = useState(false)

  const [selected, setSelected] = useState<PackageDto | null>(null)
  const [paymentState, setPaymentState] = useState<PaymentState>('idle')
  const [paymentError, setPaymentError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    fetchPackages()
    getWaitingUserStatus(user.userId)
      .then((s) => setIsWaiting(s?.isWaitingForAssignment === true))
      .catch(() => {})
  }, [])

  async function fetchPackages() {
    setLoading(true)
    setError(null)
    try {
      const data = await getPackages()
      setPackages(data)
    } catch {
      setError('Paketler yüklenemedi. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  function openModal(pkg: PackageDto) {
    setSelected(pkg)
    setPaymentState('idle')
    setPaymentError(null)
  }

  function closeModal() {
    if (paymentState === 'loading') return
    setSelected(null)
    setPaymentState('idle')
    setPaymentError(null)
  }

  async function handlePay() {
    if (!selected || !user) return
    setPaymentState('loading')
    setPaymentError(null)
    try {
      await processPayment(user.userId, selected.id, selected.price, `${selected.name} - ${selected.durationDays} gün`)
      setPaymentState('success')
      const status = await getWaitingUserStatus(user.userId).catch(() => null)
      setIsWaiting(status?.isWaitingForAssignment === true)
      setTimeout(() => {
        setSelected(null)
        navigate('/dashboard')
      }, 2000)
    } catch {
      setPaymentState('error')
      setPaymentError('Ödeme işlemi başarısız oldu. Lütfen tekrar deneyin.')
    }
  }

  if (!user) return null

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header />
        <div className="page-content">
          <div className="section-header" style={{ marginBottom: 8 }}>
            <span className="section-title">Paketler</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 4 }}>
            Hedeflerinize uygun paketi seçin ve antrenman yolculuğunuza başlayın.
          </p>

          {error && <div className="error-banner">⚠️ {error}</div>}

          {isWaiting && (
            <div className="waiting-banner">
              <span className="waiting-banner-icon">⏳</span>
              <div>
                <div className="waiting-banner-title">Aktif bir paketiniz bulunuyor</div>
                <div className="waiting-banner-sub">Ödemeniz alındı, koçunuz programınızı hazırlıyor. Aşağıdaki paketleri inceleyebilirsiniz.</div>
              </div>
            </div>
          )}

          <div className="packages-grid">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="package-card-skeleton" />
                ))
              : packages.length === 0
              ? (
                <div className="empty-state">
                  <span className="empty-state-icon">📦</span>
                  <p className="empty-state-text">Şu an aktif paket bulunmuyor</p>
                </div>
              )
              : packages.map((pkg) => (
                  <PackageCard key={pkg.id} pkg={pkg} onSelect={openModal} />
                ))
            }
          </div>
        </div>
        <BottomNav />
      </div>

      {selected && (
        <div className="payment-modal-overlay" onClick={closeModal}>
          <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="payment-modal-title">Ödemeyi Onayla</div>

            {paymentState === 'success' ? (
              <div className="payment-success">
                ✅ Ödeme başarıyla tamamlandı! Dashboard'a yönlendiriliyorsunuz...
              </div>
            ) : (
              <>
                <div className="payment-summary">
                  <div className="payment-summary-row">
                    <span>Paket</span>
                    <span className="val">{selected.name}</span>
                  </div>
                  <div className="payment-summary-row">
                    <span>Süre</span>
                    <span className="val">{selected.durationDays} gün</span>
                  </div>
                  <div className="payment-summary-row total">
                    <span>Toplam</span>
                    <span className="val">{selected.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                  </div>
                </div>

                {paymentError && (
                  <div className="payment-error">⚠️ {paymentError}</div>
                )}

                <div className="payment-modal-actions">
                  <button
                    className="btn-pay"
                    onClick={handlePay}
                    disabled={paymentState === 'loading'}
                  >
                    {paymentState === 'loading' ? 'İşleniyor...' : 'Ödemeyi Tamamla'}
                  </button>
                  <button className="btn-pay-cancel" onClick={closeModal}>
                    İptal
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
