import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet'
import { useDatabaseStore } from '../../stores/database'
import { Button } from '../ui/button'
import { useUIStore } from '../../stores/ui'
import { useEffect, useMemo, useState } from 'react'
import { Input } from '../ui/input'
import { toast } from 'sonner'
import { useConnectionStore } from '../../stores/connection'

export const RowDetailSheet = () => {
    const { selectedRow, selectRow, fields, selectedTable, schema, executeQuery } = useDatabaseStore()
    const { rowDetailSheetOpen, closeRowDetailSheet } = useUIStore()
    const open = rowDetailSheetOpen || !!selectedRow
    const [editable, setEditable] = useState<any | null>(null)
    const connectionType = useConnectionStore((s) => {
        const activeId = s.activeConnectionId
        const conn = s.connections.find((c) => c.id === activeId)
        return conn?.type
    })

    useEffect(() => {
        setEditable(selectedRow ? { ...selectedRow } : null)
    }, [selectedRow])

    const pkColumns = useMemo(() => {
        const tableMeta = schema?.tables.find((t) => t.name === selectedTable)
        return tableMeta?.columns.filter((c) => c.isPrimaryKey).map((c) => c.name) ?? []
    }, [schema, selectedTable])

    const buildPlaceholders = (count: number, startIndex = 1) => {
        if (connectionType === 'postgresql') {
            return Array.from({ length: count }, (_, i) => `$${startIndex + i}`)
        }
        // mysql
        return Array.from({ length: count }, () => `?`)
    }

    const handleUpdate = async () => {
        if (!selectedTable || !editable) return
        try {
            const nonPkCols = fields.map((f) => f.name).filter((n) => !pkColumns.includes(n))
            const setPh = buildPlaceholders(nonPkCols.length)
            const wherePh = buildPlaceholders(pkColumns.length, setPh.length + 1)
            const setClause = nonPkCols.map((c, i) => `"${c}" = ${setPh[i]}`).join(', ')
            const whereClause = pkColumns.map((c, i) => `"${c}" = ${wherePh[i]}`).join(' AND ')
            const sql = `UPDATE "${selectedTable}" SET ${setClause} WHERE ${whereClause}`
            const params = [
                ...nonPkCols.map((c) => editable[c]),
                ...pkColumns.map((c) => selectedRow?.[c])
            ]
            await executeQuery(useConnectionStore.getState().activeConnectionId!, sql, params)
            toast.success('Row updated')
        } catch (e: any) {
            toast.error(e?.message ?? 'Update failed')
        }
    }

    const handleDelete = async () => {
        if (!selectedTable || !selectedRow) return
        try {
            const wherePh = buildPlaceholders(pkColumns.length)
            const whereClause = pkColumns.map((c, i) => `"${c}" = ${wherePh[i]}`).join(' AND ')
            const sql = `DELETE FROM "${selectedTable}" WHERE ${whereClause}`
            const params = pkColumns.map((c) => selectedRow[c])
            await executeQuery(useConnectionStore.getState().activeConnectionId!, sql, params)
            toast.success('Row deleted')
            selectRow(null)
            closeRowDetailSheet()
        } catch (e: any) {
            toast.error(e?.message ?? 'Delete failed')
        }
    }

    const handleInsert = async () => {
        if (!selectedTable || !editable) return
        try {
            const cols = fields.map((f) => f.name)
            const ph = buildPlaceholders(cols.length)
            const sql = `INSERT INTO "${selectedTable}" ( ${cols
                .map((c) => `"${c}"`)
                .join(', ')} ) VALUES ( ${ph.join(', ')} )`
            const params = cols.map((c) => editable[c])
            await executeQuery(useConnectionStore.getState().activeConnectionId!, sql, params)
            toast.success('Row inserted')
        } catch (e: any) {
            toast.error(e?.message ?? 'Insert failed')
        }
    }
    return (
        <Sheet open={open} onOpenChange={(o) => (!o ? (selectRow(null), closeRowDetailSheet()) : null)}>
			<SheetContent side="right" className="w-[380px] sm:w-[420px]">
				<SheetHeader>
					<SheetTitle>Row Details</SheetTitle>
				</SheetHeader>
                {editable ? (
                    <div className="mt-4 space-y-2">
                        {fields.map((f) => (
                            <div key={f.name} className="space-y-1">
                                <div className="text-xs opacity-70">{f.name}</div>
                                <Input
                                    value={editable[f.name] ?? ''}
                                    onChange={(e) => setEditable({ ...editable, [f.name]: e.target.value })}
                                />
                            </div>
                        ))}
                    </div>
                ) : null}
				<div className="flex gap-2 pt-2 justify-end">
                    <Button variant="outline" onClick={() => { selectRow(null); closeRowDetailSheet() }}>Cancel</Button>
                    <Button variant="outline" onClick={handleDelete} disabled={pkColumns.length === 0}>Delete</Button>
                    <Button variant="outline" onClick={handleInsert}>Insert</Button>
                    <Button onClick={handleUpdate} disabled={!selectedRow}>Save</Button>
				</div>
			</SheetContent>
		</Sheet>
	)
}
