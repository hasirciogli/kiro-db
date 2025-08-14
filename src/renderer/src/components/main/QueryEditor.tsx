import { useEffect, useState } from 'react'
import Editor from '@monaco-editor/react'

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
			<Editor
				height="180px"
				defaultLanguage="sql"
				theme="vs-dark"
				value={local}
				onChange={(value) => {
					const v = value ?? ''
					setLocal(v)
					onChange?.(v)
				}}
				options={{ minimap: { enabled: false }, fontSize: 14 }}
			/>
		</div>
	)
}
