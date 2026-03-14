import { useState, useEffect } from 'react'
import api from '../services/api'

const ROLES = [
  { value: 'admin',    label: 'Administrador', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', icon: '👑' },
  { value: 'empleado', label: 'Empleado',      color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd', icon: '🧑‍💼' },
  { value: 'cliente',  label: 'Cliente',       color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', icon: '🏢' },
]

export default function Usuarios() {
  const [usuarios, setUsuarios]             = useState([])
  const [clientes, setClientes]             = useState([])
  const [loadingClientes, setLoadingClientes] = useState(false)
  const [loading, setLoading]               = useState(true)
  const [showForm, setShowForm]             = useState(false)
  const [error, setError]                   = useState('')
  const [creando, setCreando]               = useState(false)
  const [toast, setToast]                   = useState(null)
  const [credenciales, setCredenciales]     = useState(null)
  const [filtro, setFiltro]                 = useState('')
  const [filtroCliente, setFiltroCliente]   = useState('')
  const [form, setForm]                     = useState({ email: '', nombre: '', rol: '', cliente_id: '' })

  useEffect(() => { cargar(); cargarClientes() }, [])

  const cargar = () => {
    setLoading(true)
    api.get('/auth/usuarios/')
      .then(r => setUsuarios(r.data.results || r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  // ✅ FIX PRINCIPAL: Paginación real — recorre TODAS las páginas hasta que no haya next
  const cargarClientes = async () => {
    setLoadingClientes(true)
    let url = '/clientes/'
    let todos = []
    try {
      while (url) {
        const { data } = await api.get(url)
        todos = [...todos, ...(data.results || data)]
        // Extrae la ruta relativa del next si existe
        url = data.next
          ? data.next.replace(import.meta.env.VITE_API_URL, '')
          : null
      }
      setClientes(todos)
    } catch (e) {
      console.error('Error cargando clientes:', e)
    } finally {
      setLoadingClientes(false)
    }
  }

  const showToast = (msg, tipo = 'exito') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 4000)
  }

  const abrirForm = () => {
    setForm({ email: '', nombre: '', rol: '', cliente_id: '' })
    setFiltroCliente('')
    setError('')
    setShowForm(true)
  }

  const crearUsuario = async () => {
    if (!form.email || !form.rol) { setError('Email y rol son obligatorios.'); return }
    if (form.rol === 'cliente' && !form.cliente_id) { setError('Debes seleccionar un cliente para este rol.'); return }
    setCreando(true); setError('')
    try {
      const { data } = await api.post('/auth/crear/', {
        email:      form.email,
        nombre:     form.nombre,
        rol:        form.rol,
        cliente_id: form.rol === 'cliente' ? form.cliente_id : undefined,
      })
      setShowForm(false)
      cargar()
      setCredenciales({ email: form.email, password: data.password_temporal })
    } catch (e) {
      setError(e.response?.data?.error || 'Error al crear el usuario.')
    } finally {
      setCreando(false)
    }
  }

  const toggleActivo = async (usuario) => {
    try {
      await api.patch(`/auth/usuarios/${usuario.id}/`, { is_active: !usuario.is_active })
      cargar()
      showToast(usuario.is_active ? 'Usuario desactivado.' : 'Usuario activado.')
    } catch {
      showToast('Error al actualizar el usuario.', 'error')
    }
  }

  const getRol        = (nombre) => ROLES.find(r => r.value === nombre) || ROLES[1]
  const totalPorRol   = (rol)    => usuarios.filter(u => u.rol?.nombre === rol).length

  const usuariosFiltrados  = usuarios.filter(u =>
    !filtro ||
    u.email?.toLowerCase().includes(filtro.toLowerCase()) ||
    u.first_name?.toLowerCase().includes(filtro.toLowerCase())
  )

  const clientesFiltrados = clientes.filter(c =>
    !filtroCliente || c.nombre?.toLowerCase().includes(filtroCliente.toLowerCase())
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap');
        :root {
          --ink:#0d1117;--ink2:#1c2433;--muted:#6b7a99;--faint:#94a3b8;
          --line:#e8ecf2;--surface:#f7f8fb;--white:#ffffff;
          --accent:#2563eb;--green:#059669;--red:#dc2626;
          --red-soft:#fef2f2;--red-border:#fecaca;
          --radius:10px;
          --shadow:0 1px 3px rgba(13,17,23,0.08),0 4px 16px rgba(13,17,23,0.04);
          --shadow-lg:0 8px 32px rgba(13,17,23,0.12),0 2px 8px rgba(13,17,23,0.06);
        }
        *{box-sizing:border-box;margin:0;padding:0;}
        .usr{font-family:'DM Sans',sans-serif;color:var(--ink);}
        .btn{font-family:'DM Sans',sans-serif;font-weight:600;font-size:13px;padding:9px 18px;border-radius:8px;border:none;cursor:pointer;transition:all 0.15s;display:inline-flex;align-items:center;gap:6px;}
        .btn-primary{background:var(--ink);color:#fff;}
        .btn-primary:hover{background:var(--ink2);transform:translateY(-1px);box-shadow:0 4px 12px rgba(13,17,23,0.2);}
        .btn-ghost{background:var(--white);color:var(--muted);border:1.5px solid var(--line);}
        .btn-ghost:hover{background:var(--surface);color:var(--ink);}
        .btn:disabled{opacity:0.5;cursor:not-allowed!important;transform:none!important;}
        .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;}
        .kpi-card{background:var(--white);border:1.5px solid var(--line);border-radius:var(--radius);padding:18px 20px;box-shadow:var(--shadow);}
        .kpi-label{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:var(--faint);margin-bottom:8px;}
        .kpi-value{font-family:'JetBrains Mono',monospace;font-size:24px;font-weight:600;}
        .table-wrap{background:var(--white);border-radius:var(--radius);border:1.5px solid var(--line);overflow:hidden;box-shadow:var(--shadow);}
        .tbl-toolbar{padding:14px 16px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:10px;}
        .tbl-search{font-family:'DM Sans',sans-serif;font-size:13px;padding:8px 13px;background:var(--surface);border:1.5px solid var(--line);border-radius:8px;color:var(--ink);outline:none;transition:border-color 0.15s;width:260px;}
        .tbl-search:focus{border-color:var(--accent);background:var(--white);box-shadow:0 0 0 3px rgba(37,99,235,0.08);}
        .tbl-count{margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--faint);}
        .tbl-head th{padding:10px 16px;text-align:left;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.09em;color:var(--faint);background:var(--surface);border-bottom:1px solid var(--line);}
        .tbl-row td{padding:13px 16px;border-bottom:1px solid #f1f4f9;transition:background 0.1s;}
        .tbl-row:last-child td{border-bottom:none;}
        .tbl-row:hover td{background:#f8faff;}
        .badge{padding:3px 10px;border-radius:5px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;border:1px solid;display:inline-block;}
        .overlay{position:fixed;inset:0;background:rgba(10,15,28,0.65);display:flex;align-items:center;justify-content:center;z-index:1000;backdrop-filter:blur(6px);}
        .modal{background:var(--white);border-radius:14px;box-shadow:var(--shadow-lg);width:480px;animation:modalIn 0.2s cubic-bezier(.34,1.56,.64,1);}
        @keyframes modalIn{from{opacity:0;transform:translateY(16px) scale(0.97)}to{opacity:1;transform:none}}
        .modal-header{padding:26px 30px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:flex-start;}
        .modal-body{padding:22px 30px;}
        .modal-footer{padding:16px 30px 24px;border-top:1px solid var(--line);display:flex;justify-content:flex-end;gap:8px;}
        .label{display:block;font-family:'JetBrains Mono',monospace;font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin-bottom:6px;}
        .inp,.sel{font-family:'DM Sans',sans-serif;font-size:13px;padding:9px 13px;background:var(--white);border:1.5px solid var(--line);border-radius:8px;color:var(--ink);outline:none;transition:border-color 0.15s;width:100%;}
        .inp:focus,.sel:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(37,99,235,0.1);}
        .field{margin-bottom:16px;}
        .err{background:var(--red-soft);border:1px solid var(--red-border);color:var(--red);padding:10px 14px;border-radius:8px;margin-bottom:16px;font-size:12.5px;font-weight:500;}
        .close-btn{background:var(--surface);border:none;border-radius:8px;width:32px;height:32px;cursor:pointer;color:var(--muted);font-size:14px;display:flex;align-items:center;justify-content:center;transition:all 0.15s;}
        .close-btn:hover{background:var(--line);color:var(--ink);}
        .toggle{position:relative;width:36px;height:20px;cursor:pointer;display:inline-block;}
        .toggle input{opacity:0;width:0;height:0;position:absolute;}
        .toggle-track{position:absolute;inset:0;border-radius:20px;transition:0.2s;}
        .toggle input:checked + .toggle-track{background:var(--green);}
        .toggle input:not(:checked) + .toggle-track{background:#cbd5e1;}
        .toggle-thumb{position:absolute;top:3px;width:14px;height:14px;border-radius:50%;background:#fff;transition:0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2);}
        .toggle input:checked ~ .toggle-thumb{left:19px;}
        .toggle input:not(:checked) ~ .toggle-thumb{left:3px;}
        .toast{position:fixed;bottom:28px;right:28px;padding:14px 20px;border-radius:10px;font-size:13px;font-weight:600;font-family:'DM Sans',sans-serif;box-shadow:0 8px 28px rgba(0,0,0,0.15);z-index:9999;animation:toastIn 0.25s ease;}
        .toast-exito{background:var(--ink);color:#fff;}
        .toast-error{background:var(--red-soft);color:var(--red);border:1px solid var(--red-border);}
        @keyframes toastIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        .cliente-count{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--faint);margin-top:5px;text-align:right;}
        .sel-disabled{opacity:0.6;pointer-events:none;}
      `}</style>

      {toast && <div className={`toast toast-${toast.tipo}`}>{toast.msg}</div>}

      <div className="usr">

        {/* ── Header ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'28px' }}>
          <div>
            <p style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'10px', fontWeight:'500', letterSpacing:'0.18em', textTransform:'uppercase', color:'#2563eb', marginBottom:'6px' }}>
              // Administración
            </p>
            <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:'26px', fontWeight:'800', color:'var(--ink)', letterSpacing:'-0.03em', lineHeight:1, marginBottom:'4px' }}>
              Usuarios
            </h1>
            <p style={{ fontSize:'13px', color:'var(--faint)' }}>Gestiona el acceso al sistema por rol</p>
          </div>
          <button className="btn btn-primary" onClick={abrirForm}>+ Crear usuario</button>
        </div>

        {/* ── KPIs ── */}
        <div className="kpi-grid">
          {[
            { label:'Total usuarios',  value: usuarios.length,         color:'#2563eb' },
            { label:'Administradores', value: totalPorRol('admin'),    color:'#7c3aed' },
            { label:'Empleados',       value: totalPorRol('empleado'), color:'#0369a1' },
            { label:'Clientes',        value: totalPorRol('cliente'),  color:'#059669' },
          ].map(k => (
            <div key={k.label} className="kpi-card">
              <p className="kpi-label">{k.label}</p>
              <p className="kpi-value" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* ── Tabla ── */}
        <div className="table-wrap">
          <div className="tbl-toolbar">
            <input
              className="tbl-search"
              placeholder="🔍  Buscar por nombre o email..."
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
            />
            <span className="tbl-count">
              {usuariosFiltrados.length} / {usuarios.length} usuarios
            </span>
          </div>

          {loading ? (
            <div style={{ padding:'48px', textAlign:'center', color:'var(--faint)', fontSize:'13px' }}>Cargando...</div>
          ) : usuariosFiltrados.length === 0 ? (
            <div style={{ padding:'64px', textAlign:'center' }}>
              <p style={{ fontSize:'32px', marginBottom:'10px' }}>◉</p>
              <p style={{ color:'var(--muted)', fontSize:'14px', fontWeight:'500' }}>
                {filtro ? 'Sin resultados para esa búsqueda' : 'No hay usuarios registrados'}
              </p>
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr className="tbl-head">
                  {['Usuario','Email','Rol','Cliente vinculado','Estado','Activo'].map(h =>
                    <th key={h}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map(u => {
                  const rol = getRol(u.rol?.nombre)
                  return (
                    <tr key={u.id} className="tbl-row">
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                          <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:'var(--ink)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Syne,sans-serif', fontWeight:'700', fontSize:'13px', flexShrink:0 }}>
                            {(u.first_name || u.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <span style={{ color:'var(--ink)', fontSize:'13px', fontWeight:'600' }}>
                            {u.first_name || '—'}
                          </span>
                        </div>
                      </td>
                      <td style={{ color:'var(--muted)', fontSize:'12px', fontFamily:'JetBrains Mono,monospace' }}>{u.email}</td>
                      <td>
                        <span className="badge" style={{ background:rol.bg, color:rol.color, borderColor:rol.border }}>
                          {rol.icon} {rol.label}
                        </span>
                      </td>
                      <td>
                        {u.cliente_id
                          ? <span style={{ color:'var(--green)', fontWeight:'600', fontSize:'12px' }}>
                              {clientes.find(c => String(c.id) === String(u.cliente_id))?.nombre || u.cliente_id}
                            </span>
                          : <span style={{ color:'var(--line)' }}>—</span>
                        }
                      </td>
                      <td>
                        <span className="badge" style={u.is_active
                          ? { background:'#ecfdf5', color:'#059669', borderColor:'#a7f3d0' }
                          : { background:'#f1f4f9', color:'var(--faint)', borderColor:'var(--line)' }}>
                          {u.is_active ? '● Activo' : '○ Inactivo'}
                        </span>
                      </td>
                      <td>
                        <label className="toggle">
                          <input type="checkbox" checked={u.is_active} onChange={() => toggleActivo(u)} />
                          <div className="toggle-track" />
                          <div className="toggle-thumb" />
                        </label>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Modal: Crear usuario ── */}
      {showForm && (
        <div className="overlay">
          <div className="modal">
            <div className="modal-header">
              <div>
                <p style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'10px', color:'#2563eb', fontWeight:'500', letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:'5px' }}>// Nuevo acceso</p>
                <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:'18px', fontWeight:'700', color:'var(--ink)' }}>Crear usuario</h2>
              </div>
              <button className="close-btn" onClick={() => { setShowForm(false); setFiltroCliente('') }}>✕</button>
            </div>

            <div className="modal-body">
              {error && <div className="err">⚠ {error}</div>}

              <div className="field">
                <label className="label">Nombre</label>
                <input className="inp" placeholder="Nombre completo" value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })} />
              </div>

              <div className="field">
                <label className="label">Email *</label>
                <input className="inp" type="email" placeholder="correo@empresa.com" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>

              <div className="field">
                <label className="label">Rol *</label>
                <select className="sel" value={form.rol}
                  onChange={e => setForm({ ...form, rol: e.target.value, cliente_id: '' })}>
                  <option value="">Seleccionar rol</option>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.icon} {r.label}</option>)}
                </select>
              </div>

              {/* ✅ FIX: Selector de clientes con búsqueda local + paginación completa en background */}
              {form.rol === 'cliente' && (
                <div className="field">
                  <label className="label" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span>Cliente a vincular *</span>
                    {loadingClientes
                      ? <span style={{ color:'var(--accent)', fontWeight:'500', fontSize:'10px' }}>⏳ cargando todos los clientes...</span>
                      : <span style={{ color:'var(--green)', fontWeight:'500', fontSize:'10px' }}>✓ {clientes.length} clientes cargados</span>
                    }
                  </label>

                  {/* Búsqueda local sobre la lista ya paginada en memoria */}
                  <input
                    className="inp"
                    placeholder="🔍  Filtrar cliente..."
                    value={filtroCliente}
                    onChange={e => { setFiltroCliente(e.target.value); setForm({ ...form, cliente_id: '' }) }}
                    style={{ marginBottom:'6px' }}
                    disabled={loadingClientes}
                  />

                  <select
                    className={`sel ${loadingClientes ? 'sel-disabled' : ''}`}
                    value={form.cliente_id}
                    onChange={e => setForm({ ...form, cliente_id: e.target.value })}
                    size={Math.min(clientesFiltrados.length + 1, 8)}
                    style={{ height:'auto', padding:'4px 0' }}
                  >
                    <option value="">— Seleccionar —</option>
                    {clientesFiltrados.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>

                  <p className="cliente-count">
                    {loadingClientes
                      ? 'Cargando...'
                      : filtroCliente
                        ? `${clientesFiltrados.length} coincidencias de ${clientes.length} clientes`
                        : `${clientes.length} clientes disponibles`
                    }
                  </p>
                </div>
              )}

              <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:'8px', padding:'12px 14px', fontSize:'12px', color:'var(--muted)' }}>
                🔐 Se generará una contraseña temporal que podrás copiar y entregar manualmente.
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => { setShowForm(false); setFiltroCliente('') }}>Cancelar</button>
              <button className="btn btn-primary" onClick={crearUsuario} disabled={creando || loadingClientes}>
                {creando ? 'Creando...' : loadingClientes ? 'Cargando clientes...' : 'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Credenciales ── */}
      {credenciales && (
        <div className="overlay">
          <div className="modal">
            <div className="modal-header">
              <div>
                <p style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'10px', color:'#059669', fontWeight:'500', letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:'5px' }}>// Acceso creado</p>
                <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:'18px', fontWeight:'700', color:'var(--ink)' }}>Credenciales del usuario</h2>
              </div>
              <button className="close-btn" onClick={() => setCredenciales(null)}>✕</button>
            </div>

            <div className="modal-body">
              <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:'10px', padding:'20px', marginBottom:'16px' }}>
                <div style={{ marginBottom:'14px' }}>
                  <p className="label">Email</p>
                  <p style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'14px', fontWeight:'600', color:'var(--ink)', background:'var(--white)', border:'1.5px solid var(--line)', borderRadius:'7px', padding:'10px 14px' }}>
                    {credenciales.email}
                  </p>
                </div>
                <div>
                  <p className="label">Contraseña temporal</p>
                  <p style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'20px', fontWeight:'700', color:'#059669', background:'#ecfdf5', border:'1.5px solid #a7f3d0', borderRadius:'7px', padding:'12px 14px', letterSpacing:'0.08em' }}>
                    {credenciales.password}
                  </p>
                </div>
              </div>
              <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:'8px', padding:'12px 14px', fontSize:'12px', color:'#92400e' }}>
                ⚠ Copia estas credenciales ahora. La contraseña no se podrá ver de nuevo.
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setCredenciales(null)}>Cerrar</button>
              <button className="btn btn-primary" onClick={() => {
                navigator.clipboard.writeText(`Email: ${credenciales.email}\nContraseña: ${credenciales.password}`)
                showToast('✅ Credenciales copiadas al portapapeles.')
              }}>
                📋 Copiar credenciales
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}