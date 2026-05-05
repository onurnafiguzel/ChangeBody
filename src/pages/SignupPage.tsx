import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { signup } from '../services/auth'
import type { ApiError } from '../types/auth'
import '../styles/auth.css'

interface Props {
  onSwitchToLogin: () => void
}

export default function SignupPage({ onSwitchToLogin }: Props) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
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
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Geçerli bir e-posta girin'
    if (!password) errors.password = 'Şifre gerekli'
    else if (password.length < 8) errors.password = 'Şifre en az 8 karakter olmalı'
    if (!confirmPw) errors.confirmPw = 'Şifreyi tekrar girin'
    else if (password !== confirmPw) errors.confirmPw = 'Şifreler eşleşmiyor'
    if (Object.keys(errors).length) { setFieldErrors(errors); return }

    setLoading(true)
    try {
      await signup({ email: email.trim(), password })
      navigate('/dashboard')
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>
      const status = axiosErr.response?.status
      const detail = axiosErr.response?.data?.detail

      if (status === 409) {
        setFieldErrors({ email: 'Bu e-posta adresi zaten kayıtlı.' })
      } else if (status === 400 && axiosErr.response?.data?.errors) {
        const apiErrors = axiosErr.response.data.errors
        const mapped: Record<string, string> = {}
        for (const [key, msgs] of Object.entries(apiErrors)) {
          mapped[key.toLowerCase()] = msgs[0]
        }
        setFieldErrors(mapped)
      } else {
        setError(detail || 'Kayıt oluşturulamadı. Lütfen tekrar deneyin.')
      }
    } finally {
      setLoading(false)
    }
  }

  const strength = getPasswordStrength(password)

  return (
    <div className="auth-shell">
      <HeroPanel />
      <div className="auth-panel">
        <div className="auth-card">
          <div className="auth-card-header">
            <h2>Yolculuğuna başla</h2>
            <p>Bugün kaydol — en iyi versiyonun seni bekliyor.</p>
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
                  autoComplete="new-password"
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
              {password && <PasswordStrengthBar strength={strength} />}
              {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPw">Şifre Tekrar</label>
              <input
                id="confirmPw"
                type={showPw ? 'text' : 'password'}
                placeholder="Şifreni tekrar gir"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                className={fieldErrors.confirmPw ? 'error' : ''}
                autoComplete="new-password"
              />
              {fieldErrors.confirmPw && <span className="field-error">{fieldErrors.confirmPw}</span>}
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading && <span className="spinner" />}
              {loading ? 'Hesap oluşturuluyor…' : 'Üye Ol'}
            </button>
          </form>

          <div className="auth-switch">
            Zaten hesabın var mı?{' '}
            <button onClick={onSwitchToLogin}>Giriş yap</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function getPasswordStrength(pw: string): number {
  if (!pw) return 0
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score
}

function PasswordStrengthBar({ strength }: { strength: number }) {
  const labels = ['', 'Çok zayıf', 'Zayıf', 'Orta', 'Güçlü', 'Çok güçlü']
  const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a']
  const pct = (strength / 5) * 100

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ height: 4, borderRadius: 2, background: '#2a2a2a', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: colors[strength],
          borderRadius: 2,
          transition: 'width 0.3s, background 0.3s',
        }} />
      </div>
      <span style={{ fontSize: '0.72rem', color: colors[strength], marginTop: 4, display: 'block' }}>
        {labels[strength]}
      </span>
    </div>
  )
}

function HeroPanel() {
  return (
    <div className="auth-hero">
      <div className="auth-hero-rings" />
      <span className="hero-tag">ChangeBody</span>
      <h1 className="hero-headline">
        Limitlerin
        <span>senin kararın.</span>
      </h1>
      <p className="hero-sub">
        Uzman koçlar, kişisel antrenman programları ve gerçek dönüşümler.
        İlk adımı atmak için tek bir şey gerek: başlamak.
      </p>
      <div className="hero-stats">
        <div className="stat-item">
          <span className="stat-value">12+</span>
          <span className="stat-label">Hafta program</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">100%</span>
          <span className="stat-label">Kişiselleştirilmiş</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">24/7</span>
          <span className="stat-label">Takip</span>
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
