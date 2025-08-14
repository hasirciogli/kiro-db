import { useDatabaseStore } from '../../stores/database'

export const DataTable = () => {
	const { fields, tableData } = useDatabaseStore()
	if (fields.length === 0) return null
	return (
		<div className="p-2 overflow-auto">
			<table className="w-full text-sm">
				<thead>
					<tr className="text-left border-b">
						{fields.map((f) => (
							<th key={f.name} className="px-2 py-1 font-medium">
								{f.name}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{tableData.map((row, idx) => (
						<tr key={idx} className="border-b hover:bg-muted/40">
							{fields.map((f) => (
								<td key={f.name} className="px-2 py-1">
									{String(row[f.name] ?? '')}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}
