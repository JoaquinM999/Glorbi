import React, { useState, useEffect } from 'react'
import { fetchAllUsers, fetchAdminStats, deleteUser, updateUser } from '../api/admin'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog'
import CreateUserForm from './AdminCreateUserForm'
import UserDetailsModal from './AdminUserDetailsModal'
import './AdminPanel.css'

const AdminPanel = () => {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showUserDetails, setShowUserDetails] = useState(false)

  // Cargar usuarios y estadísticas
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('[AdminPanel] Cargando datos...')
      
      const usersRes = await fetchAllUsers()
      console.log('[AdminPanel] Usuarios cargados:', usersRes)
      
      const statsRes = await fetchAdminStats()
      console.log('[AdminPanel] Stats cargadas:', statsRes)
      
      setUsers(usersRes.data || [])
      setStats(statsRes.data)
    } catch (err) {
      console.error('[AdminPanel] Error cargando datos:', err)
      setError(err.response?.data?.error || err.message || 'Error cargando datos')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId) => {
    try {
      await deleteUser(userId)
      setUsers(users.filter(u => u.id !== userId))
    } catch (err) {
      setError(err.response?.data?.error || 'Error eliminando usuario')
    }
  }

  const handleUserCreated = (newUser) => {
    setUsers([...users, newUser])
    setShowCreateForm(false)
    loadData()
  }

  const handleUserUpdated = (updatedUser) => {
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u))
    setSelectedUser(null)
    setShowUserDetails(false)
  }

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="admin-header">
          <h1>Panel de Administración</h1>
          <p>Cargando datos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-panel">
      {/* Header */}
      <div className="admin-header">
        <h1>Panel de Administración</h1>
        <p>Gestión de usuarios y credenciales</p>
      </div>

      {/* Error */}
      {error && (
        <div className="admin-error">
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Estadísticas */}
      {stats && (
        <div className="admin-stats">
          <Card className="stat-card">
            <div className="stat-label">Total Usuarios</div>
            <div className="stat-value">{stats.total_users}</div>
          </Card>
          <Card className="stat-card">
            <div className="stat-label">Admins</div>
            <div className="stat-value">{stats.admins}</div>
          </Card>
          <Card className="stat-card">
            <div className="stat-label">Verificados</div>
            <div className="stat-value">{stats.verified_emails}</div>
          </Card>
          <Card className="stat-card">
            <div className="stat-label">Con Binance</div>
            <div className="stat-value">{stats.users_with_binance}</div>
          </Card>
        </div>
      )}

      {/* Acciones */}
      <div className="admin-actions">
        <div className="search-bar">
          <Input
            placeholder="Buscar usuarios por email o nombre..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="admin-search"
          />
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="btn-primary">
          + Crear Usuario
        </Button>
      </div>

      {/* Modal: Crear Usuario */}
      {showCreateForm && (
        <CreateUserForm
          onSuccess={handleUserCreated}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Modal: Detalles Usuario */}
      {showUserDetails && selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onUpdate={handleUserUpdated}
          onClose={() => {
            setShowUserDetails(false)
            setSelectedUser(null)
          }}
        />
      )}

      {/* Tabla de Usuarios */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Nombre</th>
              <th>Rol</th>
              <th>Verificado</th>
              <th>Binance</th>
              <th>Creado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td className="email-cell">{user.email}</td>
                <td>{user.full_name || '-'}</td>
                <td>
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {user.role}
                  </Badge>
                </td>
                <td>
                  {user.email_verified ? (
                    <span className="verified">✓ Sí</span>
                  ) : (
                    <span className="unverified">✗ No</span>
                  )}
                </td>
                <td>
                  {user.has_binance_keys ? (
                    <span className="has-keys">✓ Sí</span>
                  ) : (
                    <span className="no-keys">-</span>
                  )}
                </td>
                <td className="created-cell">
                  {new Date(user.created_at).toLocaleDateString('es-AR')}
                </td>
                <td className="actions-cell">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedUser(user)
                      setShowUserDetails(true)
                    }}
                  >
                    Editar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive">
                        Eliminar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogTitle>Eliminar usuario</AlertDialogTitle>
                      <AlertDialogDescription>
                        ¿Estás seguro? No se puede deshacer. Se eliminarán todos los datos asociados.
                      </AlertDialogDescription>
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteUser(user.id)}
                          style={{ backgroundColor: '#dc2626' }}
                        >
                          Eliminar
                        </AlertDialogAction>
                      </div>
                    </AlertDialogContent>
                  </AlertDialog>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && (
        <div className="no-users">
          <p>No se encontraron usuarios</p>
        </div>
      )}
    </div>
  )
}

export default AdminPanel
