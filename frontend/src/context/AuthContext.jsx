import { createContext, useContext, useState, useEffect } from 'react'
import api, { setAccessToken } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const refresh = localStorage.getItem('refresh_token')
    if (refresh) {
      api.post('/auth/refresh/', { refresh })
        .then(({ data }) => { setAccessToken(data.access); return api.get('/auth/me/') })
        .then(({ data }) => setUser(data))
        .catch(() => localStorage.removeItem('refresh_token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login/', { email, password })
    setAccessToken(data.access)
    localStorage.setItem('refresh_token', data.refresh)
    const me = await api.get('/auth/me/')
    setUser(me.data)
    return me.data
  }

  const logout = async () => {
    try {
      const refresh = localStorage.getItem('refresh_token')
      await api.post('/auth/logout/', { refresh })
    } finally {
      setAccessToken(null)
      localStorage.removeItem('refresh_token')
      setUser(null)
    }
  }

  // ─── Helpers de rol ────────────────────────────────────────────────────────
  const esAdmin    = user?.rol?.nombre === 'admin'
  const esEmpleado = user?.rol?.nombre === 'empleado'
  const esCliente  = user?.rol?.nombre === 'cliente'

  // El backend tiene User.cliente como OneToOneField → /auth/me/ devuelve cliente_id
  // Soportamos tanto cliente_id (int/uuid) como cliente.id (objeto anidado)
  const clienteId = user?.cliente_id ?? user?.cliente?.id ?? null

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      loading,
      esAdmin,
      esEmpleado,
      esCliente,
      clienteId,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)