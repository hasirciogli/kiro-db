import { useEffect, useState } from 'react'
import { Textarea } from '../ui/textarea'

interface QueryEditorProps {
	value?: string
	onChange?: (sql: string) => void
}

export const QueryEditor = ({ value, onChange }: QueryEditorProps) => {
	const [local, setLocal] = useState(value ?? '')
    useEffect(() => {
        setLocal(value ?? '')
    }, [value])
	return (
		<div className="p-2">
			<Textarea
				value={local}
				onChange={(e) => {
					setLocal(e.target.value)
					onChange?.(e.target.value)
				}}
				placeholder="-- Write your SQL here"
				className="min-h-[120px]"
			/>
		</div>
	)
}
