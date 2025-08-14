import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../ui/dropdown-menu'
import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  onConnect: () => void
  onDelete: () => void
  onTest: () => void
  onEdit: () => void
}

export const ConnectionContextMenu = ({ children, onConnect, onDelete, onTest, onEdit }: Props) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start">
        <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
        <DropdownMenuItem onClick={onConnect}>Connect</DropdownMenuItem>
        <DropdownMenuItem onClick={onTest}>Test Connection</DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete}>Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


