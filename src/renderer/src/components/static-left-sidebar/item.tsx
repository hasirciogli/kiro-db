import { PlusIcon } from 'lucide-react'
import { useUIStore } from '../../stores/ui'

export const StaticLayoutSidebarItem = () => {
  const { openAddConnection } = useUIStore()
  return (
    <div className="flex w-full aspect-square justify-center items-center border-b">
      <button onClick={openAddConnection} aria-label="Add Connection">
        <PlusIcon />
      </button>
    </div>
  )
}
