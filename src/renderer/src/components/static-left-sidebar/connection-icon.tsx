import { DatabaseIcon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { cn } from '../../lib/utils'

interface ConnectionIconProps {
  label: string
  active?: boolean
  status?: 'connected' | 'connecting' | 'disconnected' | 'error'
  onClick?: () => void
}

export const ConnectionIcon = ({ label, active, status = 'disconnected', onClick }: ConnectionIconProps) => {
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
            <div className="relative">
              <DatabaseIcon className="h-5 w-5" />
              <span
                className={cn(
                  'absolute -right-1 -bottom-1 inline-block h-2 w-2 rounded-full',
                  status === 'connected' && 'bg-green-500',
                  status === 'connecting' && 'bg-yellow-500',
                  status === 'error' && 'bg-red-500',
                  status === 'disconnected' && 'bg-muted-foreground'
                )}
              />
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

