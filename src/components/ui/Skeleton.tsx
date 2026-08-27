import { cn } from '../../lib/cn'

interface SkeletonProps {
  width: string | number
  height: string | number
  className?: string
}

export function Skeleton({ width, height, className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md elevation-inset', className)}
      style={{ width, height }}
    />
  )
}
