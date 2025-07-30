'use client'

import React from 'react'

interface SkeletonProps {
  className?: string
  width?: string
  height?: string
}

export function Skeleton({ className = '', width, height }: SkeletonProps) {
  const style = {
    ...(width && { width }),
    ...(height && { height }),
  }

  return (
    <div
      className={`animate-pulse bg-zinc-700 rounded ${className}`}
      style={style}
    />
  )
}

export function SkeletonText({ 
  className = '', 
  lines = 1, 
  lineHeight = '1rem',
  width = '100%' 
}: {
  className?: string
  lines?: number
  lineHeight?: string
  width?: string | string[]
}) {
  const widths = Array.isArray(width) ? width : Array(lines).fill(width)
  
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height={lineHeight}
          width={widths[index] || '100%'}
        />
      ))}
    </div>
  )
}

export function SkeletonButton({ 
  className = '',
  size = 'medium'
}: {
  className?: string
  size?: 'small' | 'medium' | 'large'
}) {
  const sizeClasses = {
    small: 'h-8 w-16',
    medium: 'h-10 w-24', 
    large: 'h-12 w-32'
  }
  
  return (
    <Skeleton className={`${sizeClasses[size]} ${className}`} />
  )
}

export function SkeletonCard({
  className = '',
  hasHeader = true,
  headerHeight = '1.5rem',
  contentLines = 3,
  padding = 'p-4'
}: {
  className?: string
  hasHeader?: boolean
  headerHeight?: string
  contentLines?: number
  padding?: string
}) {
  return (
    <div className={`${padding} ${className}`}>
      {hasHeader && (
        <Skeleton height={headerHeight} width="60%" className="mb-3" />
      )}
      <SkeletonText 
        lines={contentLines} 
        width={['100%', '85%', '70%']} 
        lineHeight="0.875rem"
      />
    </div>
  )
}