import { useState } from 'react'
import { TopBar } from './TopBar'
import { QueryEditor } from './QueryEditor'
import { DataTable } from './DataTable'
import { RowDetailSheet } from './RowDetailSheet'
import { QueryHistory } from './QueryHistory'
import { useConnectionStore } from '../../stores/connection'
import { useDatabaseStore } from '../../stores/database'
import { toast } from 'sonner'
import { useQueryHistory } from '../../stores/history'

export const MainContainer = () => {
	const [sql, setSql] = useState('SELECT 1;')
	const activeConnectionId = useConnectionStore((s) => s.activeConnectionId)
	const { executeQuery, selectedTable, loadTableData } = useDatabaseStore()
	const addHistory = useQueryHistory((s) => s.addQuery)

	const onExecute = async () => {
		if (!activeConnectionId) return
		try {
			const res = await executeQuery(activeConnectionId, sql)
			addHistory(activeConnectionId, sql)
			toast.success(`Query executed in ${res.executionTime}ms, rows: ${res.rowCount}`)
		} catch (e: any) {
			toast.error(e?.message ?? 'Query failed')
		}
	}

	const onCancel = async () => {
		if (!activeConnectionId) return
		// IPC cancel hook
		try {
			await window.dbapi.cancelQuery(activeConnectionId)
			toast.message('Query cancelled')
		} catch (e: any) {
			toast.error(e?.message ?? 'Cancel failed')
		}
	}

	// Auto-load when selecting a table
	if (activeConnectionId && selectedTable) {
		void loadTableData(activeConnectionId, selectedTable)
	}

	return (
		<div className="flex flex-col h-screen w-full">
			<TopBar onExecute={onExecute} onCancel={onCancel} />
			<QueryEditor value={sql} onChange={setSql} />
			<QueryHistory onPick={(q) => setSql(q)} />
			<div className="flex-1 overflow-hidden">
				<DataTable />
			</div>
			<RowDetailSheet />
		</div>
	)
}
