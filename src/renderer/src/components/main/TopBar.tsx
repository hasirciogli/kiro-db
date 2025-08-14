import { useConnectionStore } from '../../stores/connection'
import { useDatabaseStore } from '../../stores/database'
import { Button } from '../ui/button'
import { useUIStore } from '../../stores/ui'

interface TopBarProps {
	onExecute: () => void
	onCancel: () => void
}

export const TopBar = ({ onExecute, onCancel }: TopBarProps) => {
	const activeConnectionId = useConnectionStore((s) => s.activeConnectionId)
	const selectedTable = useDatabaseStore((s) => s.selectedTable)
	const loading = useDatabaseStore((s) => s.loading)
    const { isGlobalLoading } = useUIStore()

	return (
		<div className="w-full h-10 border-b flex items-center justify-between px-2 bg-card">
			<div className="text-sm opacity-80">
				{activeConnectionId ? `Active: ${activeConnectionId}` : 'No connection selected'}
				{selectedTable ? ` • ${selectedTable}` : ''}
			</div>
            <div className="flex gap-2">
                <Button
                    size="sm"
                    onClick={() => {
                        onExecute()
                        // capture last SQL from editor via event or lift-up state
                        // Here we rely on database store not to hold SQL; so we can't read it.
                        // The call site (MainContainer) sets SQL; we could expose a callback to addHistory there.
                    }}
                    disabled={loading || isGlobalLoading}
                >
					Execute SQL
				</Button>
                <Button size="sm" variant="outline" onClick={onCancel} disabled={!loading && !isGlobalLoading}>
					Cancel
				</Button>
			</div>
		</div>
	)
}
