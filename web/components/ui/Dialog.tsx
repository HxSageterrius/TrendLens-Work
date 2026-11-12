'use client';

import React, { useEffect, useRef } from 'react';
import { Button } from './Button';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  danger?: boolean;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  danger = false,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(34, 40, 49, 0.45)',
        backdropFilter: 'blur(3px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: 'var(--surface, #FFFFFF)',
          border: '1px solid var(--border, rgba(34, 40, 49, 0.12))',
          borderRadius: 'var(--radius-md, 8px)',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.14)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          animation: 'tl-scale-up 0.15s ease-out',
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '1.2rem',
              fontWeight: 700,
              color: 'var(--text-primary, #222831)',
              marginBottom: description ? '6px' : 0,
            }}
          >
            {title}
          </h2>
          {description && (
            <p
              style={{
                fontSize: '0.88rem',
                color: 'var(--text-secondary, #4B5563)',
                lineHeight: 1.5,
              }}
            >
              {description}
            </p>
          )}
        </div>

        {children && <div>{children}</div>}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            marginTop: '8px',
          }}
        >
          <Button variant="ghost" size="sm" onClick={onClose}>
            {cancelLabel}
          </Button>
          {onConfirm && (
            <Button
              variant={danger ? 'danger' : 'primary'}
              size="sm"
              onClick={() => {
                onConfirm();
                onClose();
              }}
            >
              {confirmLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export const Modal = Dialog;
