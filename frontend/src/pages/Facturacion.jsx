import { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const ESTADOS = [
  { value: 'pendiente', label: 'Pendiente', color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: '⏳' },
  { value: 'pagada',    label: 'Pagada',    color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', icon: '✅' },
  { value: 'vencida',   label: 'Vencida',   color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: '⚠️' },
]

const UNIDADES = {
  por_dia:       { label: 'Por día',       icon: '📅' },
  por_recepcion: { label: 'Por recepción', icon: '📦' },
  por_envio:     { label: 'Por envío',     icon: '🚛' },
  unitario:      { label: 'Unitario',      icon: '◆' },
}

export default function Facturacion() {
  const { esCliente, esAdmin, esEmpleado, clienteId } = useAuth()
  const puedeEscribir = esAdmin || esEmpleado

  const [facturas, setFacturas] = useState([])
  const [clientes, setClientes] = useState([])
  const [serviciosPendientes, setServiciosPendientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingServicios, setLoadingServicios] = useState(false)
  const [showFormGenerar, setShowFormGenerar] = useState(false)
  const [showDetalle, setShowDetalle] = useState(false)
  const [facturaDetalle, setFacturaDetalle] = useState(null)
  // cliente fijo para rol cliente, seleccionable para admin/empleado
  const [filtroCliente, setFiltroCliente] = useState(esCliente ? String(clienteId) : '')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [error, setError] = useState('')
  const [generando, setGenerando] = useState(false)
  const [generandoTodas, setGenerandoTodas] = useState(false)
  const [seleccionados, setSeleccionados] = useState([])
  const [form, setForm] = useState({ cliente: '', fecha_vencimiento: '' })
  const [marcandoPagada, setMarcandoPagada] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)
  const [generandoPDF, setGenerandoPDF] = useState(false)
  const printRef = useRef(null)
  const [tab, setTab] = useState('facturas')
  const [pendientesGlobal, setPendientesGlobal] = useState([])
  const [loadingPendientes, setLoadingPendientes] = useState(false)

  useEffect(() => {
    if (puedeEscribir) {
      cargarTodosClientes()
      cargarPendientesGlobal()
    }
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

  const cargarPendientesGlobal = () => {
    setLoadingPendientes(true)
    api.get('/servicios/prestados/?facturado=false&page_size=200')
      .then(r => setPendientesGlobal(r.data.results || r.data))
      .catch(console.error)
      .finally(() => setLoadingPendientes(false))
  }

  useEffect(() => { cargar() }, [filtroCliente, filtroEstado])

  const cargar = () => {
    setLoading(true)
    let url = '/facturacion/facturas/?'
    if (filtroCliente) url += `cliente=${filtroCliente}&`
    if (filtroEstado)  url += `estado=${filtroEstado}&`
    api.get(url)
      .then(r => setFacturas(r.data.results || r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const showToast = (msg, tipo = 'exito') => {
    setToastMsg({ msg, tipo })
    setTimeout(() => setToastMsg(null), 4000)
  }

  const abrirGenerar = (clienteId = '') => {
    setForm({ cliente: clienteId ? String(clienteId) : '', fecha_vencimiento: '' })
    setServiciosPendientes([])
    setSeleccionados([])
    setError('')
    setShowFormGenerar(true)
    if (clienteId) cargarServiciosPendientes(String(clienteId))
  }

  const generarTodasLasFacturas = async () => {
    const porCliente = {}
    pendientesGlobal.forEach(s => {
      if (!porCliente[s.cliente]) porCliente[s.cliente] = []
      porCliente[s.cliente].push(s.id)
    })
    const grupos = Object.entries(porCliente)
    if (grupos.length === 0) return
    if (!window.confirm(`¿Generar ${grupos.length} factura${grupos.length > 1 ? 's' : ''} automáticamente? Se usará vencimiento a 30 días.`)) return

    setGenerandoTodas(true)
    let exitosas = 0
    const hoy = new Date()
    const vencimiento = new Date(hoy.setDate(hoy.getDate() + 30)).toISOString().split('T')[0]

    for (const [clienteId, serviciosIds] of grupos) {
      try {
        await api.post('/facturacion/facturas/generar/', { cliente: clienteId, fecha_vencimiento: vencimiento, servicios_ids: serviciosIds })
        exitosas++
      } catch (e) { console.error(`Error generando factura para cliente ${clienteId}:`, e) }
    }

    setGenerandoTodas(false)
    cargar(); cargarPendientesGlobal(); setTab('facturas')
    showToast(`${exitosas} factura${exitosas > 1 ? 's' : ''} generada${exitosas > 1 ? 's' : ''} correctamente.`)
  }

  const cargarServiciosPendientes = async (cid) => {
    if (!cid) { setServiciosPendientes([]); setSeleccionados([]); return }
    setLoadingServicios(true); setServiciosPendientes([]); setSeleccionados([])
    try {
      const res = await api.get(`/servicios/prestados/?cliente=${cid}&facturado=false&page_size=100`)
      const lista = res.data.results || res.data || []
      setServiciosPendientes(lista)
      setSeleccionados(lista.map(s => s.id))
    } catch { setError('Error al cargar los servicios pendientes.') }
    finally { setLoadingServicios(false) }
  }

  const toggleSeleccion = (id) => setSeleccionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const toggleTodos = () => { if (seleccionados.length === serviciosPendientes.length) setSeleccionados([]); else setSeleccionados(serviciosPendientes.map(s => s.id)) }

  const generarFactura = async () => {
    if (!form.cliente) { setError('Selecciona un cliente.'); return }
    if (!form.fecha_vencimiento) { setError('La fecha de vencimiento es obligatoria.'); return }
    if (seleccionados.length === 0) { setError('Selecciona al menos un servicio.'); return }
    setGenerando(true); setError('')
    try {
      await api.post('/facturacion/facturas/generar/', { cliente: form.cliente, fecha_vencimiento: form.fecha_vencimiento, servicios_ids: seleccionados })
      setShowFormGenerar(false); setTab('facturas'); cargar(); cargarPendientesGlobal()
      showToast('Factura generada correctamente.')
    } catch (e) { setError(e.response?.data?.error || 'Error al generar la factura.') }
    finally { setGenerando(false) }
  }

  const verDetalle = async (factura) => {
    try {
      const res = await api.get(`/facturacion/facturas/${factura.id}/`)
      setFacturaDetalle(res.data); setShowDetalle(true)
    } catch (e) { console.error('Error cargando detalle:', e) }
  }

  const marcarPagada = async (factura) => {
    if (!window.confirm(`¿Confirmar pago de ${factura.numero_factura}?`)) return
    setMarcandoPagada(true)
    try {
      const res = await api.post(`/facturacion/facturas/${factura.id}/marcar_pagada/`)
      cargar()
      if (showDetalle) { const updated = await api.get(`/facturacion/facturas/${factura.id}/`); setFacturaDetalle(updated.data) }
      showToast(res.data.correo_enviado ? `✅ Factura pagada. Correo enviado a ${res.data.correo_destinatario}` : '✅ Factura marcada como pagada.')
    } catch (e) { showToast(e.response?.data?.error || 'Error al marcar como pagada.', 'error') }
    finally { setMarcandoPagada(false) }
  }

  const loadScript = (src) => new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src; s.onload = resolve; s.onerror = reject
    document.head.appendChild(s)
  })

  const descargarPDF = async (factura) => {
    setGenerandoPDF(true)
    try {
      let detalle = factura
      if (!factura.detalles) { const res = await api.get(`/facturacion/facturas/${factura.id}/`); detalle = res.data }
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js')

      const { jsPDF } = window.jspdf
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const W = doc.internal.pageSize.getWidth()
      const nombreCliente = getNombreCliente(detalle)

      doc.setFillColor(13, 17, 23)
      doc.roundedRect(0, 0, W, 50, 0, 0, 'F')
      doc.setTextColor(100, 130, 180); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
      doc.text('FACTURA DE SERVICIOS LOGÍSTICOS', 14, 13)
      doc.setTextColor(255, 255, 255); doc.setFontSize(19)
      doc.text(detalle.numero_factura, 14, 26)
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(170, 190, 220)
      doc.text(`Cliente: ${nombreCliente}`, 14, 37)
      doc.text(`Emitida: ${new Date(detalle.fecha_emision).toLocaleDateString('es-CO')}   Vence: ${new Date(detalle.fecha_vencimiento).toLocaleDateString('es-CO')}`, 14, 44)

      const estado = getEstado(detalle.estado)
      const badgeColors = { pendiente:[255,237,213], pagada:[209,250,229], vencida:[254,226,226] }
      const textColors  = { pendiente:[180,83,9],    pagada:[6,95,70],     vencida:[185,28,28] }
      const bc = badgeColors[detalle.estado] || [240,243,248]
      const tc = textColors[detalle.estado]  || [30,42,59]
      doc.setFillColor(...bc); doc.roundedRect(W-46,17,34,10,3,3,'F')
      doc.setTextColor(...tc); doc.setFontSize(8); doc.setFont('helvetica','bold')
      doc.text(`${estado.label.toUpperCase()}`, W-29, 23.5, { align:'center' })

      const filas = (detalle.detalles||[]).map(d => [d.descripcion, String(d.cantidad), `$${Number(d.valor_unitario).toLocaleString('es-CO')}`, `$${Number(d.subtotal).toLocaleString('es-CO')}`])
      doc.autoTable({
        startY:60, head:[['Descripción del servicio','Cant.','V. Unitario','Subtotal']], body:filas,
        headStyles:{fillColor:[247,248,251],textColor:[130,143,163],fontStyle:'bold',fontSize:8,cellPadding:5},
        bodyStyles:{fontSize:10,textColor:[28,36,51],cellPadding:5},
        columnStyles:{0:{cellWidth:90},1:{cellWidth:20,halign:'center'},2:{cellWidth:35,halign:'right'},3:{cellWidth:35,halign:'right',fontStyle:'bold',textColor:[5,150,105]}},
        alternateRowStyles:{fillColor:[249,250,252]},
        tableLineColor:[229,233,240],tableLineWidth:0.3,margin:{left:14,right:14},
      })

      const finalY = doc.lastAutoTable.finalY + 8
      const boxX = W-80; const boxW = 68
      doc.setFillColor(247,248,251); doc.setDrawColor(229,233,240); doc.setLineWidth(0.4)
      doc.roundedRect(boxX,finalY,boxW,38,3,3,'FD')
      doc.setTextColor(138,151,173); doc.setFontSize(9); doc.setFont('helvetica','normal')
      doc.text('Subtotal', boxX+6, finalY+9)
      doc.text('IVA (19%)', boxX+6, finalY+18)
      doc.setTextColor(107,122,153)
      doc.text(`$${Number(detalle.subtotal).toLocaleString('es-CO')}`, boxX+boxW-6, finalY+9, {align:'right'})
      doc.text(`$${Number(detalle.impuestos).toLocaleString('es-CO')}`, boxX+boxW-6, finalY+18, {align:'right'})
      doc.setDrawColor(229,233,240); doc.line(boxX+4,finalY+23,boxX+boxW-4,finalY+23)
      doc.setTextColor(13,17,23); doc.setFontSize(11); doc.setFont('helvetica','bold')
      doc.text('TOTAL', boxX+6, finalY+32)
      doc.setTextColor(5,150,105); doc.setFontSize(13)
      doc.text(`$${Number(detalle.total).toLocaleString('es-CO')} COP`, boxX+boxW-6, finalY+32, {align:'right'})

      const pageH = doc.internal.pageSize.getHeight()
      doc.setFillColor(247,248,251); doc.rect(0,pageH-18,W,18,'F')
      doc.setTextColor(176,186,201); doc.setFontSize(8); doc.setFont('helvetica','normal')
      doc.text('Sistema de Gestión Logística  ·  Documento generado automáticamente', W/2, pageH-8, {align:'center'})
      doc.save(`${detalle.numero_factura}.pdf`)
      showToast(`PDF generado: ${detalle.numero_factura}.pdf`)
    } catch (e) { console.error(e); showToast('Error al generar el PDF.', 'error') }
    finally { setGenerandoPDF(false) }
  }

  const getEstado = (v) => ESTADOS.find(e => e.value === v) || ESTADOS[0]

  const getNombreCliente = (idOrFactura) => {
    if (!idOrFactura) return '—'
    if (typeof idOrFactura === 'object' && idOrFactura.cliente_nombre) return idOrFactura.cliente_nombre
    if (typeof idOrFactura === 'object' && idOrFactura.cliente) {
      if (typeof idOrFactura.cliente === 'object' && idOrFactura.cliente.nombre) return idOrFactura.cliente.nombre
      idOrFactura = idOrFactura.cliente
    }
    return clientes.find(c => String(c.id) === String(idOrFactura))?.nombre || '—'
  }

  const serviciosSeleccionados = serviciosPendientes.filter(s => seleccionados.includes(s.id))
  const subtotalPreview = serviciosSeleccionados.reduce((s, p) => s + parseFloat(p.valor_total || 0), 0)
  const ivaPreview = subtotalPreview * 0.19
  const totalPreview = subtotalPreview + ivaPreview
  const totalPendiente = facturas.filter(f => f.estado === 'pendiente').reduce((s, f) => s + parseFloat(f.total || 0), 0)
  const totalPagado = facturas.filter(f => f.estado === 'pagada').reduce((s, f) => s + parseFloat(f.total || 0), 0)
  const clientesConPendientes = [...new Set(pendientesGlobal.map(s => s.cliente))].length

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
        .fac { font-family:'DM Sans',sans-serif; color:var(--ink); min-height:100vh; background:#f4f6fa; padding:32px; }
        .fac-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; }
        .fac-eyebrow { font-family:'JetBrains Mono',monospace; font-size:10px; font-weight:500; letter-spacing:0.18em; text-transform:uppercase; color:var(--accent); margin-bottom:6px; }
        .fac-title { font-family:'Syne',sans-serif; font-size:26px; font-weight:800; color:var(--ink); letter-spacing:-0.03em; line-height:1; margin-bottom:4px; }
        .fac-subtitle { font-size:13px; color:var(--faint); font-weight:400; }
        .btn { font-family:'DM Sans',sans-serif; font-weight:600; font-size:13px; padding:9px 18px; border-radius:8px; border:none; cursor:pointer; transition:all 0.15s; white-space:nowrap; display:inline-flex; align-items:center; gap:6px; }
        .btn-primary { background:var(--ink); color:#fff; }
        .btn-primary:hover { background:var(--ink2); transform:translateY(-1px); box-shadow:0 4px 12px rgba(13,17,23,0.2); }
        .btn-success { background:var(--green); color:#fff; }
        .btn-success:hover { background:#047857; transform:translateY(-1px); box-shadow:0 4px 12px rgba(5,150,105,0.3); }
        .btn-ghost { background:var(--white); color:var(--muted); border:1.5px solid var(--line); }
        .btn-ghost:hover { background:var(--surface); color:var(--ink); border-color:#d0d7e3; }
        .btn-sm { padding:5px 12px; font-size:12px; border-radius:6px; }
        .btn-view { background:var(--accent-soft); color:var(--accent); border:1px solid var(--accent-border); }
        .btn-view:hover { background:var(--accent); color:#fff; }
        .btn-pdf { background:var(--red-soft); color:var(--red); border:1px solid var(--red-border); }
        .btn-pdf:hover { background:var(--red); color:#fff; }
        .btn-pay { background:var(--green-soft); color:var(--green); border:1px solid var(--green-border); }
        .btn-pay:hover { background:var(--green); color:#fff; }
        .btn:disabled { opacity:0.5; cursor:not-allowed !important; transform:none !important; box-shadow:none !important; }
        .tabs { display:flex; gap:4px; margin-bottom:24px; background:var(--white); border:1.5px solid var(--line); border-radius:10px; padding:4px; width:fit-content; }
        .tab { font-family:'DM Sans',sans-serif; font-weight:600; font-size:13px; padding:7px 18px; border-radius:7px; border:none; cursor:pointer; transition:all 0.15s; color:var(--muted); background:transparent; display:flex; align-items:center; gap:8px; }
        .tab:hover { color:var(--ink); background:var(--surface); }
        .tab.active { background:var(--ink); color:#fff; box-shadow:0 2px 8px rgba(13,17,23,0.15); }
        .tab-badge { background:var(--red); color:#fff; border-radius:10px; padding:1px 7px; font-size:10px; font-weight:700; }
        .tab.active .tab-badge { background:var(--accent); }
        .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:24px; }
        .kpi-card { background:var(--white); border:1.5px solid var(--line); border-radius:var(--radius); padding:18px 20px; box-shadow:var(--shadow); }
        .kpi-label { font-family:'JetBrains Mono',monospace; font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.1em; color:var(--faint); margin-bottom:8px; }
        .kpi-value { font-family:'JetBrains Mono',monospace; font-size:20px; font-weight:600; }
        .filters { display:flex; gap:10px; margin-bottom:16px; align-items:center; }
        .inp, .sel { font-family:'DM Sans',sans-serif; font-size:13px; padding:9px 13px; background:var(--white); border:1.5px solid var(--line); border-radius:8px; color:var(--ink); outline:none; transition:border-color 0.15s,box-shadow 0.15s; }
        .inp:focus, .sel:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(37,99,235,0.1); }
        .table-wrap { background:var(--white); border-radius:var(--radius); border:1.5px solid var(--line); overflow:hidden; box-shadow:var(--shadow); }
        .tbl-head th { padding:10px 16px; text-align:left; font-family:'JetBrains Mono',monospace; font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.09em; color:var(--faint); background:var(--surface); border-bottom:1px solid var(--line); }
        .tbl-row td { padding:13px 16px; border-bottom:1px solid #f1f4f9; transition:background 0.1s; }
        .tbl-row:last-child td { border-bottom:none; }
        .tbl-row:hover td { background:#f8faff; }
        .badge { padding:3px 10px; border-radius:5px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; border:1px solid; display:inline-block; }
        .num-badge { background:var(--surface); color:var(--ink); border:1px solid var(--line); padding:3px 8px; border-radius:4px; font-size:12px; font-weight:700; font-family:'JetBrains Mono',monospace; }
        .pending-group { background:var(--white); border-radius:var(--radius); border:1.5px solid var(--line); overflow:hidden; box-shadow:var(--shadow); }
        .pending-group-header { display:flex; justify-content:space-between; align-items:center; padding:16px 20px; background:var(--surface); border-bottom:1px solid var(--line); }
        .client-avatar { width:38px; height:38px; border-radius:9px; background:var(--ink); color:#fff; display:flex; align-items:center; justify-content:center; font-family:'Syne',sans-serif; font-weight:700; font-size:15px; flex-shrink:0; }
        .empty { padding:64px; text-align:center; }
        .overlay { position:fixed; inset:0; background:rgba(10,15,28,0.65); display:flex; align-items:center; justify-content:center; z-index:1000; backdrop-filter:blur(6px); }
        .modal { background:var(--white); border-radius:14px; box-shadow:var(--shadow-lg); animation:modalIn 0.2s cubic-bezier(.34,1.56,.64,1); }
        @keyframes modalIn { from{opacity:0;transform:translateY(16px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        .modal-header { padding:26px 30px 20px; border-bottom:1px solid var(--line); }
        .modal-body { padding:22px 30px; overflow-y:auto; }
        .modal-footer { padding:16px 30px 24px; border-top:1px solid var(--line); display:flex; justify-content:flex-end; gap:8px; }
        .modal-eyebrow { font-family:'JetBrains Mono',monospace; font-size:10px; font-weight:500; letter-spacing:0.15em; text-transform:uppercase; color:var(--accent); margin-bottom:5px; }
        .modal-title { font-family:'Syne',sans-serif; font-size:18px; font-weight:700; color:var(--ink); letter-spacing:-0.02em; }
        .label { display:block; font-family:'JetBrains Mono',monospace; font-size:10.5px; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; color:var(--muted); margin-bottom:6px; }
        .field { margin-bottom:16px; }
        .field .inp, .field .sel { width:100%; }
        .field-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:16px; }
        .svc-item { border:1.5px solid var(--line); border-radius:9px; overflow:hidden; transition:border-color 0.15s,box-shadow 0.15s; cursor:pointer; }
        .svc-item:hover { border-color:#d0d7e3; }
        .svc-item.sel { border-color:var(--accent); box-shadow:0 0 0 3px rgba(37,99,235,0.1); }
        .svc-item-inner { display:flex; align-items:center; gap:12px; padding:12px 14px; transition:background 0.1s; }
        .svc-item.sel .svc-item-inner { background:var(--accent-soft); }
        .chk { width:17px; height:17px; border-radius:4px; border:2px solid #cbd5e1; background:var(--white); display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all 0.13s; }
        .chk.on { background:var(--accent); border-color:var(--accent); }
        .summary-box { background:var(--surface); border:1px solid var(--line); border-radius:9px; padding:16px; }
        .summary-row { display:flex; justify-content:space-between; margin-bottom:8px; }
        .summary-total { display:flex; justify-content:space-between; border-top:2px solid var(--line); padding-top:10px; margin-top:4px; }
        .err { background:var(--red-soft); border:1px solid var(--red-border); color:var(--red); padding:10px 14px; border-radius:8px; margin-bottom:18px; font-size:12.5px; font-weight:500; }
        .close-btn { background:var(--surface); border:none; border-radius:8px; width:32px; height:32px; cursor:pointer; color:var(--muted); font-weight:700; font-size:14px; display:flex; align-items:center; justify-content:center; transition:all 0.15s; flex-shrink:0; }
        .close-btn:hover { background:var(--line); color:var(--ink); }
        .toast { position:fixed; bottom:28px; right:28px; padding:14px 20px; border-radius:10px; font-size:13px; font-weight:600; font-family:'DM Sans',sans-serif; box-shadow:0 8px 28px rgba(0,0,0,0.15); z-index:9999; animation:toastIn 0.25s ease; max-width:380px; }
        .toast-exito { background:var(--ink); color:#fff; }
        .toast-error { background:var(--red-soft); color:var(--red); border:1px solid var(--red-border); }
        @keyframes toastIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .modal-body::-webkit-scrollbar { width:4px; }
        .modal-body::-webkit-scrollbar-thumb { background:var(--line); border-radius:2px; }
        .divider { height:1px; background:var(--line); margin:16px 0; }
      `}</style>

      {toastMsg && <div className={`toast toast-${toastMsg.tipo}`}>{toastMsg.msg}</div>}

      <div className="fac">
        <div className="fac-header">
          <div>
            <p className="fac-eyebrow">// Gestión</p>
            <h1 className="fac-title">Facturación</h1>
            <p className="fac-subtitle">
              {esCliente ? 'Tus facturas y estado de cuenta' : 'Genera y gestiona facturas por servicios prestados'}
            </p>
          </div>
        </div>

        {/* Tabs: cliente solo ve "Mis facturas", admin/empleado ven ambas */}
        <div className="tabs">
          <button className={`tab${tab==='facturas'?' active':''}`} onClick={() => setTab('facturas')}>
            🧾 {esCliente ? 'Mis facturas' : 'Facturas'}
          </button>
          {puedeEscribir && (
            <button className={`tab${tab==='pendientes'?' active':''}`} onClick={() => { setTab('pendientes'); cargarPendientesGlobal() }}>
              ⏳ Pendientes
              {pendientesGlobal.length > 0 && <span className="tab-badge">{pendientesGlobal.length}</span>}
            </button>
          )}
        </div>

        {/* ── TAB PENDIENTES (solo admin/empleado) ── */}
        {tab === 'pendientes' && puedeEscribir && (() => {
          const porCliente = {}
          pendientesGlobal.forEach(s => {
            if (!porCliente[s.cliente]) porCliente[s.cliente] = { nombre: s.cliente_nombre, items: [] }
            porCliente[s.cliente].items.push(s)
          })
          const grupos = Object.entries(porCliente)
          const UNID = { por_dia:'📅', por_recepcion:'📦', por_envio:'🚛', unitario:'◆' }

          return (
            <div>
              {loadingPendientes ? (
                <div style={{ padding:'48px', textAlign:'center', color:'var(--faint)', fontSize:'13px' }}>Cargando...</div>
              ) : grupos.length === 0 ? (
                <div style={{ background:'var(--white)', border:'1.5px solid var(--line)', borderRadius:'var(--radius)', padding:'56px', textAlign:'center', boxShadow:'var(--shadow)' }}>
                  <p style={{ fontSize:'32px', marginBottom:'10px' }}>✅</p>
                  <p style={{ color:'var(--muted)', fontSize:'14px', fontWeight:'500' }}>No hay cargos pendientes de facturar</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--white)', border:'1.5px solid var(--line)', borderRadius:'var(--radius)', padding:'14px 20px', boxShadow:'var(--shadow)' }}>
                    <div>
                      <p style={{ color:'var(--ink)', fontSize:'13px', fontWeight:'700', marginBottom:'2px' }}>{clientesConPendientes} cliente{clientesConPendientes>1?'s':''} con cargos pendientes</p>
                      <p style={{ color:'var(--faint)', fontSize:'11.5px' }}>Genera todas las facturas automáticamente con vencimiento a 30 días.</p>
                    </div>
                    <button className="btn btn-success" onClick={generarTodasLasFacturas} disabled={generandoTodas||grupos.length===0} style={{ flexShrink:0 }}>
                      {generandoTodas ? 'Generando...' : `🧾 Generar todas (${clientesConPendientes})`}
                    </button>
                  </div>
                  {grupos.map(([cid, grupo]) => {
                    const total = grupo.items.reduce((s, i) => s + parseFloat(i.valor_total||0), 0)
                    return (
                      <div key={cid} className="pending-group">
                        <div className="pending-group-header">
                          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                            <div className="client-avatar">{grupo.nombre?.charAt(0).toUpperCase()}</div>
                            <div>
                              <p style={{ color:'var(--ink)', fontSize:'14px', fontWeight:'700', marginBottom:'2px', fontFamily:'Syne,sans-serif' }}>{grupo.nombre}</p>
                              <p style={{ color:'var(--faint)', fontSize:'11px' }}>{grupo.items.length} cargo{grupo.items.length>1?'s':''} pendiente{grupo.items.length>1?'s':''}</p>
                            </div>
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
                            <div style={{ textAlign:'right' }}>
                              <p style={{ color:'var(--faint)', fontSize:'10px', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:'JetBrains Mono,monospace', marginBottom:'3px' }}>Total pendiente</p>
                              <p style={{ color:'var(--red)', fontSize:'17px', fontWeight:'700', fontFamily:'JetBrains Mono,monospace' }}>${total.toLocaleString('es-CO')}</p>
                            </div>
                            <button className="btn btn-primary" onClick={() => { setTab('facturas'); abrirGenerar(cid) }} style={{ fontSize:'12px', padding:'8px 14px' }}>🧾 Generar factura</button>
                          </div>
                        </div>
                        <table style={{ width:'100%', borderCollapse:'collapse' }}>
                          <thead>
                            <tr>{['Servicio','Fecha','Cant.','Valor','Observación'].map(h => (
                              <th key={h} style={{ padding:'8px 16px', textAlign:'left', fontFamily:'JetBrains Mono,monospace', color:'var(--faint)', fontSize:'10px', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.07em', background:'#fbfcfd', borderBottom:'1px solid #f0f3f8' }}>{h}</th>
                            ))}</tr>
                          </thead>
                          <tbody>
                            {grupo.items.map((item, idx) => (
                              <tr key={item.id} style={{ borderBottom:idx<grupo.items.length-1?'1px solid #f1f4f9':'none' }}>
                                <td style={{ padding:'11px 16px' }}>
                                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                                    <span style={{ fontSize:'14px' }}>{UNID[item.unidad]||'◆'}</span>
                                    <span style={{ color:'var(--ink)', fontSize:'13px', fontWeight:'600' }}>{item.catalogo_nombre}</span>
                                  </div>
                                </td>
                                <td style={{ padding:'11px 16px', color:'var(--faint)', fontSize:'12px', fontFamily:'JetBrains Mono,monospace' }}>{new Date(item.fecha).toLocaleDateString('es-CO')}</td>
                                <td style={{ padding:'11px 16px', color:'var(--muted)', fontSize:'13px', textAlign:'center', fontFamily:'JetBrains Mono,monospace' }}>{item.cantidad}</td>
                                <td style={{ padding:'11px 16px' }}><span style={{ color:'var(--green)', fontWeight:'700', fontSize:'13px', fontFamily:'JetBrains Mono,monospace' }}>${Number(item.valor_total).toLocaleString('es-CO')}</span></td>
                                <td style={{ padding:'11px 16px', color:'var(--faint)', fontSize:'12px' }}>{item.observacion||<span style={{color:'var(--line)'}}>—</span>}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })()}

        {/* ── TAB FACTURAS ── */}
        {tab === 'facturas' && (
          <>
            <div className="kpi-grid">
              {[
                { label:'Total facturas', value:facturas.length, color:'var(--accent)' },
                { label:'Por cobrar', value:`$${totalPendiente.toLocaleString('es-CO')}`, color:'var(--amber)' },
                { label:'Cobrado', value:`$${totalPagado.toLocaleString('es-CO')}`, color:'var(--green)' },
                { label:'Vencidas', value:facturas.filter(f=>f.estado==='vencida').length, color:'var(--red)' },
              ].map(k => (
                <div key={k.label} className="kpi-card">
                  <p className="kpi-label">{k.label}</p>
                  <p className="kpi-value" style={{ color:k.color }}>{k.value}</p>
                </div>
              ))}
            </div>

            <div className="filters">
              {/* Selector cliente solo para admin/empleado */}
              {puedeEscribir && (
                <select className="sel" value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} style={{ width:'240px' }}>
                  <option value="">Todos los clientes</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              )}
              <select className="sel" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ width:'180px' }}>
                <option value="">Todos los estados</option>
                {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.icon} {e.label}</option>)}
              </select>
            </div>

            <div className="table-wrap">
              {loading ? (
                <div style={{ padding:'48px', textAlign:'center', color:'var(--faint)', fontSize:'13px' }}>Cargando...</div>
              ) : facturas.length === 0 ? (
                <div className="empty">
                  <p style={{ fontSize:'40px', marginBottom:'12px' }}>🧾</p>
                  <p style={{ color:'var(--muted)', fontSize:'14px', fontWeight:'500' }}>
                    {esCliente ? 'Aún no tienes facturas emitidas' : 'No hay facturas generadas'}
                  </p>
                </div>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr className="tbl-head">
                      {['N° Factura', ...(puedeEscribir?['Cliente']:[]), 'Emisión','Vencimiento','Total','Estado','Acciones'].map(h => <th key={h}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {facturas.map(f => {
                      const estado = getEstado(f.estado)
                      return (
                        <tr key={f.id} className="tbl-row">
                          <td><span className="num-badge">{f.numero_factura}</span></td>
                          {puedeEscribir && <td style={{ color:'var(--ink)', fontSize:'13px', fontWeight:'600' }}>{getNombreCliente(f)}</td>}
                          <td style={{ color:'var(--muted)', fontSize:'12px', fontFamily:'JetBrains Mono,monospace' }}>{new Date(f.fecha_emision).toLocaleDateString('es-CO')}</td>
                          <td style={{ color:f.estado==='vencida'?'var(--red)':'var(--muted)', fontSize:'12px', fontWeight:f.estado==='vencida'?'600':'400', fontFamily:'JetBrains Mono,monospace' }}>{new Date(f.fecha_vencimiento).toLocaleDateString('es-CO')}</td>
                          <td style={{ color:'var(--green)', fontSize:'14px', fontWeight:'700', fontFamily:'JetBrains Mono,monospace' }}>${Number(f.total).toLocaleString('es-CO')}</td>
                          <td><span className="badge" style={{ background:estado.bg, color:estado.color, borderColor:estado.border }}>{estado.icon} {estado.label}</span></td>
                          <td>
                            <div style={{ display:'flex', gap:'6px' }}>
                              <button className="btn btn-sm btn-view" onClick={() => verDetalle(f)}>Ver</button>
                              <button className="btn btn-sm btn-pdf" onClick={() => descargarPDF(f)} disabled={generandoPDF}>{generandoPDF?'...':'⬇ PDF'}</button>
                            </div>
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

        {/* ── Modal Generar Factura (solo admin/empleado) ── */}
        {showFormGenerar && puedeEscribir && (
          <div className="overlay">
            <div className="modal" style={{ width:'580px', maxHeight:'90vh', display:'flex', flexDirection:'column' }}>
              <div className="modal-header">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div><p className="modal-eyebrow">// Nueva factura</p><h2 className="modal-title">Generar factura al cliente</h2></div>
                  <button className="close-btn" onClick={() => setShowFormGenerar(false)}>✕</button>
                </div>
              </div>
              <div className="modal-body">
                {error && <div className="err">⚠ {error}</div>}
                <div className="field-grid-2">
                  <div>
                    <label className="label">Cliente *</label>
                    <select className="sel" value={form.cliente} onChange={e => { const id=e.target.value; setForm({...form,cliente:id}); setError(''); cargarServiciosPendientes(id) }} style={{ width:'100%' }}>
                      <option value="">Seleccionar cliente</option>
                      {clientes.map(c => <option key={c.id} value={String(c.id)}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Fecha de vencimiento *</label>
                    <input className="inp" type="date" value={form.fecha_vencimiento} onChange={e => setForm({...form,fecha_vencimiento:e.target.value})} style={{ width:'100%' }} />
                  </div>
                </div>
                {form.cliente && (
                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
                      <label className="label" style={{ margin:0 }}>Servicios a incluir</label>
                      {serviciosPendientes.length > 0 && (
                        <button onClick={toggleTodos} style={{ background:'none', border:'none', color:'var(--accent)', fontSize:'12px', fontWeight:'600', cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
                          {seleccionados.length===serviciosPendientes.length?'Deseleccionar todos':'Seleccionar todos'}
                        </button>
                      )}
                    </div>
                    {loadingServicios ? (
                      <div style={{ padding:'24px', textAlign:'center', color:'var(--faint)', fontSize:'13px', background:'var(--surface)', borderRadius:'8px', border:'1px solid var(--line)' }}>Cargando servicios...</div>
                    ) : serviciosPendientes.length === 0 ? (
                      <div style={{ background:'var(--red-soft)', border:'1px solid var(--red-border)', color:'var(--red)', padding:'12px 14px', borderRadius:'7px', fontSize:'13px', fontWeight:'500', marginBottom:'16px' }}>⚠ Este cliente no tiene servicios pendientes de facturar.</div>
                    ) : (
                      <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginBottom:'16px' }}>
                        {serviciosPendientes.map(s => {
                          const sel = seleccionados.includes(s.id)
                          const u = UNIDADES[s.unidad]||UNIDADES.unitario
                          return (
                            <div key={s.id} className={`svc-item${sel?' sel':''}`} onClick={() => toggleSeleccion(s.id)}>
                              <div className="svc-item-inner">
                                <div className={`chk${sel?' on':''}`}>{sel&&<span style={{color:'#fff',fontSize:'10px',fontWeight:'700'}}>✓</span>}</div>
                                <span style={{ fontSize:'16px' }}>{u.icon}</span>
                                <div style={{ flex:1 }}>
                                  <p style={{ color:'var(--ink)', fontSize:'13px', fontWeight:'600', marginBottom:'1px' }}>{s.catalogo_nombre}</p>
                                  <p style={{ color:'var(--faint)', fontSize:'11px', fontFamily:'JetBrains Mono,monospace' }}>{new Date(s.fecha).toLocaleDateString('es-CO')} · {s.cantidad} {u.label}{s.observacion?` · ${s.observacion}`:''}</p>
                                </div>
                                <p style={{ color:sel?'var(--green)':'var(--muted)', fontWeight:'700', fontSize:'13px', fontFamily:'JetBrains Mono,monospace', flexShrink:0 }}>${Number(s.valor_total).toLocaleString('es-CO')}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {seleccionados.length > 0 && (
                      <div className="summary-box">
                        <div className="summary-row"><span style={{color:'var(--faint)',fontSize:'12px'}}>Servicios seleccionados</span><span style={{color:'var(--muted)',fontSize:'12px',fontWeight:'600',fontFamily:'JetBrains Mono,monospace'}}>{seleccionados.length} de {serviciosPendientes.length}</span></div>
                        <div className="summary-row"><span style={{color:'var(--faint)',fontSize:'12px'}}>Subtotal</span><span style={{color:'var(--muted)',fontSize:'12px',fontFamily:'JetBrains Mono,monospace'}}>${subtotalPreview.toLocaleString('es-CO')}</span></div>
                        <div className="summary-row"><span style={{color:'var(--faint)',fontSize:'12px'}}>IVA 19%</span><span style={{color:'var(--muted)',fontSize:'12px',fontFamily:'JetBrains Mono,monospace'}}>${ivaPreview.toLocaleString('es-CO')}</span></div>
                        <div className="summary-total"><span style={{color:'var(--ink)',fontSize:'14px',fontWeight:'700'}}>Total a facturar</span><span style={{color:'var(--green)',fontSize:'20px',fontWeight:'700',fontFamily:'JetBrains Mono,monospace'}}>${totalPreview.toLocaleString('es-CO')}</span></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setShowFormGenerar(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={generarFactura} disabled={generando||seleccionados.length===0}>
                  {generando?'Generando...':`Generar factura${seleccionados.length>0?` (${seleccionados.length} servicio${seleccionados.length>1?'s':''})`:''}` }
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal Detalle ── */}
        {showDetalle && facturaDetalle && (
          <div className="overlay">
            <div className="modal" style={{ width:'560px', maxHeight:'90vh', display:'flex', flexDirection:'column' }}>
              <div className="modal-header">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <span className="num-badge" style={{ display:'inline-block', marginBottom:'8px' }}>{facturaDetalle.numero_factura}</span>
                    <h2 className="modal-title">{getNombreCliente(facturaDetalle)}</h2>
                    <p style={{ color:'var(--faint)', fontSize:'12px', marginTop:'3px' }}>Emitida: {new Date(facturaDetalle.fecha_emision).toLocaleDateString('es-CO')} · Vence: {new Date(facturaDetalle.fecha_vencimiento).toLocaleDateString('es-CO')}</p>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'8px' }}>
                    <button className="close-btn" onClick={() => setShowDetalle(false)}>✕</button>
                    {(() => { const e=getEstado(facturaDetalle.estado); return <span className="badge" style={{background:e.bg,color:e.color,borderColor:e.border}}>{e.icon} {e.label}</span> })()}
                  </div>
                </div>
              </div>
              <div className="modal-body">
                <label className="label" style={{ marginBottom:'10px', display:'block' }}>Servicios facturados</label>
                <div style={{ background:'var(--surface)', borderRadius:'8px', border:'1px solid var(--line)', overflow:'hidden', marginBottom:'16px' }}>
                  {(facturaDetalle.detalles||[]).map((d, i) => (
                    <div key={d.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', borderBottom:i<(facturaDetalle.detalles?.length-1)?'1px solid #f1f4f9':'none' }}>
                      <div>
                        <p style={{ color:'var(--ink)', fontSize:'13px', fontWeight:'600', marginBottom:'2px' }}>{d.descripcion}</p>
                        <p style={{ color:'var(--faint)', fontSize:'11px', fontFamily:'JetBrains Mono,monospace' }}>{d.cantidad} × ${Number(d.valor_unitario).toLocaleString('es-CO')}</p>
                      </div>
                      <p style={{ color:'var(--green)', fontWeight:'700', fontSize:'13px', fontFamily:'JetBrains Mono,monospace' }}>${Number(d.subtotal).toLocaleString('es-CO')}</p>
                    </div>
                  ))}
                </div>
                <div className="summary-box">
                  {[['Subtotal',facturaDetalle.subtotal],['IVA 19%',facturaDetalle.impuestos]].map(([k,v]) => (
                    <div key={k} className="summary-row">
                      <span style={{color:'var(--faint)',fontSize:'13px'}}>{k}</span>
                      <span style={{color:'var(--muted)',fontSize:'13px',fontFamily:'JetBrains Mono,monospace'}}>${Number(v).toLocaleString('es-CO')}</span>
                    </div>
                  ))}
                  <div className="summary-total">
                    <span style={{color:'var(--ink)',fontSize:'16px',fontWeight:'700'}}>Total</span>
                    <span style={{color:'var(--green)',fontSize:'22px',fontWeight:'700',fontFamily:'JetBrains Mono,monospace'}}>${Number(facturaDetalle.total).toLocaleString('es-CO')}</span>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-sm btn-pdf" onClick={() => descargarPDF(facturaDetalle)} disabled={generandoPDF} style={{ padding:'9px 18px', fontSize:'13px' }}>
                  {generandoPDF ? 'Generando PDF...' : '⬇ Descargar PDF'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}