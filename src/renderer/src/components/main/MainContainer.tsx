import { useState } from 'react'
import { TopBar } from './TopBar'
import { QueryEditor } from './QueryEditor'
import { DataTable } from './DataTable'
import { RowDetailSheet } from './RowDetailSheet'
import { useConnectionStore } from '../../stores/connection'
import { useDatabaseStore } from '../../stores/database'

export const MainContainer = () => {
	const [sql, setSql] = useState('SELECT 1;')
	const activeConnectionId = useConnectionStore((s) => s.activeConnectionId)
	const { executeQuery, selectedTable, loadTableData } = useDatabaseStore()

	const onExecute = async () => {
		if (!activeConnectionId) return
		await executeQuery(activeConnectionId, sql)
	}

	const onCancel = async () => {
		if (!activeConnectionId) return
		// IPC cancel hook
		await window.dbapi.cancelQuery(activeConnectionId)
	}

	// Auto-load when selecting a table
	if (activeConnectionId && selectedTable) {
		void loadTableData(activeConnectionId, selectedTable)
	}

	return (
		<div className="flex flex-col h-screen w-full">
			<TopBar onExecute={onExecute} onCancel={onCancel} />
			<QueryEditor value={sql} onChange={setSql} />
			<div className="flex-1 overflow-hidden">
				<DataTable />
			</div>
			<RowDetailSheet />
		</div>
	)
}
