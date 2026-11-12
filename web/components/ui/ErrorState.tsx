'use client';

import React from 'react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  errorCode?: string | number;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'An error occurred',
  message,
  errorCode,
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`tl-error-state ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '36px 20px',
        backgroundColor: 'rgba(239, 68, 68, 0.04)',
        border: '1px solid rgba(239, 68, 68, 0.20)',
        borderRadius: 'var(--radius-md, 8px)',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: 'rgba(239, 68, 68, 0.12)',
          color: '#DC2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
          fontWeight: 700,
          marginBottom: '14px',
        }}
      >
        !
      </div>
      <h3
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '1.05rem',
          fontWeight: 700,
          color: '#B91C1C',
          marginBottom: '6px',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: '0.85rem',
          color: 'var(--text-secondary, #4B5563)',
          maxWidth: '460px',
          marginBottom: onRetry ? '18px' : 0,
          lineHeight: 1.5,
        }}
      >
        {message}
      </p>
      {errorCode && (
        <span
          style={{
            fontSize: '0.72rem',
            fontFamily: 'monospace',
            color: 'var(--text-muted, #9CA3AF)',
            marginBottom: onRetry ? '12px' : 0,
          }}
        >
          Error Code: {errorCode}
        </span>
      )}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}
