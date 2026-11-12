'use client';

import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`tl-empty-state ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '48px 24px',
        backgroundColor: 'var(--surface, #FFFFFF)',
        border: '1px dashed var(--border, rgba(34, 40, 49, 0.15))',
        borderRadius: 'var(--radius-md, 8px)',
      }}
    >
      {icon && (
        <div
          style={{
            fontSize: '2rem',
            color: 'var(--text-muted, #6B7280)',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
      )}
      <h3
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '1.1rem',
          fontWeight: 700,
          color: 'var(--text-primary, #222831)',
          marginBottom: '8px',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: '0.88rem',
          color: 'var(--text-secondary, #4B5563)',
          maxWidth: '420px',
          marginBottom: actionLabel ? '20px' : 0,
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
