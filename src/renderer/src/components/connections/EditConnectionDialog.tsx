import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Button } from '../ui/button'
import { useForm, SubmitHandler } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useUIStore } from '../../stores/ui'
import { useConnectionStore } from '../../stores/connection'

const schema = z.object({
  name: z.string().min(1),
  host: z.string().min(1),
  port: z.number().int().positive(),
  database: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1)
})

type FormValues = z.infer<typeof schema>

export const EditConnectionDialog = () => {
  const { editingConnectionId, closeEditConnection } = useUIStore()
  const { connections, updateConnection } = useConnectionStore()
  const conn = connections.find((c) => c.id === editingConnectionId)
  const { register, handleSubmit, formState: { isSubmitting }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: conn ? {
      name: conn.name,
      host: conn.host,
      port: conn.port,
      database: conn.database,
      username: conn.username,
      password: conn.password
    } : undefined
  })

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    if (!editingConnectionId) return
    await updateConnection(editingConnectionId, values)
    reset(values)
    closeEditConnection()
  }

  return (
    <Dialog open={!!editingConnectionId} onOpenChange={(o) => (!o ? closeEditConnection() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Connection</DialogTitle>
        </DialogHeader>
        {conn ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Name</Label><Input {...register('name')} /></div>
              <div className="space-y-1"><Label className="text-xs">Host</Label><Input {...register('host')} /></div>
              <div className="space-y-1"><Label className="text-xs">Port</Label><Input type="number" {...register('port', { valueAsNumber: true })} /></div>
              <div className="space-y-1"><Label className="text-xs">Database</Label><Input {...register('database')} /></div>
              <div className="space-y-1"><Label className="text-xs">Username</Label><Input {...register('username')} /></div>
              <div className="space-y-1"><Label className="text-xs">Password</Label><Input type="password" {...register('password')} /></div>
            </div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={closeEditConnection} disabled={isSubmitting}>Cancel</Button><Button type="submit" disabled={isSubmitting}>Save</Button></div>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}


