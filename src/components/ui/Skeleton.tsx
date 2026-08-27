interface SkeletonProps {
  width: string | number
  height: string | number
}

export function Skeleton({ width, height }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className="animate-pulse rounded-md elevation-inset"
      style={{ width, height }}
    />
  )
}
