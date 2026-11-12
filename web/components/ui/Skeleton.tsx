'use client';

import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
  style,
  ...props
}: SkeletonProps) {
  const getRadius = () => {
    if (variant === 'circular') return '50%';
    if (variant === 'text') return 'var(--radius-xs, 4px)';
    return 'var(--radius-sm, 6px)';
  };

  const getDefaultHeight = () => {
    if (height) return height;
    if (variant === 'text') return '14px';
    if (variant === 'circular') return width || '40px';
    return '120px';
  };

  return (
    <div
      className={`tl-skeleton ${className}`}
      style={{
        width: width || (variant === 'text' ? '100%' : undefined),
        height: getDefaultHeight(),
        borderRadius: getRadius(),
        backgroundColor: 'var(--surface-elevated, #F3F4F6)',
        backgroundImage:
          'linear-gradient(90deg, var(--surface-elevated, #F3F4F6) 0%, rgba(255, 255, 255, 0.6) 50%, var(--surface-elevated, #F3F4F6) 100%)',
        backgroundSize: '200% 100%',
        animation: 'tl-shimmer 1.5s infinite linear',
        display: 'inline-block',
        ...style,
      }}
      {...props}
    />
  );
}
