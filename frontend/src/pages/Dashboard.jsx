import { useAuth } from '../context/AuthContext'
import DashboardAdmin from './DashboardAdmin'
import DashboardCliente from './DashboardCliente'

/**
 * Enrutador de dashboards por rol.
 * Para agregar un nuevo rol:
 *   1. Crea DashboardEmpleado.jsx
 *   2. Importa y agrega: else if (esEmpleado) return <DashboardEmpleado />
 */
export default function Dashboard() {
  const { esCliente } = useAuth()

  if (esCliente) return <DashboardCliente />

  // Admin y empleado comparten DashboardAdmin — internamente filtra módulos por rol
  return <DashboardAdmin />
}