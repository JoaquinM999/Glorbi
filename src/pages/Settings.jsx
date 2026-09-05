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
import { Save, Eye, EyeOff, CheckCircle2, XCircle, Loader2, BarChart3, BriefcaseBusiness } from 'lucide-react'
import { toast } from 'sonner'

export default function Settings() {
  const queryClient = useQueryClient()
  const [showKey, setShowKey] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [iolUsername, setIolUsername] = useState('')
  const [iolPassword, setIolPassword] = useState('')

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
      queryClient.invalidateQueries({ queryKey: ['binance'] })
      toast.success('Configuración de Binance guardada')
    },
    onError: () => {
      toast.error('Error al guardar las claves')
    },
  })

  const iolSaveMutation = useMutation({
    mutationFn: async () => {
      const data = { iol_username: iolUsername, iol_password: iolPassword }
      if (settings) await UserSettings.update(settings.id, data)
      else await UserSettings.create(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] })
      queryClient.invalidateQueries({ queryKey: ['iol'] })
      setIolPassword('')
      toast.success('Configuración de IOL guardada')
    },
    onError: () => toast.error('Error al guardar la configuración de IOL'),
  })

  const iolTestMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/api/iol/test', { username: iolUsername, password: iolPassword })
      return data
    },
    onSuccess: () => toast.success('Conexión con IOL validada'),
    onError: (error) => toast.error(error.response?.data?.message || 'No se pudo validar IOL'),
  })

  const handleTest = () => {
    if (!apiKey || !apiSecret) {
      toast.error('Ingresa API Key y API Secret primero')
      return
    }
    testMutation.mutate()
  }

  const handleBinanceSave = () => {
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
    <div className="max-w-3xl space-y-8">
      <SectionHeader title="Configuración" tag="AJUSTES" />
      <p className="-mt-4 max-w-xl text-xs font-mono leading-relaxed text-muted-foreground/60">
        Conecta tus plataformas por separado. Cada credencial se cifra en el servidor y solo se usa para consultas de lectura.
      </p>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="border-b border-border bg-gradient-to-r from-yellow/10 via-transparent to-transparent px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-yellow/25 bg-yellow/10 text-yellow"><BarChart3 className="w-5 h-5" /></div>
              <div>
                <div className="flex items-center gap-2"><h2 className="text-sm font-mono font-medium text-foreground">Binance Futures</h2><span className="text-[9px] font-mono uppercase tracking-wider text-yellow">Solo lectura</span></div>
                <p className="text-[11px] font-mono text-muted-foreground/60 mt-1">Balance, posiciones y rendimiento sin ejecutar órdenes.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${settings?.binance_api_key ? 'bg-green' : 'bg-muted-foreground/30'}`} />
              {settings?.binance_api_key ? 'Conectado' : 'Sin conectar'}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">

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

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
          <span className="text-[10px] font-mono text-muted-foreground/60">{settings?.binance_api_key ? 'Credenciales guardadas. Escribe nuevas para reemplazarlas.' : 'Aún no hay credenciales guardadas.'}</span>
          <div className="flex items-center gap-2">
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
          <Button
            onClick={handleBinanceSave}
            disabled={saveMutation.isPending}
            className="bg-foreground text-background hover:bg-foreground/90 font-mono text-xs uppercase tracking-wider"
          >
            <Save className="w-3.5 h-3.5 mr-2" />
            {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="border-b border-border bg-gradient-to-r from-green/10 via-transparent to-transparent px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-green/25 bg-green/10 text-green"><BriefcaseBusiness className="w-5 h-5" /></div>
              <div>
                <div className="flex items-center gap-2"><h2 className="text-sm font-mono font-medium text-foreground">InvertirOnline</h2><span className="text-[9px] font-mono uppercase tracking-wider text-green">Solo lectura</span></div>
                <p className="text-[11px] font-mono text-muted-foreground/60 mt-1">Cartera, saldo y operaciones de tu cuenta comitente.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${settings?.iol_configured ? 'bg-green' : 'bg-muted-foreground/30'}`} />
              {settings?.iol_configured ? 'Conectado' : 'Sin conectar'}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Usuario IOL</Label>
            <Input value={iolUsername} onChange={(event) => setIolUsername(event.target.value)} placeholder={settings?.iol_configured ? 'Configurado (reemplazar)' : 'Tu usuario'} className="mt-1.5 bg-secondary border-border font-mono text-xs" autoComplete="off" />
          </div>
          <div>
            <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Contraseña IOL</Label>
            <Input type="password" value={iolPassword} onChange={(event) => setIolPassword(event.target.value)} placeholder={settings?.iol_configured ? 'Configurada (reemplazar)' : 'Tu contraseña'} className="mt-1.5 bg-secondary border-border font-mono text-xs" autoComplete="new-password" />
          </div>
        </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            <span className="text-[10px] font-mono text-muted-foreground/60">{settings?.iol_configured ? 'Cuenta guardada. Completa ambos campos para reemplazarla.' : 'La cuenta IOL todavía no está configurada.'}</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => iolTestMutation.mutate()} disabled={iolTestMutation.isPending || !iolUsername || !iolPassword} className="border-border font-mono text-xs uppercase tracking-wider">
                {iolTestMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Probar conexión
              </Button>
              <Button onClick={() => iolSaveMutation.mutate()} disabled={iolSaveMutation.isPending || !iolUsername || !iolPassword} className="bg-green text-background hover:bg-green/90 font-mono text-xs uppercase tracking-wider">
                {iolSaveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {iolSaveMutation.isPending ? 'Guardando...' : 'Guardar IOL'}
              </Button>
            </div>
          </div>
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
    </div>
  )
}
