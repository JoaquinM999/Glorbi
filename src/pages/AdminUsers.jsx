import React from 'react'
import { Shield, Trash2, CheckCircle2, Clock3, Loader2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import SectionHeader from '@/components/ui/SectionHeader'
import apiClient from '@/api/apiClient'
import { useAuth } from '@/lib/AuthContext'

export default function AdminUsers() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const usersQuery = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => (await apiClient.get('/api/admin/users')).data,
    enabled: user?.role === 'admin',
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/api/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('Cuenta eliminada')
    },
    onError: (error) => toast.error(error.response?.data?.message || 'No se pudo eliminar la cuenta'),
  })

  if (usersQuery.isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
  if (usersQuery.isError) return <p className="text-sm font-mono text-red">No se pudo cargar la administración de usuarios.</p>

  return (
    <div className="max-w-4xl space-y-6">
      <SectionHeader title="Usuarios" tag="ADMIN" />
      <div className="flex items-center gap-3 border border-yellow/20 bg-yellow/5 rounded-lg p-4">
        <Shield className="w-4 h-4 shrink-0 text-yellow" />
        <p className="text-[11px] font-mono leading-relaxed text-yellow/80">Puedes eliminar cuentas y todos sus datos asociados. Esta acción es permanente y no puede deshacerse.</p>
      </div>
      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full min-w-[680px]">
          <thead><tr className="bg-secondary border-b border-border">{['Usuario', 'Rol', 'Verificación', 'Registro', 'Acción'].map((label) => <th key={label} className="px-4 py-3 text-left text-[9px] font-mono text-muted-foreground uppercase tracking-wider">{label}</th>)}</tr></thead>
          <tbody>
            {(usersQuery.data || []).map((account) => {
              const isSelf = account.id === user.id
              return <tr key={account.id} className="border-b border-border/50">
                <td className="px-4 py-4"><div className="text-xs font-mono font-semibold text-foreground">{account.full_name || 'Sin nombre'}</div><div className="text-[10px] font-mono text-muted-foreground">{account.email}</div></td>
                <td className="px-4 py-4 text-[10px] font-mono uppercase text-muted-foreground">{account.role}</td>
                <td className="px-4 py-4">{account.email_verified ? <span className="inline-flex items-center gap-1 text-[10px] font-mono text-green"><CheckCircle2 className="w-3 h-3" /> Verificado</span> : <span className="inline-flex items-center gap-1 text-[10px] font-mono text-yellow"><Clock3 className="w-3 h-3" /> Pendiente</span>}</td>
                <td className="px-4 py-4 text-[10px] font-mono text-muted-foreground">{String(account.created_at).slice(0, 10)}</td>
                <td className="px-4 py-4">{isSelf ? <span className="text-[10px] font-mono text-muted-foreground">Cuenta actual</span> : <button type="button" disabled={deleteMutation.isPending} onClick={() => { if (window.confirm(`¿Eliminar la cuenta ${account.email}? Esta acción es permanente.`)) deleteMutation.mutate(account.id) }} className="inline-flex items-center gap-1.5 rounded border border-red/20 px-2.5 py-1.5 text-[10px] font-mono text-red hover:bg-red/10 disabled:opacity-50"><Trash2 className="w-3 h-3" /> Eliminar</button>}</td>
              </tr>
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
