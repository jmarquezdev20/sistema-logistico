import { useState, useEffect } from 'react'
import api from '../services/api'

export default function Bodegas() {
  const [bodegas, setBodegas] = useState([])
  const [ubicaciones, setUbicaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState('bodegas')
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [bodegaSeleccionada, setBodegaSeleccionada] = useState(null)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [formBodega, setFormBodega] = useState({ nombre: '', ubicacion: '', capacidad: '' })
  const [formUbicacion, setFormUbicacion] = useState({ bodega: '', codigo: '', capacidad: '' })

  const cargarBodegas = () => {
    setLoading(true)
    api.get('/infraestructura/bodegas/').then(r => setBodegas(r.data.results || r.data)).catch(console.error).finally(() => setLoading(false))
  }
  const cargarUbicaciones = (bodegaId = '') => {
    setLoading(true)
    const url = bodegaId ? `/infraestructura/ubicaciones/?bodega=${bodegaId}` : '/infraestructura/ubicaciones/'
    api.get(url).then(r => setUbicaciones(r.data.results || r.data)).catch(console.error).finally(() => setLoading(false))
  }
  useEffect(() => { cargarBodegas(); cargarUbicaciones() }, [])

  const abrirNuevaBodega = () => { setEditando(null); setFormBodega({ nombre: '', ubicacion: '', capacidad: '' }); setError(''); setShowForm(true) }
  const abrirEditarBodega = (b) => { setEditando(b); setFormBodega({ nombre: b.nombre, ubicacion: b.ubicacion, capacidad: b.capacidad }); setError(''); setShowForm(true) }
  const guardarBodega = async () => {
    if (!formBodega.nombre || !formBodega.ubicacion || !formBodega.capacidad) { setError('Todos los campos son obligatorios.'); return }
    setGuardando(true); setError('')
    try {
      if (editando) await api.put(`/infraestructura/bodegas/${editando.id}/`, formBodega)
      else await api.post('/infraestructura/bodegas/', formBodega)
      setShowForm(false); cargarBodegas()
    } catch { setError('Error al guardar la bodega.') } finally { setGuardando(false) }
  }
  const eliminarBodega = async (id) => {
    if (!window.confirm('¿Eliminar esta bodega?')) return
    await api.delete(`/infraestructura/bodegas/${id}/`); cargarBodegas(); cargarUbicaciones()
  }

  const abrirNuevaUbicacion = () => { setEditando(null); setFormUbicacion({ bodega: bodegaSeleccionada || '', codigo: '', capacidad: '' }); setError(''); setShowForm(true) }
  const abrirEditarUbicacion = (u) => { setEditando(u); setFormUbicacion({ bodega: u.bodega, codigo: u.codigo, capacidad: u.capacidad }); setError(''); setShowForm(true) }
  const guardarUbicacion = async () => {
    if (!formUbicacion.bodega || !formUbicacion.codigo || !formUbicacion.capacidad) { setError('Todos los campos son obligatorios.'); return }
    setGuardando(true); setError('')
    try {
      if (editando) await api.put(`/infraestructura/ubicaciones/${editando.id}/`, formUbicacion)
      else await api.post('/infraestructura/ubicaciones/', formUbicacion)
      setShowForm(false); cargarUbicaciones(bodegaSeleccionada)
    } catch (e) { setError(e.response?.data?.non_field_errors?.[0] || 'Error al guardar.') } finally { setGuardando(false) }
  }
  const eliminarUbicacion = async (id) => {
    if (!window.confirm('¿Eliminar esta ubicación?')) return
    await api.delete(`/infraestructura/ubicaciones/${id}/`); cargarUbicaciones(bodegaSeleccionada)
  }
  const filtrarUbicaciones = (bodegaId) => { setBodegaSeleccionada(bodegaId); cargarUbicaciones(bodegaId) }

  const inp = { width: '100%', padding: '9px 12px', background: '#fff', border: '1px solid #d1d9e6', borderRadius: '6px', color: '#1e2a3b', fontSize: '13px', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', outline: 'none' }
  const lbl = { color: '#3d4f6e', fontSize: '11px', fontWeight: '700', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .bod { font-family: 'Inter', sans-serif; color: #1e2a3b; }
        .tab-btn { padding: 7px 18px; border: 1px solid #e5e9f0; border-radius: 5px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.13s; }
        .tab-active { background: #0f1d3a; color: #fff; border-color: #0f1d3a; }
        .tab-inactive { background: #fff; color: #6b7a99; }
        .tab-inactive:hover { background: #f4f5f7; }
        .bod-card { background: #fff; border: 1px solid #e5e9f0; border-radius: 8px; padding: 20px; transition: all 0.18s; position: relative; overflow: hidden; }
        .bod-card:hover { border-color: #c0cde0; box-shadow: 0 4px 16px rgba(15,29,58,0.08); }
        .bod-card::before { content: ''; position: absolute; top: 0; left: 0; width: 3px; height: 100%; background: #7c5cbf; }
        .row-h:hover td { background: #f8faff !important; }
        .th { padding: 11px 18px; text-align: left; color: #8a97ad; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; background: #f9fafc; border-bottom: 1px solid #e5e9f0; }
        .ub-code { background: #f3f0ff; color: #7c5cbf; border: 1px solid #ddd6fe; padding: 3px 10px; border-radius: 4px; font-size: 12px; font-weight: 700; font-family: monospace; }
        .btn-sm { border: 1px solid; padding: 5px 12px; border-radius: 5px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.13s; }
        .btn-ub { background: #f0f6ff; color: #4f8ef7; border-color: #bdd6fb; }
        .btn-ub:hover { background: #4f8ef7; color: #fff; border-color: #4f8ef7; }
        .btn-ed { background: #f5f3ff; color: #7c5cbf; border-color: #ddd6fe; }
        .btn-ed:hover { background: #7c5cbf; color: #fff; border-color: #7c5cbf; }
        .btn-dl { background: #fff5f5; color: #e53e3e; border-color: #fed7d7; }
        .btn-dl:hover { background: #e53e3e; color: #fff; border-color: #e53e3e; }
        .modal-in { animation: mIn 0.2s cubic-bezier(.4,0,.2,1); }
        @keyframes mIn { from { opacity:0; transform:scale(0.97) translateY(10px) } to { opacity:1; transform:scale(1) translateY(0) } }
        .inp-f:focus { border-color: #7c5cbf !important; box-shadow: 0 0 0 3px rgba(124,92,191,0.12); }
      `}</style>

      <div className="bod">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#0f1d3a', margin: '0 0 4px', letterSpacing: '-0.01em' }}>Bodegas e Infraestructura</h1>
            <p style={{ color: '#8a97ad', fontSize: '13px', margin: 0 }}>
              {bodegas.length} bodegas · {ubicaciones.length} ubicaciones registradas
            </p>
          </div>
          <button onClick={vista === 'bodegas' ? abrirNuevaBodega : abrirNuevaUbicacion}
            style={{ background: '#0f1d3a', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: '6px', fontFamily: 'Inter, sans-serif', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = '#1a3357'}
            onMouseLeave={e => e.currentTarget.style.background = '#0f1d3a'}>
            + {vista === 'bodegas' ? 'Nueva bodega' : 'Nueva ubicación'}
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button className={`tab-btn ${vista === 'bodegas' ? 'tab-active' : 'tab-inactive'}`} onClick={() => setVista('bodegas')}>
            🏭 Bodegas ({bodegas.length})
          </button>
          <button className={`tab-btn ${vista === 'ubicaciones' ? 'tab-active' : 'tab-inactive'}`} onClick={() => setVista('ubicaciones')}>
            📍 Ubicaciones ({ubicaciones.length})
          </button>
        </div>

        {/* Vista Bodegas */}
        {vista === 'bodegas' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
            {loading ? <p style={{ color: '#8a97ad', fontSize: '13px' }}>Cargando...</p> :
              bodegas.length === 0 ? (
                <div style={{ gridColumn: '1/-1', padding: '56px', textAlign: 'center', background: '#fff', borderRadius: '8px', border: '1px solid #e5e9f0' }}>
                  <p style={{ fontSize: '28px', margin: '0 0 10px' }}>🏭</p>
                  <p style={{ color: '#8a97ad', fontSize: '13px', margin: 0 }}>No hay bodegas registradas.</p>
                </div>
              ) : bodegas.map(b => (
                <div key={b.id} className="bod-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <h3 style={{ color: '#0f1d3a', fontSize: '15px', fontWeight: '700', margin: 0 }}>{b.nombre}</h3>
                    <span style={{ background: '#f3f0ff', color: '#7c5cbf', border: '1px solid #ddd6fe', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                      {b.capacidad} u.
                    </span>
                  </div>
                  <p style={{ color: '#6b7a99', fontSize: '12px', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    📍 {b.ubicacion}
                  </p>
                  <p style={{ color: '#b0bac9', fontSize: '11px', margin: '0 0 16px', fontWeight: '500' }}>
                    {b.ubicaciones?.length || 0} ubicaciones · Capacidad total: {b.capacidad} unidades
                  </p>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn-sm btn-ub" onClick={() => { setVista('ubicaciones'); filtrarUbicaciones(b.id) }}>Ver ubicaciones</button>
                    <button className="btn-sm btn-ed" onClick={() => abrirEditarBodega(b)}>Editar</button>
                    <button className="btn-sm btn-dl" onClick={() => eliminarBodega(b.id)}>Eliminar</button>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* Vista Ubicaciones */}
        {vista === 'ubicaciones' && (
          <>
            <div style={{ marginBottom: '14px' }}>
              <select value={bodegaSeleccionada || ''} onChange={e => filtrarUbicaciones(e.target.value)}
                style={{ ...inp, width: '260px', fontSize: '13px' }}>
                <option value="">Todas las bodegas</option>
                {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
              </select>
            </div>
            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e9f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,29,58,0.05)' }}>
              {loading ? <p style={{ color: '#8a97ad', padding: '32px', fontSize: '13px' }}>Cargando...</p> :
                ubicaciones.length === 0 ? (
                  <div style={{ padding: '56px', textAlign: 'center' }}>
                    <p style={{ fontSize: '28px', margin: '0 0 10px' }}>📍</p>
                    <p style={{ color: '#8a97ad', fontSize: '13px', margin: 0 }}>No hay ubicaciones registradas.</p>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Código', 'Bodega', 'Capacidad', 'Disponible', 'Acciones'].map(h => (
                          <th key={h} className="th">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ubicaciones.map((u, i) => {
                        const pct = u.capacidad > 0 ? Math.round((u.ocupado || 0) / u.capacidad * 100) : 0
                        const barColor = pct >= 90 ? '#e53e3e' : pct >= 60 ? '#d97706' : '#059669'
                        return (
                          <tr key={u.id} className="row-h" style={{ borderBottom: i < ubicaciones.length - 1 ? '1px solid #f0f3f8' : 'none' }}>
                            <td style={{ padding: '13px 18px' }}><span className="ub-code">{u.codigo}</span></td>
                            <td style={{ padding: '13px 18px', color: '#6b7a99', fontSize: '13px' }}>
                              {bodegas.find(b => b.id === u.bodega)?.nombre || u.bodega_nombre || '—'}
                            </td>
                            <td style={{ padding: '13px 18px', color: '#1e2a3b', fontSize: '13px', fontWeight: '600' }}>{u.capacidad}</td>
                            <td style={{ padding: '13px 18px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ flex: 1, height: '5px', background: '#f0f3f8', borderRadius: '3px', overflow: 'hidden', minWidth: '60px' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: '3px', transition: 'width 0.3s' }} />
                                </div>
                                <span style={{ color: barColor, fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                                  {u.disponible ?? u.capacidad} libre
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '13px 18px' }}>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button className="btn-sm btn-ed" onClick={() => abrirEditarUbicacion(u)}>Editar</button>
                                <button className="btn-sm btn-dl" onClick={() => eliminarUbicacion(u.id)}>Eliminar</button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )
              }
            </div>
          </>
        )}

        {/* Modal Bodega */}
        {showForm && vista === 'bodegas' && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,29,58,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' }}>
            <div className="modal-in" style={{ background: '#fff', borderRadius: '10px', padding: '32px', width: '460px', boxShadow: '0 20px 60px rgba(15,29,58,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
                <div>
                  <p style={{ color: '#8a97ad', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 3px' }}>{editando ? 'Editar registro' : 'Nuevo registro'}</p>
                  <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#0f1d3a', margin: 0 }}>{editando ? editando.nombre : 'Crear bodega'}</h2>
                </div>
                <button onClick={() => setShowForm(false)} style={{ background: '#f4f5f7', border: 'none', borderRadius: '6px', width: '30px', height: '30px', cursor: 'pointer', color: '#8a97ad', fontWeight: '700' }}>✕</button>
              </div>
              <div style={{ height: '1px', background: '#f0f3f8', marginBottom: '20px' }} />
              {error && <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', color: '#e53e3e', padding: '10px', borderRadius: '6px', marginBottom: '16px', fontSize: '12px', fontWeight: '500' }}>⚠ {error}</div>}
              {[
                { label: 'Nombre de la bodega', key: 'nombre', ph: 'Bodega Principal' },
                { label: 'Dirección física', key: 'ubicacion', ph: 'Calle 123 # 45-67, Barranquilla' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: '15px' }}>
                  <label style={lbl}>{f.label} *</label>
                  <input className="inp-f" value={formBodega[f.key]} onChange={e => setFormBodega({ ...formBodega, [f.key]: e.target.value })} placeholder={f.ph} style={inp} />
                </div>
              ))}
              <div style={{ marginBottom: '24px' }}>
                <label style={lbl}>Capacidad total (unidades) *</label>
                <input className="inp-f" type="number" value={formBodega.capacidad} onChange={e => setFormBodega({ ...formBodega, capacidad: e.target.value })} placeholder="1000" style={inp} />
              </div>
              <div style={{ height: '1px', background: '#f0f3f8', marginBottom: '20px' }} />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowForm(false)} style={{ background: '#fff', color: '#6b7a99', border: '1px solid #d1d9e6', padding: '9px 18px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}>Cancelar</button>
                <button onClick={guardarBodega} disabled={guardando}
                  style={{ background: '#0f1d3a', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'Inter, sans-serif', opacity: guardando ? 0.7 : 1 }}>
                  {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear bodega'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Ubicación */}
        {showForm && vista === 'ubicaciones' && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,29,58,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' }}>
            <div className="modal-in" style={{ background: '#fff', borderRadius: '10px', padding: '32px', width: '460px', boxShadow: '0 20px 60px rgba(15,29,58,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
                <div>
                  <p style={{ color: '#8a97ad', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 3px' }}>{editando ? 'Editar registro' : 'Nuevo registro'}</p>
                  <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#0f1d3a', margin: 0 }}>{editando ? editando.codigo : 'Crear ubicación'}</h2>
                </div>
                <button onClick={() => setShowForm(false)} style={{ background: '#f4f5f7', border: 'none', borderRadius: '6px', width: '30px', height: '30px', cursor: 'pointer', color: '#8a97ad', fontWeight: '700' }}>✕</button>
              </div>
              <div style={{ height: '1px', background: '#f0f3f8', marginBottom: '20px' }} />
              {error && <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', color: '#e53e3e', padding: '10px', borderRadius: '6px', marginBottom: '16px', fontSize: '12px', fontWeight: '500' }}>⚠ {error}</div>}
              <div style={{ marginBottom: '15px' }}>
                <label style={lbl}>Bodega *</label>
                <select className="inp-f" value={formUbicacion.bodega} onChange={e => setFormUbicacion({ ...formUbicacion, bodega: e.target.value })} style={inp}>
                  <option value="">Seleccionar bodega</option>
                  {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={lbl}>Código de ubicación *</label>
                <input className="inp-f" value={formUbicacion.codigo} onChange={e => setFormUbicacion({ ...formUbicacion, codigo: e.target.value })} placeholder="P1-C3-N2" style={{ ...inp, fontFamily: 'monospace', letterSpacing: '0.05em' }} />
                <p style={{ color: '#b0bac9', fontSize: '11px', margin: '4px 0 0' }}>Ej: Pasillo 1 · Columna 3 · Nivel 2 → P1-C3-N2</p>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={lbl}>Capacidad (unidades) *</label>
                <input className="inp-f" type="number" value={formUbicacion.capacidad} onChange={e => setFormUbicacion({ ...formUbicacion, capacidad: e.target.value })} placeholder="100" style={inp} />
              </div>
              <div style={{ height: '1px', background: '#f0f3f8', marginBottom: '20px' }} />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowForm(false)} style={{ background: '#fff', color: '#6b7a99', border: '1px solid #d1d9e6', padding: '9px 18px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}>Cancelar</button>
                <button onClick={guardarUbicacion} disabled={guardando}
                  style={{ background: '#0f1d3a', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'Inter, sans-serif', opacity: guardando ? 0.7 : 1 }}>
                  {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear ubicación'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}