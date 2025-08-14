import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useUIStore } from '../../stores/ui'
import { useConnectionStore } from '../../stores/connection'

const schema = z.object({
  name: z.string().min(1),
  type: z.enum(['mysql', 'postgresql']),
  host: z.string().min(1),
  port: z.coerce.number().int().positive(),
  database: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  ssl: z.boolean().optional()
})

type FormValues = z.infer<typeof schema>

export const AddConnectionDialog = () => {
  const { isAddConnectionOpen, closeAddConnection } = useUIStore()
  const saveConnection = useConnectionStore((s) => s.saveConnection)
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      type: 'postgresql',
      host: 'localhost',
      port: 5432,
      database: '',
      username: '',
      password: '',
      ssl: false
    }
  })

  const onSubmit = async (values: FormValues) => {
    await saveConnection(values)
    closeAddConnection()
  }

  return (
    <Dialog open={isAddConnectionOpen} onOpenChange={(o) => (!o ? closeAddConnection() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Connection</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input {...register('name')} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select onValueChange={(v) => setValue('type', v as any)} defaultValue="postgresql">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="postgresql">PostgreSQL</SelectItem>
                  <SelectItem value="mysql">MySQL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Host</Label>
              <Input {...register('host')} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Port</Label>
              <Input type="number" {...register('port', { valueAsNumber: true })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Database</Label>
              <Input {...register('database')} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Username</Label>
              <Input {...register('username')} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Password</Label>
              <Input type="password" {...register('password')} />
            </div>
          </div>
          {Object.keys(errors).length > 0 ? (
            <div className="text-xs text-destructive">Please fill all required fields.</div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={closeAddConnection} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}


