import { useState, useEffect } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const UNIDADES = [
  { value: 'por_dia',       label: 'Por día',       icon: '📅', color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
  { value: 'por_recepcion', label: 'Por recepción', icon: '📦', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  { value: 'por_envio',     label: 'Por envío',     icon: '🚛', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  { value: 'unitario',      label: 'Unitario',      icon: '◆',  color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
]
const getUnidad = (v) => UNIDADES.find(u => u.value === v) || UNIDADES[3]

export default function Servicios() {
  const { esCliente, esAdmin, esEmpleado, clienteId } = useAuth()
  const puedeEscribir = esAdmin || esEmpleado

  const [tab, setTab] = useState('catalogo')
  const [catalogo, setCatalogo] = useState([])
  const [cargos, setCargos] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showFormCatalogo, setShowFormCatalogo] = useState(false)
  const [showFormCargo, setShowFormCargo] = useState(false)
  const [editando, setEditando] = useState(null)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  // cliente fijo para rol cliente, seleccionable para admin/empleado
  const [filtroCliente, setFiltroCliente] = useState(esCliente ? String(clienteId) : '')
  const [filtroFacturado, setFiltroFacturado] = useState('')
  const [formCatalogo, setFormCatalogo] = useState({ nombre: '', descripcion: '', tarifa: '', unidad: 'unitario', activo: true })
  const [cargoCliente, setCargoCliente] = useState(esCliente ? String(clienteId) : '')
  const [cargoFecha, setCargoFecha] = useState(new Date().toISOString().split('T')[0])
  const [cargoObservacion, setCargoObservacion] = useState('')
  const [seleccionados, setSeleccionados] = useState({})

  useEffect(() => {
    if (puedeEscribir) cargarTodosClientes()
    cargarCatalogo()
  }, [])

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

  useEffect(() => {
    if (tab === 'catalogo') cargarCatalogo()
    if (tab === 'cargos') cargarCargos()
  }, [tab, filtroCliente, filtroFacturado])

  useEffect(() => {
    const onFocus = () => { if (tab === 'cargos') cargarCargos() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [tab])

  const cargarCatalogo = () => {
    setLoading(true)
    api.get('/servicios/catalogo/').then(r => setCatalogo(r.data.results || r.data)).catch(console.error).finally(() => setLoading(false))
  }

  const cargarCargos = () => {
    setLoading(true)
    let url = '/servicios/prestados/?page_size=100&'
    if (filtroCliente) url += `cliente=${filtroCliente}&`
    if (filtroFacturado !== '') url += `facturado=${filtroFacturado}&`
    api.get(url).then(r => setCargos(r.data.results || r.data)).catch(console.error).finally(() => setLoading(false))
  }

  const abrirNuevo = () => { setEditando(null); setFormCatalogo({ nombre: '', descripcion: '', tarifa: '', unidad: 'unitario', activo: true }); setError(''); setShowFormCatalogo(true) }
  const abrirEditar = (s) => { setEditando(s); setFormCatalogo({ nombre: s.nombre, descripcion: s.descripcion || '', tarifa: s.tarifa, unidad: s.unidad, activo: s.activo }); setError(''); setShowFormCatalogo(true) }

  const guardarCatalogo = async () => {
    if (!formCatalogo.nombre || !formCatalogo.tarifa) { setError('Nombre y tarifa son obligatorios.'); return }
    setGuardando(true); setError('')
    try {
      if (editando) await api.put(`/servicios/catalogo/${editando.id}/`, formCatalogo)
      else await api.post('/servicios/catalogo/', formCatalogo)
      setShowFormCatalogo(false); cargarCatalogo()
    } catch { setError('Error al guardar el servicio.') }
    finally { setGuardando(false) }
  }

  const eliminarCatalogo = async (id) => {
    if (!window.confirm('¿Eliminar este servicio del catálogo?')) return
    await api.delete(`/servicios/catalogo/${id}/`); cargarCatalogo()
  }

  const toggleActivo = async (s) => {
    await api.patch(`/servicios/catalogo/${s.id}/`, { activo: !s.activo }); cargarCatalogo()
  }

  const abrirCargo = () => {
    setCargoCliente(esCliente ? String(clienteId) : '')
    setCargoFecha(new Date().toISOString().split('T')[0])
    setCargoObservacion(''); setSeleccionados({}); setError(''); setShowFormCargo(true)
  }

  const toggleServicio = (s) => {
    setSeleccionados(prev => {
      if (prev[s.id]) { const next = { ...prev }; delete next[s.id]; return next }
      return { ...prev, [s.id]: { cantidad: 1, valor_unitario: parseFloat(s.tarifa) } }
    })
  }

  const updateCampo = (id, field, value) => {
    setSeleccionados(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  const guardarCargo = async () => {
    if (!cargoCliente) { setError('Selecciona el cliente.'); return }
    const items = Object.entries(seleccionados)
    if (items.length === 0) { setError('Selecciona al menos un servicio.'); return }
    for (const [, v] of items) {
      if (!v.cantidad || parseFloat(v.cantidad) <= 0) { setError('Todas las cantidades deben ser mayores a 0.'); return }
      if (!v.valor_unitario || parseFloat(v.valor_unitario) <= 0) { setError('Todos los valores unitarios son obligatorios.'); return }
    }
    setGuardando(true); setError('')
    try {
      await Promise.all(items.map(([catalogo_servicio, v]) =>
        api.post('/servicios/prestados/', {
          cliente: cargoCliente, catalogo_servicio,
          cantidad: parseFloat(v.cantidad), valor_unitario: parseFloat(v.valor_unitario),
          fecha: cargoFecha, observacion: cargoObservacion,
        })
      ))
      setShowFormCargo(false)
      if (tab === 'cargos') cargarCargos()
    } catch (e) { setError(e.response?.data?.error || 'Error al registrar los cargos.') }
    finally { setGuardando(false) }
  }

  const totalPendiente = cargos.filter(c => !c.facturado).reduce((s, c) => s + parseFloat(c.valor_total || 0), 0)
  const nSeleccionados = Object.keys(seleccionados).length
  const totalPreview = Object.values(seleccionados).reduce((s, v) =>
    s + (parseFloat(v.cantidad) || 0) * (parseFloat(v.valor_unitario) || 0), 0)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
        :root {
          --ink:#0d1117; --ink2:#1c2433; --muted:#6b7a99; --faint:#94a3b8; --line:#e8ecf2; --surface:#f7f8fb; --white:#ffffff;
          --accent:#2563eb; --accent-soft:#eff4ff; --accent-border:#c7d6fd;
          --green:#059669; --green-soft:#ecfdf5; --green-border:#a7f3d0;
          --red:#dc2626; --red-soft:#fef2f2; --red-border:#fecaca;
          --amber:#d97706; --amber-soft:#fffbeb; --amber-border:#fde68a;
          --radius:10px; --shadow:0 1px 3px rgba(13,17,23,0.08),0 4px 16px rgba(13,17,23,0.04);
          --shadow-lg:0 8px 32px rgba(13,17,23,0.12),0 2px 8px rgba(13,17,23,0.06);
        }
        * { box-sizing:border-box; margin:0; padding:0; }
        .svc { font-family:'DM Sans',sans-serif; color:var(--ink); min-height:100vh; background:#f4f6fa; padding:32px; }
        .svc-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; }
        .svc-eyebrow { font-family:'JetBrains Mono',monospace; font-size:10px; font-weight:500; letter-spacing:0.18em; text-transform:uppercase; color:var(--accent); margin-bottom:6px; }
        .svc-title { font-family:'Syne',sans-serif; font-size:26px; font-weight:800; color:var(--ink); letter-spacing:-0.03em; line-height:1; margin-bottom:4px; }
        .svc-subtitle { font-size:13px; color:var(--faint); font-weight:400; }
        .svc-actions { display:flex; gap:8px; align-items:center; }
        .btn { font-family:'DM Sans',sans-serif; font-weight:600; font-size:13px; padding:9px 18px; border-radius:8px; border:none; cursor:pointer; transition:all 0.15s; white-space:nowrap; display:inline-flex; align-items:center; gap:6px; }
        .btn-primary { background:var(--ink); color:#fff; }
        .btn-primary:hover { background:var(--ink2); transform:translateY(-1px); box-shadow:0 4px 12px rgba(13,17,23,0.2); }
        .btn-success { background:var(--green); color:#fff; }
        .btn-success:hover { background:#047857; transform:translateY(-1px); box-shadow:0 4px 12px rgba(5,150,105,0.3); }
        .btn-ghost { background:var(--white); color:var(--muted); border:1.5px solid var(--line); }
        .btn-ghost:hover { background:var(--surface); color:var(--ink); border-color:#d0d7e3; }
        .btn-sm { padding:5px 12px; font-size:12px; border-radius:6px; }
        .btn-edit { background:var(--accent-soft); color:var(--accent); border:1px solid var(--accent-border); }
        .btn-edit:hover { background:var(--accent); color:#fff; }
        .btn-del { background:var(--red-soft); color:var(--red); border:1px solid var(--red-border); }
        .btn-del:hover { background:var(--red); color:#fff; }
        .btn:disabled { opacity:0.5; cursor:not-allowed; transform:none !important; box-shadow:none !important; }
        .tabs { display:flex; gap:4px; margin-bottom:24px; background:var(--white); border:1.5px solid var(--line); border-radius:10px; padding:4px; width:fit-content; }
        .tab { font-family:'DM Sans',sans-serif; font-weight:600; font-size:13px; padding:7px 18px; border-radius:7px; border:none; cursor:pointer; transition:all 0.15s; color:var(--muted); background:transparent; }
        .tab:hover { color:var(--ink); background:var(--surface); }
        .tab.active { background:var(--ink); color:#fff; box-shadow:0 2px 8px rgba(13,17,23,0.15); }
        .kpi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:24px; }
        .kpi-card { background:var(--white); border:1.5px solid var(--line); border-radius:var(--radius); padding:20px; box-shadow:var(--shadow); }
        .kpi-label { font-size:10.5px; font-weight:600; text-transform:uppercase; letter-spacing:0.1em; color:var(--faint); margin-bottom:8px; font-family:'JetBrains Mono',monospace; }
        .kpi-value { font-family:'JetBrains Mono',monospace; font-size:22px; font-weight:600; }
        .cards-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:14px; }
        .svc-card { background:var(--white); border:1.5px solid var(--line); border-radius:12px; padding:22px; transition:all 0.2s; box-shadow:var(--shadow); }
        .svc-card:hover { border-color:var(--accent-border); box-shadow:0 8px 28px rgba(37,99,235,0.1); transform:translateY(-2px); }
        .svc-icon { width:44px; height:44px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }
        .svc-name { font-family:'Syne',sans-serif; font-size:15px; font-weight:700; color:var(--ink); margin-bottom:2px; letter-spacing:-0.01em; }
        .svc-badge { display:inline-block; padding:2px 8px; border-radius:5px; font-size:10.5px; font-weight:600; border:1px solid; }
        .svc-price { font-family:'JetBrains Mono',monospace; font-size:22px; font-weight:600; margin-bottom:2px; }
        .svc-price-label { color:var(--faint); font-size:11px; font-weight:500; }
        .svc-price-box { background:var(--surface); border-radius:8px; padding:12px 14px; margin:14px 0; border:1px solid var(--line); }
        .table-wrap { background:var(--white); border-radius:var(--radius); border:1.5px solid var(--line); overflow:hidden; box-shadow:var(--shadow); }
        .table-head th { padding:10px 16px; text-align:left; font-size:10.5px; font-weight:600; text-transform:uppercase; letter-spacing:0.09em; color:var(--faint); background:var(--surface); border-bottom:1px solid var(--line); font-family:'JetBrains Mono',monospace; }
        .table-row td { padding:14px 16px; border-bottom:1px solid #f1f4f9; transition:background 0.1s; }
        .table-row:last-child td { border-bottom:none; }
        .table-row:hover td { background:#f8faff; }
        .filters { display:flex; gap:10px; margin-bottom:16px; align-items:center; }
        .inp, .sel { font-family:'DM Sans',sans-serif; font-size:13px; padding:9px 13px; background:var(--white); border:1.5px solid var(--line); border-radius:8px; color:var(--ink); outline:none; transition:border-color 0.15s,box-shadow 0.15s; }
        .inp:focus, .sel:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(37,99,235,0.1); }
        .badge { padding:3px 10px; border-radius:5px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; border:1px solid; display:inline-block; }
        .empty { padding:64px; text-align:center; background:var(--white); border-radius:var(--radius); border:1.5px solid var(--line); }
        .overlay { position:fixed; inset:0; background:rgba(10,15,28,0.6); display:flex; align-items:center; justify-content:center; z-index:1000; backdrop-filter:blur(6px); }
        .modal { background:var(--white); border-radius:14px; box-shadow:var(--shadow-lg); animation:modalIn 0.2s cubic-bezier(.34,1.56,.64,1); }
        @keyframes modalIn { from{opacity:0;transform:translateY(16px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        .modal-header { padding:28px 30px 20px; border-bottom:1px solid var(--line); }
        .modal-body { padding:22px 30px; overflow-y:auto; }
        .modal-footer { padding:16px 30px 24px; border-top:1px solid var(--line); display:flex; justify-content:flex-end; gap:8px; }
        .modal-eyebrow { font-family:'JetBrains Mono',monospace; font-size:10px; font-weight:500; letter-spacing:0.15em; text-transform:uppercase; color:var(--accent); margin-bottom:5px; }
        .modal-title { font-family:'Syne',sans-serif; font-size:18px; font-weight:700; color:var(--ink); letter-spacing:-0.02em; }
        .field { margin-bottom:16px; }
        .label { display:block; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; color:var(--muted); margin-bottom:6px; font-family:'JetBrains Mono',monospace; }
        .field .inp, .field .sel { width:100%; }
        .field-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:16px; }
        .unidad-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .unidad-opt { border:1.5px solid var(--line); border-radius:8px; padding:10px 13px; cursor:pointer; transition:all 0.15s; display:flex; align-items:center; gap:9px; background:var(--white); }
        .unidad-opt.active { background:var(--accent-soft); border-color:var(--accent-border); }
        .svc-item { border:1.5px solid var(--line); border-radius:10px; overflow:hidden; transition:border-color 0.15s,box-shadow 0.15s; }
        .svc-item.sel { border-color:var(--accent); box-shadow:0 0 0 3px rgba(37,99,235,0.1); }
        .svc-item-hdr { display:flex; align-items:center; gap:12px; padding:12px 14px; cursor:pointer; user-select:none; transition:background 0.1s; }
        .svc-item.sel .svc-item-hdr { background:var(--accent-soft); }
        .svc-item-detail { border-top:1px solid var(--line); padding:14px; background:#fafbff; display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .inp-sm { padding:8px 10px; border:1.5px solid var(--line); border-radius:7px; font-size:13px; font-family:'JetBrains Mono',monospace; color:var(--ink); outline:none; background:var(--white); transition:border-color 0.15s; width:100%; }
        .chk { width:18px; height:18px; border-radius:5px; border:2px solid #cbd5e1; background:var(--white); display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all 0.15s; }
        .chk.on { background:var(--accent); border-color:var(--accent); }
        .summary-bar { display:flex; justify-content:space-between; align-items:center; background:linear-gradient(135deg,var(--green-soft),#f0fdf7); border:1.5px solid var(--green-border); border-radius:10px; padding:14px 18px; margin-bottom:14px; }
        .err { background:var(--red-soft); border:1px solid var(--red-border); color:var(--red); padding:10px 14px; border-radius:8px; margin-bottom:18px; font-size:12.5px; font-weight:500; display:flex; align-items:center; gap:8px; }
        .status-toggle { padding:3px 10px; border-radius:6px; font-size:10.5px; font-weight:700; cursor:pointer; text-transform:uppercase; letter-spacing:0.05em; border:1px solid; transition:all 0.15s; user-select:none; }
        .close-btn { background:var(--surface); border:none; border-radius:8px; width:32px; height:32px; cursor:pointer; color:var(--muted); font-weight:700; font-size:14px; display:flex; align-items:center; justify-content:center; transition:all 0.15s; flex-shrink:0; }
        .close-btn:hover { background:var(--line); color:var(--ink); }
        .modal-body::-webkit-scrollbar { width:4px; }
        .modal-body::-webkit-scrollbar-thumb { background:var(--line); border-radius:2px; }
      `}</style>

      <div className="svc">
        <div className="svc-header">
          <div>
            <p className="svc-eyebrow">// Gestión</p>
            <h1 className="svc-title">Servicios</h1>
            <p className="svc-subtitle">
              {esCliente ? 'Mis servicios contratados' : 'Catálogo y cargos por cliente'}
            </p>
          </div>
          {/* Acciones solo para admin/empleado */}
          {puedeEscribir && (
            <div className="svc-actions">
              <button className="btn btn-success" onClick={abrirCargo}><span>+</span> Registrar cargos</button>
              {tab === 'catalogo' && (
                <button className="btn btn-primary" onClick={abrirNuevo}><span>+</span> Nuevo servicio</button>
              )}
            </div>
          )}
        </div>

        <div className="tabs">
          <button className={`tab${tab === 'catalogo' ? ' active' : ''}`} onClick={() => setTab('catalogo')}>Catálogo</button>
          <button className={`tab${tab === 'cargos' ? ' active' : ''}`} onClick={() => setTab('cargos')}>
            {esCliente ? 'Mis cargos' : 'Cargos por cliente'}
          </button>
        </div>

        {/* ── TAB CATÁLOGO ── */}
        {tab === 'catalogo' && (
          <>
            {loading ? (
              <div style={{ padding:'60px', textAlign:'center', color:'var(--faint)', fontSize:'13px' }}>Cargando...</div>
            ) : catalogo.length === 0 ? (
              <div className="empty">
                <div style={{ fontSize:'40px', marginBottom:'12px' }}>📋</div>
                <p style={{ color:'var(--muted)', fontSize:'14px', fontWeight:'500', marginBottom:'20px' }}>No hay servicios en el catálogo</p>
                {puedeEscribir && <button className="btn btn-primary" onClick={abrirNuevo}>Crear primer servicio</button>}
              </div>
            ) : (
              <div className="cards-grid">
                {catalogo.map(s => {
                  const u = getUnidad(s.unidad)
                  return (
                    <div key={s.id} className="svc-card">
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'14px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                          <div className="svc-icon" style={{ background:u.bg, border:`1.5px solid ${u.border}` }}>{u.icon}</div>
                          <div>
                            <p className="svc-name">{s.nombre}</p>
                            <span className="svc-badge" style={{ background:u.bg, color:u.color, borderColor:u.border }}>{u.label}</span>
                          </div>
                        </div>
                        <span className="status-toggle"
                          onClick={puedeEscribir ? () => toggleActivo(s) : undefined}
                          style={{ cursor:puedeEscribir?'pointer':'default', background:s.activo?'var(--green-soft)':'var(--red-soft)', color:s.activo?'var(--green)':'var(--red)', borderColor:s.activo?'var(--green-border)':'var(--red-border)' }}>
                          {s.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      {s.descripcion && <p style={{ color:'var(--faint)', fontSize:'12.5px', marginBottom:'14px', lineHeight:'1.55' }}>{s.descripcion}</p>}
                      <div className="svc-price-box">
                        <p className="svc-price" style={{ color:u.color }}>${Number(s.tarifa).toLocaleString('es-CO')}</p>
                        <p className="svc-price-label">COP · {u.label}</p>
                      </div>
                      {/* Botones editar/eliminar solo para admin/empleado */}
                      {puedeEscribir && (
                        <div style={{ display:'flex', gap:'8px' }}>
                          <button className="btn btn-sm btn-edit" style={{ flex:1 }} onClick={() => abrirEditar(s)}>Editar</button>
                          <button className="btn btn-sm btn-del" onClick={() => eliminarCatalogo(s.id)}>Eliminar</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── TAB CARGOS ── */}
        {tab === 'cargos' && (
          <>
            <div className="kpi-grid">
              <div className="kpi-card">
                <p className="kpi-label">{esCliente ? 'Pendiente de pago' : 'Pendiente de facturar'}</p>
                <p className="kpi-value" style={{ color:'var(--red)' }}>${totalPendiente.toLocaleString('es-CO')}</p>
              </div>
              <div className="kpi-card">
                <p className="kpi-label">Total cargos</p>
                <p className="kpi-value" style={{ color:'var(--accent)' }}>{cargos.length}</p>
              </div>
              <div className="kpi-card">
                <p className="kpi-label">Sin facturar</p>
                <p className="kpi-value" style={{ color:'var(--amber)' }}>{cargos.filter(c => !c.facturado).length}</p>
              </div>
            </div>

            <div className="filters">
              {/* Selector de cliente solo para admin/empleado */}
              {puedeEscribir && (
                <select className="sel" value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} style={{ width:'220px' }}>
                  <option value="">Todos los clientes</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              )}
              <select className="sel" value={filtroFacturado} onChange={e => setFiltroFacturado(e.target.value)} style={{ width:'190px' }}>
                <option value="">Todos los estados</option>
                <option value="false">Pendientes</option>
                <option value="true">Facturados</option>
              </select>
              <button className="btn btn-ghost" onClick={cargarCargos} style={{ fontSize:'13px' }}>↺ Actualizar</button>
            </div>

            <div className="table-wrap">
              {loading ? (
                <div style={{ padding:'60px', textAlign:'center', color:'var(--faint)', fontSize:'13px' }}>Cargando...</div>
              ) : cargos.length === 0 ? (
                <div className="empty" style={{ border:'none', borderRadius:0 }}>
                  <div style={{ fontSize:'40px', marginBottom:'12px' }}>🧾</div>
                  <p style={{ color:'var(--muted)', fontSize:'14px', fontWeight:'500', marginBottom:'20px' }}>
                    {esCliente ? 'Aún no tienes cargos registrados' : 'No hay cargos registrados'}
                  </p>
                  {puedeEscribir && <button className="btn btn-success" onClick={abrirCargo}>Registrar primer cargo</button>}
                </div>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr className="table-head">
                      {/* Columna Cliente solo para admin/empleado */}
                      {puedeEscribir && <th>Cliente</th>}
                      {['Servicio','Fecha','Cant.','Total','Estado'].map(h => <th key={h}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {cargos.map(c => {
                      const u = getUnidad(c.unidad)
                      return (
                        <tr key={c.id} className="table-row">
                          {puedeEscribir && (
                            <td style={{ color:'var(--ink)', fontSize:'13.5px', fontWeight:'600' }}>{c.cliente_nombre}</td>
                          )}
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:'9px' }}>
                              <span style={{ width:'30px', height:'30px', borderRadius:'7px', background:u.bg, border:`1px solid ${u.border}`, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'14px', flexShrink:0 }}>{u.icon}</span>
                              <div>
                                <p style={{ color:'var(--ink2)', fontSize:'13px', fontWeight:'600', marginBottom:'1px' }}>{c.catalogo_nombre}</p>
                                {c.observacion && <p style={{ color:'var(--faint)', fontSize:'11.5px' }}>{c.observacion}</p>}
                              </div>
                            </div>
                          </td>
                          <td style={{ color:'var(--muted)', fontSize:'12.5px', fontFamily:'JetBrains Mono,monospace' }}>{new Date(c.fecha).toLocaleDateString('es-CO')}</td>
                          <td style={{ color:'var(--muted)', fontSize:'13px', textAlign:'center', fontFamily:'JetBrains Mono,monospace' }}>{c.cantidad}</td>
                          <td><span style={{ color:'var(--green)', fontSize:'14px', fontWeight:'700', fontFamily:'JetBrains Mono,monospace' }}>${Number(c.valor_total).toLocaleString('es-CO')}</span></td>
                          <td>
                            <span className="badge" style={{ background:c.facturado?'var(--green-soft)':'var(--amber-soft)', color:c.facturado?'var(--green)':'var(--amber)', borderColor:c.facturado?'var(--green-border)':'var(--amber-border)' }}>
                              {c.facturado ? 'Facturado' : 'Pendiente'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ── MODAL NUEVO SERVICIO (solo admin/empleado) ── */}
        {showFormCatalogo && puedeEscribir && (
          <div className="overlay">
            <div className="modal" style={{ width:'490px' }}>
              <div className="modal-header">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <p className="modal-eyebrow">// Catálogo</p>
                    <h2 className="modal-title">{editando ? 'Editar servicio' : 'Nuevo servicio'}</h2>
                  </div>
                  <button className="close-btn" onClick={() => setShowFormCatalogo(false)}>✕</button>
                </div>
              </div>
              <div className="modal-body" style={{ maxHeight:'70vh' }}>
                {error && <div className="err">⚠ {error}</div>}
                <div className="field">
                  <label className="label">Nombre del servicio *</label>
                  <input className="inp" value={formCatalogo.nombre} onChange={e => setFormCatalogo({...formCatalogo,nombre:e.target.value})} placeholder="Ej: Descargue, Estiba, Bodegaje..." style={{ width:'100%' }} />
                </div>
                <div className="field">
                  <label className="label">Descripción</label>
                  <input className="inp" value={formCatalogo.descripcion} onChange={e => setFormCatalogo({...formCatalogo,descripcion:e.target.value})} placeholder="Breve descripción" style={{ width:'100%' }} />
                </div>
                <div className="field">
                  <label className="label">Tipo de cobro *</label>
                  <div className="unidad-grid">
                    {UNIDADES.map(u => (
                      <div key={u.value} className={`unidad-opt${formCatalogo.unidad===u.value?' active':''}`}
                        onClick={() => setFormCatalogo({...formCatalogo,unidad:u.value})}
                        style={formCatalogo.unidad===u.value?{borderColor:u.color,background:u.bg}:{}}>
                        <span style={{ fontSize:'17px' }}>{u.icon}</span>
                        <span style={{ fontSize:'12.5px', fontWeight:'600', color:formCatalogo.unidad===u.value?u.color:'var(--muted)' }}>{u.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label className="label">Tarifa (COP) *</label>
                  <input className="inp" type="number" min="0" value={formCatalogo.tarifa} onChange={e => setFormCatalogo({...formCatalogo,tarifa:e.target.value})} placeholder="50000" style={{ width:'100%' }} />
                  {formCatalogo.tarifa && <p style={{ color:'var(--accent)', fontSize:'12px', marginTop:'5px', fontWeight:'600', fontFamily:'JetBrains Mono,monospace' }}>${Number(formCatalogo.tarifa).toLocaleString('es-CO')} · {getUnidad(formCatalogo.unidad).label}</p>}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setShowFormCatalogo(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={guardarCatalogo} disabled={guardando}>{guardando?'Guardando...':editando?'Guardar cambios':'Crear servicio'}</button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL REGISTRAR CARGOS (solo admin/empleado) ── */}
        {showFormCargo && puedeEscribir && (
          <div className="overlay">
            <div className="modal" style={{ width:'580px', maxHeight:'92vh', display:'flex', flexDirection:'column' }}>
              <div className="modal-header">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <p className="modal-eyebrow">// Nuevo cargo</p>
                    <h2 className="modal-title">Registrar servicios prestados</h2>
                  </div>
                  <button className="close-btn" onClick={() => setShowFormCargo(false)}>✕</button>
                </div>
              </div>
              <div className="modal-body">
                {error && <div className="err">⚠ {error}</div>}
                <div className="field-grid-2">
                  <div>
                    <label className="label">Cliente *</label>
                    <select className="sel" value={cargoCliente} onChange={e => setCargoCliente(e.target.value)} style={{ width:'100%' }}>
                      <option value="">Seleccionar cliente</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Fecha *</label>
                    <input className="inp" type="date" value={cargoFecha} onChange={e => setCargoFecha(e.target.value)} style={{ width:'100%' }} />
                  </div>
                </div>
                <div className="field">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
                    <label className="label" style={{ margin:0 }}>Servicios prestados *</label>
                    {nSeleccionados > 0 && <span style={{ fontSize:'11.5px', fontWeight:'600', color:'var(--accent)', background:'var(--accent-soft)', border:'1px solid var(--accent-border)', padding:'2px 9px', borderRadius:'20px' }}>{nSeleccionados} seleccionado{nSeleccionados>1?'s':''}</span>}
                  </div>
                  {catalogo.filter(c => c.activo).length === 0 ? (
                    <div style={{ background:'var(--amber-soft)', border:'1.5px solid var(--amber-border)', color:'var(--amber)', padding:'12px 14px', borderRadius:'9px', fontSize:'13px', fontWeight:'500' }}>⚠ No hay servicios en el catálogo. Crea uno primero.</div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                      {catalogo.filter(c => c.activo).map(s => {
                        const u = getUnidad(s.unidad)
                        const sel = !!seleccionados[s.id]
                        const vals = seleccionados[s.id] || {}
                        const subtotal = (parseFloat(vals.cantidad)||0)*(parseFloat(vals.valor_unitario)||0)
                        return (
                          <div key={s.id} className={`svc-item${sel?' sel':''}`}>
                            <div className="svc-item-hdr" onClick={() => toggleServicio(s)}>
                              <div className={`chk${sel?' on':''}`}>{sel&&<span style={{color:'#fff',fontSize:'11px',fontWeight:'800',lineHeight:1}}>✓</span>}</div>
                              <span style={{width:'34px',height:'34px',borderRadius:'8px',background:u.bg,border:`1.5px solid ${u.border}`,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:'16px',flexShrink:0}}>{u.icon}</span>
                              <div style={{flex:1,minWidth:0}}>
                                <p style={{color:'var(--ink)',fontSize:'13.5px',fontWeight:'600',marginBottom:'1px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.nombre}</p>
                                <p style={{color:'var(--faint)',fontSize:'11.5px',fontFamily:'JetBrains Mono,monospace'}}>${Number(s.tarifa).toLocaleString('es-CO')} · {u.label}</p>
                              </div>
                              {sel&&subtotal>0&&<span style={{color:'var(--green)',fontSize:'13.5px',fontWeight:'700',fontFamily:'JetBrains Mono,monospace',flexShrink:0,marginLeft:'8px'}}>${subtotal.toLocaleString('es-CO')}</span>}
                            </div>
                            {sel && (
                              <div className="svc-item-detail">
                                <div>
                                  <p style={{color:'var(--muted)',fontSize:'10.5px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'5px',fontFamily:'JetBrains Mono,monospace'}}>Cantidad</p>
                                  <input className="inp-sm" type="number" min="1" value={vals.cantidad??''} onChange={e=>updateCampo(s.id,'cantidad',e.target.value)} onClick={e=>e.stopPropagation()} placeholder="1" />
                                </div>
                                <div>
                                  <p style={{color:'var(--muted)',fontSize:'10.5px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'5px',fontFamily:'JetBrains Mono,monospace'}}>Valor unitario (COP)</p>
                                  <input className="inp-sm" type="number" min="0" value={vals.valor_unitario??''} onChange={e=>updateCampo(s.id,'valor_unitario',e.target.value)} onClick={e=>e.stopPropagation()} placeholder={s.tarifa} />
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div className="field">
                  <label className="label">Observación general</label>
                  <input className="inp" value={cargoObservacion} onChange={e => setCargoObservacion(e.target.value)} placeholder="Ej: Recepción Bavaria turno mañana" style={{ width:'100%' }} />
                </div>
              </div>
              <div className="modal-footer" style={{ flexDirection:'column', alignItems:'stretch' }}>
                {nSeleccionados > 0 && (
                  <div className="summary-bar">
                    <div>
                      <p style={{color:'#065f46',fontSize:'12.5px',fontWeight:'600',marginBottom:'2px'}}>{nSeleccionados} servicio{nSeleccionados>1?'s':''} · total a registrar</p>
                      <p style={{color:'var(--faint)',fontSize:'11px'}}>Cada servicio se guarda como cargo independiente</p>
                    </div>
                    <span style={{color:'var(--green)',fontSize:'22px',fontWeight:'700',fontFamily:'JetBrains Mono,monospace'}}>${totalPreview.toLocaleString('es-CO')}</span>
                  </div>
                )}
                <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
                  <button className="btn btn-ghost" onClick={() => setShowFormCargo(false)}>Cancelar</button>
                  <button className={`btn${nSeleccionados>0?' btn-success':''}`} onClick={guardarCargo} disabled={guardando||nSeleccionados===0}
                    style={nSeleccionados===0?{background:'var(--line)',color:'var(--faint)',cursor:'not-allowed'}:{}}>
                    {guardando?'Registrando...':nSeleccionados===0?'Selecciona servicios':`Registrar ${nSeleccionados} cargo${nSeleccionados>1?'s':''}`}
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