import { useConnectionStore } from '../../stores/connection'
import { useDatabaseStore } from '../../stores/database'
import { Button } from '../ui/button'

interface TopBarProps {
	onExecute: () => void
	onCancel: () => void
}

export const TopBar = ({ onExecute, onCancel }: TopBarProps) => {
	const activeConnectionId = useConnectionStore((s) => s.activeConnectionId)
	const selectedTable = useDatabaseStore((s) => s.selectedTable)

	return (
		<div className="w-full h-10 border-b flex items-center justify-between px-2 bg-card">
			<div className="text-sm opacity-80">
				{activeConnectionId ? `Active: ${activeConnectionId}` : 'No connection selected'}
				{selectedTable ? ` • ${selectedTable}` : ''}
			</div>
			<div className="flex gap-2">
				<Button size="sm" onClick={onExecute}>
					Execute SQL
				</Button>
				<Button size="sm" variant="outline" onClick={onCancel}>
					Cancel
				</Button>
			</div>
		</div>
	)
}
