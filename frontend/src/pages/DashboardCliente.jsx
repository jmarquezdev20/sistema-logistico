import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function DashboardCliente() {
  const { user, clienteId } = useAuth()
  const navigate = useNavigate()
  const [now, setNow] = useState(new Date())
  const [datos, setDatos] = useState({
    productos:   [],
    inventarios: [],
    envios:      [],
    facturas:    [],
    pagos:       [],
  })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!clienteId) return
    const cargar = async () => {
      try {
        // ✅ Todos los endpoints con ?cliente= — doble seguridad junto al backend
        const [prods, invs, envs, facts, pags] = await Promise.allSettled([
          api.get(`/inventario/productos/?cliente=${clienteId}&page_size=100`),
          api.get(`/inventario/inventarios/?cliente=${clienteId}&page_size=100`),
          api.get(`/envios/ordenes/?cliente=${clienteId}&page_size=100`),
          api.get(`/facturacion/facturas/?cliente=${clienteId}&page_size=100`),
          api.get(`/pagos/?cliente=${clienteId}&page_size=100`),
        ])
        setDatos({
          productos:   prods.status === 'fulfilled' ? (prods.value.data.results || prods.value.data) : [],
          inventarios: invs.status  === 'fulfilled' ? (invs.value.data.results  || invs.value.data)  : [],
          envios:      envs.status  === 'fulfilled' ? (envs.value.data.results  || envs.value.data)  : [],
          facturas:    facts.status === 'fulfilled' ? (facts.value.data.results || facts.value.data) : [],
          pagos:       pags.status  === 'fulfilled' ? (pags.value.data.results  || pags.value.data)  : [],
        })
      } catch (e) { console.error(e) }
      finally { setLoaded(true) }
    }
    cargar()
  }, [clienteId])

  const hora   = now.getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches'

  const totalStock         = datos.inventarios.reduce((s, i) => s + (i.cantidad || 0), 0)
  const totalProductos     = datos.productos.length
  const enviosPendientes   = datos.envios.filter(e => e.estado === 'pendiente' || e.estado === 'preparando').length
  const enviosTransito     = datos.envios.filter(e => e.estado === 'en_transito').length
  const enviosEntregados   = datos.envios.filter(e => e.estado === 'entregado').length
  const facturasPendientes = datos.facturas.filter(f => f.estado === 'pendiente')
  const totalPorPagar      = facturasPendientes.reduce((s, f) => s + parseFloat(f.total || 0), 0)
  const totalPagado        = datos.pagos.reduce((s, p) => s + parseFloat(p.monto || 0), 0)

  const topProductos = datos.inventarios
    .map(inv => {
      const prod = datos.productos.find(p => p.id === inv.producto)
      return { nombre: prod?.nombre || `Producto ${inv.producto}`, cantidad: inv.cantidad || 0 }
    })
    .filter(p => p.cantidad > 0)
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 6)

  const maxStock = topProductos[0]?.cantidad || 1

  const ultimosEnvios = [...datos.envios]
    .sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion))
    .slice(0, 4)

  const ESTADO_ENV = {
    pendiente:   { label: 'Pendiente',   color: '#f59e0b', bg: '#fffbeb', dot: '#f59e0b' },
    preparando:  { label: 'Preparando',  color: '#3b82f6', bg: '#eff6ff', dot: '#3b82f6' },
    en_transito: { label: 'En tránsito', color: '#7c3aed', bg: '#f5f3ff', dot: '#7c3aed' },
    entregado:   { label: 'Entregado',   color: '#059669', bg: '#ecfdf5', dot: '#059669' },
  }

  // ✅ Solo 4 módulos — sin Servicios
  const accesos = [
    { label: 'Mis Envíos',  icon: '🚛', path: '/envios',      color: '#7c3aed', desc: 'Seguimiento de órdenes' },
    { label: 'Inventario',  icon: '📦', path: '/inventario',  color: '#0891b2', desc: 'Stock de productos' },
    { label: 'Facturación', icon: '🧾', path: '/facturacion', color: '#dc2626', desc: 'Mis facturas' },
    { label: 'Pagos',       icon: '💳', path: '/pagos',       color: '#059669', desc: 'Historial de pagos' },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .dc-root { font-family: 'Outfit', sans-serif; color: #0f172a; }
        .dc-root * { box-sizing: border-box; }
        @keyframes fadeSlide { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulsar { 0%,100%{box-shadow:0 0 0 3px rgba(34,197,94,0.2)} 50%{box-shadow:0 0 0 7px rgba(34,197,94,0.06)} }
        @keyframes barGrow { from{width:0} }
        .dc-fade { opacity:0; animation:fadeSlide 0.45s ease forwards; }
        .dc-kpi { background:#fff; border:1px solid #e8edf5; border-radius:16px; padding:20px 22px; position:relative; overflow:hidden; transition:transform 0.2s,box-shadow 0.2s; cursor:default; }
        .dc-kpi:hover { transform:translateY(-3px); box-shadow:0 12px 32px rgba(15,23,42,0.1); }
        .dc-acceso { background:#fff; border:1.5px solid #e8edf5; border-radius:14px; padding:18px 20px; cursor:pointer; transition:all 0.2s; display:flex; align-items:center; gap:14px; }
        .dc-acceso:hover { border-color:var(--ac-color); box-shadow:0 6px 20px rgba(0,0,0,0.08); transform:translateY(-2px); }
        .dc-bar-wrap { background:#f1f5f9; border-radius:6px; height:10px; overflow:hidden; flex:1; }
        .dc-bar { height:100%; border-radius:6px; animation:barGrow 0.8s cubic-bezier(0.4,0,0.2,1) forwards; }
        .dc-envio-row { display:flex; align-items:center; gap:12px; padding:12px 0; border-bottom:1px solid #f8fafc; }
        .dc-envio-row:last-child { border-bottom:none; }
        .dc-section-title { font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.1em; }
      `}</style>

      <div className="dc-root">

        {/* ── HEADER ── */}
        <div className="dc-fade" style={{ animationDelay:'0ms', marginBottom:'28px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'16px' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px' }}>
                <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#22c55e', animation:'pulsar 2s infinite', flexShrink:0 }} />
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#64748b', letterSpacing:'0.1em', textTransform:'uppercase' }}>Portal cliente</span>
              </div>
              <h1 style={{ fontSize:'28px', fontWeight:'800', color:'#0f172a', margin:'0 0 5px', letterSpacing:'-0.03em', lineHeight:1.1 }}>
                {saludo}, {user?.first_name || user?.username} 👋
              </h1>
              <p style={{ color:'#64748b', fontSize:'13px', margin:0 }}>
                {now.toLocaleDateString('es-CO', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
              </p>
            </div>
            <div style={{ background:'#fff', border:'1px solid #e8edf5', borderRadius:'14px', padding:'14px 22px', textAlign:'right', boxShadow:'0 1px 6px rgba(15,23,42,0.05)' }}>
              <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'24px', fontWeight:'500', color:'#0f172a', margin:'0 0 2px', letterSpacing:'-0.02em' }}>
                {now.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' })}
              </p>
              <p style={{ fontSize:'10px', color:'#94a3b8', margin:0, fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.07em' }}>Barranquilla · COL</p>
            </div>
          </div>
        </div>

        {/* ── KPIs ── */}
        <div className="dc-fade" style={{ animationDelay:'60ms', display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))', gap:'12px', marginBottom:'28px' }}>
          {[
            { label:'Mis productos',  value: totalProductos,                      icon:'📦', color:'#0891b2', bg:'rgba(8,145,178,0.08)',   trend:'en inventario' },
            { label:'Stock total',    value: totalStock,                           icon:'🗂️', color:'#7c3aed', bg:'rgba(124,58,237,0.08)', trend:'unidades' },
            { label:'Envíos activos', value: enviosPendientes + enviosTransito,    icon:'🚛', color:'#f59e0b', bg:'rgba(245,158,11,0.08)', trend:'en proceso' },
            { label:'Por pagar',      value:`$${totalPorPagar > 0 ? (totalPorPagar/1000).toFixed(0)+'K' : '0'}`, icon:'🧾', color:'#dc2626', bg:'rgba(220,38,38,0.08)', trend:'COP pendiente' },
            { label:'Total pagado',   value:`$${totalPagado   > 0 ? (totalPagado/1000).toFixed(0)+'K'   : '0'}`, icon:'✅', color:'#059669', bg:'rgba(5,150,105,0.08)',  trend:'COP' },
          ].map((k, i) => (
            <div key={k.label} className="dc-kpi dc-fade" style={{ animationDelay:`${80 + i*40}ms` }}>
              <div style={{ position:'absolute', top:'-20px', right:'-20px', width:'80px', height:'80px', borderRadius:'50%', background:k.bg, filter:'blur(20px)', pointerEvents:'none' }} />
              <div style={{ position:'relative' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
                  <p style={{ color:'#64748b', fontSize:'11px', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.07em', margin:0 }}>{k.label}</p>
                  <span style={{ fontSize:'16px' }}>{k.icon}</span>
                </div>
                <p style={{ color:k.color, fontSize:'30px', fontWeight:'800', margin:'0 0 4px', fontFamily:"'JetBrains Mono',monospace", letterSpacing:'-0.03em', lineHeight:1 }}>
                  {loaded ? k.value : '—'}
                </p>
                <p style={{ color:'#94a3b8', fontSize:'11px', margin:0 }}>{k.trend}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── FILA PRINCIPAL ── */}
        <div className="dc-fade" style={{ animationDelay:'200ms', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'16px' }}>

          {/* Stock por producto */}
          <div style={{ background:'#fff', border:'1px solid #e8edf5', borderRadius:'16px', padding:'22px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
              <div>
                <p className="dc-section-title" style={{ margin:'0 0 3px' }}>Stock de mis productos</p>
                <p style={{ color:'#0f172a', fontSize:'14px', fontWeight:'700', margin:0 }}>Nivel de inventario</p>
              </div>
              <button onClick={() => navigate('/inventario')}
                style={{ background:'#f1f5f9', color:'#475569', border:'none', padding:'6px 14px', borderRadius:'8px', fontSize:'12px', fontWeight:'600', cursor:'pointer', fontFamily:"'Outfit',sans-serif" }}>
                Ver todo →
              </button>
            </div>
            {!loaded ? (
              <div style={{ padding:'32px 0', textAlign:'center', color:'#94a3b8', fontSize:'13px' }}>Cargando...</div>
            ) : topProductos.length === 0 ? (
              <div style={{ padding:'32px 0', textAlign:'center' }}>
                <p style={{ fontSize:'28px', margin:'0 0 8px' }}>📦</p>
                <p style={{ color:'#94a3b8', fontSize:'13px', margin:0 }}>Sin productos en inventario</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                {topProductos.map((p, i) => {
                  const pct   = Math.round((p.cantidad / maxStock) * 100)
                  const COLS  = ['#7c3aed','#0891b2','#059669','#f59e0b','#dc2626','#6366f1']
                  const color = COLS[i % COLS.length]
                  return (
                    <div key={p.nombre}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px' }}>
                        <span style={{ fontSize:'13px', fontWeight:'600', color:'#0f172a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'65%' }}>{p.nombre}</span>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'12px', fontWeight:'600', color, flexShrink:0 }}>{p.cantidad} u.</span>
                      </div>
                      <div className="dc-bar-wrap">
                        <div className="dc-bar" style={{ width:`${pct}%`, background:`linear-gradient(90deg,${color}cc,${color})`, animationDelay:`${i*80}ms` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Últimos envíos */}
          <div style={{ background:'#fff', border:'1px solid #e8edf5', borderRadius:'16px', padding:'22px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'18px' }}>
              <div>
                <p className="dc-section-title" style={{ margin:'0 0 3px' }}>Mis envíos</p>
                <p style={{ color:'#0f172a', fontSize:'14px', fontWeight:'700', margin:0 }}>Órdenes recientes</p>
              </div>
              <button onClick={() => navigate('/envios')}
                style={{ background:'#f1f5f9', color:'#475569', border:'none', padding:'6px 14px', borderRadius:'8px', fontSize:'12px', fontWeight:'600', cursor:'pointer', fontFamily:"'Outfit',sans-serif" }}>
                Ver todo →
              </button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginBottom:'18px' }}>
              {[
                { label:'En proceso', value: enviosPendientes + enviosTransito, color:'#7c3aed', bg:'#f5f3ff' },
                { label:'Tránsito',   value: enviosTransito,                    color:'#0891b2', bg:'#ecfeff' },
                { label:'Entregados', value: enviosEntregados,                  color:'#059669', bg:'#ecfdf5' },
              ].map(s => (
                <div key={s.label} style={{ background:s.bg, borderRadius:'10px', padding:'10px 12px', textAlign:'center' }}>
                  <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'20px', fontWeight:'700', color:s.color, margin:'0 0 2px' }}>{loaded ? s.value : '—'}</p>
                  <p style={{ fontSize:'10px', fontWeight:'600', color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em', margin:0 }}>{s.label}</p>
                </div>
              ))}
            </div>
            {!loaded ? (
              <div style={{ padding:'20px 0', textAlign:'center', color:'#94a3b8', fontSize:'13px' }}>Cargando...</div>
            ) : ultimosEnvios.length === 0 ? (
              <p style={{ color:'#94a3b8', fontSize:'13px', textAlign:'center', margin:'20px 0 0' }}>Sin órdenes de envío</p>
            ) : ultimosEnvios.map(env => {
              const est = ESTADO_ENV[env.estado] || ESTADO_ENV.pendiente
              return (
                <div key={env.id} className="dc-envio-row">
                  <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:est.dot, flexShrink:0 }} />
                  <div style={{ flex:1, overflow:'hidden' }}>
                    <p style={{ fontSize:'13px', fontWeight:'600', color:'#0f172a', margin:'0 0 1px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      📍 {env.destino}
                    </p>
                    <p style={{ fontSize:'11px', color:'#94a3b8', margin:0, fontFamily:"'JetBrains Mono',monospace" }}>
                      {new Date(env.fecha_creacion).toLocaleDateString('es-CO',{day:'2-digit',month:'short'})}
                    </p>
                  </div>
                  <span style={{ background:est.bg, color:est.color, fontSize:'10px', fontWeight:'700', padding:'3px 9px', borderRadius:'20px', textTransform:'uppercase', letterSpacing:'0.05em', flexShrink:0 }}>
                    {est.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── FINANCIERO + ACCESOS ── */}
        <div className="dc-fade" style={{ animationDelay:'280ms', display:'grid', gridTemplateColumns:'1fr 1.2fr', gap:'16px', marginBottom:'28px' }}>

          {/* Resumen financiero */}
          <div style={{ background:'linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)', borderRadius:'16px', padding:'22px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:'-30px', right:'-30px', width:'140px', height:'140px', borderRadius:'50%', background:'rgba(124,58,237,0.15)', filter:'blur(40px)', pointerEvents:'none' }} />
            <div style={{ position:'relative' }}>
              <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.12em', margin:'0 0 5px', fontFamily:"'JetBrains Mono',monospace" }}>Estado financiero</p>
              <p style={{ color:'#fff', fontSize:'16px', fontWeight:'700', margin:'0 0 20px' }}>Resumen de mi cuenta</p>
              <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'20px' }}>
                {[
                  { label:'Facturas pendientes', value:`$${totalPorPagar.toLocaleString('es-CO')}`, color:'#fbbf24', count: facturasPendientes.length },
                  { label:'Total pagado',         value:`$${totalPagado.toLocaleString('es-CO')}`,   color:'#34d399', count: datos.pagos.length },
                ].map(r => (
                  <div key={r.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(255,255,255,0.06)', borderRadius:'10px', padding:'11px 14px' }}>
                    <div>
                      <p style={{ color:'rgba(255,255,255,0.45)', fontSize:'10px', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.07em', margin:'0 0 2px' }}>{r.label}</p>
                      <p style={{ color:r.color, fontSize:'16px', fontWeight:'700', margin:0, fontFamily:"'JetBrains Mono',monospace" }}>{loaded ? r.value : '—'}</p>
                    </div>
                    <span style={{ background:'rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.6)', fontSize:'13px', fontWeight:'700', padding:'4px 10px', borderRadius:'20px', fontFamily:"'JetBrains Mono',monospace" }}>
                      {loaded ? r.count : '—'}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                <button onClick={() => navigate('/facturacion')}
                  style={{ background:'rgba(255,255,255,0.1)', color:'#fff', border:'1px solid rgba(255,255,255,0.15)', padding:'9px', borderRadius:'9px', cursor:'pointer', fontSize:'12px', fontWeight:'600', fontFamily:"'Outfit',sans-serif", transition:'all 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.18)'}
                  onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'}>
                  🧾 Ver facturas
                </button>
                <button onClick={() => navigate('/pagos')}
                  style={{ background:'rgba(52,211,153,0.2)', color:'#34d399', border:'1px solid rgba(52,211,153,0.3)', padding:'9px', borderRadius:'9px', cursor:'pointer', fontSize:'12px', fontWeight:'600', fontFamily:"'Outfit',sans-serif", transition:'all 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(52,211,153,0.3)'}
                  onMouseLeave={e => e.currentTarget.style.background='rgba(52,211,153,0.2)'}>
                  💳 Ver pagos
                </button>
              </div>
            </div>
          </div>

          {/* Accesos rápidos — solo 4 módulos */}
          <div style={{ background:'#fff', border:'1px solid #e8edf5', borderRadius:'16px', padding:'22px' }}>
            <p className="dc-section-title" style={{ margin:'0 0 4px' }}>Accesos rápidos</p>
            <p style={{ color:'#0f172a', fontSize:'14px', fontWeight:'700', margin:'0 0 16px' }}>Mis módulos</p>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {accesos.map((a, i) => (
                <div key={a.path} className="dc-acceso dc-fade"
                  style={{ '--ac-color': a.color, animationDelay:`${300 + i*50}ms` }}
                  onClick={() => navigate(a.path)}>
                  <div style={{ width:'38px', height:'38px', borderRadius:'10px', background:a.color+'15', border:`1px solid ${a.color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'17px', flexShrink:0 }}>
                    {a.icon}
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ color:'#0f172a', fontSize:'13px', fontWeight:'700', margin:'0 0 1px' }}>{a.label}</p>
                    <p style={{ color:'#94a3b8', fontSize:'11px', margin:0 }}>{a.desc}</p>
                  </div>
                  <span style={{ color:a.color, fontSize:'16px', opacity:0.6 }}>›</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="dc-fade" style={{ animationDelay:'400ms', paddingTop:'18px', borderTop:'1px solid #e8edf5', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'8px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <div style={{ width:'20px', height:'20px', background:'linear-gradient(135deg,#3b82f6,#8b5cf6)', borderRadius:'5px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px' }}>🚛</div>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', color:'#cbd5e1', letterSpacing:'0.04em' }}>BodegaXpress · Portal Cliente · v1.0</span>
          </div>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', color:'#cbd5e1' }}>{user?.email}</span>
        </div>

      </div>
    </>
  )
}