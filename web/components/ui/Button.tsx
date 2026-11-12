'use client';

import React, { forwardRef } from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = '',
      variant = 'secondary',
      size = 'md',
      loading = false,
      disabled = false,
      iconLeft,
      iconRight,
      style,
      ...props
    },
    ref
  ) => {
    const baseStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      fontWeight: 600,
      fontFamily: 'var(--font-sans)',
      borderRadius: 'var(--radius-sm, 6px)',
      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      opacity: disabled || loading ? 0.6 : 1,
      textDecoration: 'none',
      border: '1px solid transparent',
      lineHeight: 1.25,
      whiteSpace: 'nowrap',
    };

    const sizeStyles: Record<'sm' | 'md' | 'lg', React.CSSProperties> = {
      sm: {
        fontSize: '0.8rem',
        padding: '6px 12px',
        height: '32px',
      },
      md: {
        fontSize: '0.88rem',
        padding: '8px 16px',
        height: '40px',
      },
      lg: {
        fontSize: '0.98rem',
        padding: '12px 24px',
        height: '48px',
      },
    };

    const variantStyles: Record<
      'primary' | 'secondary' | 'outline' | 'ghost' | 'danger',
      React.CSSProperties
    > = {
      primary: {
        backgroundColor: 'var(--primary-accent, #FFD369)',
        color: '#222831',
        borderColor: 'transparent',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
      },
      secondary: {
        backgroundColor: 'var(--surface, #FFFFFF)',
        color: 'var(--text-primary, #222831)',
        borderColor: 'var(--border, rgba(34, 40, 49, 0.10))',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
      },
      outline: {
        backgroundColor: 'transparent',
        color: 'var(--text-primary, #222831)',
        borderColor: 'var(--border, rgba(34, 40, 49, 0.15))',
      },
      ghost: {
        backgroundColor: 'transparent',
        color: 'var(--text-secondary, #393E46)',
        borderColor: 'transparent',
      },
      danger: {
        backgroundColor: '#DC2626',
        color: '#FFFFFF',
        borderColor: 'transparent',
      },
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`tl-button tl-button-${variant} ${className}`}
        style={{
          ...baseStyle,
          ...sizeStyles[size],
          ...variantStyles[variant],
          ...style,
        }}
        {...props}
      >
        {loading ? (
          <span
            style={{
              width: '14px',
              height: '14px',
              border: '2px solid currentColor',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'tl-spin 0.6s linear infinite',
            }}
          />
        ) : (
          iconLeft
        )}
        <span>{children}</span>
        {!loading && iconRight}
      </button>
    );
  }
);

Button.displayName = 'Button';
