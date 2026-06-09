import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      fullWidth,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'

    const variants: Record<ButtonVariant, string> = {
      primary: 'bg-primary text-white hover:bg-primary/90 shadow-sm',
      secondary: 'bg-surface text-text border border-border hover:bg-bg shadow-sm',
      ghost: 'bg-transparent text-text hover:bg-surface',
      danger: 'bg-error text-white hover:bg-error/90 shadow-sm',
    }

    const sizes: Record<ButtonSize, string> = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-10 px-4 py-2 gap-2',
      lg: 'h-12 px-6 text-lg gap-2.5',
    }

    const combinedClassName = `${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`

    return (
      <button
        ref={ref}
        className={combinedClassName}
        disabled={disabled ?? isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="animate-spin" size={size === 'sm' ? 14 : size === 'lg' ? 20 : 18} />}
        {!isLoading && leftIcon}
        {children}
        {!isLoading && rightIcon}
      </button>
    )
  }
)

Button.displayName = 'Button'
