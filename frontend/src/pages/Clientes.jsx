import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const PAGE_SIZE = 15

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [busquedaInput, setBusquedaInput] = useState('')
  const [filtroActivo, setFiltroActivo] = useState('todos')
  const [form, setForm] = useState({ nombre: '', correo: '', telefono: '', direccion: '', activo: true })
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalActivos, setTotalActivos] = useState(0)
  const totalPaginas = Math.ceil(total / PAGE_SIZE)

  const cargar = useCallback(() => {
    setLoading(true)
    let url = `/clientes/?search=${busqueda}&page=${pagina}&page_size=${PAGE_SIZE}`
    if (filtroActivo === 'activos') url += '&activo=true'
    if (filtroActivo === 'inactivos') url += '&activo=false'
    api.get(url)
      .then(r => {
        setClientes(r.data.results || r.data)
        setTotal(r.data.count ?? (Array.isArray(r.data) ? r.data.length : 0))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [busqueda, pagina, filtroActivo])

  // Cargar total de activos para el header
  useEffect(() => {
  api.get('/clientes/?activo=true&page_size=1')
    .then(r => setTotalActivos(r.data.count ?? 0))
    .catch(() => {})
}, [])

  useEffect(() => { cargar() }, [cargar])

  const handleBuscar = (val) => { setBusquedaInput(val); setBusqueda(val); setPagina(1) }
  const handleFiltro = (f) => { setFiltroActivo(f); setPagina(1) }

  const abrirNuevo = () => {
    setEditando(null)
    setForm({ nombre: '', correo: '', telefono: '', direccion: '', activo: true })
    setError(''); setShowForm(true)
  }
  const abrirEditar = (c) => {
    setEditando(c)
    setForm({ nombre: c.nombre, correo: c.correo, telefono: c.telefono || '', direccion: c.direccion || '', activo: c.activo })
    setError(''); setShowForm(true)
  }
  const guardar = async () => {
    if (!form.nombre || !form.correo) { setError('Nombre y correo son obligatorios.'); return }
    setGuardando(true); setError('')
    try {
      if (editando) await api.put(`/clientes/${editando.id}/`, form)
      else await api.post('/clientes/', form)
      setShowForm(false); cargar()
    } catch (e) {
      setError(e.response?.data?.correo?.[0] || e.response?.data?.nombre?.[0] || 'Error al guardar.')
    } finally { setGuardando(false) }
  }
  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este cliente?')) return
    await api.delete(`/clientes/${id}/`); cargar()
  }
  const toggleActivo = async (c) => {
    await api.patch(`/clientes/${c.id}/`, { activo: !c.activo }); cargar()
  }

  const getPaginas = () => {
    const pages = []
    if (totalPaginas <= 7) { for (let i = 1; i <= totalPaginas; i++) pages.push(i) }
    else {
      pages.push(1)
      if (pagina > 3) pages.push('...')
      for (let i = Math.max(2, pagina - 1); i <= Math.min(totalPaginas - 1, pagina + 1); i++) pages.push(i)
      if (pagina < totalPaginas - 2) pages.push('...')
      pages.push(totalPaginas)
    }
    return pages
  }

  const avatarColor = (nombre) => {
    const colors = [
      { bg: '#dbeafe', text: '#1d4ed8' }, { bg: '#dcfce7', text: '#15803d' },
      { bg: '#fce7f3', text: '#be185d' }, { bg: '#ede9fe', text: '#6d28d9' },
      { bg: '#ffedd5', text: '#c2410c' }, { bg: '#cffafe', text: '#0e7490' },
      { bg: '#fef9c3', text: '#a16207' }, { bg: '#fecdd3', text: '#be123c' },
    ]
    return colors[nombre.charCodeAt(0) % colors.length]
  }

  const desde = total === 0 ? 0 : (pagina - 1) * PAGE_SIZE + 1
  const hasta = Math.min(pagina * PAGE_SIZE, total)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');

        .cli-root * { box-sizing: border-box; }
        .cli-root { font-family: 'Plus Jakarta Sans', sans-serif; color: #0f172a; }

        /* Tabla hover */
        .cli-tbody tr { transition: background 0.12s; }
        .cli-tbody tr:hover td { background: #f0f7ff !important; }

        /* Inputs */
        .cli-inp {
          width: 100%; padding: 10px 13px;
          background: #fff; border: 1.5px solid #e2e8f0;
          border-radius: 9px; color: #0f172a; font-size: 13px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          outline: none; transition: border-color 0.15s, box-shadow 0.15s;
        }
        .cli-inp:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }

        /* Filtros tab */
        .fil-btn {
          padding: 6px 16px; border-radius: 8px; border: 1.5px solid transparent;
          font-size: 12px; font-weight: 600; cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif; transition: all 0.15s;
          background: transparent; color: #64748b;
        }
        .fil-btn:hover { background: #f1f5f9; color: #0f172a; }
        .fil-btn.active { background: #0f172a; color: #fff; border-color: #0f172a; }

        /* Acción botones */
        .act-btn {
          padding: 5px 12px; border-radius: 7px; border: 1px solid;
          font-size: 11px; font-weight: 600; cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif; transition: all 0.15s;
        }

        /* Paginación */
        .pg-btn {
          min-width: 34px; height: 34px; border-radius: 9px;
          border: 1.5px solid #e2e8f0; background: #fff; color: #475569;
          font-size: 13px; font-weight: 600; cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s; padding: 0 10px;
        }
        .pg-btn:hover:not(:disabled) { border-color: #3b82f6; color: #3b82f6; background: #eff6ff; }
        .pg-btn.active { background: #0f172a; color: #fff; border-color: #0f172a; box-shadow: 0 2px 8px rgba(15,23,42,0.2); }
        .pg-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        /* Modal */
        .modal-bd {
          position: fixed; inset: 0; background: rgba(15,23,42,0.6);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; backdrop-filter: blur(4px);
          animation: bdIn 0.2s ease;
        }
        @keyframes bdIn { from { opacity:0 } to { opacity:1 } }
        .modal-box {
          background: #fff; border-radius: 20px; width: 520px;
          box-shadow: 0 32px 80px rgba(15,23,42,0.25);
          max-height: 92vh; overflow-y: auto;
          animation: boxIn 0.25s cubic-bezier(.4,0,.2,1);
        }
        @keyframes boxIn { from { opacity:0; transform:scale(0.95) translateY(16px) } to { opacity:1; transform:scale(1) translateY(0) } }

        /* Animaciones */
        .fade-rows { animation: fadeRows 0.25s ease; }
        @keyframes fadeRows { from { opacity:0; transform:translateY(4px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      <div className="cli-root">

        {/* ══ HEADER IMPACTANTE ══ */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
          borderRadius: '16px', padding: '28px 32px', marginBottom: '24px',
          position: 'relative', overflow: 'hidden'
        }}>
          {/* Decoración fondo */}
          <div style={{ position:'absolute', top:'-40px', right:'-40px', width:'180px', height:'180px', borderRadius:'50%', background:'rgba(59,130,246,0.12)', filter:'blur(40px)' }} />
          <div style={{ position:'absolute', bottom:'-30px', left:'30%', width:'120px', height:'120px', borderRadius:'50%', background:'rgba(139,92,246,0.1)', filter:'blur(30px)' }} />

          <div style={{ position:'relative', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'16px' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' }}>
                <div style={{ width:'36px', height:'36px', background:'rgba(59,130,246,0.2)', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', border:'1px solid rgba(59,130,246,0.3)' }}>👥</div>
                <div>
                  <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.12em', margin:0 }}>Módulo</p>
                  <h1 style={{ color:'#fff', fontSize:'22px', fontWeight:'800', margin:0, letterSpacing:'-0.02em' }}>Gestión de Clientes</h1>
                </div>
              </div>
              <p style={{ color:'rgba(255,255,255,0.45)', fontSize:'12px', margin:0 }}>
                Barranquilla, Colombia · BodegaXpress
              </p>
            </div>

            {/* KPIs en header */}
            <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
              {[
                { label:'Total', value: total, color:'#60a5fa' },
                { label:'Activos', value: totalActivos, color:'#34d399' },
                { label:'Inactivos', value: total - totalActivos, color:'#f87171' },
              ].map(k => (
                <div key={k.label} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', padding:'12px 18px', textAlign:'center', minWidth:'80px', backdropFilter:'blur(10px)' }}>
                  <p style={{ color:k.color, fontSize:'22px', fontWeight:'800', margin:'0 0 2px', fontFamily:"'DM Mono',monospace", letterSpacing:'-0.03em' }}>{k.value}</p>
                  <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'10px', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.08em', margin:0 }}>{k.label}</p>
                </div>
              ))}
            </div>

            <button
              onClick={abrirNuevo}
              style={{ background:'#3b82f6', color:'#fff', border:'none', padding:'11px 22px', borderRadius:'10px', fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:'700', fontSize:'13px', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px', transition:'all 0.15s', boxShadow:'0 4px 14px rgba(59,130,246,0.4)', whiteSpace:'nowrap' }}
              onMouseEnter={e => { e.currentTarget.style.background='#2563eb'; e.currentTarget.style.transform='translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.background='#3b82f6'; e.currentTarget.style.transform='translateY(0)' }}
            >
              <span style={{fontSize:'18px',lineHeight:1}}>+</span> Nuevo cliente
            </button>
          </div>
        </div>

        {/* ══ BUSCADOR + FILTROS ══ */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', flexWrap:'wrap', gap:'12px' }}>
          {/* Buscador */}
          <div style={{ position:'relative', flex:'1', maxWidth:'360px' }}>
            <span style={{ position:'absolute', left:'13px', top:'50%', transform:'translateY(-50%)', color:'#94a3b8', fontSize:'15px', pointerEvents:'none' }}>🔍</span>
            <input
              className="cli-inp"
              placeholder="Buscar cliente por nombre o correo..."
              value={busquedaInput}
              onChange={e => handleBuscar(e.target.value)}
              style={{ paddingLeft:'40px', paddingRight: busquedaInput ? '36px' : '13px' }}
            />
            {busquedaInput && (
              <button onClick={() => handleBuscar('')} style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'#e2e8f0', border:'none', borderRadius:'50%', width:'20px', height:'20px', cursor:'pointer', color:'#64748b', fontSize:'11px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700' }}>✕</button>
            )}
          </div>

          {/* Filtros */}
          <div style={{ display:'flex', gap:'6px', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:'10px', padding:'4px' }}>
            {[
              { key:'todos', label:'Todos' },
              { key:'activos', label:'✓ Activos' },
              { key:'inactivos', label:'✗ Inactivos' },
            ].map(f => (
              <button key={f.key} className={`fil-btn${filtroActivo === f.key ? ' active' : ''}`} onClick={() => handleFiltro(f.key)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ══ TABLA ══ */}
        <div style={{ background:'#fff', borderRadius:'14px', border:'1px solid #e8edf5', overflow:'hidden', boxShadow:'0 1px 8px rgba(15,23,42,0.06)' }}>
          {loading ? (
            <div style={{ padding:'72px', textAlign:'center' }}>
              <div style={{ display:'inline-block', width:'32px', height:'32px', border:'3px solid #e2e8f0', borderTopColor:'#3b82f6', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
              <p style={{ color:'#94a3b8', fontSize:'13px', margin:'14px 0 0', animation:'pulse 1.5s ease infinite' }}>Cargando clientes...</p>
            </div>
          ) : clientes.length === 0 ? (
            <div style={{ padding:'72px', textAlign:'center' }}>
              <div style={{ width:'64px', height:'64px', background:'#f1f5f9', borderRadius:'16px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px', margin:'0 auto 16px' }}>👥</div>
              <p style={{ color:'#0f172a', fontSize:'15px', fontWeight:'700', margin:'0 0 6px' }}>
                {busqueda ? 'Sin resultados' : 'Aún no hay clientes'}
              </p>
              <p style={{ color:'#94a3b8', fontSize:'13px', margin:0 }}>
                {busqueda ? `No se encontró "${busqueda}"` : 'Agrega el primer cliente con el botón de arriba.'}
              </p>
            </div>
          ) : (
            <>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ borderBottom:'2px solid #f1f5f9' }}>
                    {[
                      { label:'Cliente', w:'28%' },
                      { label:'Correo electrónico', w:'24%' },
                      { label:'Teléfono', w:'14%' },
                      { label:'Dirección', w:'18%' },
                      { label:'Estado', w:'8%' },
                      { label:'Acciones', w:'8%' },
                    ].map(h => (
                      <th key={h.label} style={{ padding:'13px 18px', textAlign:'left', color:'#94a3b8', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.1em', background:'#fafbfc', width:h.w, whiteSpace:'nowrap' }}>
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="cli-tbody fade-rows">
                  {clientes.map((c, i) => {
                    const av = avatarColor(c.nombre)
                    const isLast = i === clientes.length - 1
                    const td = { padding:'14px 18px', borderBottom: isLast ? 'none' : '1px solid #f8fafc', verticalAlign:'middle', background:'#fff', transition:'background 0.12s' }
                    return (
                      <tr key={c.id}>
                        {/* Nombre con avatar */}
                        <td style={td}>
                          <div style={{ display:'flex', alignItems:'center', gap:'11px' }}>
                            <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:av.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:`0 0 0 1px ${av.bg}` }}>
                              <span style={{ fontSize:'14px', fontWeight:'800', color:av.text }}>{c.nombre.charAt(0).toUpperCase()}</span>
                            </div>
                            <div>
                              <p style={{ color:'#0f172a', fontSize:'13px', fontWeight:'700', margin:'0 0 1px', letterSpacing:'-0.01em' }}>{c.nombre}</p>
                              <p style={{ color:'#cbd5e1', fontSize:'10px', fontFamily:"'DM Mono',monospace", margin:0 }}>ID·{String(c.id).slice(0,8)}</p>
                            </div>
                          </div>
                        </td>
                        {/* Correo */}
                        <td style={{ ...td, color:'#475569', fontSize:'13px' }}>
                          {c.correo
                            ? <a href={`mailto:${c.correo}`} style={{ color:'#3b82f6', textDecoration:'none', fontWeight:'500' }} onMouseEnter={e=>e.currentTarget.style.textDecoration='underline'} onMouseLeave={e=>e.currentTarget.style.textDecoration='none'}>{c.correo}</a>
                            : <span style={{color:'#cbd5e1'}}>—</span>}
                        </td>
                        {/* Teléfono */}
                        <td style={{ ...td, fontFamily:"'DM Mono',monospace", color:'#475569', fontSize:'12px' }}>
                          {c.telefono || <span style={{color:'#cbd5e1',fontFamily:'inherit'}}>—</span>}
                        </td>
                        {/* Dirección */}
                        <td style={{ ...td, color:'#94a3b8', fontSize:'12px' }}>
                          {c.direccion
                            ? <span title={c.direccion}>{c.direccion.length > 26 ? c.direccion.slice(0,26)+'…' : c.direccion}</span>
                            : <span style={{color:'#cbd5e1'}}>—</span>}
                        </td>
                        {/* Estado */}
                        <td style={td}>
                          <span
                            onClick={() => toggleActivo(c)}
                            title="Clic para cambiar"
                            style={{
                              display:'inline-flex', alignItems:'center', gap:'5px',
                              padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'700',
                              cursor:'pointer', letterSpacing:'0.03em', textTransform:'uppercase',
                              userSelect:'none', transition:'all 0.15s', whiteSpace:'nowrap',
                              background: c.activo ? '#dcfce7' : '#fef2f2',
                              color: c.activo ? '#15803d' : '#ef4444',
                              border: `1px solid ${c.activo ? '#bbf7d0' : '#fecaca'}`,
                            }}
                          >
                            <span style={{ width:'5px', height:'5px', borderRadius:'50%', background: c.activo ? '#22c55e' : '#ef4444', display:'inline-block', animation: c.activo ? 'pulse 2s ease infinite' : 'none' }} />
                            {c.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        {/* Acciones */}
                        <td style={td}>
                          <div style={{ display:'flex', gap:'5px' }}>
                            <button
                              className="act-btn"
                              onClick={() => abrirEditar(c)}
                              style={{ background:'#eff6ff', color:'#3b82f6', borderColor:'#bfdbfe' }}
                              onMouseEnter={e => { e.currentTarget.style.background='#3b82f6'; e.currentTarget.style.color='#fff'; e.currentTarget.style.borderColor='#3b82f6' }}
                              onMouseLeave={e => { e.currentTarget.style.background='#eff6ff'; e.currentTarget.style.color='#3b82f6'; e.currentTarget.style.borderColor='#bfdbfe' }}
                            >Editar</button>
                            <button
                              className="act-btn"
                              onClick={() => eliminar(c.id)}
                              style={{ background:'#fef2f2', color:'#ef4444', borderColor:'#fecaca' }}
                              onMouseEnter={e => { e.currentTarget.style.background='#ef4444'; e.currentTarget.style.color='#fff'; e.currentTarget.style.borderColor='#ef4444' }}
                              onMouseLeave={e => { e.currentTarget.style.background='#fef2f2'; e.currentTarget.style.color='#ef4444'; e.currentTarget.style.borderColor='#fecaca' }}
                            >Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* ══ PAGINACIÓN ══ */}
        {totalPaginas > 1 && (
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'16px', flexWrap:'wrap', gap:'10px' }}>
            <p style={{ color:'#94a3b8', fontSize:'12px', margin:0 }}>
              Mostrando <strong style={{color:'#0f172a'}}>{desde}–{hasta}</strong> de <strong style={{color:'#0f172a'}}>{total}</strong> clientes · Página <strong style={{color:'#0f172a'}}>{pagina}</strong> de <strong style={{color:'#0f172a'}}>{totalPaginas}</strong>
            </p>
            <div style={{ display:'flex', gap:'5px', alignItems:'center' }}>
              <button className="pg-btn" onClick={() => setPagina(1)} disabled={pagina===1} title="Primera">«</button>
              <button className="pg-btn" onClick={() => setPagina(p=>p-1)} disabled={pagina===1}>‹ Ant</button>
              {getPaginas().map((p,i) =>
                p === '...'
                  ? <span key={`e${i}`} style={{color:'#94a3b8',fontSize:'13px',padding:'0 4px'}}>…</span>
                  : <button key={p} className={`pg-btn${pagina===p?' active':''}`} onClick={() => setPagina(p)}>{p}</button>
              )}
              <button className="pg-btn" onClick={() => setPagina(p=>p+1)} disabled={pagina===totalPaginas}>Sig ›</button>
              <button className="pg-btn" onClick={() => setPagina(totalPaginas)} disabled={pagina===totalPaginas} title="Última">»</button>
            </div>
          </div>
        )}

        {/* ══ MODAL PROFESIONAL ══ */}
        {showForm && (
          <div className="modal-bd" onClick={e => { if (e.target===e.currentTarget) setShowForm(false) }}>
            <div className="modal-box">

              {/* Modal header con gradiente */}
              <div style={{ background:'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', borderRadius:'20px 20px 0 0', padding:'28px 32px', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:'-30px', right:'-30px', width:'120px', height:'120px', borderRadius:'50%', background:'rgba(59,130,246,0.15)', filter:'blur(30px)' }} />
                <div style={{ position:'relative', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <p style={{ color:'rgba(255,255,255,0.45)', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.12em', margin:'0 0 6px' }}>
                      {editando ? 'Editar registro' : 'Nuevo registro'}
                    </p>
                    <h2 style={{ color:'#fff', fontSize:'20px', fontWeight:'800', margin:0, letterSpacing:'-0.02em' }}>
                      {editando ? editando.nombre : 'Crear cliente'}
                    </h2>
                    {editando && <p style={{ color:'rgba(255,255,255,0.35)', fontSize:'11px', fontFamily:"'DM Mono',monospace", margin:'4px 0 0' }}>ID · {String(editando.id).slice(0,8)}</p>}
                  </div>
                  <button
                    onClick={() => setShowForm(false)}
                    style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'9px', width:'34px', height:'34px', cursor:'pointer', color:'rgba(255,255,255,0.7)', fontSize:'16px', fontWeight:'700', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s', flexShrink:0 }}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.2)'}
                    onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'}
                  >✕</button>
                </div>
              </div>

              {/* Modal body */}
              <div style={{ padding:'28px 32px' }}>
                {error && (
                  <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#ef4444', padding:'11px 16px', borderRadius:'10px', marginBottom:'20px', fontSize:'12px', fontWeight:'600', display:'flex', gap:'8px', alignItems:'center' }}>
                    <span style={{fontSize:'16px'}}>⚠</span> {error}
                  </div>
                )}

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'16px' }}>
                  {/* Nombre */}
                  <div style={{ gridColumn:'1 / -1' }}>
                    <label style={{ color:'#374151', fontSize:'11px', fontWeight:'700', display:'block', marginBottom:'7px', textTransform:'uppercase', letterSpacing:'0.07em' }}>
                      Nombre / Razón social <span style={{color:'#ef4444'}}>*</span>
                    </label>
                    <input className="cli-inp" type="text" value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} placeholder="Empresa S.A.S" />
                  </div>
                  {/* Correo */}
                  <div>
                    <label style={{ color:'#374151', fontSize:'11px', fontWeight:'700', display:'block', marginBottom:'7px', textTransform:'uppercase', letterSpacing:'0.07em' }}>
                      Correo electrónico <span style={{color:'#ef4444'}}>*</span>
                    </label>
                    <input className="cli-inp" type="email" value={form.correo} onChange={e=>setForm({...form,correo:e.target.value})} placeholder="contacto@empresa.com" />
                  </div>
                  {/* Teléfono */}
                  <div>
                    <label style={{ color:'#374151', fontSize:'11px', fontWeight:'700', display:'block', marginBottom:'7px', textTransform:'uppercase', letterSpacing:'0.07em' }}>Teléfono</label>
                    <input className="cli-inp" type="text" value={form.telefono} onChange={e=>setForm({...form,telefono:e.target.value})} placeholder="300 123 4567" />
                  </div>
                </div>

                {/* Dirección */}
                <div style={{ marginBottom:'20px' }}>
                  <label style={{ color:'#374151', fontSize:'11px', fontWeight:'700', display:'block', marginBottom:'7px', textTransform:'uppercase', letterSpacing:'0.07em' }}>Dirección</label>
                  <textarea className="cli-inp" value={form.direccion} onChange={e=>setForm({...form,direccion:e.target.value})} placeholder="Calle 123 # 45-67, Barranquilla" style={{ resize:'vertical', minHeight:'76px' }} />
                </div>

                {/* Toggle activo */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', background: form.activo ? '#f0fdf4' : '#fef2f2', borderRadius:'12px', border:`1.5px solid ${form.activo ? '#bbf7d0' : '#fecaca'}`, marginBottom:'24px', cursor:'pointer', transition:'all 0.2s' }} onClick={() => setForm({...form, activo:!form.activo})}>
                  <div>
                    <p style={{ color: form.activo ? '#15803d' : '#ef4444', fontSize:'13px', fontWeight:'700', margin:'0 0 2px' }}>
                      {form.activo ? '✓ Cliente activo' : '✗ Cliente inactivo'}
                    </p>
                    <p style={{ color:'#94a3b8', fontSize:'11px', margin:0 }}>
                      {form.activo ? 'Puede generar facturas y envíos' : 'Bloqueado para operaciones'}
                    </p>
                  </div>
                  {/* Toggle switch */}
                  <div style={{ width:'44px', height:'24px', borderRadius:'12px', background: form.activo ? '#22c55e' : '#e2e8f0', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
                    <div style={{ position:'absolute', top:'3px', left: form.activo ? '23px' : '3px', width:'18px', height:'18px', borderRadius:'50%', background:'#fff', boxShadow:'0 1px 4px rgba(0,0,0,0.2)', transition:'left 0.2s' }} />
                  </div>
                </div>

                {/* Botones */}
                <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end' }}>
                  <button
                    onClick={() => setShowForm(false)}
                    style={{ background:'#fff', color:'#64748b', border:'1.5px solid #e2e8f0', padding:'11px 22px', borderRadius:'10px', cursor:'pointer', fontSize:'13px', fontWeight:'600', fontFamily:"'Plus Jakarta Sans',sans-serif", transition:'all 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor='#94a3b8'}
                    onMouseLeave={e => e.currentTarget.style.borderColor='#e2e8f0'}
                  >Cancelar</button>
                  <button
                    onClick={guardar} disabled={guardando}
                    style={{ background: guardando ? '#64748b' : '#0f172a', color:'#fff', border:'none', padding:'11px 24px', borderRadius:'10px', cursor: guardando?'not-allowed':'pointer', fontSize:'13px', fontWeight:'700', fontFamily:"'Plus Jakarta Sans',sans-serif", transition:'all 0.15s', display:'flex', alignItems:'center', gap:'8px', boxShadow: guardando ? 'none' : '0 4px 12px rgba(15,23,42,0.25)' }}
                    onMouseEnter={e => { if(!guardando) e.currentTarget.style.background='#1e293b' }}
                    onMouseLeave={e => e.currentTarget.style.background= guardando?'#64748b':'#0f172a'}
                  >
                    {guardando && <span style={{display:'inline-block',width:'13px',height:'13px',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.7s linear infinite'}} />}
                    {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear cliente'}
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