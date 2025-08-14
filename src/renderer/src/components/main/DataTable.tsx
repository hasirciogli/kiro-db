import { useDatabaseStore } from '../../stores/database'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '../ui/pagination'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

export const DataTable = () => {
	const { fields, tableData, page, pageSize, totalRows, setPage, setPageSize, selectRow, schema, selectedTable } = useDatabaseStore()
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
				<div className="mt-2 flex items-center justify-between gap-2">
					<div className="text-xs opacity-70 flex items-center gap-2">
						<span>Rows per page</span>
						<Select defaultValue={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
							<SelectTrigger className="h-7 w-[84px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="25">25</SelectItem>
								<SelectItem value="50">50</SelectItem>
								<SelectItem value="100">100</SelectItem>
								<SelectItem value="200">200</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<Pagination>
						<PaginationContent>
							<PaginationItem>
								<PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage(Math.max(1, page - 1)) }} />
							</PaginationItem>
							<PaginationItem>
								<PaginationLink isActive size="default">Page {page} / {Math.max(1, Math.ceil(totalRows / pageSize))}</PaginationLink>
							</PaginationItem>
							<PaginationItem>
								<PaginationNext href="#" onClick={(e) => { e.preventDefault(); const max = Math.max(1, Math.ceil(totalRows / pageSize)); setPage(Math.min(max, page + 1)) }} />
							</PaginationItem>
						</PaginationContent>
					</Pagination>
				</div>
			) : null}
		</div>
	)
}
