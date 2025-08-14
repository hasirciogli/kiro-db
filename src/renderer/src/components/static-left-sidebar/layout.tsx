import { StaticLayoutSidebarItem } from './item'
import { SettingsButton } from './settings'
import { useConnectionStore } from '../../stores/connection'
import { useEffect } from 'react'
import { ConnectionIcon } from './connection-icon'

export const StaticLeftBar = () => {
  const { connections, activeConnectionId, loadConnections, setActiveConnection, connect } =
    useConnectionStore()

  useEffect(() => {
    void loadConnections()
  }, [loadConnections])

  return (
    <div className="flex flex-col w-14 border-r h-screen bg-sidebar-primary">
      {/* Slide Container */}
      <div className="flex h-full items-start overflow-y-scroll flex-col">
        {connections.map((c) => (
          <ConnectionIcon
            key={c.id}
            label={c.name}
            active={activeConnectionId === c.id}
            onClick={() => {
              setActiveConnection(c.id)
              void connect(c.id)
            }}
          />
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
