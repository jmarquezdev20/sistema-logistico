import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    setTimeout(() => setMounted(true), 50)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch {
      setError('Credenciales inválidas. Verifica tu correo y contraseña.')
    } finally {
      setLoading(false)
    }
  }

  const stats = [
    { value: '99.8%', label: 'Disponibilidad' },
    { value: '+500', label: 'Envíos/mes' },
    { value: '24/7', label: 'Operaciones' },
  ]

  const services = [
    { icon: '🏭', title: 'Almacenamiento', desc: 'Bodegas seguras con control de inventario en tiempo real' },
    { icon: '📦', title: 'Descargue & Estiba', desc: 'Manejo profesional de carga con personal especializado' },
    { icon: '🚛', title: 'Distribución', desc: 'Red de transporte para entregas locales y nacionales' },
    { icon: '📋', title: 'Embalaje', desc: 'Empaque profesional para protección de tu mercancía' },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --navy: #050d1f; --navy2: #0a1628;
          --blue: #1a56db; --blue-light: #3b82f6;
          --accent: #f97316; --accent2: #fb923c;
          --teal: #0ea5e9; --white: #ffffff;
          --gray: #94a3b8; --gray2: #64748b;
          --border: rgba(255,255,255,0.07);
          --card: rgba(255,255,255,0.04);
        }
        .lx-root { min-height: 100vh; display: flex; font-family: 'Sora', sans-serif; background: var(--navy); overflow: hidden; }
        .lx-bg { position: fixed; inset: 0; z-index: 0; background: var(--navy); overflow: hidden; }
        .lx-bg::before { content: ''; position: absolute; top: -30%; left: -10%; width: 70%; height: 70%; background: radial-gradient(ellipse, rgba(26,86,219,0.25) 0%, transparent 65%); animation: drift1 12s ease-in-out infinite alternate; }
        .lx-bg::after { content: ''; position: absolute; bottom: -20%; right: -5%; width: 60%; height: 60%; background: radial-gradient(ellipse, rgba(249,115,22,0.12) 0%, transparent 65%); animation: drift2 15s ease-in-out infinite alternate; }
        .lx-bg-teal { position: absolute; top: 50%; left: 40%; width: 40%; height: 40%; background: radial-gradient(ellipse, rgba(14,165,233,0.08) 0%, transparent 65%); animation: drift3 18s ease-in-out infinite alternate; }
        .lx-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px); background-size: 48px 48px; mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%); }
        @keyframes drift1 { from { transform: translate(0,0) scale(1); } to { transform: translate(4%,3%) scale(1.08); } }
        @keyframes drift2 { from { transform: translate(0,0) scale(1); } to { transform: translate(-3%,-4%) scale(1.1); } }
        @keyframes drift3 { from { transform: translate(0,0); } to { transform: translate(2%,-3%); } }

        .lx-left { flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 52px 56px; position: relative; z-index: 1; opacity: 0; transform: translateX(-24px); transition: opacity 0.7s ease, transform 0.7s ease; }
        .lx-left.show { opacity: 1; transform: translateX(0); }
        .lx-right { width: 500px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; padding: 40px 48px; position: relative; z-index: 1; opacity: 0; transform: translateX(24px); transition: opacity 0.7s ease 0.15s, transform 0.7s ease 0.15s; }
        .lx-right.show { opacity: 1; transform: translateX(0); }
        .lx-divider { width: 1px; background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.1) 30%, rgba(255,255,255,0.1) 70%, transparent); position: relative; z-index: 1; align-self: stretch; margin: 60px 0; }

        .lx-logo { display: flex; align-items: center; gap: 14px; }
        .lx-logo-icon { width: 48px; height: 48px; background: linear-gradient(135deg, var(--blue) 0%, var(--teal) 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; box-shadow: 0 0 32px rgba(26,86,219,0.4); }
        .lx-logo-name { font-size: 22px; font-weight: 800; color: var(--white); letter-spacing: -0.03em; line-height: 1; }
        .lx-logo-name span { color: var(--accent); }
        .lx-logo-sub { font-size: 10px; font-weight: 500; color: var(--gray2); text-transform: uppercase; letter-spacing: 0.15em; margin-top: 3px; font-family: 'JetBrains Mono', monospace; }
        .lx-location { display: inline-flex; align-items: center; gap: 6px; background: rgba(14,165,233,0.08); border: 1px solid rgba(14,165,233,0.18); color: rgba(14,165,233,0.7); font-size: 10px; font-weight: 500; padding: 4px 10px; border-radius: 20px; margin-top: 10px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.05em; width: fit-content; }

        .lx-hero { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 40px 0; }
        .lx-tag { display: inline-flex; align-items: center; gap: 6px; background: rgba(249,115,22,0.12); border: 1px solid rgba(249,115,22,0.25); color: var(--accent2); font-size: 11px; font-weight: 600; padding: 5px 12px; border-radius: 20px; margin-bottom: 22px; width: fit-content; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.05em; }
        .lx-tag::before { content: '●'; font-size: 8px; animation: blink 2s ease infinite; }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        .lx-headline { font-size: 44px; font-weight: 800; color: var(--white); line-height: 1.1; letter-spacing: -0.04em; margin-bottom: 18px; }
        .lx-headline .grad { background: linear-gradient(90deg, var(--blue-light), var(--teal)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .lx-desc { color: var(--gray); font-size: 14px; line-height: 1.75; max-width: 440px; margin-bottom: 40px; font-weight: 300; }

        .lx-services { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 40px; }
        .lx-svc { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; display: flex; align-items: flex-start; gap: 12px; transition: background 0.2s, border-color 0.2s; }
        .lx-svc:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.12); }
        .lx-svc-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
        .lx-svc-title { font-size: 12px; font-weight: 700; color: var(--white); margin-bottom: 3px; }
        .lx-svc-desc { font-size: 11px; color: var(--gray2); line-height: 1.5; font-weight: 300; }

        .lx-stats { display: flex; gap: 32px; padding-top: 24px; border-top: 1px solid var(--border); }
        .lx-stat-val { font-size: 22px; font-weight: 800; color: var(--white); letter-spacing: -0.03em; font-family: 'JetBrains Mono', monospace; }
        .lx-stat-label { font-size: 11px; color: var(--gray2); font-weight: 400; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.08em; }

        .lx-card { width: 100%; background: rgba(255,255,255,0.04); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 42px 40px; box-shadow: 0 0 0 1px rgba(255,255,255,0.05), 0 32px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08); }
        .lx-card-tag { font-size: 10px; font-weight: 600; color: var(--gray2); text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 8px; font-family: 'JetBrains Mono', monospace; }
        .lx-card-title { font-size: 24px; font-weight: 800; color: var(--white); letter-spacing: -0.03em; margin-bottom: 6px; }
        .lx-card-sub { font-size: 13px; color: var(--gray2); margin-bottom: 32px; font-weight: 300; }

        .lx-field { margin-bottom: 18px; }
        .lx-label { display: block; font-size: 11px; font-weight: 600; color: var(--gray); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; font-family: 'JetBrains Mono', monospace; }
        .lx-input-wrap { position: relative; }
        .lx-input { width: 100%; padding: 13px 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: var(--white); font-size: 14px; font-family: 'Sora', sans-serif; font-weight: 400; outline: none; transition: border-color 0.2s, background 0.2s, box-shadow 0.2s; }
        .lx-input::placeholder { color: rgba(255,255,255,0.2); }
        .lx-input:focus { border-color: rgba(59,130,246,0.6); background: rgba(255,255,255,0.08); box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }
        .lx-eye { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.25); font-size: 16px; padding: 0; transition: color 0.15s; }
        .lx-eye:hover { color: rgba(255,255,255,0.6); }

        .lx-error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); color: #fca5a5; padding: 12px 14px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; display: flex; align-items: center; gap: 8px; }

        .lx-btn { width: 100%; padding: 14px; background: linear-gradient(135deg, var(--blue) 0%, var(--blue-light) 100%); color: var(--white); border: none; border-radius: 10px; font-size: 14px; font-weight: 700; font-family: 'Sora', sans-serif; cursor: pointer; letter-spacing: 0.02em; transition: all 0.2s; position: relative; overflow: hidden; box-shadow: 0 4px 24px rgba(26,86,219,0.35); margin-top: 8px; }
        .lx-btn::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent); opacity: 0; transition: opacity 0.2s; }
        .lx-btn:hover:not(:disabled)::before { opacity: 1; }
        .lx-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 32px rgba(26,86,219,0.45); }
        .lx-btn:active:not(:disabled) { transform: translateY(0); }
        .lx-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .lx-spin { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; vertical-align: middle; margin-right: 8px; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .lx-creds { margin-top: 24px; padding: 14px 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; }
        .lx-creds-title { font-size: 9px; font-weight: 600; color: var(--gray2); text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 8px; font-family: 'JetBrains Mono', monospace; }
        .lx-cred-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
        .lx-cred-row:last-child { margin-bottom: 0; }
        .lx-cred-key { font-size: 10px; color: var(--gray2); width: 24px; flex-shrink: 0; }
        .lx-cred-val { font-size: 12px; color: rgba(255,255,255,0.5); font-family: 'JetBrains Mono', monospace; }

        @media (max-width: 900px) { .lx-left, .lx-divider { display: none; } .lx-right { width: 100%; padding: 24px; } }
      `}</style>

      <div className="lx-bg">
        <div className="lx-grid" />
        <div className="lx-bg-teal" />
      </div>

      <div className="lx-root">
        {/* LEFT */}
        <div className={`lx-left ${mounted ? 'show' : ''}`}>
          <div>
            <div className="lx-logo">
              <div className="lx-logo-icon">🚛</div>
              <div>
                <div className="lx-logo-name">Bodega<span>Xpress</span></div>
                <div className="lx-logo-sub">Sistema de Gestión Logística</div>
              </div>
            </div>
            <div className="lx-location">📍 Barranquilla, Colombia</div>
          </div>

          <div className="lx-hero">
            <div className="lx-tag">Plataforma operativa activa</div>
            <h1 className="lx-headline">
              Logística que<br />
              <span className="grad">mueve tu negocio</span>
            </h1>
            <p className="lx-desc">
              Gestionamos el almacenamiento, descargue, embalaje y distribución
              de tu mercancía desde nuestra bodega en Barranquilla.
              Control total de inventario, envíos y facturación en una sola plataforma.
            </p>
            <div className="lx-services">
              {services.map(s => (
                <div key={s.title} className="lx-svc">
                  <span className="lx-svc-icon">{s.icon}</span>
                  <div>
                    <div className="lx-svc-title">{s.title}</div>
                    <div className="lx-svc-desc">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lx-stats">
            {stats.map(s => (
              <div key={s.label}>
                <div className="lx-stat-val">{s.value}</div>
                <div className="lx-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="lx-divider" />

        {/* RIGHT */}
        <div className={`lx-right ${mounted ? 'show' : ''}`}>
          <div className="lx-card">
            <div className="lx-card-tag">Acceso al sistema</div>
            <div className="lx-card-title">Inicia sesión</div>
            <div className="lx-card-sub">Ingresa tus credenciales para continuar</div>

            {error && (
              <div className="lx-error"><span>⚠</span> {error}</div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="lx-field">
                <label className="lx-label">Correo electrónico</label>
                <input className="lx-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="correo@empresa.com" autoComplete="email" />
              </div>
              <div className="lx-field">
                <label className="lx-label">Contraseña</label>
                <div className="lx-input-wrap">
                  <input className="lx-input" type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" style={{ paddingRight: '44px' }} autoComplete="current-password" />
                  <button type="button" className="lx-eye" onClick={() => setShowPass(!showPass)}>
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="lx-btn">
                {loading ? <><span className="lx-spin" />Ingresando...</> : 'Ingresar al sistema →'}
              </button>
            </form>

            <div className="lx-creds">
              <div className="lx-creds-title">Credenciales demo</div>
              <div className="lx-cred-row">
                <span className="lx-cred-key">📧</span>
                <span className="lx-cred-val">juan@gmail.com</span>
              </div>
              <div className="lx-cred-row">
                <span className="lx-cred-key">🔑</span>
                <span className="lx-cred-val">admin1234</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}