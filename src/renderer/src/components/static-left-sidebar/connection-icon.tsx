import { DatabaseIcon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { cn } from '../../lib/utils'

interface ConnectionIconProps {
  label: string
  active?: boolean
  onClick?: () => void
}

export const ConnectionIcon = ({ label, active, onClick }: ConnectionIconProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className={cn(
              'flex w-full aspect-square justify-center items-center border-b transition-colors',
              active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            )}
          >
            <DatabaseIcon className="h-5 w-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

