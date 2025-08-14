import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet'
import { useDatabaseStore } from '../../stores/database'
import { Button } from '../ui/button'
import { useUIStore } from '../../stores/ui'

export const RowDetailSheet = () => {
    const { selectedRow, selectRow } = useDatabaseStore()
    const { rowDetailSheetOpen, closeRowDetailSheet } = useUIStore()
    const open = rowDetailSheetOpen || !!selectedRow
    return (
        <Sheet open={open} onOpenChange={(o) => (!o ? (selectRow(null), closeRowDetailSheet()) : null)}>
			<SheetContent side="right" className="w-[380px] sm:w-[420px]">
				<SheetHeader>
					<SheetTitle>Row Details</SheetTitle>
				</SheetHeader>
				<pre className="text-xs mt-4 whitespace-pre-wrap">
					{selectedRow ? JSON.stringify(selectedRow, null, 2) : ''}
				</pre>
				<div className="flex gap-2 pt-2 justify-end">
					<Button variant="outline" onClick={() => selectRow(null)}>Cancel</Button>
					<Button disabled>Save</Button>
				</div>
			</SheetContent>
		</Sheet>
	)
}
