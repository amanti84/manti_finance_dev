import type { FC, ReactNode } from 'react'
import { Button } from './Button'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export const EmptyState: FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-300 ${className}`}>
      {icon && (
        <div className="flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-surface border border-border text-primary shadow-sm">
          {icon}
        </div>
      )}
      <h3 className="text-xl font-semibold text-text mb-2">{title}</h3>
      {description && (
        <p className="max-w-xs text-sm text-text-muted mb-8">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
