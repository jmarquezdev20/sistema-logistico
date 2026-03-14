import { useState, useEffect } from 'react'
import api from '../services/api'

const TIPOS = [
  { value: 'moto', label: 'Moto', icon: '🏍️', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { value: 'camioneta', label: 'Camioneta', icon: '🚙', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  { value: 'camion', label: 'Camión', icon: '🚛', color: '#7c5cbf', bg: '#f5f3ff', border: '#ddd6fe' },
  { value: 'furgon', label: 'Furgón', icon: '🚐', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
]

export default function Transportadores() {
  const [transportadores, setTransportadores] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({ nombre: '', telefono: '', placa_vehiculo: '', tipo_vehiculo: 'moto', activo: true })

  const cargar = () => {
    setLoading(true)
    api.get('/transportadores/?search=' + busqueda)
      .then(r => setTransportadores(r.data.results || r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [busqueda])

  const abrirNuevo = () => { setEditando(null); setForm({ nombre: '', telefono: '', placa_vehiculo: '', tipo_vehiculo: 'moto', activo: true }); setError(''); setShowForm(true) }
  const abrirEditar = (t) => { setEditando(t); setForm({ nombre: t.nombre, telefono: t.telefono, placa_vehiculo: t.placa_vehiculo, tipo_vehiculo: t.tipo_vehiculo, activo: t.activo }); setError(''); setShowForm(true) }

  const guardar = async () => {
    if (!form.nombre || !form.telefono || !form.placa_vehiculo) { setError('Nombre, teléfono y placa son obligatorios.'); return }
    setGuardando(true); setError('')
    try {
      if (editando) await api.put(`/transportadores/${editando.id}/`, form)
      else await api.post('/transportadores/', form)
      setShowForm(false); cargar()
    } catch { setError('Error al guardar el transportador.') }
    finally { setGuardando(false) }
  }

  const eliminar = async (id) => { if (!window.confirm('¿Eliminar este transportador?')) return; await api.delete(`/transportadores/${id}/`); cargar() }
  const toggleActivo = async (t) => { await api.patch(`/transportadores/${t.id}/`, { activo: !t.activo }); cargar() }

  const filtrados = transportadores.filter(t => !filtroTipo || t.tipo_vehiculo === filtroTipo)
  const getTipo = (v) => TIPOS.find(t => t.value === v) || { label: v, icon: '🚗', color: '#6b7a99', bg: '#f4f5f7', border: '#e5e9f0' }

  const inp = { width: '100%', padding: '9px 12px', background: '#fff', border: '1px solid #d1d9e6', borderRadius: '6px', color: '#1e2a3b', fontSize: '13px', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', outline: 'none' }
  const lbl = { color: '#3d4f6e', fontSize: '11px', fontWeight: '700', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .tr-root { font-family: 'Inter', sans-serif; color: #1e2a3b; }
        .tr-row:hover td { background: #f8faff !important; }
        .th { padding: 11px 18px; text-align: left; color: #8a97ad; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; background: #f9fafc; border-bottom: 1px solid #e5e9f0; }
        .btn-sm { border: 1px solid; padding: 5px 12px; border-radius: 5px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.13s; }
        .btn-ed { background: #f0f6ff; color: #4f8ef7; border-color: #bdd6fb; }
        .btn-ed:hover { background: #4f8ef7; color: #fff; border-color: #4f8ef7; }
        .btn-dl { background: #fff5f5; color: #e53e3e; border-color: #fed7d7; }
        .btn-dl:hover { background: #e53e3e; color: #fff; border-color: #e53e3e; }
        .kpi-chip { border: 1.5px solid; border-radius: 8px; padding: 14px 18px; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 12px; }
        .kpi-chip:hover { box-shadow: 0 4px 12px rgba(15,29,58,0.1); transform: translateY(-1px); }
        .inp-f:focus { border-color: #4f8ef7 !important; box-shadow: 0 0 0 3px rgba(79,142,247,0.12); }
        .modal-in { animation: mIn 0.2s cubic-bezier(.4,0,.2,1); }
        @keyframes mIn { from { opacity:0; transform:scale(0.97) translateY(10px) } to { opacity:1; transform:scale(1) translateY(0) } }
      `}</style>

      <div className="tr-root">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#0f1d3a', margin: '0 0 4px', letterSpacing: '-0.01em' }}>Transportadores</h1>
            <p style={{ color: '#8a97ad', fontSize: '13px', margin: 0 }}>
              {transportadores.length} registros · <span style={{ color: '#059669', fontWeight: '600' }}>{transportadores.filter(t => t.activo).length} activos</span>
            </p>
          </div>
          <button onClick={abrirNuevo}
            style={{ background: '#0f1d3a', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: '6px', fontFamily: 'Inter, sans-serif', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = '#1a3357'}
            onMouseLeave={e => e.currentTarget.style.background = '#0f1d3a'}>
            + Nuevo transportador
          </button>
        </div>

        {/* KPIs por tipo */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {TIPOS.map(tipo => {
            const count = transportadores.filter(t => t.tipo_vehiculo === tipo.value).length
            const activo = filtroTipo === tipo.value
            return (
              <div key={tipo.value} className="kpi-chip"
                onClick={() => setFiltroTipo(activo ? '' : tipo.value)}
                style={{ background: activo ? tipo.bg : '#fff', borderColor: activo ? tipo.border : '#e5e9f0', borderWidth: activo ? '2px' : '1px' }}>
                <span style={{ fontSize: '22px' }}>{tipo.icon}</span>
                <div>
                  <p style={{ color: tipo.color, fontSize: '20px', fontWeight: '700', margin: 0, lineHeight: 1 }}>{count}</p>
                  <p style={{ color: '#8a97ad', fontSize: '11px', fontWeight: '600', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{tipo.label}</p>
                </div>
                {activo && <span style={{ marginLeft: '4px', background: tipo.color, color: '#fff', fontSize: '10px', fontWeight: '700', padding: '1px 6px', borderRadius: '10px' }}>✓</span>}
              </div>
            )
          })}
        </div>

        {/* Búsqueda */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#b0bac9', fontSize: '14px' }}>🔍</span>
            <input className="inp-f" placeholder="Buscar por nombre o placa..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
              style={{ ...inp, paddingLeft: '34px', width: '280px' }} />
          </div>
        </div>

        {/* Tabla */}
        <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e9f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,29,58,0.05)' }}>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#8a97ad', fontSize: '13px' }}>Cargando...</div>
          ) : filtrados.length === 0 ? (
            <div style={{ padding: '56px', textAlign: 'center' }}>
              <p style={{ fontSize: '28px', margin: '0 0 10px' }}>🚚</p>
              <p style={{ color: '#8a97ad', fontSize: '13px', margin: 0 }}>No hay transportadores registrados.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Transportador', 'Teléfono', 'Placa', 'Tipo de vehículo', 'Estado', 'Acciones'].map(h => <th key={h} className="th">{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtrados.map((t, i) => {
                  const tipo = getTipo(t.tipo_vehiculo)
                  return (
                    <tr key={t.id} className="tr-row" style={{ borderBottom: i < filtrados.length - 1 ? '1px solid #f0f3f8' : 'none' }}>
                      <td style={{ padding: '13px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '30px', height: '30px', borderRadius: '6px', background: tipo.bg, border: `1px solid ${tipo.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                            {tipo.icon}
                          </div>
                          <span style={{ color: '#0f1d3a', fontSize: '13px', fontWeight: '600' }}>{t.nombre}</span>
                        </div>
                      </td>
                      <td style={{ padding: '13px 18px', color: '#6b7a99', fontSize: '13px' }}>{t.telefono}</td>
                      <td style={{ padding: '13px 18px' }}>
                        <span style={{ background: '#f4f5f7', color: '#3d4f6e', border: '1px solid #e5e9f0', padding: '3px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: '700', fontFamily: 'monospace', letterSpacing: '0.06em' }}>
                          {t.placa_vehiculo}
                        </span>
                      </td>
                      <td style={{ padding: '13px 18px' }}>
                        <span style={{ background: tipo.bg, color: tipo.color, border: `1px solid ${tipo.border}`, padding: '3px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                          {tipo.icon} {tipo.label}
                        </span>
                      </td>
                      <td style={{ padding: '13px 18px' }}>
                        <span onClick={() => toggleActivo(t)} style={{ padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em', transition: 'all 0.13s', background: t.activo ? '#ecfdf5' : '#fff5f5', color: t.activo ? '#059669' : '#e53e3e', border: `1px solid ${t.activo ? '#a7f3d0' : '#fed7d7'}` }}>
                          {t.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={{ padding: '13px 18px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn-sm btn-ed" onClick={() => abrirEditar(t)}>Editar</button>
                          <button className="btn-sm btn-dl" onClick={() => eliminar(t.id)}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,29,58,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' }}>
            <div className="modal-in" style={{ background: '#fff', borderRadius: '10px', padding: '32px', width: '460px', boxShadow: '0 20px 60px rgba(15,29,58,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
                <div>
                  <p style={{ color: '#8a97ad', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 3px' }}>{editando ? 'Editar registro' : 'Nuevo registro'}</p>
                  <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#0f1d3a', margin: 0 }}>{editando ? editando.nombre : 'Crear transportador'}</h2>
                </div>
                <button onClick={() => setShowForm(false)} style={{ background: '#f4f5f7', border: 'none', borderRadius: '6px', width: '30px', height: '30px', cursor: 'pointer', color: '#8a97ad', fontWeight: '700' }}>✕</button>
              </div>
              <div style={{ height: '1px', background: '#f0f3f8', marginBottom: '20px' }} />
              {error && <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', color: '#e53e3e', padding: '10px', borderRadius: '6px', marginBottom: '16px', fontSize: '12px', fontWeight: '500' }}>⚠ {error}</div>}

              {[
                { label: 'Nombre completo', key: 'nombre', type: 'text', ph: 'Carlos Pérez' },
                { label: 'Teléfono', key: 'telefono', type: 'text', ph: '300 123 4567' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: '15px' }}>
                  <label style={lbl}>{f.label} *</label>
                  <input className="inp-f" type={f.type} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.ph} style={inp} />
                </div>
              ))}

              <div style={{ marginBottom: '15px' }}>
                <label style={lbl}>Placa del vehículo *</label>
                <input className="inp-f" value={form.placa_vehiculo} onChange={e => setForm({ ...form, placa_vehiculo: e.target.value.toUpperCase() })} placeholder="ABC123"
                  style={{ ...inp, fontFamily: 'monospace', letterSpacing: '0.08em', fontWeight: '700' }} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={lbl}>Tipo de vehículo *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {TIPOS.map(t => (
                    <div key={t.value} onClick={() => setForm({ ...form, tipo_vehiculo: t.value })}
                      style={{ padding: '10px 12px', border: `2px solid ${form.tipo_vehiculo === t.value ? t.color : '#e5e9f0'}`, borderRadius: '7px', cursor: 'pointer', background: form.tipo_vehiculo === t.value ? t.bg : '#fff', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.13s' }}>
                      <span style={{ fontSize: '18px' }}>{t.icon}</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: form.tipo_vehiculo === t.value ? t.color : '#6b7a99' }}>{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', background: '#f9fafc', borderRadius: '6px', border: '1px solid #e5e9f0' }}>
                <input type="checkbox" id="activo" checked={form.activo} onChange={e => setForm({ ...form, activo: e.target.checked })} style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#4f8ef7' }} />
                <div>
                  <label htmlFor="activo" style={{ color: '#1e2a3b', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'block' }}>Transportador activo</label>
                  <span style={{ color: '#8a97ad', fontSize: '11px' }}>Disponible para asignar envíos</span>
                </div>
              </div>

              <div style={{ height: '1px', background: '#f0f3f8', marginBottom: '20px' }} />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowForm(false)} style={{ background: '#fff', color: '#6b7a99', border: '1px solid #d1d9e6', padding: '9px 18px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}>Cancelar</button>
                <button onClick={guardar} disabled={guardando}
                  style={{ background: '#0f1d3a', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'Inter, sans-serif', opacity: guardando ? 0.7 : 1 }}
                  onMouseEnter={e => { if (!guardando) e.currentTarget.style.background = '#1a3357' }}
                  onMouseLeave={e => e.currentTarget.style.background = '#0f1d3a'}>
                  {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear transportador'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}