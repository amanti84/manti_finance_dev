import type { FC } from 'react'

interface LogoProps {
  collapsed?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export const Logo: FC<LogoProps> = ({ collapsed, className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }

  const textClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl',
  }

  return (
    <div className={`flex items-center gap-2 px-2 py-1 ${className}`}>
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`text-primary ${sizeClasses[size]}`}
      >
        <rect width="32" height="32" rx="6" fill="currentColor" fillOpacity="0.1" />
        <path
          d="M8 24V8H12L16 14L20 8H24V24H20V14L16 20L12 14V24H8Z"
          fill="currentColor"
        />
      </svg>
      {!collapsed && (
        <span className={`${textClasses[size]} font-bold tracking-tight text-text whitespace-nowrap`}>
          Manti<span className="text-primary">Finance</span>
        </span>
      )}
    </div>
  )
}
