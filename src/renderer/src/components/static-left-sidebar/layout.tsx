import { StaticLayoutSidebarItem } from './item'
import { SettingsButton } from './settings'
import { useConnectionStore } from '../../stores/connection'
import { useEffect } from 'react'
import { ConnectionIcon } from './connection-icon'
import { ConnectionContextMenu } from './connection-context-menu'

export const StaticLeftBar = () => {
  const {
    connections,
    activeConnectionId,
    loadConnections,
    setActiveConnection,
    connect,
    deleteConnection,
    testConnection
  } = useConnectionStore()

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
              void connect(c.id)
            }}
            onDelete={() => void deleteConnection(c.id)}
            onTest={() =>
              void testConnection({
                name: c.name,
                type: c.type,
                host: c.host,
                port: c.port,
                database: c.database,
                username: c.username,
                password: c.password,
                ssl: c.ssl
              } as any)
            }
          >
            <ConnectionIcon
              label={c.name}
              active={activeConnectionId === c.id}
              status={activeConnectionId === c.id ? 'connected' : 'disconnected'}
              onClick={() => {
                setActiveConnection(c.id)
                void connect(c.id)
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
