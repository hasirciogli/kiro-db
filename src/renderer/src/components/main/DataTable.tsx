import { useDatabaseStore } from '../../stores/database'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '../ui/pagination'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'

export const DataTable = () => {
	const { fields, tableData, page, pageSize, totalRows, setPage, selectRow, schema, selectedTable } = useDatabaseStore()
	if (fields.length === 0) return null
	return (
		<div className="p-2 overflow-auto">
			<table className="w-full text-sm">
				<thead>
					<tr className="text-left border-b">
						{fields.map((f) => {
							const columnMeta = schema?.tables
								.find((t) => t.name === selectedTable)
								?.columns.find((c) => c.name === f.name)
							return (
								<th key={f.name} className="px-2 py-1 font-medium">
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<span>{f.name}</span>
											</TooltipTrigger>
											<TooltipContent>
												<div className="text-xs">
													<div>Type: {columnMeta?.type ?? f.type}</div>
													{columnMeta ? (
														<div>
															{columnMeta.isPrimaryKey ? 'PK • ' : ''}
															{columnMeta.nullable ? 'NULLABLE' : 'NOT NULL'}
															{columnMeta.defaultValue ? ` • default: ${String(columnMeta.defaultValue)}` : ''}
														</div>
													) : null}
											</div>
										</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								</th>
							)
						})}
					</tr>
				</thead>
				<tbody>
					{tableData.map((row, idx) => (
						<tr key={idx} className="border-b hover:bg-muted/40 cursor-pointer" onClick={() => selectRow(row)}>
							{fields.map((f) => (
								<td key={f.name} className="px-2 py-1">
									{String(row[f.name] ?? '')}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
			{totalRows != null ? (
				<Pagination className="mt-2">
					<PaginationContent>
						<PaginationItem>
							<PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage(Math.max(1, page - 1)) }} />
						</PaginationItem>
						<PaginationItem>
							<PaginationLink isActive size="default">Page {page}</PaginationLink>
						</PaginationItem>
						<PaginationItem>
							<PaginationNext href="#" onClick={(e) => { e.preventDefault(); const max = Math.max(1, Math.ceil(totalRows / pageSize)); setPage(Math.min(max, page + 1)) }} />
						</PaginationItem>
					</PaginationContent>
				</Pagination>
			) : null}
		</div>
	)
}
