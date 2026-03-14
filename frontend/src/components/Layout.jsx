import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const navItems = [
    { path: '/dashboard',       label: 'Dashboard',       icon: '⊞', roles: ['admin', 'empleado', 'cliente'] },
    { path: '/clientes',        label: 'Clientes',        icon: '◎', roles: ['admin', 'empleado'] },
    { path: '/bodegas',         label: 'Bodegas',         icon: '▣', roles: ['admin', 'empleado'] },
    { path: '/transportadores', label: 'Transportadores', icon: '▷', roles: ['admin', 'empleado'] },
    { path: '/inventario',      label: 'Inventario',      icon: '⊟', roles: ['admin', 'empleado', 'cliente'] },
    { path: '/envios',          label: 'Envíos',          icon: '⇢', roles: ['admin', 'empleado', 'cliente'] },
    { path: '/servicios',       label: 'Servicios',       icon: '◈', roles: ['admin', 'empleado'] },
    { path: '/facturacion',     label: 'Facturación',     icon: '▤', roles: ['admin', 'cliente'] },
    { path: '/pagos',           label: 'Pagos',           icon: '◇', roles: ['admin', 'cliente'] },
    { path: '/usuarios',        label: 'Usuarios',        icon: '◉', roles: ['admin'] },
    { path: '/auditoria',       label: 'Auditoría',       icon: '▦', roles: ['admin'] },
  ]

  const rolActual      = user?.rol?.nombre || ''
  const itemsVisibles  = navItems.filter(item => item.roles.includes(rolActual))

  const seccionPrincipal   = itemsVisibles.filter(i => i.path === '/dashboard')
  const seccionOperaciones = itemsVisibles.filter(i => ['/clientes','/bodegas','/transportadores','/inventario','/envios','/servicios'].includes(i.path))
  const seccionFinanzas    = itemsVisibles.filter(i => ['/facturacion','/pagos'].includes(i.path))
  const seccionAdmin       = itemsVisibles.filter(i => ['/usuarios','/auditoria'].includes(i.path))

  const NavLink = ({ item }) => (
    <Link to={item.path} className={`nav-link${location.pathname === item.path ? ' active' : ''}`}>
      <span style={{ fontSize: '13px', opacity: 0.7 }}>{item.icon}</span>
      {item.label}
    </Link>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f4f5f7; font-family: 'Inter', sans-serif; }
        .nav-link {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 14px; margin: 1px 0; border-radius: 4px;
          color: #6b7a99; text-decoration: none; font-size: 13px;
          font-weight: 500; font-family: 'Inter', sans-serif;
          transition: all 0.13s; letter-spacing: 0.01em;
        }
        .nav-link:hover { background: rgba(255,255,255,0.07); color: #fff; }
        .nav-link.active { background: rgba(255,255,255,0.12); color: #fff; font-weight: 600; border-left: 3px solid #4f8ef7; padding-left: 11px; }
        .nav-section { color: #3d4f6e; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; padding: 16px 14px 6px; }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>

        {/* ── Sidebar ── */}
        <aside style={{
          width: '240px',
          background: 'linear-gradient(180deg, #0f1d3a 0%, #0a1628 100%)',
          flexShrink: 0, display: 'flex', flexDirection: 'column',
          position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 100,
          borderRight: '1px solid rgba(255,255,255,0.04)'
        }}>
          {/* Logo */}
          <div style={{ padding: '28px 20px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '30px', height: '30px', background: '#4f8ef7', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: '#fff', fontSize: '14px', fontWeight: '800' }}>B</span>
              </div>
              <div>
                <h1 style={{ color: '#fff', fontSize: '15px', fontWeight: '700', letterSpacing: '0.02em', lineHeight: 1 }}>BodegaXpress</h1>
                <p style={{ color: '#3d4f6e', fontSize: '10px', fontWeight: '500', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '2px' }}>Gestión Logística</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
            {seccionPrincipal.length > 0 && (
              <>
                <div className="nav-section">Principal</div>
                {seccionPrincipal.map(item => <NavLink key={item.path} item={item} />)}
              </>
            )}
            {seccionOperaciones.length > 0 && (
              <>
                <div className="nav-section" style={{ marginTop: '8px' }}>Operaciones</div>
                {seccionOperaciones.map(item => <NavLink key={item.path} item={item} />)}
              </>
            )}
            {seccionFinanzas.length > 0 && (
              <>
                <div className="nav-section" style={{ marginTop: '8px' }}>Finanzas</div>
                {seccionFinanzas.map(item => <NavLink key={item.path} item={item} />)}
              </>
            )}
            {seccionAdmin.length > 0 && (
              <>
                <div className="nav-section" style={{ marginTop: '8px' }}>Administración</div>
                {seccionAdmin.map(item => <NavLink key={item.path} item={item} />)}
              </>
            )}
          </nav>

          {/* User */}
          <div style={{ padding: '14px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg, #4f8ef7, #1a56db)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: '#fff', fontSize: '12px', fontWeight: '700' }}>
                  {(user?.first_name || user?.username || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <p style={{ color: '#e2e8f0', fontSize: '12px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.first_name || user?.username}
                </p>
                <p style={{ color: '#3d4f6e', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '500' }}>
                  {user?.rol?.nombre || '—'}
                </p>
              </div>
            </div>
            <button onClick={handleLogout}
              style={{ width: '100%', padding: '7px', background: 'transparent', color: '#4a5568', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#fc8181'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#4a5568'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
            >
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* ── Top bar ── */}
        <div style={{ position: 'fixed', top: 0, left: '240px', right: 0, height: '52px', background: '#fff', borderBottom: '1px solid #e5e9f0', zIndex: 99, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#b0bac9', fontSize: '12px' }}>BodegaXpress</span>
            <span style={{ color: '#d1d9e6', fontSize: '12px' }}>›</span>
            <span style={{ color: '#3d4f6e', fontSize: '12px', fontWeight: '600' }}>
              {navItems.find(n => n.path === location.pathname)?.label || 'Panel'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ color: '#b0bac9', fontSize: '12px' }}>
              {new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #4f8ef7, #1a56db)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: '11px', fontWeight: '700' }}>
                {(user?.first_name || user?.username || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* ── Main ── */}
        <main style={{ flex: 1, marginLeft: '240px', marginTop: '52px', minHeight: 'calc(100vh - 52px)', background: '#f4f5f7' }}>
          <div style={{ padding: '32px 36px', maxWidth: '1280px' }}>
            {children}
          </div>
        </main>

      </div>
    </>
  )
}