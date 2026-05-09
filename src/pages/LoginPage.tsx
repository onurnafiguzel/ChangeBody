import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { login } from '../services/auth'
import { breakdownApiError, parseApiError } from '../utils/errorHandler'
import '../styles/auth.css'

interface Props {
  onSwitchToSignup: () => void
}

export default function LoginPage({ onSwitchToSignup }: Props) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setFieldErrors({})

    const errors: Record<string, string> = {}
    if (!email) errors.email = 'E-posta adresi gerekli'
    if (!password) errors.password = 'Şifre gerekli'
    if (Object.keys(errors).length) { setFieldErrors(errors); return }

    setLoading(true)
    try {
      await login({ email: email.trim(), password })
      navigate('/dashboard')
    } catch (err) {
      const status = (err as AxiosError).response?.status

      if (status === 401) {
        setError('E-posta veya şifre hatalı. Tekrar deneyin.')
      } else if (status === 400) {
        const { fieldErrors: fields, globalMessage } = breakdownApiError(err)
        setFieldErrors(fields)
        if (globalMessage) setError(globalMessage)
      } else {
        setError(parseApiError(err))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      <HeroPanel />
      <div className="auth-panel">
        <div className="auth-card">
          <div className="auth-card-header">
            <h2>Tekrar hoş geldin</h2>
            <p>Daha iyi bir versiyona giden yolculuğuna devam et.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {error && <div className="auth-error">{error}</div>}

            <div className="form-group">
              <label htmlFor="email">E-posta</label>
              <input
                id="email"
                type="email"
                placeholder="ornek@mail.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={fieldErrors.email ? 'error' : ''}
                autoComplete="email"
              />
              {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Şifre</label>
              <div className="input-wrapper">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="En az 8 karakter"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={fieldErrors.password ? 'error' : ''}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="toggle-pw"
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'Şifreyi gizle' : 'Şifreyi göster'}
                >
                  {showPw ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading && <span className="spinner" />}
              {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
            </button>
          </form>

          <div className="auth-switch">
            Hesabın yok mu?{' '}
            <button onClick={onSwitchToSignup}>Üye ol</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function HeroPanel() {
  return (
    <div className="auth-hero">
      <div className="auth-hero-rings" />
      <span className="hero-tag">ChangeBody</span>
      <h1 className="hero-headline">
        Her gün bir adım
        <span>daha güçlü.</span>
      </h1>
      <p className="hero-sub">
        Kişisel koçun rehberliğinde vücudunu ve zihnini dönüştür.
        Gerçek sonuçlar, gerçek bir plan — sana özel.
      </p>
      <div className="hero-stats">
        <div className="stat-item">
          <span className="stat-value">500+</span>
          <span className="stat-label">Egzersiz</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">1:1</span>
          <span className="stat-label">Koçluk</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">∞</span>
          <span className="stat-label">Potansiyel</span>
        </div>
      </div>
    </div>
  )
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}
