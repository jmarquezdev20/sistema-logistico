import { useState, useEffect } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const ESTADOS = [
  { value: 'pendiente',   label: 'Pendiente',   color: '#d97706', bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b', icon: '⏳' },
  { value: 'preparando',  label: 'Preparando',  color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', dot: '#3b82f6', icon: '📦' },
  { value: 'en_transito', label: 'En Tránsito', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', dot: '#7c3aed', icon: '🚛' },
  { value: 'entregado',   label: 'Entregado',   color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', dot: '#10b981', icon: '✅' },
]

export default function Envios() {
  const { esCliente, esAdmin, esEmpleado, clienteId } = useAuth()
  const puedeEscribir = esAdmin || esEmpleado

  const [ordenes, setOrdenes]                   = useState([])
  const [clientes, setClientes]                 = useState([])
  const [transportadores, setTransportadores]   = useState([])
  const [productos, setProductos]               = useState([])
  const [inventarios, setInventarios]           = useState([])
  const [loading, setLoading]                   = useState(true)
  const [showForm, setShowForm]                 = useState(false)
  const [showDetalle, setShowDetalle]           = useState(false)
  const [ordenDetalle, setOrdenDetalle]         = useState(null)
  const [filtroEstado, setFiltroEstado]         = useState('')
  const [filtroCliente, setFiltroCliente]       = useState(esCliente ? String(clienteId) : '')
  const [error, setError]                       = useState('')
  const [guardando, setGuardando]               = useState(false)
  const [despachando, setDespachando]           = useState(false)
  const [form, setForm]                         = useState({ cliente: '', transportador: '', destino: '', observacion: '' })
  const [productosOrden, setProductosOrden]     = useState([{ producto: '', cantidad: '' }])

  const withClienteParam = (base) => {
    if (!filtroCliente) return base
    const sep = base.includes('?') ? '&' : '?'
    return `${base}${sep}cliente=${filtroCliente}`
  }

  useEffect(() => {
    // ✅ Transportadores: todos los roles lo necesitan para mostrar el nombre
    api.get('/transportadores/?page_size=100')
      .then(r => setTransportadores(r.data.results || r.data))
      .catch(console.error)

    if (puedeEscribir) {
      const cargarTodosClientes = async () => {
        let todos = [], pagina = 1, hayMas = true
        while (hayMas) {
          try {
            const r = await api.get(`/clientes/?page=${pagina}&page_size=100`)
            todos = [...todos, ...(r.data.results || r.data)]
            hayMas = !!r.data.next
            pagina++
          } catch { hayMas = false }
        }
        setClientes(todos)
      }
      cargarTodosClientes()
    }

    api.get(withClienteParam('/inventario/productos/?page_size=200'))
      .then(r => setProductos(r.data.results || r.data)).catch(console.error)
    api.get(withClienteParam('/inventario/inventarios/?page_size=200'))
      .then(r => setInventarios(r.data.results || r.data)).catch(console.error)
  }, [])

  const cargar = () => {
    setLoading(true)
    let url = '/envios/ordenes/?'
    if (filtroEstado)  url += `estado=${filtroEstado}&`
    if (filtroCliente) url += `cliente=${filtroCliente}&`
    api.get(url).then(r => setOrdenes(r.data.results || r.data)).catch(console.error).finally(() => setLoading(false))
  }
  useEffect(() => { cargar() }, [filtroEstado, filtroCliente])

  const getEstado              = (v)   => ESTADOS.find(e => e.value === v) || ESTADOS[0]
  const getNombreCliente       = (id)  => clientes.find(c => c.id === id)?.nombre || '—'
  const getNombreTransportador = (id)  => transportadores.find(t => t.id === id)?.nombre || '—'
  const getStockProducto       = (pid) => inventarios.find(i => i.producto === pid)?.cantidad ?? '?'

  const abrirNuevaOrden = () => {
    setForm({ cliente: esCliente ? String(clienteId) : '', transportador: '', destino: '', observacion: '' })
    setProductosOrden([{ producto: '', cantidad: '' }])
    setError(''); setShowForm(true)
  }
  const agregarLinea    = ()           => setProductosOrden([...productosOrden, { producto: '', cantidad: '' }])
  const quitarLinea     = (i)          => setProductosOrden(productosOrden.filter((_, idx) => idx !== i))
  const actualizarLinea = (i, f, val)  => { const n = [...productosOrden]; n[i][f] = val; setProductosOrden(n) }

  const crearOrden = async () => {
    if (!form.cliente || !form.destino) { setError('Cliente y destino son obligatorios.'); return }
    const lineas = productosOrden.filter(p => p.producto && p.cantidad)
    if (lineas.length === 0) { setError('Agrega al menos un producto.'); return }
    setGuardando(true); setError('')
    try {
      const res = await api.post('/envios/ordenes/', {
        cliente: form.cliente, transportador: form.transportador || null,
        destino: form.destino, observacion: form.observacion
      })
      for (const l of lineas)
        await api.post(`/envios/ordenes/${res.data.id}/productos/`, { orden_envio: res.data.id, producto: l.producto, cantidad: parseInt(l.cantidad) })
      setShowForm(false); cargar()
    } catch (e) { setError(e.response?.data?.error || 'Error al crear la orden.') }
    finally { setGuardando(false) }
  }

  const cambiarEstado = async (orden, nuevoEstado) => {
    await api.patch(`/envios/ordenes/${orden.id}/`, { estado: nuevoEstado }); cargar()
    if (ordenDetalle?.id === orden.id) { const r = await api.get(`/envios/ordenes/${orden.id}/`); setOrdenDetalle(r.data) }
  }

  const despachar = async (orden) => {
    if (!window.confirm('¿Confirmar despacho? Se descontará el stock y se registrará el cargo de envío automáticamente.')) return
    setDespachando(true)
    try {
      await api.post(`/envios/ordenes/${orden.id}/despachar/`); cargar()
      if (ordenDetalle?.id === orden.id) { const r = await api.get(`/envios/ordenes/${orden.id}/`); setOrdenDetalle(r.data) }
    } catch (e) { alert(e.response?.data?.error || 'Error al despachar.') }
    finally { setDespachando(false) }
  }

  const verDetalle = async (orden) => {
    const r = await api.get(`/envios/ordenes/${orden.id}/`)
    setOrdenDetalle(r.data); setShowDetalle(true)
  }

  const inp = { width:'100%', padding:'10px 13px', background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:'9px', color:'#0f172a', fontSize:'13px', fontFamily:"'Plus Jakarta Sans',sans-serif", boxSizing:'border-box', outline:'none', transition:'border-color 0.15s, box-shadow 0.15s' }
  const lbl = { color:'#374151', fontSize:'11px', fontWeight:'700', display:'block', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.07em' }
  const conteo = (estado) => ordenes.filter(o => o.estado === estado).length

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        .env-root * { box-sizing: border-box; }
        .env-root { font-family: 'Plus Jakarta Sans', sans-serif; color: #0f172a; }
        .env-tbody tr:hover td { background: #f0f7ff !important; }
        .env-inp:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.1) !important; }
        .th-env { padding:12px 18px; text-align:left; color:#94a3b8; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.09em; background:#fafbfc; border-bottom:2px solid #f1f5f9; white-space:nowrap; }
        .act-btn { border:1px solid; padding:5px 12px; border-radius:7px; font-size:11px; font-weight:600; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; transition:all 0.15s; white-space:nowrap; }
        .kpi-pill { border-radius:14px; padding:16px 20px; cursor:pointer; transition:all 0.18s; text-align:center; border:2px solid; min-width:110px; }
        .kpi-pill:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(15,23,42,0.1); }
        .modal-bd { position:fixed; inset:0; background:rgba(15,23,42,0.6); display:flex; align-items:center; justify-content:center; z-index:1000; backdrop-filter:blur(4px); animation:bdIn 0.2s ease; }
        @keyframes bdIn { from{opacity:0} to{opacity:1} }
        .modal-box { background:#fff; border-radius:20px; box-shadow:0 32px 80px rgba(15,23,42,0.25); max-height:92vh; overflow-y:auto; animation:boxIn 0.25s cubic-bezier(.4,0,.2,1); }
        @keyframes boxIn { from{opacity:0;transform:scale(0.95) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(0.85)} }
        .linea-prod { display:grid; grid-template-columns:1fr 90px 34px; gap:8px; align-items:center; margin-bottom:8px; }
      `}</style>

      <div className="env-root">

        {/* ══ HEADER BANNER ══ */}
        <div style={{ background:'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', borderRadius:'16px', padding:'26px 30px', marginBottom:'22px', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:'-50px', right:'-50px', width:'220px', height:'220px', borderRadius:'50%', background:'rgba(124,58,237,0.12)', filter:'blur(50px)' }} />
          <div style={{ position:'absolute', bottom:'-30px', left:'30%', width:'160px', height:'160px', borderRadius:'50%', background:'rgba(59,130,246,0.08)', filter:'blur(40px)' }} />
          <div style={{ position:'relative', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'18px' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' }}>
                <div style={{ width:'40px', height:'40px', background:'rgba(124,58,237,0.2)', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', border:'1px solid rgba(124,58,237,0.3)', flexShrink:0 }}>🚛</div>
                <div>
                  <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.12em', margin:0 }}>{esCliente ? 'Mis envíos' : 'Módulo'}</p>
                  <h1 style={{ color:'#fff', fontSize:'22px', fontWeight:'800', margin:0, letterSpacing:'-0.02em' }}>Gestión de Envíos</h1>
                </div>
              </div>
              <p style={{ color:'rgba(255,255,255,0.35)', fontSize:'12px', margin:0 }}>
                {esCliente ? 'Seguimiento de tus órdenes de envío' : 'Órdenes · Tránsito · Entregas · BodegaXpress'}
              </p>
            </div>
            <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
              {ESTADOS.map(e => (
                <div key={e.value} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', padding:'10px 16px', textAlign:'center', minWidth:'76px', backdropFilter:'blur(10px)' }}>
                  <p style={{ color:e.dot, fontSize:'20px', fontWeight:'800', margin:'0 0 2px', fontFamily:"'DM Mono',monospace" }}>{conteo(e.value)}</p>
                  <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'10px', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.08em', margin:0 }}>{e.label}</p>
                </div>
              ))}
            </div>
            {puedeEscribir && (
              <button onClick={abrirNuevaOrden}
                style={{ background:'#7c3aed', color:'#fff', border:'none', padding:'11px 22px', borderRadius:'10px', fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:'700', fontSize:'13px', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px', boxShadow:'0 4px 16px rgba(124,58,237,0.4)', transition:'all 0.15s', whiteSpace:'nowrap', flexShrink:0 }}
                onMouseEnter={e => { e.currentTarget.style.background='#6d28d9'; e.currentTarget.style.transform='translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.background='#7c3aed'; e.currentTarget.style.transform='translateY(0)' }}
              ><span style={{fontSize:'17px',lineHeight:1}}>+</span> Nueva orden</button>
            )}
          </div>
        </div>

        {/* ══ FILTROS / KPI PILLS ══ */}
        <div style={{ display:'flex', gap:'10px', marginBottom:'16px', flexWrap:'wrap', alignItems:'center' }}>
          {ESTADOS.map(e => {
            const count = conteo(e.value)
            const activo = filtroEstado === e.value
            return (
              <div key={e.value} className="kpi-pill"
                onClick={() => setFiltroEstado(activo ? '' : e.value)}
                style={{ background:activo ? e.bg : '#fff', borderColor:activo ? e.border : '#e8edf5', boxShadow:activo ? `0 4px 14px ${e.border}` : 'none' }}>
                <p style={{ fontSize:'20px', margin:'0 0 4px' }}>{e.icon}</p>
                <p style={{ color:e.color, fontSize:'22px', fontWeight:'800', margin:'0 0 3px', fontFamily:"'DM Mono',monospace", letterSpacing:'-0.03em' }}>{count}</p>
                <p style={{ color:'#64748b', fontSize:'10px', fontWeight:'700', margin:0, textTransform:'uppercase', letterSpacing:'0.05em' }}>{e.label}</p>
                {activo && <span style={{ display:'inline-block', marginTop:'5px', background:e.color, color:'#fff', fontSize:'9px', fontWeight:'700', padding:'2px 8px', borderRadius:'10px' }}>Filtrando</span>}
              </div>
            )
          })}
          <div style={{ marginLeft:'auto', display:'flex', gap:'8px', flexWrap:'wrap' }}>
            {puedeEscribir && (
              <select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)}
                style={{ ...inp, width:'220px', padding:'8px 12px', fontSize:'12px' }}>
                <option value="">Todos los clientes</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            )}
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
              style={{ ...inp, width:'160px', padding:'8px 12px', fontSize:'12px' }}>
              <option value="">Todos los estados</option>
              {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.icon} {e.label}</option>)}
            </select>
          </div>
        </div>

        {/* ══ TABLA ══ */}
        <div style={{ background:'#fff', borderRadius:'14px', border:'1px solid #e8edf5', overflow:'hidden', boxShadow:'0 1px 8px rgba(15,23,42,0.06)' }}>
          {loading ? (
            <div style={{ padding:'72px', textAlign:'center' }}>
              <div style={{ display:'inline-block', width:'32px', height:'32px', border:'3px solid #e2e8f0', borderTopColor:'#7c3aed', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
              <p style={{ color:'#94a3b8', fontSize:'13px', margin:'14px 0 0' }}>Cargando órdenes...</p>
            </div>
          ) : ordenes.length === 0 ? (
            <div style={{ padding:'72px', textAlign:'center' }}>
              <div style={{ width:'64px', height:'64px', background:'#f1f5f9', borderRadius:'16px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px', margin:'0 auto 16px' }}>🚛</div>
              <p style={{ color:'#0f172a', fontSize:'15px', fontWeight:'700', margin:'0 0 6px' }}>
                {esCliente ? 'Aún no tienes órdenes de envío' : 'Sin órdenes de envío'}
              </p>
              <p style={{ color:'#94a3b8', fontSize:'13px', margin:'0 0 20px' }}>
                {filtroEstado ? 'No hay órdenes con los filtros aplicados.' : esCliente ? 'Tus órdenes aparecerán aquí una vez creadas.' : 'Crea la primera orden con el botón de arriba.'}
              </p>
              {puedeEscribir && !filtroEstado && !filtroCliente && (
                <button onClick={abrirNuevaOrden} style={{ background:'#0f172a', color:'#fff', border:'none', padding:'10px 22px', borderRadius:'9px', fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:'700', fontSize:'13px', cursor:'pointer' }}>+ Nueva orden</button>
              )}
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  {puedeEscribir && <th className="th-env">Cliente</th>}
                  {['Destino','Transportador','Estado','Fecha'].map(h => <th key={h} className="th-env">{h}</th>)}
                  {puedeEscribir && <th className="th-env">Acciones</th>}
                  {esCliente && <th className="th-env">Detalle</th>}
                </tr>
              </thead>
              <tbody className="env-tbody">
                {ordenes.map((o, i) => {
                  const estado = getEstado(o.estado)
                  const isLast = i === ordenes.length - 1
                  const td = { padding:'13px 18px', borderBottom:isLast?'none':'1px solid #f8fafc', verticalAlign:'middle', background:'#fff' }
                  return (
                    <tr key={o.id}>
                      {puedeEscribir && (
                        <td style={td}>
                          <p style={{ color:'#0f172a', fontSize:'13px', fontWeight:'700', margin:0 }}>{getNombreCliente(o.cliente)}</p>
                        </td>
                      )}
                      <td style={{ ...td, maxWidth:'160px' }}>
                        <p style={{ color:'#475569', fontSize:'12px', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={o.destino}>
                          📍 {o.destino}
                        </p>
                      </td>
                      <td style={td}>
                        {o.transportador
                          ? <span style={{ color:'#475569', fontSize:'13px', fontWeight:'500' }}>{getNombreTransportador(o.transportador)}</span>
                          : <span style={{ color:'#cbd5e1', fontSize:'12px', fontStyle:'italic' }}>Sin asignar</span>}
                      </td>
                      <td style={td}>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:'5px', padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'700', textTransform:'uppercase', background:estado.bg, color:estado.color, border:`1px solid ${estado.border}` }}>
                          <span style={{ width:'5px', height:'5px', borderRadius:'50%', background:estado.dot, display:'inline-block', animation:'pulse-dot 2s ease infinite' }} />
                          {estado.label}
                        </span>
                      </td>
                      <td style={{ ...td, fontFamily:"'DM Mono',monospace", color:'#64748b', fontSize:'12px' }}>
                        {new Date(o.fecha_creacion).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'})}
                      </td>
                      {puedeEscribir && (
                        <td style={td}>
                          <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
                            <button className="act-btn" onClick={() => verDetalle(o)}
                              style={{ background:'#f8fafc', color:'#475569', borderColor:'#e2e8f0' }}
                              onMouseEnter={e=>{e.currentTarget.style.background='#0f172a';e.currentTarget.style.color='#fff';e.currentTarget.style.borderColor='#0f172a'}}
                              onMouseLeave={e=>{e.currentTarget.style.background='#f8fafc';e.currentTarget.style.color='#475569';e.currentTarget.style.borderColor='#e2e8f0'}}
                            >Ver</button>
                            {o.estado === 'pendiente' && (
                              <button className="act-btn" onClick={() => cambiarEstado(o,'preparando')}
                                style={{ background:'#eff6ff', color:'#3b82f6', borderColor:'#bfdbfe' }}
                                onMouseEnter={e=>{e.currentTarget.style.background='#3b82f6';e.currentTarget.style.color='#fff'}}
                                onMouseLeave={e=>{e.currentTarget.style.background='#eff6ff';e.currentTarget.style.color='#3b82f6'}}
                              >Preparar</button>
                            )}
                            {(o.estado === 'pendiente' || o.estado === 'preparando') && (
                              <button className="act-btn" onClick={() => despachar(o)} disabled={despachando}
                                style={{ background:'#f5f3ff', color:'#7c3aed', borderColor:'#ddd6fe' }}
                                onMouseEnter={e=>{e.currentTarget.style.background='#7c3aed';e.currentTarget.style.color='#fff'}}
                                onMouseLeave={e=>{e.currentTarget.style.background='#f5f3ff';e.currentTarget.style.color='#7c3aed'}}
                              >🚛 Despachar</button>
                            )}
                            {o.estado === 'en_transito' && (
                              <button className="act-btn" onClick={() => cambiarEstado(o,'entregado')}
                                style={{ background:'#ecfdf5', color:'#059669', borderColor:'#a7f3d0' }}
                                onMouseEnter={e=>{e.currentTarget.style.background='#059669';e.currentTarget.style.color='#fff'}}
                                onMouseLeave={e=>{e.currentTarget.style.background='#ecfdf5';e.currentTarget.style.color='#059669'}}
                              >✅ Entregado</button>
                            )}
                          </div>
                        </td>
                      )}
                      {esCliente && (
                        <td style={td}>
                          <button className="act-btn" onClick={() => verDetalle(o)}
                            style={{ background:'#f8fafc', color:'#475569', borderColor:'#e2e8f0' }}
                            onMouseEnter={e=>{e.currentTarget.style.background='#0f172a';e.currentTarget.style.color='#fff';e.currentTarget.style.borderColor='#0f172a'}}
                            onMouseLeave={e=>{e.currentTarget.style.background='#f8fafc';e.currentTarget.style.color='#475569';e.currentTarget.style.borderColor='#e2e8f0'}}
                          >Ver detalle</button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ══ MODAL NUEVA ORDEN (solo admin/empleado) ══ */}
        {showForm && puedeEscribir && (
          <div className="modal-bd" onClick={e => { if(e.target===e.currentTarget) setShowForm(false) }}>
            <div className="modal-box" style={{ width:'580px' }}>
              <div style={{ background:'linear-gradient(135deg,#0f172a,#2d1b69)', borderRadius:'20px 20px 0 0', padding:'24px 28px', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:'-20px', right:'-20px', width:'120px', height:'120px', borderRadius:'50%', background:'rgba(124,58,237,0.2)', filter:'blur(30px)' }} />
                <div style={{ position:'relative', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.12em', margin:'0 0 5px' }}>Nuevo registro</p>
                    <h2 style={{ color:'#fff', fontSize:'19px', fontWeight:'800', margin:0, letterSpacing:'-0.02em' }}>Crear orden de envío</h2>
                  </div>
                  <button onClick={() => setShowForm(false)} style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'9px', width:'32px', height:'32px', cursor:'pointer', color:'rgba(255,255,255,0.7)', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                </div>
              </div>
              <div style={{ padding:'26px 28px' }}>
                {error && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#ef4444', padding:'10px 14px', borderRadius:'9px', marginBottom:'18px', fontSize:'12px', fontWeight:'600' }}>⚠ {error}</div>}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'14px' }}>
                  <div>
                    <label style={lbl}>Cliente *</label>
                    <select className="env-inp" value={form.cliente} onChange={e => setForm({...form,cliente:e.target.value})} style={inp}>
                      <option value="">Seleccionar</option>
                      {clientes.filter(c => c.activo).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Transportador</label>
                    <select className="env-inp" value={form.transportador} onChange={e => setForm({...form,transportador:e.target.value})} style={inp}>
                      <option value="">Sin asignar</option>
                      {transportadores.filter(t => t.activo).map(t => <option key={t.id} value={t.id}>{t.nombre} — {t.placa_vehiculo}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom:'14px' }}>
                  <label style={lbl}>Destino *</label>
                  <input className="env-inp" value={form.destino} onChange={e => setForm({...form,destino:e.target.value})} placeholder="Calle 123 # 45-67, Ciudad" style={inp} />
                </div>
                <div style={{ marginBottom:'16px' }}>
                  <label style={lbl}>Observación</label>
                  <input className="env-inp" value={form.observacion} onChange={e => setForm({...form,observacion:e.target.value})} placeholder="Instrucciones especiales..." style={inp} />
                </div>
                <div style={{ background:'linear-gradient(90deg,#eff6ff,#f5f3ff)', border:'1px solid #c4b5fd', borderRadius:'10px', padding:'11px 16px', marginBottom:'18px', display:'flex', gap:'10px', alignItems:'center' }}>
                  <span style={{fontSize:'16px'}}>ℹ️</span>
                  <p style={{ color:'#5b21b6', fontSize:'12px', margin:0, fontWeight:'600' }}>Al despachar se descontará el stock y se registrará automáticamente el cargo de envío.</p>
                </div>
                <div style={{ background:'#f8fafc', borderRadius:'12px', padding:'18px', border:'1.5px solid #e2e8f0', marginBottom:'22px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
                    <div>
                      <p style={{ color:'#0f172a', fontSize:'13px', fontWeight:'700', margin:'0 0 2px' }}>📦 Productos a enviar</p>
                      <p style={{ color:'#94a3b8', fontSize:'11px', margin:0 }}>Uno o más productos para esta orden</p>
                    </div>
                    <button onClick={agregarLinea}
                      style={{ background:'#ecfdf5', color:'#059669', border:'1px solid #a7f3d0', padding:'6px 12px', borderRadius:'8px', cursor:'pointer', fontSize:'12px', fontWeight:'700', fontFamily:"'Plus Jakarta Sans',sans-serif", transition:'all 0.15s' }}
                      onMouseEnter={e=>{e.currentTarget.style.background='#059669';e.currentTarget.style.color='#fff'}}
                      onMouseLeave={e=>{e.currentTarget.style.background='#ecfdf5';e.currentTarget.style.color='#059669'}}
                    >+ Línea</button>
                  </div>
                  {productosOrden.map((linea, i) => (
                    <div key={i} className="linea-prod">
                      <select className="env-inp" value={linea.producto} onChange={e => actualizarLinea(i,'producto',e.target.value)} style={inp}>
                        <option value="">Seleccionar producto</option>
                        {productos.filter(p => !form.cliente || p.cliente === form.cliente).map(p => (
                          <option key={p.id} value={p.id}>{p.nombre} (Stock: {getStockProducto(p.id)})</option>
                        ))}
                      </select>
                      <input className="env-inp" type="number" min="1" placeholder="Cant." value={linea.cantidad} onChange={e => actualizarLinea(i,'cantidad',e.target.value)} style={{ ...inp, textAlign:'center' }} />
                      {productosOrden.length > 1 && (
                        <button onClick={() => quitarLinea(i)} style={{ background:'#fef2f2', color:'#ef4444', border:'1px solid #fecaca', borderRadius:'8px', cursor:'pointer', fontSize:'14px', width:'34px', height:'42px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700', flexShrink:0 }}>✕</button>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ height:'1px', background:'#f1f5f9', marginBottom:'20px' }} />
                <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
                  <button onClick={() => setShowForm(false)} style={{ background:'#fff', color:'#64748b', border:'1.5px solid #e2e8f0', padding:'10px 20px', borderRadius:'9px', cursor:'pointer', fontSize:'13px', fontWeight:'600', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Cancelar</button>
                  <button onClick={crearOrden} disabled={guardando}
                    style={{ background:'#0f172a', color:'#fff', border:'none', padding:'10px 22px', borderRadius:'9px', cursor:guardando?'not-allowed':'pointer', fontSize:'13px', fontWeight:'700', fontFamily:"'Plus Jakarta Sans',sans-serif", opacity:guardando?0.7:1, display:'flex', alignItems:'center', gap:'7px', boxShadow:'0 4px 12px rgba(15,23,42,0.2)' }}
                    onMouseEnter={e => { if(!guardando) e.currentTarget.style.background='#1e293b' }}
                    onMouseLeave={e => e.currentTarget.style.background='#0f172a'}
                  >
                    {guardando && <span style={{ display:'inline-block', width:'12px', height:'12px', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />}
                    {guardando ? 'Creando...' : 'Crear orden'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ MODAL DETALLE ══ */}
        {showDetalle && ordenDetalle && (
          <div className="modal-bd" onClick={e => { if(e.target===e.currentTarget) setShowDetalle(false) }}>
            <div className="modal-box" style={{ width:'540px' }}>
              {(() => {
                const e = getEstado(ordenDetalle.estado)
                const gradFin = ordenDetalle.estado==='entregado' ? '#064e3b' : ordenDetalle.estado==='en_transito' ? '#2d1b69' : '#1e3a5f'
                return (
                  <div style={{ background:`linear-gradient(135deg,#0f172a,${gradFin})`, borderRadius:'20px 20px 0 0', padding:'24px 28px', position:'relative', overflow:'hidden' }}>
                    <div style={{ position:'absolute', top:'-20px', right:'-20px', width:'120px', height:'120px', borderRadius:'50%', background:`${e.dot}25`, filter:'blur(30px)' }} />
                    <div style={{ position:'relative', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div>
                        <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.12em', margin:'0 0 5px' }}>Detalle de orden</p>
                        <h2 style={{ color:'#fff', fontSize:'19px', fontWeight:'800', margin:'0 0 8px', letterSpacing:'-0.02em' }}>
                          {esCliente ? 'Mi orden' : getNombreCliente(ordenDetalle.cliente)}
                        </h2>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:'5px', padding:'4px 12px', borderRadius:'20px', fontSize:'11px', fontWeight:'700', textTransform:'uppercase', background:'rgba(255,255,255,0.12)', color:'#fff', border:'1px solid rgba(255,255,255,0.2)' }}>
                          {e.icon} {e.label}
                        </span>
                      </div>
                      <button onClick={() => setShowDetalle(false)} style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'9px', width:'32px', height:'32px', cursor:'pointer', color:'rgba(255,255,255,0.7)', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                    </div>
                  </div>
                )
              })()}
              <div style={{ padding:'24px 28px' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'18px' }}>
                  {[
                    ['📍 Destino', ordenDetalle.destino],
                    ['🚚 Transportador', ordenDetalle.transportador ? getNombreTransportador(ordenDetalle.transportador) : 'Sin asignar'],
                    ['📅 Creación', new Date(ordenDetalle.fecha_creacion).toLocaleDateString('es-CO',{day:'2-digit',month:'long',year:'numeric'})],
                    ['📅 Despacho', ordenDetalle.fecha_despacho ? new Date(ordenDetalle.fecha_despacho).toLocaleDateString('es-CO',{day:'2-digit',month:'long',year:'numeric'}) : '—'],
                  ].map(([k,v]) => (
                    <div key={k} style={{ background:'#f8fafc', borderRadius:'10px', padding:'12px 16px', border:'1px solid #f1f5f9' }}>
                      <p style={{ color:'#94a3b8', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.07em', margin:'0 0 4px' }}>{k}</p>
                      <p style={{ color:'#0f172a', fontSize:'13px', fontWeight:'600', margin:0 }}>{v}</p>
                    </div>
                  ))}
                </div>
                {ordenDetalle.observacion && (
                  <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:'10px', padding:'12px 16px', marginBottom:'18px' }}>
                    <p style={{ color:'#94a3b8', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.07em', margin:'0 0 4px' }}>Observación</p>
                    <p style={{ color:'#92400e', fontSize:'13px', margin:0 }}>{ordenDetalle.observacion}</p>
                  </div>
                )}
                <p style={{ color:'#374151', fontSize:'11px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 10px' }}>Productos en esta orden</p>
                {(ordenDetalle.productos || []).length === 0
                  ? <p style={{ color:'#94a3b8', fontSize:'13px', fontStyle:'italic' }}>Sin productos registrados.</p>
                  : (ordenDetalle.productos || []).map(p => (
                    <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 16px', background:'#f8fafc', borderRadius:'10px', marginBottom:'7px', border:'1px solid #f1f5f9' }}>
                      <span style={{ color:'#0f172a', fontSize:'13px', fontWeight:'600' }}>📦 {p.producto_nombre}</span>
                      <span style={{ background:'#fff7ed', color:'#c2410c', border:'1px solid #fed7aa', padding:'3px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:'700', fontFamily:"'DM Mono',monospace" }}>×{p.cantidad}</span>
                    </div>
                  ))
                }
                {puedeEscribir && (ordenDetalle.estado === 'pendiente' || ordenDetalle.estado === 'preparando') && (
                  <div style={{ marginTop:'18px', display:'flex', gap:'8px' }}>
                    {ordenDetalle.estado === 'pendiente' && (
                      <button onClick={() => { cambiarEstado(ordenDetalle,'preparando'); setShowDetalle(false) }}
                        style={{ flex:1, background:'#eff6ff', color:'#3b82f6', border:'1.5px solid #bfdbfe', padding:'10px', borderRadius:'10px', cursor:'pointer', fontSize:'13px', fontWeight:'700', fontFamily:"'Plus Jakarta Sans',sans-serif", transition:'all 0.15s' }}
                        onMouseEnter={e=>{e.currentTarget.style.background='#3b82f6';e.currentTarget.style.color='#fff'}}
                        onMouseLeave={e=>{e.currentTarget.style.background='#eff6ff';e.currentTarget.style.color='#3b82f6'}}
                      >📦 Marcar en preparación</button>
                    )}
                    <button onClick={() => { despachar(ordenDetalle); setShowDetalle(false) }} disabled={despachando}
                      style={{ flex:1, background:'#7c3aed', color:'#fff', border:'none', padding:'10px', borderRadius:'10px', cursor:'pointer', fontSize:'13px', fontWeight:'700', fontFamily:"'Plus Jakarta Sans',sans-serif", boxShadow:'0 4px 12px rgba(124,58,237,0.3)', transition:'all 0.15s' }}
                      onMouseEnter={e=>{e.currentTarget.style.background='#6d28d9'}}
                      onMouseLeave={e=>{e.currentTarget.style.background='#7c3aed'}}
                    >🚛 Despachar orden</button>
                  </div>
                )}
                {puedeEscribir && ordenDetalle.estado === 'en_transito' && (
                  <button onClick={() => { cambiarEstado(ordenDetalle,'entregado'); setShowDetalle(false) }}
                    style={{ width:'100%', marginTop:'18px', background:'#059669', color:'#fff', border:'none', padding:'11px', borderRadius:'10px', cursor:'pointer', fontSize:'13px', fontWeight:'700', fontFamily:"'Plus Jakarta Sans',sans-serif", boxShadow:'0 4px 12px rgba(5,150,105,0.3)', transition:'all 0.15s' }}
                    onMouseEnter={e=>{e.currentTarget.style.background='#047857'}}
                    onMouseLeave={e=>{e.currentTarget.style.background='#059669'}}
                  >✅ Confirmar entrega</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}