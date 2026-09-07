import React, { useState } from 'react'
import { updateUser, updateUserPassword, deleteUserCredentials, setUserCredentials } from '../api/admin'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Checkbox } from './ui/checkbox'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog'
import './AdminModal.css'

const UserDetailsModal = ({ user, onUpdate, onClose }) => {
  const [editData, setEditData] = useState({
    email: user.email,
    full_name: user.full_name || '',
    role: user.role,
    email_verified: user.email_verified,
  })
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [activeTab, setActiveTab] = useState('info')

  // Nuevo: campos para que el admin cargue credenciales de un usuario
  const [credBinanceKey, setCredBinanceKey] = useState('')
  const [credBinanceSecret, setCredBinanceSecret] = useState('')
  const [credIolUser, setCredIolUser] = useState('')
  const [credIolPass, setCredIolPass] = useState('')
  const [credLoading, setCredLoading] = useState(false)

  const handleSaveCredentials = async (e) => {
    e.preventDefault()
    setCredLoading(true)
    setError(null)
    try {
      await setUserCredentials(user.id, {
        binance_api_key: credBinanceKey || undefined,
        binance_api_secret: credBinanceSecret || undefined,
        iol_username: credIolUser || undefined,
        iol_password: credIolPass || undefined,
      })
      setSuccessMsg('Credenciales guardadas')
      setTimeout(() => setSuccessMsg(null), 2000)
      setCredBinanceKey('')
      setCredBinanceSecret('')
      setCredIolUser('')
      setCredIolPass('')
      // Refrescamos el estado local para reflejar "Conectado" sin esperar
      // a que se recargue toda la lista de usuarios.
      onUpdate({ ...user, has_binance_keys: user.has_binance_keys || !!credBinanceKey })
    } catch (err) {
      setError(err.response?.data?.error || 'Error guardando credenciales')
    } finally {
      setCredLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setEditData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleRoleChange = (value) => {
    setEditData(prev => ({ ...prev, role: value }))
  }

  const handleSaveInfo = async (e) => {
    e.preventDefault()
    console.log('[DEBUG] handleSaveInfo — enviando:', {
      email: editData.email,
      full_name: editData.full_name,
      role: editData.role,
      email_verified: editData.email_verified,
      tipo_email_verified: typeof editData.email_verified,
    })
    try {
      setLoading(true)
      const res = await updateUser(user.id, {
        email: editData.email,
        full_name: editData.full_name,
        role: editData.role,
        email_verified: editData.email_verified,
      })
      console.log('[DEBUG] handleSaveInfo — respuesta del servidor:', res.data)
      onUpdate(res.data.user)
      setSuccessMsg('Usuario actualizado')
      setTimeout(() => setSuccessMsg(null), 2000)
    } catch (err) {
      console.error('[DEBUG] handleSaveInfo — ERROR:', err.response?.data || err.message)
      setError(err.response?.data?.error || 'Error actualizando usuario')
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      setError('Contraseña mínimo 6 caracteres')
      return
    }

    try {
      setLoading(true)
      await updateUserPassword(user.id, newPassword)
      setNewPassword('')
      setSuccessMsg('Contraseña actualizada')
      setTimeout(() => setSuccessMsg(null), 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'Error actualizando contraseña')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCredentials = async () => {
    try {
      setLoading(true)
      await deleteUserCredentials(user.id)
      setSuccessMsg('Credenciales eliminadas')
      setTimeout(() => setSuccessMsg(null), 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'Error eliminando credenciales')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="admin-dialog large">
        <DialogHeader>
          <DialogTitle>Editar Usuario: {user.email}</DialogTitle>
          <DialogDescription>
            Gestiona los detalles y credenciales del usuario
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="admin-error-inline">
            {error}
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {successMsg && (
          <div className="admin-success-inline">
            {successMsg}
          </div>
        )}

        {/* Tabs */}
        <div className="admin-tabs">
          <button
            className={`tab ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            Información
          </button>
          <button
            className={`tab ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => setActiveTab('password')}
          >
            Contraseña
          </button>
          <button
            className={`tab ${activeTab === 'credentials' ? 'active' : ''}`}
            onClick={() => setActiveTab('credentials')}
          >
            Credenciales
          </button>
        </div>

        {/* Tab: Información */}
        {activeTab === 'info' && (
          <form onSubmit={handleSaveInfo} className="admin-form">
            <div className="form-group">
              <label>Email</label>
              <Input
                type="email"
                name="email"
                value={editData.email}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Nombre Completo</label>
              <Input
                type="text"
                name="full_name"
                value={editData.full_name}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Rol</label>
              <Select value={editData.role} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuario</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="form-group checkbox">
              <Checkbox
                id="email_verified"
                name="email_verified"
                checked={editData.email_verified}
                onCheckedChange={(checked) =>
                  setEditData(prev => ({ ...prev, email_verified: checked }))
                }
              />
              <label htmlFor="email_verified" className="checkbox-label">
                Email verificado
              </label>
            </div>

            <div className="form-actions">
              <Button type="button" variant="outline" onClick={onClose}>
                Cerrar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </form>
        )}

        {/* Tab: Contraseña */}
        {activeTab === 'password' && (
          <form onSubmit={handleChangePassword} className="admin-form">
            <div className="form-group">
              <label>Nueva Contraseña</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mín. 6 caracteres"
              />
            </div>

            <div className="form-actions">
              <Button type="button" variant="outline" onClick={onClose}>
                Cerrar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
              </Button>
            </div>
          </form>
        )}

        {/* Tab: Credenciales */}
        {activeTab === 'credentials' && (
          <div className="credentials-tab">
            <div className="credential-item">
              <div className="credential-header">
                <h4>Binance API</h4>
                {user.has_binance_keys ? (
                  <span className="status connected">Conectado</span>
                ) : (
                  <span className="status disconnected">No conectado</span>
                )}
              </div>

              {user.has_binance_keys && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive">
                      Desconectar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogTitle>Desconectar Binance</AlertDialogTitle>
                    <AlertDialogDescription>
                      ¿Estás seguro? El usuario no podrá acceder a sus datos de Binance.
                    </AlertDialogDescription>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteCredentials}
                        style={{ backgroundColor: '#dc2626' }}
                      >
                        Desconectar
                      </AlertDialogAction>
                    </div>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            {/* NUEVO: formulario para cargar/reemplazar credenciales.
                Antes no existía ninguna forma de CONECTAR desde acá —
                solo se podía ver el estado y desconectar. */}
            <form onSubmit={handleSaveCredentials} className="admin-form" style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label>Binance API Key</label>
                <Input
                  type="text"
                  value={credBinanceKey}
                  onChange={(e) => setCredBinanceKey(e.target.value)}
                  placeholder={user.has_binance_keys ? 'Configurada (dejar vacío para no cambiar)' : 'API Key de Binance'}
                  autoComplete="off"
                />
              </div>
              <div className="form-group">
                <label>Binance API Secret</label>
                <Input
                  type="password"
                  value={credBinanceSecret}
                  onChange={(e) => setCredBinanceSecret(e.target.value)}
                  placeholder={user.has_binance_keys ? 'Configurado (dejar vacío para no cambiar)' : 'API Secret de Binance'}
                  autoComplete="new-password"
                />
              </div>

              <div className="form-group">
                <label>Usuario IOL</label>
                <Input
                  type="text"
                  value={credIolUser}
                  onChange={(e) => setCredIolUser(e.target.value)}
                  placeholder="Usuario de InvertirOnline"
                  autoComplete="off"
                />
              </div>
              <div className="form-group">
                <label>Contraseña IOL</label>
                <Input
                  type="password"
                  value={credIolPass}
                  onChange={(e) => setCredIolPass(e.target.value)}
                  placeholder="Contraseña de InvertirOnline"
                  autoComplete="new-password"
                />
              </div>

              <div className="form-actions">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cerrar
                </Button>
                <Button type="submit" disabled={credLoading}>
                  {credLoading ? 'Guardando...' : 'Guardar Credenciales'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default UserDetailsModal
