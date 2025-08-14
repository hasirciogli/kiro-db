import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet'
import { useDatabaseStore } from '../../stores/database'

export const RowDetailSheet = () => {
	const { selectedRow } = useDatabaseStore()
	return (
		<Sheet open={!!selectedRow}>
			<SheetContent side="right" className="w-[380px] sm:w-[420px]">
				<SheetHeader>
					<SheetTitle>Row Details</SheetTitle>
				</SheetHeader>
				<pre className="text-xs mt-4 whitespace-pre-wrap">
					{selectedRow ? JSON.stringify(selectedRow, null, 2) : ''}
				</pre>
			</SheetContent>
		</Sheet>
	)
}
