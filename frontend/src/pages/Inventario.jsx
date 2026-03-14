import { useState, useEffect } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function Inventario() {
  const { esCliente, esAdmin, esEmpleado, clienteId } = useAuth()

  const [tab, setTab]                   = useState('productos')
  const [productos, setProductos]       = useState([])
  const [inventarios, setInventarios]   = useState([])
  const [movimientos, setMovimientos]   = useState([])
  const [clientes, setClientes]         = useState([])
  const [ubicaciones, setUbicaciones]   = useState([])
  const [catalogoServicios, setCatalogoServicios] = useState([])
  const [loading, setLoading]           = useState(true)
  const [showForm, setShowForm]         = useState(false)
  const [showMovForm, setShowMovForm]   = useState(false)
  const [editando, setEditando]         = useState(null)
  const [error, setError]               = useState('')
  const [guardando, setGuardando]       = useState(false)

  // ─── Filtro de cliente ───────────────────────────────────────────────────────
  // Si es rol cliente: SIEMPRE fijo en su propio clienteId (nunca editable)
  // Si es admin/empleado: puede cambiarlo desde el select
  const [filtroCliente, setFiltroCliente] = useState(() =>
    esCliente ? String(clienteId ?? '') : ''
  )

  const [modoEntrada, setModoEntrada]   = useState('existente')

  const [formProducto, setFormProducto]   = useState({ cliente: '', nombre: '', descripcion: '' })
  const [formUbicacion, setFormUbicacion] = useState({ ubicacion: '' })
  const [formMov, setFormMov]   = useState({ producto: '', cantidad: '', observacion: '' })
  const [formNuevo, setFormNuevo] = useState({ cliente: '', nombre: '', descripcion: '', ubicacion: '', cantidad: '', observacion: '' })
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState({})

  // ─── Sincronizar filtroCliente si clienteId llega después del primer render ──
  // Esto cubre el caso en que el contexto de auth tarda en hidratarse
  useEffect(() => {
    if (esCliente && clienteId) {
      setFiltroCliente(String(clienteId))
    }
  }, [esCliente, clienteId])

  useEffect(() => {
    if (!esCliente) {
      const cargarTodosClientes = async () => {
        let todos = [], pagina = 1, hayMas = true
        while (hayMas) {
          try {
            const r = await api.get(`/clientes/?page=${pagina}&page_size=100`)
            const results = r.data.results || r.data
            todos = [...todos, ...results]
            hayMas = !!r.data.next
            pagina++
          } catch { hayMas = false }
        }
        setClientes(todos)
      }
      cargarTodosClientes()
      cargarUbicaciones()
    }
    api.get('/servicios/catalogo/?page_size=100')
      .then(r => setCatalogoServicios(r.data.results || r.data))
      .catch(console.error)
  }, [esCliente])

  // ─── Cargar datos al cambiar de tab o de filtro ──────────────────────────────
  // Guard: si es cliente, esperar a tener el clienteId antes de llamar a la API
  useEffect(() => {
    if (esCliente && !filtroCliente) return   // aún no tenemos el id, esperamos

    if (tab === 'productos')   cargarProductos()
    if (tab === 'stock')       cargarInventarios()
    if (tab === 'movimientos') cargarMovimientos()
  }, [tab, filtroCliente])

  // ─── Helper de URL ───────────────────────────────────────────────────────────
  // Para rol cliente siempre inyecta ?cliente=<id>
  // Para admin/empleado solo si hay un filtro activo
  const withClienteParam = (base) => {
    const id = esCliente ? String(clienteId) : filtroCliente
    if (!id) return base
    const sep = base.includes('?') ? '&' : '?'
    return `${base}${sep}cliente=${id}`
  }

  // ─── Cargas ─────────────────────────────────────────────────────────────────
  const cargarUbicaciones = () =>
    api.get('/infraestructura/ubicaciones/?page_size=100')
      .then(r => setUbicaciones(r.data.results || r.data))
      .catch(console.error)

  const cargarProductos = () => {
    setLoading(true)
    api.get(withClienteParam('/inventario/productos/'))
      .then(r => setProductos(r.data.results || r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const cargarInventarios = () => {
    setLoading(true)
    api.get(withClienteParam('/inventario/inventarios/'))
      .then(r => setInventarios(r.data.results || r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const cargarMovimientos = () => {
    setLoading(true)
    api.get(withClienteParam('/inventario/movimientos/'))
      .then(r => setMovimientos(r.data.results || r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const refrescarTodo = () => {
    cargarProductos()
    if (tab === 'movimientos') cargarMovimientos()
    if (tab === 'stock')       cargarInventarios()
    if (!esCliente) cargarUbicaciones()
  }

  // ─── Solo admin/empleado pueden escribir ────────────────────────────────────
  const puedeEscribir = esAdmin || esEmpleado

  const ubicacionesDisponibles = ubicaciones.filter(u => !u.llena && (u.disponible ?? u.capacidad) > 0)

  const toggleServicio = (svc) => {
    setServiciosSeleccionados(prev => {
      if (prev[svc.id] !== undefined) { const next = { ...prev }; delete next[svc.id]; return next }
      return { ...prev, [svc.id]: String(svc.tarifa) }
    })
  }
  const setValorServicio = (id, valor) =>
    setServiciosSeleccionados(prev => ({ ...prev, [id]: valor }))
  const serviciosElegidos = Object.keys(serviciosSeleccionados)
  const totalCargos = serviciosElegidos.reduce((acc, id) => acc + (parseFloat(serviciosSeleccionados[id]) || 0), 0)
  const buildCargos = () => serviciosElegidos.map(id => ({ catalogo_id: id, valor_unitario: serviciosSeleccionados[id] }))

  const abrirNuevoProducto = () => {
    setEditando(null)
    setFormProducto({ cliente: filtroCliente || '', nombre: '', descripcion: '' })
    setFormUbicacion({ ubicacion: '' }); setError(''); setShowForm(true)
  }
  const abrirEditarProducto = (p) => {
    setEditando(p)
    setFormProducto({ cliente: p.cliente, nombre: p.nombre, descripcion: p.descripcion || '' })
    setError(''); setShowForm(true)
  }
  const guardarProducto = async () => {
    if (!formProducto.cliente || !formProducto.nombre) { setError('Cliente y nombre son obligatorios.'); return }
    if (!editando && !formUbicacion.ubicacion) { setError('Debes asignar una ubicación.'); return }
    setGuardando(true); setError('')
    try {
      if (editando) await api.put(`/inventario/productos/${editando.id}/`, formProducto)
      else await api.post('/inventario/productos/', { ...formProducto, ubicacion: formUbicacion.ubicacion })
      setShowForm(false); cargarProductos(); cargarUbicaciones()
    } catch (e) { setError(e.response?.data?.error || JSON.stringify(e.response?.data) || 'Error al guardar.') }
    finally { setGuardando(false) }
  }
  const eliminarProducto = async (id) => {
    if (!window.confirm('¿Eliminar este producto?')) return
    await api.delete(`/inventario/productos/${id}/`)
    cargarProductos(); cargarUbicaciones()
  }

  const abrirEntrada = (productoId = '') => {
    setModoEntrada('existente')
    setFormMov({ producto: productoId, cantidad: '', observacion: '' })
    setFormNuevo({ cliente: filtroCliente || '', nombre: '', descripcion: '', ubicacion: '', cantidad: '', observacion: '' })
    setServiciosSeleccionados({}); setError(''); setShowMovForm(true)
  }

  const guardarEntradaExistente = async () => {
    if (!formMov.producto) { setError('Selecciona un producto.'); return }
    if (!formMov.cantidad || parseInt(formMov.cantidad) <= 0) { setError('La cantidad debe ser mayor a 0.'); return }
    setGuardando(true); setError('')
    try {
      const body = { producto: formMov.producto, tipo: 'entrada', cantidad: parseInt(formMov.cantidad), observacion: formMov.observacion }
      const cargos = buildCargos()
      if (cargos.length) body.cargos_servicios = cargos
      await api.post('/inventario/movimientos/', body)
      setShowMovForm(false); refrescarTodo()
    } catch (e) { setError(e.response?.data?.error || 'Error al registrar.') }
    finally { setGuardando(false) }
  }

  const guardarEntradaNuevo = async () => {
    if (!formNuevo.cliente)   { setError('Selecciona el cliente.'); return }
    if (!formNuevo.nombre)    { setError('El nombre del producto es obligatorio.'); return }
    if (!formNuevo.ubicacion) { setError('Selecciona una ubicación.'); return }
    if (!formNuevo.cantidad || parseInt(formNuevo.cantidad) <= 0) { setError('La cantidad debe ser mayor a 0.'); return }
    setGuardando(true); setError('')
    try {
      const body = {
        tipo: 'entrada', cantidad: parseInt(formNuevo.cantidad), observacion: formNuevo.observacion,
        producto_nuevo: { nombre: formNuevo.nombre, cliente: formNuevo.cliente, descripcion: formNuevo.descripcion, ubicacion: formNuevo.ubicacion },
      }
      const cargos = buildCargos()
      if (cargos.length) body.cargos_servicios = cargos
      await api.post('/inventario/movimientos/', body)
      setShowMovForm(false); refrescarTodo()
    } catch (e) { setError(e.response?.data?.error || JSON.stringify(e.response?.data) || 'Error al registrar.') }
    finally { setGuardando(false) }
  }

  const getNombreCliente = (id) => clientes.find(c => c.id === id)?.nombre || '—'
  const formatCOP = (v) => Number(v).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })
  const avatarColor = (nombre) => {
    const colors = [
      { bg: '#dbeafe', text: '#1d4ed8' }, { bg: '#dcfce7', text: '#15803d' },
      { bg: '#fce7f3', text: '#be185d' }, { bg: '#ede9fe', text: '#6d28d9' },
      { bg: '#ffedd5', text: '#c2410c' }, { bg: '#cffafe', text: '#0e7490' },
    ]
    return colors[nombre.charCodeAt(0) % colors.length]
  }

  const tabConfig = [
    { key: 'productos',    label: 'Productos',   icon: '📦', count: productos.length },
    { key: 'stock',        label: 'Stock actual', icon: '📊', count: inventarios.length },
    { key: 'movimientos',  label: 'Movimientos',  icon: '🔄', count: movimientos.length },
  ]

  const inp = { width:'100%', padding:'10px 13px', background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:'9px', color:'#0f172a', fontSize:'13px', fontFamily:"'Plus Jakarta Sans',sans-serif", boxSizing:'border-box', outline:'none', transition:'border-color 0.15s, box-shadow 0.15s' }
  const lbl = { color:'#374151', fontSize:'11px', fontWeight:'700', display:'block', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.07em' }

  // ─── Columnas según rol ──────────────────────────────────────────────────────
  // Cliente NUNCA ve columna "Cliente" ni columna "Acciones"
  const colsProductos   = puedeEscribir ? ['Producto','Cliente','Descripción','Acciones'] : ['Producto','Descripción']
  const colsStock       = puedeEscribir ? ['Producto','Cliente','Ubicación','Cantidad','Estado','Acciones'] : ['Producto','Ubicación','Cantidad','Estado']
  const colsMovimientos = puedeEscribir ? ['Tipo','Producto','Cliente','Cantidad','Detalle','Observación','Fecha'] : ['Tipo','Producto','Cantidad','Detalle','Observación','Fecha']

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        .inv-root * { box-sizing: border-box; }
        .inv-root { font-family: 'Plus Jakarta Sans', sans-serif; color: #0f172a; }
        .inv-tbody tr { transition: background 0.12s; }
        .inv-tbody tr:hover td { background: #f0f7ff !important; }
        .inv-inp:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.1) !important; }
        .tab-pill { display:flex; align-items:center; gap:8px; padding:9px 18px; border-radius:10px; font-size:13px; font-weight:600; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; border:1.5px solid transparent; transition:all 0.15s; }
        .tab-pill.on  { background:#0f172a; color:#fff; box-shadow:0 2px 8px rgba(15,23,42,0.2); }
        .tab-pill.off { background:#fff; color:#64748b; border-color:#e2e8f0; }
        .tab-pill.off:hover { background:#f8fafc; border-color:#cbd5e1; color:#0f172a; }
        .th-inv { padding:12px 18px; text-align:left; color:#94a3b8; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.09em; background:#fafbfc; border-bottom:2px solid #f1f5f9; white-space:nowrap; }
        .act-btn { border:1px solid; padding:5px 12px; border-radius:7px; font-size:11px; font-weight:600; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; transition:all 0.15s; }
        .modo-btn { flex:1; padding:11px 16px; border-radius:10px; font-size:13px; font-weight:600; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; border:1.5px solid; transition:all 0.15s; text-align:center; }
        .modo-on  { background:#0f172a; color:#fff; border-color:#0f172a; box-shadow:0 2px 8px rgba(15,23,42,0.2); }
        .modo-off { background:#fff; color:#64748b; border-color:#e2e8f0; }
        .modo-off:hover { background:#f8fafc; border-color:#cbd5e1; }
        .svc-card { border:1.5px solid #e2e8f0; border-radius:11px; padding:12px 16px; cursor:pointer; transition:all 0.15s; background:#fff; }
        .svc-card:hover { border-color:#93c5fd; background:#f8fbff; box-shadow:0 2px 8px rgba(59,130,246,0.08); }
        .svc-card.on { border-color:#3b82f6; background:#eff6ff; box-shadow:0 2px 12px rgba(59,130,246,0.12); }
        .modal-bd { position:fixed; inset:0; background:rgba(15,23,42,0.6); display:flex; align-items:center; justify-content:center; z-index:1000; backdrop-filter:blur(4px); animation:bdIn 0.2s ease; }
        @keyframes bdIn { from{opacity:0} to{opacity:1} }
        .modal-box { background:#fff; border-radius:20px; box-shadow:0 32px 80px rgba(15,23,42,0.25); max-height:92vh; display:flex; flex-direction:column; animation:boxIn 0.25s cubic-bezier(.4,0,.2,1); }
        @keyframes boxIn { from{opacity:0;transform:scale(0.95) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .fade-in { animation:fadeIn 0.25s ease; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>

      <div className="inv-root">

        {/* ══ HEADER ══ */}
        <div style={{ background:'linear-gradient(135deg, #0f172a 0%, #1a3a5c 100%)', borderRadius:'16px', padding:'26px 30px', marginBottom:'22px', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:'-50px', right:'-50px', width:'200px', height:'200px', borderRadius:'50%', background:'rgba(16,185,129,0.1)', filter:'blur(50px)' }} />
          <div style={{ position:'absolute', bottom:'-30px', left:'20%', width:'150px', height:'150px', borderRadius:'50%', background:'rgba(59,130,246,0.08)', filter:'blur(35px)' }} />

          <div style={{ position:'relative', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'16px' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' }}>
                <div style={{ width:'36px', height:'36px', background:'rgba(16,185,129,0.2)', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', border:'1px solid rgba(16,185,129,0.3)' }}>📦</div>
                <div>
                  <p style={{ color:'rgba(255,255,255,0.45)', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.12em', margin:0 }}>
                    {esCliente ? 'Mi inventario' : 'Módulo'}
                  </p>
                  <h1 style={{ color:'#fff', fontSize:'22px', fontWeight:'800', margin:0, letterSpacing:'-0.02em' }}>
                    Control de Inventario
                  </h1>
                </div>
              </div>
              <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'12px', margin:0 }}>
                {esCliente
                  ? 'Consulta tus productos, stock y movimientos'
                  : 'Productos · Stock · Movimientos de entrada y salida'
                }
              </p>
            </div>

            {/* KPIs */}
            <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
              {[
                { label:'Productos',    value: productos.length,                          color:'#34d399' },
                { label:'En stock',     value: inventarios.filter(i=>i.cantidad>0).length, color:'#60a5fa' },
                { label:'Movimientos',  value: movimientos.length,                        color:'#a78bfa' },
              ].map(k => (
                <div key={k.label} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', padding:'10px 16px', textAlign:'center', minWidth:'76px', backdropFilter:'blur(10px)' }}>
                  <p style={{ color:k.color, fontSize:'20px', fontWeight:'800', margin:'0 0 2px', fontFamily:"'DM Mono',monospace", letterSpacing:'-0.03em' }}>{k.value}</p>
                  <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'10px', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.08em', margin:0 }}>{k.label}</p>
                </div>
              ))}
            </div>

            {puedeEscribir && (
              <div style={{ display:'flex', gap:'8px' }}>
                {tab === 'productos' && (
                  <button onClick={abrirNuevoProducto}
                    style={{ background:'rgba(255,255,255,0.1)', color:'#fff', border:'1px solid rgba(255,255,255,0.2)', padding:'10px 18px', borderRadius:'10px', fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:'600', fontSize:'13px', cursor:'pointer', transition:'all 0.15s', backdropFilter:'blur(10px)' }}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.18)'}
                    onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'}
                  >+ Producto</button>
                )}
                <button onClick={() => abrirEntrada()}
                  style={{ background:'#10b981', color:'#fff', border:'none', padding:'10px 20px', borderRadius:'10px', fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:'700', fontSize:'13px', cursor:'pointer', boxShadow:'0 4px 14px rgba(16,185,129,0.4)', transition:'all 0.15s', display:'flex', alignItems:'center', gap:'7px' }}
                  onMouseEnter={e => { e.currentTarget.style.background='#059669'; e.currentTarget.style.transform='translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.background='#10b981'; e.currentTarget.style.transform='translateY(0)' }}
                >↑ Registrar entrada</button>
              </div>
            )}
          </div>
        </div>

        {puedeEscribir && (
          <div style={{ background:'linear-gradient(90deg, #eff6ff, #f0fdf4)', border:'1px solid #bfdbfe', borderRadius:'10px', padding:'11px 18px', marginBottom:'18px', display:'flex', gap:'10px', alignItems:'center' }}>
            <span style={{fontSize:'16px'}}>ℹ️</span>
            <p style={{ color:'#1d4ed8', fontSize:'12px', margin:0, fontWeight:'500' }}>
              Las <strong>entradas</strong> se registran aquí y generan cargos en <strong>Servicios</strong> pendientes de facturar.
              Las <strong>salidas</strong> se generan al despachar desde <strong>Envíos</strong>.
            </p>
          </div>
        )}

        {/* ══ TABS ══ */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'18px', alignItems:'center', flexWrap:'wrap' }}>
          {tabConfig.map(t => (
            <button key={t.key} className={`tab-pill ${tab===t.key?'on':'off'}`} onClick={() => setTab(t.key)}>
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {t.count > 0 && (
                <span style={{ background: tab===t.key ? 'rgba(255,255,255,0.2)' : '#f1f5f9', color: tab===t.key ? '#fff' : '#64748b', borderRadius:'20px', padding:'1px 8px', fontSize:'11px', fontWeight:'700', fontFamily:"'DM Mono',monospace" }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}

          {/* Filtro por cliente: SOLO admin/empleado */}
          {!esCliente && (
            <div style={{ marginLeft:'auto' }}>
              <select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)}
                style={{ ...inp, width:'220px', padding:'8px 12px', fontSize:'12px' }}>
                <option value="">Todos los clientes</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* ══ CONTENIDO TABS ══ */}
        <div style={{ background:'#fff', borderRadius:'14px', border:'1px solid #e8edf5', overflow:'hidden', boxShadow:'0 1px 8px rgba(15,23,42,0.06)' }}>

          {loading ? (
            <div style={{ padding:'72px', textAlign:'center' }}>
              <div style={{ display:'inline-block', width:'32px', height:'32px', border:'3px solid #e2e8f0', borderTopColor:'#10b981', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
              <p style={{ color:'#94a3b8', fontSize:'13px', margin:'14px 0 0', animation:'pulse 1.5s ease infinite' }}>Cargando datos...</p>
            </div>
          ) : (
            <>
              {/* TAB: PRODUCTOS */}
              {tab === 'productos' && (
                productos.length === 0 ? (
                  <div style={{ padding:'72px', textAlign:'center' }}>
                    <div style={{ width:'64px', height:'64px', background:'#f1f5f9', borderRadius:'16px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px', margin:'0 auto 16px' }}>📦</div>
                    <p style={{ color:'#0f172a', fontSize:'15px', fontWeight:'700', margin:'0 0 6px' }}>Sin productos registrados</p>
                    <p style={{ color:'#94a3b8', fontSize:'13px', margin:'0 0 20px' }}>
                      {esCliente ? 'Aún no tienes productos en el sistema.' : 'Crea el primer producto con el botón de arriba.'}
                    </p>
                    {puedeEscribir && (
                      <button onClick={abrirNuevoProducto} style={{ background:'#0f172a', color:'#fff', border:'none', padding:'10px 22px', borderRadius:'9px', fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:'700', fontSize:'13px', cursor:'pointer' }}>+ Crear producto</button>
                    )}
                  </div>
                ) : (
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr>{colsProductos.map(h => <th key={h} className="th-inv">{h}</th>)}</tr>
                    </thead>
                    <tbody className="inv-tbody fade-in">
                      {productos.map((p,i) => {
                        const av = avatarColor(p.nombre)
                        const td = { padding:'13px 18px', borderBottom: i<productos.length-1?'1px solid #f8fafc':'none', verticalAlign:'middle', background:'#fff', transition:'background 0.12s' }
                        return (
                          <tr key={p.id}>
                            <td style={td}>
                              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                                <div style={{ width:'34px', height:'34px', borderRadius:'9px', background:av.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                  <span style={{ fontSize:'13px', fontWeight:'800', color:av.text }}>{p.nombre.charAt(0).toUpperCase()}</span>
                                </div>
                                <p style={{ color:'#0f172a', fontSize:'13px', fontWeight:'700', margin:0 }}>{p.nombre}</p>
                              </div>
                            </td>
                            {/* Columna cliente: SOLO admin/empleado */}
                            {puedeEscribir && (
                              <td style={{ ...td, color:'#475569', fontSize:'13px' }}>{getNombreCliente(p.cliente)}</td>
                            )}
                            <td style={{ ...td, color:'#94a3b8', fontSize:'12px' }}>{p.descripcion || <span style={{color:'#cbd5e1'}}>—</span>}</td>
                            {/* Acciones: SOLO admin/empleado */}
                            {puedeEscribir && (
                              <td style={td}>
                                <div style={{ display:'flex', gap:'5px' }}>
                                  <button className="act-btn" onClick={() => abrirEntrada(p.id)}
                                    style={{ background:'#ecfdf5', color:'#059669', borderColor:'#a7f3d0' }}
                                    onMouseEnter={e=>{e.currentTarget.style.background='#059669';e.currentTarget.style.color='#fff'}}
                                    onMouseLeave={e=>{e.currentTarget.style.background='#ecfdf5';e.currentTarget.style.color='#059669'}}>↑ Entrada</button>
                                  <button className="act-btn" onClick={() => abrirEditarProducto(p)}
                                    style={{ background:'#eff6ff', color:'#3b82f6', borderColor:'#bfdbfe' }}
                                    onMouseEnter={e=>{e.currentTarget.style.background='#3b82f6';e.currentTarget.style.color='#fff'}}
                                    onMouseLeave={e=>{e.currentTarget.style.background='#eff6ff';e.currentTarget.style.color='#3b82f6'}}>Editar</button>
                                  <button className="act-btn" onClick={() => eliminarProducto(p.id)}
                                    style={{ background:'#fef2f2', color:'#ef4444', borderColor:'#fecaca' }}
                                    onMouseEnter={e=>{e.currentTarget.style.background='#ef4444';e.currentTarget.style.color='#fff'}}
                                    onMouseLeave={e=>{e.currentTarget.style.background='#fef2f2';e.currentTarget.style.color='#ef4444'}}>Eliminar</button>
                                </div>
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )
              )}

              {/* TAB: STOCK */}
              {tab === 'stock' && (
                inventarios.length === 0 ? (
                  <div style={{ padding:'72px', textAlign:'center' }}>
                    <div style={{ width:'64px', height:'64px', background:'#f1f5f9', borderRadius:'16px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px', margin:'0 auto 16px' }}>📊</div>
                    <p style={{ color:'#0f172a', fontSize:'15px', fontWeight:'700', margin:'0 0 6px' }}>Sin registros de stock</p>
                    <p style={{ color:'#94a3b8', fontSize:'13px', margin:0 }}>
                      {esCliente ? 'Aún no tienes stock registrado.' : 'Registra una entrada para ver el stock aquí.'}
                    </p>
                  </div>
                ) : (
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr>{colsStock.map(h => <th key={h} className="th-inv">{h}</th>)}</tr>
                    </thead>
                    <tbody className="inv-tbody fade-in">
                      {inventarios.map((inv,i) => {
                        const sinStock  = inv.cantidad === 0
                        const stockBajo = inv.cantidad > 0 && inv.cantidad < 10
                        const td = { padding:'13px 18px', borderBottom: i<inventarios.length-1?'1px solid #f8fafc':'none', verticalAlign:'middle', background:'#fff', transition:'background 0.12s' }
                        return (
                          <tr key={inv.id}>
                            <td style={td}><p style={{ color:'#0f172a', fontSize:'13px', fontWeight:'700', margin:0 }}>{inv.producto_nombre}</p></td>
                            {/* Columna cliente: SOLO admin/empleado */}
                            {puedeEscribir && <td style={{ ...td, color:'#475569', fontSize:'13px' }}>{inv.cliente_nombre}</td>}
                            <td style={td}>
                              <span style={{ background:'#eff6ff', color:'#3b82f6', border:'1px solid #bfdbfe', padding:'3px 10px', borderRadius:'6px', fontSize:'11px', fontWeight:'700', fontFamily:"'DM Mono',monospace" }}>
                                {inv.ubicacion_codigo}
                              </span>
                            </td>
                            <td style={{ ...td, fontFamily:"'DM Mono',monospace", fontSize:'20px', fontWeight:'800', color: sinStock?'#ef4444':stockBajo?'#f59e0b':'#10b981' }}>
                              {inv.cantidad}
                            </td>
                            <td style={td}>
                              <span style={{ display:'inline-flex', alignItems:'center', gap:'5px', padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'700', textTransform:'uppercase',
                                background: sinStock?'#fef2f2':stockBajo?'#fffbeb':'#dcfce7',
                                color: sinStock?'#ef4444':stockBajo?'#d97706':'#15803d',
                                border: `1px solid ${sinStock?'#fecaca':stockBajo?'#fde68a':'#bbf7d0'}`,
                              }}>
                                <span style={{ width:'5px', height:'5px', borderRadius:'50%', background: sinStock?'#ef4444':stockBajo?'#f59e0b':'#22c55e', display:'inline-block' }} />
                                {sinStock?'Sin stock':stockBajo?'Stock bajo':'Disponible'}
                              </span>
                            </td>
                            {/* Acciones: SOLO admin/empleado */}
                            {puedeEscribir && (
                              <td style={td}>
                                <button className="act-btn" onClick={() => abrirEntrada(inv.producto)}
                                  style={{ background:'#ecfdf5', color:'#059669', borderColor:'#a7f3d0' }}
                                  onMouseEnter={e=>{e.currentTarget.style.background='#059669';e.currentTarget.style.color='#fff'}}
                                  onMouseLeave={e=>{e.currentTarget.style.background='#ecfdf5';e.currentTarget.style.color='#059669'}}>↑ Entrada</button>
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )
              )}

              {/* TAB: MOVIMIENTOS */}
              {tab === 'movimientos' && (
                movimientos.length === 0 ? (
                  <div style={{ padding:'72px', textAlign:'center' }}>
                    <div style={{ width:'64px', height:'64px', background:'#f1f5f9', borderRadius:'16px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px', margin:'0 auto 16px' }}>🔄</div>
                    <p style={{ color:'#0f172a', fontSize:'15px', fontWeight:'700', margin:'0 0 6px' }}>Sin movimientos</p>
                    <p style={{ color:'#94a3b8', fontSize:'13px', margin:0 }}>
                      {esCliente ? 'Aún no hay movimientos de tus productos.' : 'Los movimientos aparecerán aquí al registrar entradas o despachar envíos.'}
                    </p>
                  </div>
                ) : (
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr>{colsMovimientos.map(h => <th key={h} className="th-inv">{h}</th>)}</tr>
                    </thead>
                    <tbody className="inv-tbody fade-in">
                      {movimientos.map((m,i) => {
                        const td = { padding:'13px 18px', borderBottom: i<movimientos.length-1?'1px solid #f8fafc':'none', verticalAlign:'middle', background:'#fff', transition:'background 0.12s' }
                        const esEntrada = m.tipo === 'entrada'
                        return (
                          <tr key={m.id}>
                            <td style={td}>
                              <span style={{ display:'inline-flex', alignItems:'center', gap:'5px', padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'700', textTransform:'uppercase',
                                background: esEntrada?'#dcfce7':'#fef2f2',
                                color: esEntrada?'#15803d':'#ef4444',
                                border: `1px solid ${esEntrada?'#bbf7d0':'#fecaca'}`,
                              }}>
                                {esEntrada ? '↑ Entrada' : '↓ Salida'}
                              </span>
                            </td>
                            <td style={td}><p style={{ color:'#0f172a', fontSize:'13px', fontWeight:'700', margin:0 }}>{m.producto_nombre}</p></td>
                            {/* Columna cliente: SOLO admin/empleado */}
                            {puedeEscribir && (
                              <td style={{ ...td, color:'#475569', fontSize:'13px' }}>{m.cliente_nombre || '—'}</td>
                            )}
                            <td style={{ ...td, fontFamily:"'DM Mono',monospace", fontSize:'16px', fontWeight:'800', color: esEntrada?'#10b981':'#ef4444' }}>
                              {esEntrada?'+':'-'}{m.cantidad}
                            </td>
                            <td style={td}>
                              {esEntrada
                                ? <span style={{ color:'#10b981', fontWeight:'600', fontSize:'12px' }}>📦 Recepción en bodega</span>
                                : <div>
                                    <p style={{ color:'#475569', margin:'0 0 2px', fontWeight:'600', fontSize:'12px' }}>🚚 {m.transportador_nombre||'Sin transportador'}</p>
                                    <p style={{ color:'#94a3b8', margin:'0 0 2px', fontSize:'11px' }}>📍 {m.destino||'Sin destino'}</p>
                                    {m.numero_orden && <p style={{ color:'#cbd5e1', margin:0, fontSize:'10px', fontFamily:"'DM Mono',monospace" }}>Orden: {m.numero_orden}</p>}
                                  </div>
                              }
                            </td>
                            <td style={{ ...td, color:'#94a3b8', fontSize:'12px' }}>{m.observacion||<span style={{color:'#cbd5e1'}}>—</span>}</td>
                            <td style={{ ...td, fontFamily:"'DM Mono',monospace", color:'#64748b', fontSize:'12px' }}>
                              {new Date(m.fecha_creacion).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'})}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )
              )}
            </>
          )}
        </div>

        {/* ══ MODALES: solo para admin/empleado ══ */}
        {puedeEscribir && showForm && (
          <div className="modal-bd" onClick={e => { if(e.target===e.currentTarget) setShowForm(false) }}>
            <div className="modal-box" style={{ width:'500px' }}>
              <div style={{ background:'linear-gradient(135deg,#0f172a,#1a3a5c)', borderRadius:'20px 20px 0 0', padding:'24px 28px', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:'-20px', right:'-20px', width:'100px', height:'100px', borderRadius:'50%', background:'rgba(16,185,129,0.15)', filter:'blur(25px)' }} />
                <div style={{ position:'relative', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.12em', margin:'0 0 5px' }}>{editando?'Editar':'Nuevo'} registro</p>
                    <h2 style={{ color:'#fff', fontSize:'19px', fontWeight:'800', margin:0, letterSpacing:'-0.02em' }}>{editando?editando.nombre:'Crear producto'}</h2>
                  </div>
                  <button onClick={() => setShowForm(false)} style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'9px', width:'32px', height:'32px', cursor:'pointer', color:'rgba(255,255,255,0.7)', fontSize:'16px', fontWeight:'700', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                </div>
              </div>
              <div style={{ padding:'26px 28px' }}>
                {error && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#ef4444', padding:'10px 14px', borderRadius:'9px', marginBottom:'18px', fontSize:'12px', fontWeight:'600', display:'flex', gap:'6px' }}>⚠ {error}</div>}
                <div style={{ marginBottom:'15px' }}>
                  <label style={lbl}>Cliente *</label>
                  <select className="inv-inp" value={formProducto.cliente} onChange={e => setFormProducto({...formProducto,cliente:e.target.value})} style={inp}>
                    <option value="">Seleccionar cliente</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom:'15px' }}>
                  <label style={lbl}>Nombre del producto *</label>
                  <input className="inv-inp" value={formProducto.nombre} onChange={e => setFormProducto({...formProducto,nombre:e.target.value})} placeholder="Ej: Caja de tornillos M8" style={inp} />
                </div>
                <div style={{ marginBottom:'15px' }}>
                  <label style={lbl}>Descripción</label>
                  <textarea className="inv-inp" value={formProducto.descripcion} onChange={e => setFormProducto({...formProducto,descripcion:e.target.value})} placeholder="Descripción opcional..." style={{ ...inp, minHeight:'64px', resize:'vertical' }} />
                </div>
                {!editando && (
                  <div style={{ marginBottom:'22px' }}>
                    <label style={lbl}>Ubicación en bodega *</label>
                    {ubicacionesDisponibles.length===0
                      ? <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#ef4444', padding:'10px', borderRadius:'9px', fontSize:'12px' }}>⚠ No hay ubicaciones disponibles.</div>
                      : <select className="inv-inp" value={formUbicacion.ubicacion} onChange={e => setFormUbicacion({ubicacion:e.target.value})} style={inp}>
                          <option value="">Seleccionar ubicación</option>
                          {ubicacionesDisponibles.map(u => <option key={u.id} value={u.id}>{u.codigo} — {u.bodega_nombre} — Disp: {u.disponible??u.capacidad}</option>)}
                        </select>
                    }
                  </div>
                )}
                <div style={{ height:'1px', background:'#f1f5f9', marginBottom:'20px' }} />
                <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
                  <button onClick={() => setShowForm(false)} style={{ background:'#fff', color:'#64748b', border:'1.5px solid #e2e8f0', padding:'10px 20px', borderRadius:'9px', cursor:'pointer', fontSize:'13px', fontWeight:'600', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Cancelar</button>
                  <button onClick={guardarProducto} disabled={guardando} style={{ background:'#0f172a', color:'#fff', border:'none', padding:'10px 22px', borderRadius:'9px', cursor:'pointer', fontSize:'13px', fontWeight:'700', fontFamily:"'Plus Jakarta Sans',sans-serif", opacity:guardando?0.7:1, display:'flex', alignItems:'center', gap:'7px' }}>
                    {guardando && <span style={{ display:'inline-block', width:'12px', height:'12px', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />}
                    {guardando?'Guardando...':editando?'Guardar cambios':'Crear producto'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {puedeEscribir && showMovForm && (
          <div className="modal-bd" onClick={e => { if(e.target===e.currentTarget) setShowMovForm(false) }}>
            <div className="modal-box" style={{ width:'600px' }}>
              <div style={{ background:'linear-gradient(135deg,#0f172a,#064e3b)', borderRadius:'20px 20px 0 0', padding:'24px 28px', position:'relative', overflow:'hidden', flexShrink:0 }}>
                <div style={{ position:'absolute', top:'-20px', right:'-20px', width:'120px', height:'120px', borderRadius:'50%', background:'rgba(16,185,129,0.2)', filter:'blur(30px)' }} />
                <div style={{ position:'relative', display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'16px' }}>
                  <div>
                    <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.12em', margin:'0 0 5px' }}>Recepción de mercancía</p>
                    <h2 style={{ color:'#fff', fontSize:'19px', fontWeight:'800', margin:0, letterSpacing:'-0.02em' }}>Registrar entrada</h2>
                  </div>
                  <button onClick={() => setShowMovForm(false)} style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'9px', width:'32px', height:'32px', cursor:'pointer', color:'rgba(255,255,255,0.7)', fontSize:'16px', fontWeight:'700', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                </div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button className={`modo-btn ${modoEntrada==='existente'?'modo-on':'modo-off'}`} onClick={() => { setModoEntrada('existente'); setError('') }}>📦 Producto existente</button>
                  <button className={`modo-btn ${modoEntrada==='nuevo'?'modo-on':'modo-off'}`} onClick={() => { setModoEntrada('nuevo'); setError('') }}>✨ Producto nuevo</button>
                </div>
              </div>
              <div style={{ padding:'22px 28px', overflowY:'auto', flex:1 }}>
                {error && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#ef4444', padding:'10px 14px', borderRadius:'9px', marginBottom:'16px', fontSize:'12px', fontWeight:'600', display:'flex', gap:'6px' }}>⚠ {error}</div>}
                {modoEntrada === 'existente' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:'14px', marginBottom:'22px' }}>
                    <div>
                      <label style={lbl}>Producto *</label>
                      <select className="inv-inp" value={formMov.producto} onChange={e => setFormMov({...formMov,producto:e.target.value})} style={inp}>
                        <option value="">Seleccionar producto</option>
                        {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} — {getNombreCliente(p.cliente)}</option>)}
                      </select>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                      <div>
                        <label style={lbl}>Cantidad *</label>
                        <input className="inv-inp" type="number" min="1" value={formMov.cantidad} onChange={e => setFormMov({...formMov,cantidad:e.target.value})} placeholder="0" style={inp} />
                      </div>
                      <div>
                        <label style={lbl}>Observación</label>
                        <input className="inv-inp" value={formMov.observacion} onChange={e => setFormMov({...formMov,observacion:e.target.value})} placeholder="Ej: Pedido #123" style={inp} />
                      </div>
                    </div>
                  </div>
                )}
                {modoEntrada === 'nuevo' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:'14px', marginBottom:'22px' }}>
                    <div style={{ background:'#fefce8', border:'1px solid #fde68a', borderRadius:'10px', padding:'10px 14px', display:'flex', gap:'8px', alignItems:'center' }}>
                      <span>✨</span>
                      <p style={{ color:'#92400e', fontSize:'12px', fontWeight:'600', margin:0 }}>Crea el producto, asígnale ubicación y registra la entrada en un solo paso.</p>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                      <div>
                        <label style={lbl}>Cliente *</label>
                        <select className="inv-inp" value={formNuevo.cliente} onChange={e => setFormNuevo({...formNuevo,cliente:e.target.value})} style={inp}>
                          <option value="">Seleccionar</option>
                          {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={lbl}>Nombre del producto *</label>
                        <input className="inv-inp" value={formNuevo.nombre} onChange={e => setFormNuevo({...formNuevo,nombre:e.target.value})} placeholder="Ej: Caja tornillos M8" style={inp} />
                      </div>
                    </div>
                    <div>
                      <label style={lbl}>Descripción</label>
                      <input className="inv-inp" value={formNuevo.descripcion} onChange={e => setFormNuevo({...formNuevo,descripcion:e.target.value})} placeholder="Opcional" style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>Ubicación en bodega *</label>
                      {ubicacionesDisponibles.length===0
                        ? <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#ef4444', padding:'10px', borderRadius:'9px', fontSize:'12px' }}>⚠ No hay ubicaciones disponibles.</div>
                        : <select className="inv-inp" value={formNuevo.ubicacion} onChange={e => setFormNuevo({...formNuevo,ubicacion:e.target.value})} style={inp}>
                            <option value="">Seleccionar</option>
                            {ubicacionesDisponibles.map(u => <option key={u.id} value={u.id}>{u.codigo} — {u.bodega_nombre} — Disp: {u.disponible??u.capacidad}</option>)}
                          </select>
                      }
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                      <div>
                        <label style={lbl}>Cantidad *</label>
                        <input className="inv-inp" type="number" min="1" value={formNuevo.cantidad} onChange={e => setFormNuevo({...formNuevo,cantidad:e.target.value})} placeholder="0" style={inp} />
                      </div>
                      <div>
                        <label style={lbl}>Observación</label>
                        <input className="inv-inp" value={formNuevo.observacion} onChange={e => setFormNuevo({...formNuevo,observacion:e.target.value})} placeholder="Ej: Pedido #123" style={inp} />
                      </div>
                    </div>
                  </div>
                )}
                <div style={{ background:'#f8fafc', border:'1.5px solid #e2e8f0', borderRadius:'12px', padding:'18px 20px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
                    <div>
                      <p style={{ color:'#0f172a', fontSize:'13px', fontWeight:'700', margin:'0 0 2px' }}>⚡ Servicios prestados</p>
                      <p style={{ color:'#94a3b8', fontSize:'11px', margin:0 }}>Se registran como pendientes de facturar</p>
                    </div>
                    {serviciosElegidos.length > 0 && (
                      <span style={{ background:'#0f172a', color:'#fff', borderRadius:'20px', padding:'3px 12px', fontSize:'11px', fontWeight:'700' }}>
                        {serviciosElegidos.length} seleccionado{serviciosElegidos.length>1?'s':''}
                      </span>
                    )}
                  </div>
                  {catalogoServicios.length === 0
                    ? <p style={{ color:'#94a3b8', fontSize:'12px', margin:0 }}>No hay servicios en el catálogo.</p>
                    : (
                      <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                        {catalogoServicios.map(svc => {
                          const sel = serviciosSeleccionados[svc.id] !== undefined
                          return (
                            <div key={svc.id} className={`svc-card${sel?' on':''}`} onClick={() => toggleServicio(svc)}>
                              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                                  <div style={{ width:'20px', height:'20px', borderRadius:'6px', border:`2px solid ${sel?'#3b82f6':'#cbd5e1'}`, background:sel?'#3b82f6':'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s' }}>
                                    {sel && <span style={{ color:'#fff', fontSize:'11px', fontWeight:'700', lineHeight:1 }}>✓</span>}
                                  </div>
                                  <div>
                                    <p style={{ margin:0, fontSize:'13px', fontWeight:'600', color:sel?'#1d4ed8':'#0f172a' }}>{svc.nombre}</p>
                                    {svc.descripcion && <p style={{ margin:0, fontSize:'11px', color:'#94a3b8' }}>{svc.descripcion}</p>}
                                  </div>
                                </div>
                                <span style={{ fontSize:'12px', fontWeight:'700', color:sel?'#3b82f6':'#64748b', fontFamily:"'DM Mono',monospace", flexShrink:0 }}>{formatCOP(svc.tarifa)}</span>
                              </div>
                              {sel && (
                                <div style={{ marginTop:'10px', paddingTop:'10px', borderTop:'1px solid #bfdbfe' }} onClick={e => e.stopPropagation()}>
                                  <label style={{ ...lbl, color:'#1d4ed8', marginBottom:'5px' }}>Precio a cobrar</label>
                                  <div style={{ position:'relative' }}>
                                    <span style={{ position:'absolute', left:'11px', top:'50%', transform:'translateY(-50%)', color:'#94a3b8', fontSize:'13px', fontWeight:'600' }}>$</span>
                                    <input type="number" min="0" value={serviciosSeleccionados[svc.id]} onChange={e => setValorServicio(svc.id, e.target.value)} style={{ ...inp, paddingLeft:'26px', borderColor:'#bfdbfe' }} placeholder="0" />
                                  </div>
                                  {serviciosSeleccionados[svc.id] && parseFloat(serviciosSeleccionados[svc.id]) !== parseFloat(svc.tarifa) && (
                                    <p style={{ color:'#d97706', fontSize:'11px', margin:'4px 0 0', fontWeight:'600' }}>⚡ Precio ajustado · tarifa normal: {formatCOP(svc.tarifa)}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  }
                  {serviciosElegidos.length > 0 && (
                    <div style={{ marginTop:'16px', paddingTop:'14px', borderTop:'2px dashed #bfdbfe', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ color:'#64748b', fontSize:'12px', fontWeight:'600' }}>Total cargos esta entrada</span>
                      <span style={{ color:'#0f172a', fontSize:'18px', fontWeight:'800', fontFamily:"'DM Mono',monospace" }}>{formatCOP(totalCargos)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ padding:'14px 28px 22px', borderTop:'1px solid #f1f5f9', flexShrink:0, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  {serviciosElegidos.length > 0
                    ? <p style={{ color:'#10b981', fontSize:'12px', fontWeight:'700', margin:0 }}>✓ {serviciosElegidos.length} cargo{serviciosElegidos.length>1?'s':''} · {formatCOP(totalCargos)}</p>
                    : <p style={{ color:'#94a3b8', fontSize:'12px', margin:0 }}>Sin cargos de servicio</p>
                  }
                </div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button onClick={() => setShowMovForm(false)} style={{ background:'#fff', color:'#64748b', border:'1.5px solid #e2e8f0', padding:'10px 20px', borderRadius:'9px', cursor:'pointer', fontSize:'13px', fontWeight:'600', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Cancelar</button>
                  <button
                    onClick={modoEntrada==='existente'?guardarEntradaExistente:guardarEntradaNuevo}
                    disabled={guardando}
                    style={{ background:'#10b981', color:'#fff', border:'none', padding:'10px 22px', borderRadius:'9px', cursor:guardando?'not-allowed':'pointer', fontSize:'13px', fontWeight:'700', fontFamily:"'Plus Jakarta Sans',sans-serif", opacity:guardando?0.7:1, display:'flex', alignItems:'center', gap:'7px', boxShadow:'0 4px 12px rgba(16,185,129,0.3)' }}
                    onMouseEnter={e => { if(!guardando) e.currentTarget.style.background='#059669' }}
                    onMouseLeave={e => e.currentTarget.style.background='#10b981'}
                  >
                    {guardando && <span style={{ display:'inline-block', width:'12px', height:'12px', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />}
                    {guardando ? 'Registrando...' : modoEntrada==='nuevo' ? '✨ Crear y registrar' : '↑ Registrar entrada'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  )
}