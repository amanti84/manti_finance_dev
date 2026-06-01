import type { FC, ReactNode, HTMLAttributes } from 'react'

export type CardVariant = 'default' | 'flat' | 'elevated'

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  variant?: CardVariant
  title?: ReactNode
  description?: ReactNode
  footer?: ReactNode
  actions?: ReactNode
}

export const Card: FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  title,
  description,
  footer,
  actions,
  ...props
}) => {
  const baseStyles = 'rounded-lg bg-surface transition-all duration-180'

  const variants: Record<CardVariant, string> = {
    default: 'border border-border shadow-sm',
    flat: 'border border-border shadow-none',
    elevated: 'border border-border shadow-md',
  }

  const combinedClassName = `${baseStyles} ${variants[variant]} ${className}`

  return (
    <div className={combinedClassName} {...props}>
      {(title ?? description ?? actions) && (
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="space-y-1">
            {title && <h3 className="text-xl font-semibold tracking-tight text-text leading-none">{title}</h3>}
            {description && <div className="text-sm text-text-muted">{description}</div>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={`p-6 ${title ?? description ?? actions ? 'pt-0' : ''}`}>
        {children}
      </div>
      {footer && (
        <div className="flex items-center p-6 pt-0 mt-auto border-t border-border/50 pt-4">
          {footer}
        </div>
      )}
    </div>
  )
}

export const CardHeader: FC<HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props}>
    {children}
  </div>
)

export const CardTitle: FC<HTMLAttributes<HTMLHeadingElement>> = ({ children, className = '', ...props }) => (
  <h3 className={`text-xl font-semibold leading-none tracking-tight ${className}`} {...props}>
    {children}
  </h3>
)

export const CardDescription: FC<HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div className={`text-sm text-text-muted ${className}`} {...props}>
    {children}
  </div>
)

export const CardContent: FC<HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div className={`p-6 pt-0 ${className}`} {...props}>
    {children}
  </div>
)

export const CardFooter: FC<HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div className={`flex items-center p-6 pt-0 ${className}`} {...props}>
    {children}
  </div>
)
