'use client';

import React, { useState } from 'react';

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function Tooltip({
  content,
  children,
  position = 'top',
  className = '',
}: TooltipProps) {
  const [visible, setVisible] = useState(false);

  const positionStyles: Record<'top' | 'bottom' | 'left' | 'right', React.CSSProperties> = {
    top: {
      bottom: 'calc(100% + 6px)',
      left: '50%',
      transform: 'translateX(-50%)',
    },
    bottom: {
      top: 'calc(100% + 6px)',
      left: '50%',
      transform: 'translateX(-50%)',
    },
    left: {
      right: 'calc(100% + 6px)',
      top: '50%',
      transform: 'translateY(-50%)',
    },
    right: {
      left: 'calc(100% + 6px)',
      top: '50%',
      transform: 'translateY(-50%)',
    },
  };

  return (
    <div
      className={`tl-tooltip-wrapper ${className}`}
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && content && (
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            ...positionStyles[position],
            backgroundColor: '#222831',
            color: '#EEEEEE',
            fontSize: '0.72rem',
            fontWeight: 500,
            fontFamily: 'var(--font-sans)',
            padding: '4px 8px',
            borderRadius: 'var(--radius-xs, 4px)',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            pointerEvents: 'none',
            animation: 'tl-fade-in 0.12s ease-out',
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}
