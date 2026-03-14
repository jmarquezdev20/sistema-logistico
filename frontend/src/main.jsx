import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import Bodegas from './pages/Bodegas'
import Transportadores from './pages/Transportadores'
import Inventario from './pages/Inventario'
import Envios from './pages/Envios'
import Servicios from './pages/Servicios'
import Facturacion from './pages/Facturacion'
import Pagos from './pages/Pagos'
import Usuarios from './pages/Usuarios'
import Auditoria from './pages/Auditoria'

// ─── Guards ────────────────────────────────────────────────────────────────

function PrivateRoute({ children, soloAdmin = false, soloAdminOEmpleado = false }) {
  const { user, loading, esAdmin, esEmpleado } = useAuth()

  if (loading) return <div style={{ color: '#e2e8f0', padding: '40px' }}>Cargando...</div>
  if (!user)   return <Navigate to="/login" replace />

  // Rutas exclusivas para admin
  if (soloAdmin && !esAdmin)
    return <Navigate to="/dashboard" replace />

  // Rutas exclusivas para admin o empleado (los clientes no pueden entrar)
  if (soloAdminOEmpleado && !esAdmin && !esEmpleado)
    return <Navigate to="/dashboard" replace />

  return <Layout>{children}</Layout>
}

// ─── App ────────────────────────────────────────────────────────────────────

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Todos los roles autenticados */}
        <Route path="/dashboard"  element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/inventario" element={<PrivateRoute><Inventario /></PrivateRoute>} />
        <Route path="/servicios"  element={<PrivateRoute><Servicios /></PrivateRoute>} />
        <Route path="/facturacion" element={<PrivateRoute><Facturacion /></PrivateRoute>} />
        <Route path="/pagos"      element={<PrivateRoute><Pagos /></PrivateRoute>} />
        <Route path="/envios"     element={<PrivateRoute><Envios /></PrivateRoute>} />

        {/* Solo admin o empleado — los clientes no ven estas secciones */}
        <Route path="/clientes"        element={<PrivateRoute soloAdminOEmpleado><Clientes /></PrivateRoute>} />
        <Route path="/bodegas"         element={<PrivateRoute soloAdminOEmpleado><Bodegas /></PrivateRoute>} />
        <Route path="/transportadores" element={<PrivateRoute soloAdminOEmpleado><Transportadores /></PrivateRoute>} />

        {/* Solo admin */}
        <Route path="/usuarios"  element={<PrivateRoute soloAdmin><Usuarios /></PrivateRoute>} />
        <Route path="/auditoria" element={<PrivateRoute soloAdmin><Auditoria /></PrivateRoute>} />

        <Route path="/"  element={<Navigate to="/dashboard" replace />} />
        <Route path="*"  element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <AuthProvider><App /></AuthProvider>
)