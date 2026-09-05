import React from 'react'
import { useAuth } from '../lib/AuthContext'
import { useNavigate } from 'react-router-dom'
import AdminPanel from '../components/AdminPanel'
import { Button } from '../components/ui/button'

const Admin = () => {
  const { user, isLoadingAuth } = useAuth()
  const navigate = useNavigate()

  if (isLoadingAuth) {
    return (
      <div>
        <p>Cargando...</p>
      </div>
    )
  }

  // Verificar que es admin
  if (!user || user.role !== 'admin') {
    console.log('[Admin] User:', user, 'Role:', user?.role)
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h1 style={{ color: '#ef4444' }}>Acceso Denegado</h1>
        <p style={{ color: '#cbd5e1' }}>Solo los administradores pueden acceder a este panel.</p>
        <Button onClick={() => navigate('/')} style={{ marginTop: '20px' }}>
          Volver al inicio
        </Button>
      </div>
    )
  }

  return <AdminPanel />
}

export default Admin
