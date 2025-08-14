import { useConnectionStore } from '../../stores/connection'
import { useQueryHistory } from '../../stores/history'

export const QueryHistory = ({ onPick }: { onPick: (sql: string) => void }) => {
  const connectionId = useConnectionStore((s) => s.activeConnectionId)
  const history = useQueryHistory((s) => s.getHistory(connectionId ?? ''))
  if (!connectionId) return null
  if (!history.length) return null
  return (
    <div className="p-2 border-t bg-card/50">
      <div className="text-xs mb-1 opacity-70">History</div>
      <div className="flex gap-2 flex-wrap">
        {history.map((h, i) => (
          <button
            key={i}
            className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/70"
            onClick={() => onPick(h)}
            title={h}
          >
            {h.length > 40 ? h.slice(0, 37) + '…' : h}
          </button>
        ))}
      </div>
    </div>
  )
}


