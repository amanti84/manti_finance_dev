import type { FC, HTMLAttributes } from 'react'

export type SkeletonVariant = 'text' | 'heading' | 'card' | 'avatar' | 'image'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant
  width?: string | number
  height?: string | number
}

export const Skeleton: FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  style,
  ...props
}) => {
  const baseStyles = 'animate-pulse bg-text/10 rounded-md'

  const variants: Record<SkeletonVariant, string> = {
    text: 'h-4 w-full',
    heading: 'h-8 w-3/4',
    card: 'h-48 w-full',
    avatar: 'h-12 w-12 rounded-full',
    image: 'h-64 w-full rounded-lg',
  }

  const combinedStyles = {
    width: width,
    height: height,
    ...style,
  }

  return (
    <div
      className={`${baseStyles} ${variants[variant]} ${className}`}
      style={combinedStyles}
      {...props}
    />
  )
}
