import { useEffect } from 'react'
import { useConnectionStore } from '../../stores/connection'
import { useDatabaseStore } from '../../stores/database'
import { Separator } from '../ui/separator'
import { ScrollArea } from '../ui/scroll-area'

export const DatabaseSidebar = () => {
	const activeConnectionId = useConnectionStore((s) => s.activeConnectionId)
	const { schema, loadSchema, selectTable, selectedTable } = useDatabaseStore()

	useEffect(() => {
		if (activeConnectionId) {
			void loadSchema(activeConnectionId)
		}
	}, [activeConnectionId, loadSchema])

	if (!activeConnectionId) {
		return null
	}

	return (
		<div className="w-64 border-r h-screen bg-sidebar">
			<ScrollArea className="h-full p-2">
				<div className="space-y-2">
					<h4 className="text-xs font-semibold opacity-70">Tables</h4>
					<div className="space-y-1">
						{schema?.tables.map((t) => (
							<button
								key={t.name}
								onClick={() => void selectTable(t.name)}
								className={`w-full text-left text-sm px-2 py-1 rounded ${
									selectedTable === t.name ? 'bg-muted' : 'hover:bg-muted'
								}`}
							>
								{t.name}
							</button>
						))}
					</div>
					<Separator className="my-2" />
					<h4 className="text-xs font-semibold opacity-70">Views</h4>
					<div className="space-y-1">
						{schema?.views.map((v) => (
							<div key={v.name} className="text-sm px-2 py-1 opacity-80">
								{v.name}
							</div>
						))}
					</div>
					<Separator className="my-2" />
					<h4 className="text-xs font-semibold opacity-70">Functions</h4>
					<div className="space-y-1">
						{schema?.functions.map((f) => (
							<div key={f.name} className="text-sm px-2 py-1 opacity-80">
								{f.name}
							</div>
						))}
					</div>
					<Separator className="my-2" />
					<h4 className="text-xs font-semibold opacity-70">Procedures</h4>
					<div className="space-y-1">
						{schema?.procedures.map((p) => (
							<div key={p.name} className="text-sm px-2 py-1 opacity-80">
								{p.name}
							</div>
						))}
					</div>
				</div>
			</ScrollArea>
		</div>
	)
}
