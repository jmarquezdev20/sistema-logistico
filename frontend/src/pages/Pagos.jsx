import { useState, useEffect } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const METODOS = [
  { value: 'efectivo',      label: 'Efectivo',      icon: '💵', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  { value: 'transferencia', label: 'Transferencia', icon: '🏦', color: '#4f8ef7', bg: '#eff6ff', border: '#bfdbfe' },
  { value: 'cheque',        label: 'Cheque',        icon: '📄', color: '#7c5cbf', bg: '#f5f3ff', border: '#ddd6fe' },
  { value: 'tarjeta',       label: 'Tarjeta',       icon: '💳', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
]

export default function Pagos() {
  const { esCliente, esAdmin, esEmpleado, clienteId } = useAuth()
  const puedeEscribir = esAdmin || esEmpleado

  const [pagos, setPagos] = useState([])
  const [facturasPendientes, setFacturasPendientes] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({ factura: '', cliente: '', monto: '', metodo_pago: 'transferencia', referencia: '', observacion: '', fecha_pago: new Date().toISOString().split('T')[0] })
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null)
  const [toastMsg, setToastMsg] = useState(null)

  // Para cliente: filtra la lista de pagos por su propio cliente_id
  const withClienteParam = (url) => {
    if (!esCliente || !clienteId) return url
    const sep = url.includes('?') ? '&' : '?'
    return `${url}${sep}cliente=${clienteId}`
  }

  useEffect(() => {
    if (puedeEscribir) {
      api.get('/clientes/?page_size=100').then(r => setClientes(r.data.results || r.data)).catch(console.error)
    }
    cargarPagos()
  }, [])

  const cargarPagos = () => {
    setLoading(true)
    api.get(withClienteParam('/pagos/'))
      .then(r => setPagos(r.data.results || r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const abrirRegistrarPago = async () => {
    setForm({ factura: '', cliente: '', monto: '', metodo_pago: 'transferencia', referencia: '', observacion: '', fecha_pago: new Date().toISOString().split('T')[0] })
    setFacturaSeleccionada(null); setError('')
    const res = await api.get('/facturacion/facturas/?estado=pendiente')
    setFacturasPendientes(res.data.results || res.data)
    setShowForm(true)
  }

  const seleccionarFactura = (facturaId) => {
    const f = facturasPendientes.find(f => String(f.id) === String(facturaId))
    setFacturaSeleccionada(f)
    setForm(prev => ({ ...prev, factura: facturaId, cliente: f ? f.cliente : '', monto: f ? f.total : '' }))
  }

  const showToast = (msg, tipo = 'exito') => { setToastMsg({ msg, tipo }); setTimeout(() => setToastMsg(null), 4500) }

  const guardarPago = async () => {
    if (!form.factura) { setError('Selecciona una factura.'); return }
    if (!form.monto || parseFloat(form.monto) <= 0) { setError('El monto debe ser mayor a 0.'); return }
    if (!form.metodo_pago) { setError('Selecciona el método de pago.'); return }
    setGuardando(true); setError('')
    try {
      const res = await api.post('/pagos/', form)
      setFacturasPendientes(prev => prev.filter(f => String(f.id) !== String(form.factura)))
      setShowForm(false); cargarPagos()
      showToast(res.data.correo_enviado ? `✅ Pago registrado. Correo enviado a ${res.data.correo_destinatario}` : '✅ Pago registrado y factura marcada como pagada.')
    } catch (e) { setError(e.response?.data?.error || JSON.stringify(e.response?.data) || 'Error al registrar el pago.') }
    finally { setGuardando(false) }
  }

  const getNombreCliente = (id) => clientes.find(c => c.id === id)?.nombre || '-'
  const getMetodo = (v) => METODOS.find(m => m.value === v) || { label: v, icon: '💰', color: '#6b7a99', bg: '#f4f5f7', border: '#e5e9f0' }
  const totalCobrado = pagos.reduce((s, p) => s + parseFloat(p.monto || 0), 0)
  const esteMes = pagos.filter(p => new Date(p.fecha_pago).getMonth() === new Date().getMonth()).length

  const inp = { width:'100%', padding:'9px 12px', background:'#fff', border:'1px solid #d1d9e6', borderRadius:'6px', color:'#1e2a3b', fontSize:'13px', fontFamily:'Inter,sans-serif', boxSizing:'border-box', outline:'none' }
  const lbl = { color:'#3d4f6e', fontSize:'11px', fontWeight:'700', display:'block', marginBottom:'5px', textTransform:'uppercase', letterSpacing:'0.06em' }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .pag { font-family:'Inter',sans-serif; color:#1e2a3b; }
        .th { padding:11px 18px; text-align:left; color:#8a97ad; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; background:#f9fafc; border-bottom:1px solid #e5e9f0; }
        .pag-row:hover td { background:#f8faff !important; }
        .modal-in { animation:mIn 0.2s cubic-bezier(.4,0,.2,1); }
        @keyframes mIn { from{opacity:0;transform:scale(0.97) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .inp-f:focus { border-color:#4f8ef7 !important; box-shadow:0 0 0 3px rgba(79,142,247,0.12); }
        .metodo-opt { border:2px solid #e5e9f0; border-radius:7px; padding:9px 12px; cursor:pointer; transition:all 0.13s; display:flex; align-items:center; gap:8px; }
        .metodo-opt:hover { border-color:#c0cde0; }
      `}</style>

      {toastMsg && (
        <div style={{ position:'fixed', bottom:'28px', right:'28px', padding:'14px 20px', borderRadius:'10px', fontSize:'13px', fontWeight:'600', fontFamily:'Inter,sans-serif', boxShadow:'0 8px 28px rgba(0,0,0,0.15)', zIndex:9999, background:toastMsg.tipo==='exito'?'#0f1d3a':'#fef2f2', color:toastMsg.tipo==='exito'?'#fff':'#dc2626', border:toastMsg.tipo==='exito'?'none':'1px solid #fecaca', maxWidth:'360px' }}>
          {toastMsg.msg}
        </div>
      )}

      <div className="pag">
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px' }}>
          <div>
            <h1 style={{ fontSize:'20px', fontWeight:'700', color:'#0f1d3a', margin:'0 0 4px', letterSpacing:'-0.01em' }}>Pagos</h1>
            <p style={{ color:'#8a97ad', fontSize:'13px', margin:0 }}>
              {esCliente ? 'Historial de tus pagos' : 'Registro de pagos recibidos de clientes'}
            </p>
          </div>
          {/* Botón registrar pago solo para admin/empleado */}
          {puedeEscribir && (
            <button onClick={abrirRegistrarPago}
              style={{ background:'#0f1d3a', color:'#fff', border:'none', padding:'9px 18px', borderRadius:'6px', fontFamily:'Inter,sans-serif', fontWeight:'600', fontSize:'13px', cursor:'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background='#1a3357'}
              onMouseLeave={e => e.currentTarget.style.background='#0f1d3a'}>
              + Registrar pago
            </button>
          )}
        </div>

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'18px' }}>
          {[
            { label:'Total pagos', value:pagos.length, color:'#4f8ef7', bg:'#eff6ff', border:'#bfdbfe' },
            { label:esCliente?'Total pagado':'Total cobrado', value:`$${totalCobrado.toLocaleString('es-CO')}`, color:'#059669', bg:'#ecfdf5', border:'#a7f3d0' },
            { label:'Este mes', value:esteMes, color:'#7c5cbf', bg:'#f5f3ff', border:'#ddd6fe' },
          ].map(k => (
            <div key={k.label} style={{ background:k.bg, border:`1px solid ${k.border}`, borderRadius:'8px', padding:'14px 18px' }}>
              <p style={{ color:'#8a97ad', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 4px' }}>{k.label}</p>
              <p style={{ color:k.color, fontSize:'22px', fontWeight:'700', margin:0 }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Tabla */}
        <div style={{ background:'#fff', borderRadius:'8px', border:'1px solid #e5e9f0', overflow:'hidden', boxShadow:'0 1px 4px rgba(15,29,58,0.05)' }}>
          {loading ? (
            <div style={{ padding:'48px', textAlign:'center', color:'#8a97ad', fontSize:'13px' }}>Cargando...</div>
          ) : pagos.length === 0 ? (
            <div style={{ padding:'56px', textAlign:'center' }}>
              <p style={{ fontSize:'28px', margin:'0 0 10px' }}>💰</p>
              <p style={{ color:'#8a97ad', fontSize:'13px', margin:0 }}>
                {esCliente ? 'Aún no tienes pagos registrados.' : 'No hay pagos registrados.'}
              </p>
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  {['Factura', ...(puedeEscribir?['Cliente']:[]), 'Monto','Método','Referencia','Fecha','Observación'].map(h => <th key={h} className="th">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {pagos.map((p, i) => {
                  const met = getMetodo(p.metodo_pago)
                  return (
                    <tr key={p.id} className="pag-row" style={{ borderBottom:i<pagos.length-1?'1px solid #f0f3f8':'none' }}>
                      <td style={{ padding:'13px 18px' }}>
                        <span style={{ background:'#f4f5f7', color:'#0f1d3a', border:'1px solid #e5e9f0', padding:'3px 8px', borderRadius:'4px', fontSize:'12px', fontWeight:'700', fontFamily:'monospace' }}>
                          {p.numero_factura || p.factura_numero || '—'}
                        </span>
                      </td>
                      {puedeEscribir && (
                        <td style={{ padding:'13px 18px', color:'#0f1d3a', fontSize:'13px', fontWeight:'600' }}>
                          {p.cliente_nombre || getNombreCliente(p.cliente)}
                        </td>
                      )}
                      <td style={{ padding:'13px 18px', color:'#059669', fontSize:'15px', fontWeight:'700' }}>
                        ${Number(p.monto).toLocaleString('es-CO')}
                      </td>
                      <td style={{ padding:'13px 18px' }}>
                        <span style={{ background:met.bg, color:met.color, border:`1px solid ${met.border}`, padding:'3px 10px', borderRadius:'4px', fontSize:'11px', fontWeight:'600' }}>
                          {met.icon} {met.label}
                        </span>
                      </td>
                      <td style={{ padding:'13px 18px', color:'#8a97ad', fontSize:'12px', fontFamily:'monospace' }}>
                        {p.referencia || <span style={{ color:'#d1d9e6' }}>—</span>}
                      </td>
                      <td style={{ padding:'13px 18px', color:'#8a97ad', fontSize:'12px' }}>
                        {new Date(p.fecha_pago).toLocaleDateString('es-CO')}
                      </td>
                      <td style={{ padding:'13px 18px', color:'#8a97ad', fontSize:'12px' }}>
                        {p.observacion || <span style={{ color:'#d1d9e6' }}>—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Registrar Pago (solo admin/empleado) */}
        {showForm && puedeEscribir && (
          <div style={{ position:'fixed', inset:0, background:'rgba(15,29,58,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, backdropFilter:'blur(2px)' }}>
            <div className="modal-in" style={{ background:'#fff', borderRadius:'10px', padding:'32px', width:'500px', boxShadow:'0 20px 60px rgba(15,29,58,0.2)', maxHeight:'90vh', overflowY:'auto' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'22px' }}>
                <div>
                  <p style={{ color:'#8a97ad', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 3px' }}>Nuevo registro</p>
                  <h2 style={{ fontSize:'17px', fontWeight:'700', color:'#0f1d3a', margin:0 }}>Registrar pago</h2>
                </div>
                <button onClick={() => setShowForm(false)} style={{ background:'#f4f5f7', border:'none', borderRadius:'6px', width:'30px', height:'30px', cursor:'pointer', color:'#8a97ad', fontWeight:'700' }}>✕</button>
              </div>
              <div style={{ height:'1px', background:'#f0f3f8', marginBottom:'20px' }} />
              {error && <div style={{ background:'#fff5f5', border:'1px solid #fed7d7', color:'#e53e3e', padding:'10px', borderRadius:'6px', marginBottom:'16px', fontSize:'12px', fontWeight:'500' }}>⚠ {error}</div>}

              <div style={{ marginBottom:'16px' }}>
                <label style={lbl}>Factura pendiente *</label>
                {facturasPendientes.length === 0 ? (
                  <div style={{ background:'#fffbeb', border:'1px solid #fde68a', color:'#d97706', padding:'12px 14px', borderRadius:'7px', fontSize:'13px', fontWeight:'500' }}>
                    ⚠ No hay facturas pendientes de pago.
                  </div>
                ) : (
                  <select className="inp-f" value={form.factura||''} onChange={e => seleccionarFactura(e.target.value)} style={inp}>
                    <option value="">Seleccionar factura</option>
                    {facturasPendientes.map(f => (
                      <option key={f.id} value={String(f.id)}>
                        {f.numero_factura} — {getNombreCliente(f.cliente)} — ${Number(f.total).toLocaleString('es-CO')}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {facturaSeleccionada && (
                <div style={{ background:'#f0f6ff', border:'1px solid #bfdbfe', borderRadius:'8px', padding:'14px', marginBottom:'18px' }}>
                  <p style={{ color:'#3d4f6e', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 10px' }}>Resumen de la factura</p>
                  {[['Cliente', getNombreCliente(facturaSeleccionada.cliente)], ['Vencimiento', new Date(facturaSeleccionada.fecha_vencimiento).toLocaleDateString('es-CO')]].map(([k,v]) => (
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                      <span style={{ color:'#8a97ad', fontSize:'12px' }}>{k}</span>
                      <span style={{ color:'#3d4f6e', fontSize:'12px', fontWeight:'500' }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ display:'flex', justifyContent:'space-between', borderTop:'1px solid #bfdbfe', paddingTop:'8px', marginTop:'4px' }}>
                    <span style={{ color:'#1d4ed8', fontSize:'13px', fontWeight:'700' }}>Total a pagar</span>
                    <span style={{ color:'#059669', fontSize:'18px', fontWeight:'700' }}>${Number(facturaSeleccionada.total).toLocaleString('es-CO')}</span>
                  </div>
                </div>
              )}

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'16px' }}>
                <div>
                  <label style={lbl}>Fecha de pago *</label>
                  <input className="inp-f" type="date" value={form.fecha_pago} onChange={e => setForm({...form,fecha_pago:e.target.value})} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Monto recibido (COP) *</label>
                  <input className="inp-f" type="number" min="0" value={form.monto} onChange={e => setForm({...form,monto:e.target.value})} placeholder="0" style={inp} />
                </div>
              </div>

              <div style={{ marginBottom:'16px' }}>
                <label style={lbl}>Método de pago *</label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                  {METODOS.map(m => (
                    <div key={m.value} className="metodo-opt"
                      onClick={() => setForm({...form,metodo_pago:m.value})}
                      style={{ borderColor:form.metodo_pago===m.value?m.color:'#e5e9f0', borderWidth:'2px', background:form.metodo_pago===m.value?m.bg:'#fff' }}>
                      <span style={{ fontSize:'18px' }}>{m.icon}</span>
                      <span style={{ fontSize:'13px', fontWeight:'600', color:form.metodo_pago===m.value?m.color:'#6b7a99' }}>{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom:'14px' }}>
                <label style={lbl}>Referencia / N° transacción</label>
                <input className="inp-f" value={form.referencia} onChange={e => setForm({...form,referencia:e.target.value})} placeholder="Ej: TRF-20250301-001" style={{ ...inp, fontFamily:'monospace' }} />
              </div>
              <div style={{ marginBottom:'24px' }}>
                <label style={lbl}>Observación</label>
                <input className="inp-f" value={form.observacion} onChange={e => setForm({...form,observacion:e.target.value})} placeholder="Opcional..." style={inp} />
              </div>

              <div style={{ height:'1px', background:'#f0f3f8', marginBottom:'20px' }} />
              <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
                <button onClick={() => setShowForm(false)} style={{ background:'#fff', color:'#6b7a99', border:'1px solid #d1d9e6', padding:'9px 18px', borderRadius:'6px', cursor:'pointer', fontSize:'13px', fontWeight:'600', fontFamily:'Inter,sans-serif' }}>Cancelar</button>
                <button onClick={guardarPago} disabled={guardando||facturasPendientes.length===0}
                  style={{ background:'#0f1d3a', color:'#fff', border:'none', padding:'9px 20px', borderRadius:'6px', cursor:'pointer', fontSize:'13px', fontWeight:'600', fontFamily:'Inter,sans-serif', opacity:(guardando||facturasPendientes.length===0)?0.45:1 }}
                  onMouseEnter={e => { if(!guardando) e.currentTarget.style.background='#1a3357' }}
                  onMouseLeave={e => e.currentTarget.style.background='#0f1d3a'}>
                  {guardando ? 'Registrando...' : 'Registrar pago'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}