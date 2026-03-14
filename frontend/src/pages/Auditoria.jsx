import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const MODULOS = [
  { value: '',            label: 'Todos los módulos' },
  { value: 'envios',      label: '⇢ Envíos' },
  { value: 'inventario',  label: '⊟ Inventario' },
  { value: 'servicios',   label: '◈ Servicios' },
  { value: 'facturacion', label: '▤ Facturación' },
  { value: 'pagos',       label: '◇ Pagos' },
  { value: 'clientes',    label: '◎ Clientes' },
  { value: 'usuarios',    label: '◉ Usuarios' },
]

const MODULO_COLORS = {
  envios:      { color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
  inventario:  { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  servicios:   { color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  facturacion: { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  pagos:       { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  clientes:    { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  usuarios:    { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
}

const MODULO_ICONS = {
  envios: '⇢', inventario: '⊟', servicios: '◈',
  facturacion: '▤', pagos: '◇', clientes: '◎', usuarios: '◉',
}

function formatFecha(fechaStr) {
  const fecha = new Date(fechaStr)
  const ahora = new Date()
  const diff  = Math.floor((ahora - fecha) / 1000)
  if (diff < 60)   return 'Hace un momento'
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`
  return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Auditoria() {
  const [registros, setRegistros]     = useState([])
  const [usuarios, setUsuarios]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [filtros, setFiltros]         = useState({ modulo: '', usuario: '', fecha_desde: '', fecha_hasta: '', search: '' })
  const [stats, setStats]             = useState({})

  const cargar = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filtros.modulo)      params.append('modulo',      filtros.modulo)
    if (filtros.usuario)     params.append('usuario',     filtros.usuario)
    if (filtros.fecha_desde) params.append('fecha_desde', filtros.fecha_desde)
    if (filtros.fecha_hasta) params.append('fecha_hasta', filtros.fecha_hasta)
    if (filtros.search)      params.append('search',      filtros.search)
    params.append('page_size', '200')

    api.get(`/auditoria/?${params}`)
      .then(r => {
        const data = r.data.results || r.data
        setRegistros(data)
        // calcular stats
        const s = {}
        data.forEach(reg => {
          s[reg.modulo] = (s[reg.modulo] || 0) + 1
        })
        setStats(s)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [filtros])

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    api.get('/auth/usuarios/?page_size=100')
      .then(r => setUsuarios(r.data.results || r.data))
      .catch(console.error)
  }, [])

  const limpiarFiltros = () => setFiltros({ modulo: '', usuario: '', fecha_desde: '', fecha_hasta: '', search: '' })

  const hayFiltros = filtros.modulo || filtros.usuario || filtros.fecha_desde || filtros.fecha_hasta || filtros.search

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap');
        :root {
          --ink:#0d1117;--ink2:#1c2433;--muted:#6b7a99;--faint:#94a3b8;
          --line:#e8ecf2;--surface:#f7f8fb;--white:#ffffff;
          --accent:#2563eb;--radius:10px;
          --shadow:0 1px 3px rgba(13,17,23,0.08),0 4px 16px rgba(13,17,23,0.04);
        }
        *{box-sizing:border-box;margin:0;padding:0;}
        .aud{font-family:'DM Sans',sans-serif;color:var(--ink);}
        .inp,.sel{font-family:'DM Sans',sans-serif;font-size:13px;padding:8px 12px;background:var(--white);border:1.5px solid var(--line);border-radius:8px;color:var(--ink);outline:none;transition:border-color 0.15s;}
        .inp:focus,.sel:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(37,99,235,0.1);}
        .btn{font-family:'DM Sans',sans-serif;font-weight:600;font-size:12px;padding:8px 14px;border-radius:7px;border:none;cursor:pointer;transition:all 0.15s;display:inline-flex;align-items:center;gap:5px;}
        .btn-ghost{background:var(--white);color:var(--muted);border:1.5px solid var(--line);}
        .btn-ghost:hover{background:var(--surface);color:var(--ink);}
        .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px;}
        .kpi-card{background:var(--white);border:1.5px solid var(--line);border-radius:var(--radius);padding:16px 18px;box-shadow:var(--shadow);}
        .kpi-label{font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:var(--faint);margin-bottom:6px;}
        .kpi-value{font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:600;}
        .badge{padding:2px 9px;border-radius:5px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;border:1px solid;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;}
        .timeline{display:flex;flex-direction:column;gap:0;}
        .tl-item{display:grid;grid-template-columns:48px 1fr;gap:0;position:relative;}
        .tl-dot-col{display:flex;flex-direction:column;align-items:center;padding-top:16px;}
        .tl-dot{width:10px;height:10px;border-radius:50%;border:2px solid;flex-shrink:0;z-index:1;}
        .tl-line{width:2px;flex:1;background:var(--line);margin-top:4px;}
        .tl-item:last-child .tl-line{display:none;}
        .tl-card{background:var(--white);border:1.5px solid var(--line);border-radius:10px;padding:14px 16px;margin:8px 0 8px 0;box-shadow:var(--shadow);transition:border-color 0.15s;}
        .tl-card:hover{border-color:#c7d6fd;}
        .avatar{width:28px;height:28px;border-radius:7px;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:700;font-size:11px;flex-shrink:0;}
        .filters-bar{background:var(--white);border:1.5px solid var(--line);border-radius:var(--radius);padding:16px 20px;margin-bottom:20px;box-shadow:var(--shadow);}
        .empty{padding:64px;text-align:center;background:var(--white);border-radius:var(--radius);border:1.5px solid var(--line);}
      `}</style>

      <div className="aud">
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'24px' }}>
          <div>
            <p style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'10px', fontWeight:'500', letterSpacing:'0.18em', textTransform:'uppercase', color:'#2563eb', marginBottom:'6px' }}>// Administración</p>
            <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:'26px', fontWeight:'800', color:'var(--ink)', letterSpacing:'-0.03em', lineHeight:1, marginBottom:'4px' }}>Auditoría</h1>
            <p style={{ fontSize:'13px', color:'var(--faint)' }}>Registro de todas las acciones del sistema</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'11px', color:'var(--muted)' }}>
              {registros.length} registros
            </span>
            <button className="btn btn-ghost" onClick={cargar}>↺ Actualizar</button>
          </div>
        </div>

        {/* KPIs por módulo */}
        <div className="kpi-grid">
          {[
            { label:'Total acciones', value: registros.length,          color:'#2563eb' },
            { label:'Hoy',            value: registros.filter(r => new Date(r.fecha).toDateString() === new Date().toDateString()).length, color:'#7c3aed' },
            { label:'Usuarios activos', value: [...new Set(registros.map(r => r.usuario_email))].length, color:'#0369a1' },
            { label:'Módulos',        value: Object.keys(stats).length, color:'#059669' },
          ].map(k => (
            <div key={k.label} className="kpi-card">
              <p className="kpi-label">{k.label}</p>
              <p className="kpi-value" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="filters-bar">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 180px 180px 160px 160px auto', gap:'10px', alignItems:'center' }}>
            <input className="inp" placeholder="🔍 Buscar por usuario, acción..." value={filtros.search}
              onChange={e => setFiltros({ ...filtros, search: e.target.value })} />
            <select className="sel" value={filtros.modulo}
              onChange={e => setFiltros({ ...filtros, modulo: e.target.value })}>
              {MODULOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <select className="sel" value={filtros.usuario}
              onChange={e => setFiltros({ ...filtros, usuario: e.target.value })}>
              <option value="">Todos los usuarios</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.first_name || u.email}</option>)}
            </select>
            <input className="inp" type="date" value={filtros.fecha_desde}
              onChange={e => setFiltros({ ...filtros, fecha_desde: e.target.value })} />
            <input className="inp" type="date" value={filtros.fecha_hasta}
              onChange={e => setFiltros({ ...filtros, fecha_hasta: e.target.value })} />
            {hayFiltros && (
              <button className="btn btn-ghost" onClick={limpiarFiltros}>✕ Limpiar</button>
            )}
          </div>

          {/* Pills módulos activos */}
          <div style={{ display:'flex', gap:'6px', marginTop:'12px', flexWrap:'wrap' }}>
            {Object.entries(stats).map(([mod, count]) => {
              const c = MODULO_COLORS[mod] || { color:'#6b7a99', bg:'#f7f8fb', border:'#e8ecf2' }
              return (
                <button key={mod}
                  onClick={() => setFiltros({ ...filtros, modulo: filtros.modulo === mod ? '' : mod })}
                  className="badge"
                  style={{
                    background: filtros.modulo === mod ? c.color : c.bg,
                    color: filtros.modulo === mod ? '#fff' : c.color,
                    borderColor: c.border,
                    cursor: 'pointer',
                    padding: '4px 10px',
                    fontSize: '11px',
                  }}>
                  {MODULO_ICONS[mod]} {mod} ({count})
                </button>
              )
            })}
          </div>
        </div>

        {/* Timeline */}
        {loading ? (
          <div className="empty">
            <p style={{ color:'var(--faint)', fontSize:'13px' }}>Cargando registros...</p>
          </div>
        ) : registros.length === 0 ? (
          <div className="empty">
            <p style={{ fontSize:'32px', marginBottom:'10px' }}>◎</p>
            <p style={{ color:'var(--muted)', fontSize:'14px', fontWeight:'500' }}>No hay registros{hayFiltros ? ' con estos filtros' : ''}</p>
            {hayFiltros && <button className="btn btn-ghost" style={{ marginTop:'12px' }} onClick={limpiarFiltros}>Limpiar filtros</button>}
          </div>
        ) : (
          <div className="timeline">
            {registros.map((reg) => {
              const c = MODULO_COLORS[reg.modulo] || { color:'#6b7a99', bg:'#f7f8fb', border:'#e8ecf2' }
              return (
                <div key={reg.id} className="tl-item">
                  <div className="tl-dot-col">
                    <div className="tl-dot" style={{ background: c.bg, borderColor: c.color }} />
                    <div className="tl-line" />
                  </div>
                  <div className="tl-card">
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'12px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'10px', flex:1, minWidth:0 }}>
                        <div className="avatar">
                          {(reg.usuario_nombre || reg.usuario_email || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap', marginBottom:'3px' }}>
                            <span style={{ fontSize:'13px', fontWeight:'600', color:'var(--ink)' }}>
                              {reg.usuario_nombre}
                            </span>
                            <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'10px', color:'var(--faint)' }}>
                              {reg.usuario_email}
                            </span>
                            <span className="badge" style={{ background: c.bg, color: c.color, borderColor: c.border }}>
                              {MODULO_ICONS[reg.modulo]} {reg.modulo_label}
                            </span>
                          </div>
                          <p style={{ fontSize:'13px', color:'var(--ink2)', fontWeight:'500' }}>{reg.accion}</p>
                          {reg.detalle && (
                            <p style={{ fontSize:'11.5px', color:'var(--muted)', marginTop:'3px', fontFamily:'JetBrains Mono,monospace' }}>
                              {reg.detalle}
                            </p>
                          )}
                        </div>
                      </div>
                      <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'10.5px', color:'var(--faint)', flexShrink:0, marginTop:'2px' }}>
                        {formatFecha(reg.fecha)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}