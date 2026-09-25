import { useRef, useState } from 'react'
import Brand from './Brand.jsx'
import Icon from './Icon.jsx'
import ThemeToggle from './ThemeToggle.jsx'

function ProviderIcon({ provider }) {
  return provider === 'Google' ? (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4h5.4a4.6 4.6 0 0 1-2 3c-1 .7-2.1 1-3.4 1a6 6 0 1 1 0-12c1.5 0 2.8.5 3.9 1.5l2.9-2.8A10 10 0 1 0 12 22c5.8 0 9.6-4.1 9.6-9.8Z" /></svg>
  ) : (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.8 5.2a18 18 0 0 0-4.4-1.4l-.5 1.1a16 16 0 0 0-5.8 0l-.5-1.1a18 18 0 0 0-4.4 1.4C1.5 9.3.8 13.3 1.2 17.3a18 18 0 0 0 5.4 2.8l1.2-1.9-1.8-.9.4-.4a14 14 0 0 0 11.2 0l.4.4-1.8.9 1.2 1.9a18 18 0 0 0 5.4-2.8c.5-4.7-.9-8.7-3-12.1ZM8.2 14.8c-1.1 0-1.9-1-1.9-2.2s.8-2.2 1.9-2.2 1.9 1 1.9 2.2-.8 2.2-1.9 2.2Zm7.6 0c-1.1 0-1.9-1-1.9-2.2s.8-2.2 1.9-2.2 1.9 1 1.9 2.2-.8 2.2-1.9 2.2Z" /></svg>
  )
}

// The auth adapter owns the session; this form never creates a demo login.
export default function AuthGate({ auth }) {
  const [mode, setMode] = useState('signin')
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState('')
  const busy = useRef(false)
  const isRegister = mode === 'signup'

  async function authenticate(event, provider) {
    event?.preventDefault()
    if (busy.current) return
    const action = provider ? auth?.signInWithProvider : isRegister ? auth?.signUp : auth?.signIn
    if (!action) {
      setNotice('Sign-in is not available yet. Please check back when FinDuo launches.')
      return
    }
    const data = event ? new FormData(event.currentTarget) : null
    busy.current = true
    setPending(true)
    setNotice('')
    try {
      await action(provider ? provider.toLowerCase() : { email: data.get('email').trim(), password: data.get('password') })
      setNotice(isRegister && !provider ? 'Check your email for any next steps to complete your account.' : 'Waiting for your account to finish signing in…')
    } catch {
      setNotice('We couldn’t complete your request. Please check your details and try again.')
    } finally {
      busy.current = false
      setPending(false)
    }
  }

  function changeMode(next) {
    setMode(next)
    setNotice('')
    setShowPassword(false)
  }

  return (
    <div className="entry-screen">
      <div className="ambient-orbit orbit-one" aria-hidden="true" /><div className="ambient-orbit orbit-two" aria-hidden="true" />
      <header className="entry-header page-container"><Brand /><ThemeToggle /></header>
      <main id="main-content" className="entry-main" tabIndex={-1}>
        <div className="entry-intro"><p className="eyebrow"><span className="status-dot" /> GOOD GAMES START WITH GOOD PEOPLE</p><h1>Find your duo.<br className="mobile-break" /> <span>Find your flow.</span></h1><p>Your game. Your vibe. Your next teammate.</p></div>
        <section className="auth-card glass-panel" aria-labelledby="auth-title">
          <div className="auth-switch" role="group" aria-label="Account access">
            <span className={`auth-switch-indicator ${isRegister ? 'is-register' : ''}`} aria-hidden="true" />
            <button type="button" aria-pressed={!isRegister} disabled={pending} onClick={() => changeMode('signin')}>Sign in</button>
            <button type="button" aria-pressed={isRegister} disabled={pending} onClick={() => changeMode('signup')}>Create account</button>
          </div>
          <div className="auth-heading"><span className="section-icon"><Icon name={isRegister ? 'users' : 'spark'} /></span><h2 id="auth-title">{isRegister ? 'Your squad is out there.' : 'Welcome back, player.'}</h2><p>{isRegister ? 'Create an account. Make your next game a good one.' : 'Sign in and get ready for your next great game.'}</p></div>
          <form key={mode} className="auth-form" onSubmit={authenticate} aria-busy={pending}>
            <div className="form-field"><label htmlFor="email">Email address</label><div className="input-wrap"><Icon name="mail" /><input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required disabled={pending} /></div></div>
            <div className="form-field"><label htmlFor="password">Password</label><div className="input-wrap"><Icon name="lock" /><input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={isRegister ? 'new-password' : 'current-password'} placeholder={isRegister ? 'Choose your password' : 'Enter your password'} required disabled={pending} /><button className="password-toggle" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}><Icon name={showPassword ? 'eyeOff' : 'eye'} /></button></div></div>
            <button className="button button-primary auth-submit" disabled={pending} type="submit"><span>{pending ? 'Connecting…' : isRegister ? 'Create account' : 'Sign in'}</span><Icon name="arrow" /></button>
          </form>
          <div className="auth-divider"><span>or continue with</span></div>
          <div className="provider-buttons">{['Discord', 'Google'].map(provider => <button type="button" className="button button-secondary" key={provider} disabled={pending} onClick={() => authenticate(null, provider)} aria-label={`Continue with ${provider}`}><ProviderIcon provider={provider} />{provider}</button>)}</div>
          <p className="auth-notice" role="status" aria-live="polite">{notice}</p>
          <p className="auth-bottom">{isRegister ? 'Already part of the squad?' : 'New to FinDuo?'} <button type="button" className="text-button" disabled={pending} onClick={() => changeMode(isRegister ? 'signin' : 'signup')}>{isRegister ? 'Sign in' : 'Join the party'} <span aria-hidden="true">↗</span></button></p>
        </section>
        <p className="entry-caption"><Icon name="users" /> Better together. In every lobby.</p>
      </main>
      <footer className="entry-footer page-container"><span>© {new Date().getFullYear()} FinDuo</span><span>LESS SOLO. MORE DUO.</span></footer>
    </div>
  )
}
