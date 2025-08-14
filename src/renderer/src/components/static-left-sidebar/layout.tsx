import { StaticLayoutSidebarItem } from './item'
import { SettingsButton } from './settings'
import { useConnectionStore } from '../../stores/connection'
import { useEffect } from 'react'
import { ConnectionIcon } from './connection-icon'
import { ConnectionContextMenu } from './connection-context-menu'
import { useUIStore } from '../../stores/ui'
import { toast } from 'sonner'

export const StaticLeftBar = () => {
  const {
    connections,
    activeConnectionId,
    loadConnections,
    setActiveConnection,
    connect,
    testConnection
  } = useConnectionStore()
  const { openEditConnection, askDeleteConnection } = useUIStore()

  useEffect(() => {
    void loadConnections()
  }, [loadConnections])

  return (
    <div className="flex flex-col w-14 border-r h-screen bg-sidebar-primary">
      {/* Slide Container */}
      <div className="flex h-full items-start overflow-y-scroll flex-col">
        {connections.map((c) => (
          <ConnectionContextMenu
            key={c.id}
            onConnect={() => {
              setActiveConnection(c.id)
              ;(async () => {
                try {
                  await connect(c.id)
                  toast.success(`Connected to ${c.name}`)
                } catch (e: any) {
                  toast.error(e?.message ?? `Failed to connect to ${c.name}`)
                }
              })()
            }}
            onDelete={() => askDeleteConnection(c.id)}
            onTest={() => {
              ;(async () => {
                try {
                  const ok = await testConnection({
                    name: c.name,
                    type: c.type,
                    host: c.host,
                    port: c.port,
                    database: c.database,
                    username: c.username,
                    password: c.password,
                    ssl: c.ssl
                  } as any)
                  if (ok) toast.success(`Connection test passed for ${c.name}`)
                  else toast.error(`Connection test failed for ${c.name}`)
                } catch (e: any) {
                  toast.error(e?.message ?? `Connection test failed for ${c.name}`)
                }
              })()
            }}
            onEdit={() => openEditConnection(c.id)}
          >
            <ConnectionIcon
              label={c.name}
              active={activeConnectionId === c.id}
              status={activeConnectionId === c.id ? 'connected' : 'disconnected'}
              onClick={() => {
                setActiveConnection(c.id)
                ;(async () => {
                  try {
                    await connect(c.id)
                    toast.success(`Connected to ${c.name}`)
                  } catch (e: any) {
                    toast.error(e?.message ?? `Failed to connect to ${c.name}`)
                  }
                })()
              }}
            />
          </ConnectionContextMenu>
        ))}
        <StaticLayoutSidebarItem />
      </div>

      {/* Footer */}
      <div className="flex w-full aspect-square items-center justify-center">
        <SettingsButton />
      </div>
    </div>
  )
}
