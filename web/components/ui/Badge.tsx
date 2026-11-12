'use client';

import React from 'react';

export type BadgeVariant =
  | 'emerging'
  | 'stable'
  | 'declining'
  | 'live'
  | 'demo'
  | 'simulated'
  | 'neutral'
  | 'outline';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export function Badge({
  children,
  className = '',
  variant = 'neutral',
  size = 'md',
  pulse = false,
  style,
  ...props
}: BadgeProps) {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontWeight: 600,
    fontFamily: 'var(--font-sans)',
    borderRadius: 'var(--radius-full, 9999px)',
    letterSpacing: '0.02em',
    lineHeight: 1,
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  };

  const sizeStyles: Record<'sm' | 'md', React.CSSProperties> = {
    sm: {
      fontSize: '0.70rem',
      padding: '3px 8px',
    },
    md: {
      fontSize: '0.78rem',
      padding: '4px 10px',
    },
  };

  const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
    emerging: {
      backgroundColor: 'var(--primary-accent, #FFD369)',
      color: '#222831',
      border: '1px solid rgba(0, 0, 0, 0.05)',
      fontWeight: 700,
    },
    stable: {
      backgroundColor: '#F3F4F6',
      color: '#393E46',
      border: '1px solid rgba(34, 40, 49, 0.10)',
    },
    declining: {
      backgroundColor: 'transparent',
      color: '#6B7280',
      border: '1px solid rgba(34, 40, 49, 0.15)',
    },
    live: {
      backgroundColor: 'rgba(34, 197, 94, 0.12)',
      color: '#15803D',
      border: '1px solid rgba(34, 197, 94, 0.25)',
    },
    demo: {
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      color: '#B45309',
      border: '1px solid rgba(245, 158, 11, 0.25)',
    },
    simulated: {
      backgroundColor: 'rgba(255, 211, 105, 0.18)',
      color: '#92400E',
      border: '1px solid rgba(255, 211, 105, 0.40)',
    },
    neutral: {
      backgroundColor: 'var(--surface-elevated, #F3F4F6)',
      color: 'var(--text-primary, #222831)',
      border: '1px solid var(--border, rgba(34, 40, 49, 0.08))',
    },
    outline: {
      backgroundColor: 'transparent',
      color: 'var(--text-secondary, #393E46)',
      border: '1px solid var(--border, rgba(34, 40, 49, 0.15))',
    },
  };

  const renderIcon = () => {
    if (variant === 'emerging') return <span>↗</span>;
    if (variant === 'stable') return <span>→</span>;
    if (variant === 'declining') return <span>↘</span>;
    if (pulse) {
      return (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'currentColor',
            display: 'inline-block',
            animation: 'tl-pulse 1.8s infinite',
          }}
        />
      );
    }
    return null;
  };

  return (
    <span
      className={`tl-badge tl-badge-${variant} ${className}`}
      style={{
        ...baseStyle,
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style,
      }}
      {...props}
    >
      {renderIcon()}
      <span>{children}</span>
    </span>
  );
}
