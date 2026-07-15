/**
 * Settings.jsx
 *
 * Cambios respecto a la versión anterior:
 *  - Nuevo botón "Probar conexión" que llama a POST /api/binance/test
 *    ANTES de guardar, para validar que las keys funcionan y evitar
 *    que el usuario guarde credenciales inválidas sin saberlo.
 *  - Muestra el balance de la cuenta si la conexión es exitosa.
 */
import React, { useState, useEffect } from 'react'
import { getMe } from '@/api/auth'
import { UserSettings } from '@/api/entities'
import apiClient from '@/api/apiClient'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import SectionHeader from '@/components/ui/SectionHeader'
import { Save, Eye, EyeOff, Shield, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function Settings() {
  const queryClient = useQueryClient()
  const [showKey, setShowKey] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')

  // Estado de la prueba de conexión: null | 'testing' | { valid, account?, message? }
  const [testResult, setTestResult] = useState(null)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['userSettings'],
    queryFn: async () => {
      const me = await getMe()
      const items = await UserSettings.filter({ created_by: me.email })
      return items[0] || null
    },
  })

  useEffect(() => {
    if (settings) {
      setApiKey(settings.binance_api_key || '')
      setApiSecret(settings.binance_api_secret || '')
    }
  }, [settings])

  // Resetear el resultado del test si el usuario edita las keys
  useEffect(() => {
    setTestResult(null)
  }, [apiKey, apiSecret])

  const testMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/api/binance/test', {
        binance_api_key: apiKey,
        binance_api_secret: apiSecret,
      })
      return data
    },
    onMutate: () => setTestResult('testing'),
    onSuccess: (data) => {
      setTestResult(data)
      if (data.valid) toast.success('Conexión exitosa con Binance Futures')
    },
    onError: (err) => {
      const message = err.response?.data?.message || 'No se pudo validar la conexión'
      setTestResult({ valid: false, message })
      toast.error(message)
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settings) {
        await UserSettings.update(settings.id, data)
      } else {
        await UserSettings.create(data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] })
      // También invalida los datos de Binance para que el Dashboard los recargue
      queryClient.invalidateQueries({ queryKey: ['binance'] })
      toast.success('Claves guardadas correctamente')
    },
    onError: () => {
      toast.error('Error al guardar las claves')
    },
  })

  const handleTest = () => {
    if (!apiKey || !apiSecret) {
      toast.error('Ingresa API Key y API Secret primero')
      return
    }
    testMutation.mutate()
  }

  const handleSave = () => {
    saveMutation.mutate({
      binance_api_key: apiKey,
      binance_api_secret: apiSecret,
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-8">
      <SectionHeader title="Configuración" tag="AJUSTES" />

      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-5 h-5 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-mono font-medium text-foreground">Binance API Keys</h2>
            <p className="text-[11px] font-mono text-muted-foreground/50 mt-1">
              Claves de solo lectura para Binance Futures. Glorbi nunca ejecuta órdenes.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              API Key
            </Label>
            <div className="flex gap-2 mt-1.5">
              <Input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Ingresa tu API Key"
                className="bg-secondary border-border font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowKey(!showKey)}
                className="shrink-0 border-border"
                type="button"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              API Secret
            </Label>
            <div className="flex gap-2 mt-1.5">
              <Input
                type={showSecret ? 'text' : 'password'}
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="Ingresa tu API Secret"
                className="bg-secondary border-border font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowSecret(!showSecret)}
                className="shrink-0 border-border"
                type="button"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Botón de prueba de conexión */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testMutation.isPending || !apiKey || !apiSecret}
            className="border-border font-mono text-xs uppercase tracking-wider"
            type="button"
          >
            {testMutation.isPending
              ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
              : null}
            Probar conexión
          </Button>

          {testResult && testResult !== 'testing' && (
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono ${
              testResult.valid ? 'text-green' : 'text-red'
            }`}>
              {testResult.valid
                ? <CheckCircle2 className="w-3.5 h-3.5" />
                : <XCircle className="w-3.5 h-3.5" />}
              {testResult.valid
                ? `Conectado — Balance: $${testResult.account?.totalWalletBalance?.toLocaleString('en', { maximumFractionDigits: 2 }) ?? '0.00'}`
                : testResult.message}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${apiKey && apiSecret ? 'bg-green' : 'bg-muted-foreground/30'}`} />
            <span className="text-[10px] font-mono text-muted-foreground">
              {apiKey && apiSecret ? 'Claves configuradas' : 'Sin claves configuradas'}
            </span>
          </div>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-foreground text-background hover:bg-foreground/90 font-mono text-xs uppercase tracking-wider"
          >
            <Save className="w-3.5 h-3.5 mr-2" />
            {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>

      <div className="bg-yellow/5 border border-yellow/15 rounded-lg p-4">
        <p className="text-[11px] font-mono text-yellow/80 leading-relaxed">
          <strong>Importante:</strong> Asegúrate de que tus claves tengan únicamente permisos de lectura
          (Enable Reading). No actives "Enable Futures" para trading ni "Enable Withdrawals".
          Glorbi es una plataforma de solo lectura — nunca ejecuta operaciones ni retiros en tu cuenta.
        </p>
      </div>

      <div className="bg-secondary/50 border border-border rounded-lg p-4">
        <p className="text-[11px] font-mono text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Cómo generar tus keys:</strong><br />
          1. Ve a Binance → Perfil → API Management<br />
          2. Crea una nueva API key<br />
          3. En permisos, activa solo <strong>"Enable Reading"</strong><br />
          4. Restringe el acceso por IP si es posible (opcional pero recomendado)<br />
          5. Copia la Key y el Secret aquí — el Secret solo se muestra una vez en Binance
        </p>
      </div>
    </div>
  )
}
