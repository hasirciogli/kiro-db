import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { useUIStore } from '../../stores/ui'
import { useConnectionStore } from '../../stores/connection'

export const DeleteConnectionDialog = () => {
  const { deletingConnectionId, cancelDeleteConnection } = useUIStore()
  const { deleteConnection } = useConnectionStore()

  return (
    <Dialog open={!!deletingConnectionId} onOpenChange={(o) => (!o ? cancelDeleteConnection() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Connection</DialogTitle>
        </DialogHeader>
        <p className="text-sm">Are you sure you want to delete this connection?</p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={cancelDeleteConnection}>Cancel</Button>
          <Button onClick={async () => { if (deletingConnectionId) { await deleteConnection(deletingConnectionId); cancelDeleteConnection() } }}>Delete</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}


