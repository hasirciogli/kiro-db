import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Checkbox } from '@renderer/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { Separator } from '@renderer/components/ui/separator'
import { useSettings } from '@renderer/hooks/settings'

export const SettingsDialogBase = () => {
  const { open, setOpen } = useSettings() as {
    open: boolean
    setOpen: (open: boolean) => void
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Connection</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="host" className="text-xs">
                  Host
                </Label>
                <Input id="host" placeholder="localhost" className="h-8" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="port" className="text-xs">
                  Port
                </Label>
                <Input id="port" type="number" placeholder="5432" className="h-8" />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="text-sm font-medium">Query</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="timeout" className="text-xs">
                  Timeout (s)
                </Label>
                <Input id="timeout" type="number" placeholder="30" className="h-8" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rows" className="text-xs">
                  Max Rows
                </Label>
                <Input id="rows" type="number" placeholder="1000" className="h-8" />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="autocommit" />
              <Label htmlFor="autocommit" className="text-xs">
                Auto-commit
              </Label>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="text-sm font-medium">Editor</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Font Size</Label>
                <Select>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="14px" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12px</SelectItem>
                    <SelectItem value="14">14px</SelectItem>
                    <SelectItem value="16">16px</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Theme</Label>
                <Select>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Auto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="auto">Auto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="syntax" defaultChecked />
              <Label htmlFor="syntax" className="text-xs">
                Syntax highlighting
              </Label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => setOpen(false)}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
