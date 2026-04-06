import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

// ── Módulos visibles según rol ──────────────────────────────────────────────
const modulesAdmin = [
  { label: 'Clientes',        path: '/clientes',        icon: '👥', desc: 'Gestión de clientes empresariales', stat: '/clientes/',               key: 'clientes',       accent: '#3b82f6', tag: 'CRM' },
  { label: 'Bodegas',         path: '/bodegas',         icon: '🏭', desc: 'Control de bodegas y ubicaciones', stat: '/infraestructura/bodegas/', key: 'bodegas',        accent: '#8b5cf6', tag: 'Infraestructura' },
  { label: 'Transportadores', path: '/transportadores', icon: '🚚', desc: 'Flota de transporte registrada',   stat: '/transportadores/',         key: 'transportadores',accent: '#06b6d4', tag: 'Flota' },
  { label: 'Inventario',      path: '/inventario',      icon: '📦', desc: 'Stock y movimientos de productos', stat: '/inventario/productos/',    key: 'inventario',     accent: '#10b981', tag: 'Stock' },
  { label: 'Envíos',          path: '/envios',          icon: '🗺️', desc: 'Órdenes de despacho y seguimiento',stat: '/envios/ordenes/',          key: 'envios',         accent: '#f59e0b', tag: 'Despacho' },
  { label: 'Servicios',       path: '/servicios',       icon: '⚙️', desc: 'Catálogo y cargos por cliente',   stat: '/servicios/catalogo/',      key: 'servicios',      accent: '#f97316', tag: 'Catálogo' },
  { label: 'Facturación',     path: '/facturacion',     icon: '🧾', desc: 'Generación y control de facturas', stat: '/facturacion/facturas/',    key: 'facturacion',    accent: '#ef4444', tag: 'Finanzas' },
  { label: 'Pagos',           path: '/pagos',           icon: '💳', desc: 'Registro de pagos recibidos',      stat: '/pagos/',                   key: 'pagos',          accent: '#22c55e', tag: 'Tesorería' },
]

const modulesEmpleado = [
  { label: 'Clientes',        path: '/clientes',        icon: '👥', desc: 'Gestión de clientes empresariales', stat: '/clientes/',               key: 'clientes',       accent: '#3b82f6', tag: 'CRM' },
  { label: 'Bodegas',         path: '/bodegas',         icon: '🏭', desc: 'Control de bodegas y ubicaciones', stat: '/infraestructura/bodegas/', key: 'bodegas',        accent: '#8b5cf6', tag: 'Infraestructura' },
  { label: 'Transportadores', path: '/transportadores', icon: '🚚', desc: 'Flota de transporte registrada',   stat: '/transportadores/',         key: 'transportadores',accent: '#06b6d4', tag: 'Flota' },
  { label: 'Inventario',      path: '/inventario',      icon: '📦', desc: 'Stock y movimientos de productos', stat: '/inventario/productos/',    key: 'inventario',     accent: '#10b981', tag: 'Stock' },
  { label: 'Envíos',          path: '/envios',          icon: '🗺️', desc: 'Órdenes de despacho y seguimiento',stat: '/envios/ordenes/',          key: 'envios',         accent: '#f59e0b', tag: 'Despacho' },
  { label: 'Servicios',       path: '/servicios',       icon: '⚙️', desc: 'Catálogo y cargos por cliente',   stat: '/servicios/catalogo/',      key: 'servicios',      accent: '#f97316', tag: 'Catálogo' },
]

export default function DashboardAdmin() {
  const { user, esAdmin, esEmpleado } = useAuth()
  const navigate  = useNavigate()
  const modules   = esAdmin ? modulesAdmin : modulesEmpleado

  const [stats,       setStats]       = useState({})
  const [hoveredCard, setHoveredCard] = useState(null)
  const [now,         setNow]         = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const hora   = now.getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches'

  useEffect(() => {
    modules.forEach(m => {
      api.get(m.stat + '?page_size=1')
        .then(r => {
          const count = r.data.count ?? (Array.isArray(r.data) ? r.data.length : null)
          if (count !== null) setStats(prev => ({ ...prev, [m.key]: count }))
        }).catch(() => {})
    })
  }, [])

  // KPIs según rol
  const kpisAdmin = [
    { label: 'Clientes activos',  value: stats.clientes    ?? '—', icon: '👥', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.15)',  trend: 'Total registrados' },
    { label: 'Órdenes de envío',  value: stats.envios      ?? '—', icon: '🗺️', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.15)',  trend: 'Historial total' },
    { label: 'Productos en stock',value: stats.inventario  ?? '—', icon: '📦', color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.15)',  trend: 'Actualizado' },
    { label: 'Facturas emitidas', value: stats.facturacion ?? '—', icon: '🧾', color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.15)',   trend: 'Total histórico' },
  ]

  const kpisEmpleado = [
    { label: 'Clientes activos',  value: stats.clientes   ?? '—', icon: '👥', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.15)', trend: 'Total registrados' },
    { label: 'Órdenes de envío',  value: stats.envios     ?? '—', icon: '🗺️', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.15)', trend: 'Historial total' },
    { label: 'Productos en stock',value: stats.inventario ?? '—', icon: '📦', color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.15)', trend: 'Actualizado' },
    { label: 'Servicios activos', value: stats.servicios  ?? '—', icon: '⚙️', color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.15)', trend: 'En catálogo' },
  ]

  const kpis = esAdmin ? kpisAdmin : kpisEmpleado

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        .dash-root { font-family: 'Plus Jakarta Sans', sans-serif; color: #0f172a; }
        .fade-up { opacity: 0; transform: translateY(14px); animation: fadeUp 0.45s ease forwards; }
        @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
        .kpi-card { background:#ffffff; border-radius:14px; padding:22px 24px; flex:1; min-width:150px; border:1px solid #e8edf5; position:relative; overflow:hidden; transition:box-shadow 0.22s,transform 0.22s; }
        .kpi-card:hover { box-shadow:0 8px 28px rgba(15,23,42,0.1); transform:translateY(-2px); }
        .kpi-card::after { content:''; position:absolute; bottom:0; left:0; right:0; height:3px; background:var(--kpi-color); opacity:0; transition:opacity 0.22s; }
        .kpi-card:hover::after { opacity:1; }
        .mod-card { background:#ffffff; border-radius:14px; padding:22px; cursor:pointer; border:1px solid #e8edf5; transition:all 0.22s cubic-bezier(0.4,0,0.2,1); position:relative; overflow:hidden; }
        .mod-card:hover { border-color:var(--mod-accent); box-shadow:0 8px 28px rgba(15,23,42,0.1); transform:translateY(-3px); }
        .mod-card::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg,var(--mod-accent) 0%,transparent 55%); opacity:0; transition:opacity 0.22s; }
        .mod-card:hover::before { opacity:0.035; }
        .mod-arrow { opacity:0; transform:translateX(-4px); transition:opacity 0.2s,transform 0.2s; display:inline-block; }
        .mod-card:hover .mod-arrow { opacity:1; transform:translateX(0); }
        .mod-tag { font-family:'DM Mono',monospace; font-size:9px; font-weight:500; letter-spacing:0.08em; text-transform:uppercase; padding:3px 8px; border-radius:4px; background:var(--mod-bg); color:var(--mod-accent); border:1px solid var(--mod-border); }
        .section-label { font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.1em; white-space:nowrap; }
        .section-line { flex:1; height:1px; background:#e8edf5; }
        .status-dot { width:7px; height:7px; border-radius:50%; background:#22c55e; box-shadow:0 0 0 3px rgba(34,197,94,0.2); animation:pdot 2.2s ease-in-out infinite; flex-shrink:0; }
        @keyframes pdot { 0%,100%{box-shadow:0 0 0 3px rgba(34,197,94,0.2)} 50%{box-shadow:0 0 0 6px rgba(34,197,94,0.07)} }
        .grid-modules { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:14px; }
        .icon-box { width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px; transition:transform 0.2s; }
        .mod-card:hover .icon-box { transform:scale(1.1) rotate(-3deg); }
        .rol-badge { display:inline-flex; align-items:center; gap:6px; background:rgba(79,142,247,0.1); border:1px solid rgba(79,142,247,0.2); color:#4f8ef7; padding:3px 10px; border-radius:20px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; }
      `}</style>

      <div className="dash-root">

        {/* ── HEADER ── */}
        <div className="fade-up" style={{ animationDelay:'0ms', marginBottom:'30px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'12px' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
                <div className="status-dot" />
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'10px', color:'#64748b', letterSpacing:'0.07em', textTransform:'uppercase' }}>
                  Plataforma operativa
                </span>
                {/* Badge de rol */}
                <span className="rol-badge">
                  {esAdmin ? '🛡 Admin' : '🔧 Empleado'}
                </span>
              </div>
              <h1 style={{ fontSize:'27px', fontWeight:'800', color:'#0f172a', margin:'0 0 5px', letterSpacing:'-0.03em', lineHeight:1.1 }}>
                {saludo}, {user?.first_name || user?.username || 'Administrador'} 👋
              </h1>
              <p style={{ color:'#64748b', fontSize:'13px', margin:0 }}>
                {now.toLocaleDateString('es-CO', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
              </p>
            </div>
            <div style={{ background:'#fff', border:'1px solid #e8edf5', borderRadius:'12px', padding:'12px 20px', boxShadow:'0 1px 6px rgba(15,23,42,0.06)', textAlign:'right' }}>
              <p style={{ fontFamily:"'DM Mono',monospace", fontSize:'22px', fontWeight:'500', color:'#0f172a', margin:'0 0 2px', letterSpacing:'-0.02em' }}>
                {now.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' })}
              </p>
              <p style={{ fontSize:'10px', color:'#94a3b8', margin:0, fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.07em' }}>
                Barranquilla · COL
              </p>
            </div>
          </div>
        </div>

        {/* ── KPIs ── */}
        <div className="fade-up" style={{ animationDelay:'70ms', display:'flex', gap:'14px', marginBottom:'36px', flexWrap:'wrap' }}>
          {kpis.map(k => (
            <div key={k.label} className="kpi-card" style={{ '--kpi-color': k.color }}>
              <div style={{ position:'absolute', top:'-24px', right:'-24px', width:'90px', height:'90px', borderRadius:'50%', background:k.bg, filter:'blur(24px)', pointerEvents:'none' }} />
              <div style={{ position:'relative' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'14px' }}>
                  <p style={{ color:'#64748b', fontSize:'11px', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.08em', margin:0, lineHeight:1.4 }}>{k.label}</p>
                  <div style={{ width:'32px', height:'32px', background:k.bg, border:`1px solid ${k.border}`, borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', flexShrink:0 }}>{k.icon}</div>
                </div>
                <p style={{ color:k.color, fontSize:'34px', fontWeight:'800', margin:'0 0 6px', letterSpacing:'-0.04em', fontFamily:"'DM Mono',monospace", lineHeight:1 }}>{k.value}</p>
                <p style={{ color:'#94a3b8', fontSize:'11px', margin:0, fontWeight:'500' }}>{k.trend}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── MÓDULOS ── */}
        <div className="fade-up" style={{ animationDelay:'180ms' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px' }}>
            <span className="section-label">Módulos del sistema</span>
            <div className="section-line" />
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'10px', color:'#cbd5e1', whiteSpace:'nowrap' }}>{modules.length} módulos</span>
          </div>
          <div className="grid-modules">
            {modules.map((m, i) => {
              const accentBg     = m.accent + '12'
              const accentBorder = m.accent + '28'
              return (
                <div key={m.label} className="mod-card fade-up"
                  style={{ '--mod-accent':m.accent, '--mod-bg':accentBg, '--mod-border':accentBorder, animationDelay:`${200 + i * 38}ms` }}
                  onClick={() => navigate(m.path)}
                  onMouseEnter={() => setHoveredCard(m.key)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <div style={{ position:'relative' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'14px' }}>
                      <div className="icon-box" style={{ background:accentBg, border:`1px solid ${accentBorder}` }}>{m.icon}</div>
                      <span className="mod-tag">{m.tag}</span>
                    </div>
                    <h3 style={{ color:'#0f172a', fontSize:'14px', fontWeight:'700', margin:'0 0 5px', letterSpacing:'-0.01em' }}>{m.label}</h3>
                    <p style={{ color:'#94a3b8', fontSize:'12px', margin:'0 0 16px', lineHeight:1.65 }}>{m.desc}</p>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ color:m.accent, fontSize:'12px', fontWeight:'700' }}>Abrir <span className="mod-arrow">→</span></span>
                      {stats[m.key] !== undefined && (
                        <span style={{ fontFamily:"'DM Mono',monospace", background:accentBg, color:m.accent, fontSize:'11px', fontWeight:'500', padding:'3px 9px', borderRadius:'6px', border:`1px solid ${accentBorder}` }}>
                          {stats[m.key]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="fade-up" style={{ animationDelay:'520ms', marginTop:'48px', paddingTop:'20px', borderTop:'1px solid #e8edf5', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'8px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <div style={{ width:'20px', height:'20px', background:'linear-gradient(135deg,#3b82f6,#8b5cf6)', borderRadius:'5px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px' }}>🚛</div>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'11px', color:'#cbd5e1', letterSpacing:'0.04em' }}>BodegaXpress · Sistema de Gestión Logística.</span>
          </div>
          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'11px', color:'#cbd5e1' }}>{user?.email}</span>
        </div>

      </div>
    </>
  )
}