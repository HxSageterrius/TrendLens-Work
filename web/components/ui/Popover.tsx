'use client';

import React, { useState, useRef, useEffect } from 'react';

interface PopoverProps {
  children: React.ReactNode;
}

interface PopoverTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

interface PopoverContentProps {
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  className?: string;
  style?: React.CSSProperties;
}

const PopoverContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}>({
  open: false,
  setOpen: () => {},
  triggerRef: { current: null },
});

export function Popover({ children }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && open) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <PopoverContext.Provider value={{ open, setOpen, triggerRef }}>
      <div
        ref={containerRef}
        style={{ position: 'relative', display: 'inline-block' }}
      >
        {children}
      </div>
    </PopoverContext.Provider>
  );
}

export function PopoverTrigger({ children }: PopoverTriggerProps) {
  const { open, setOpen, triggerRef } = React.useContext(PopoverContext);

  return (
    <div
      ref={triggerRef}
      onClick={() => setOpen(!open)}
      role="button"
      tabIndex={0}
      aria-expanded={open}
      style={{ display: 'inline-flex', cursor: 'pointer' }}
    >
      {children}
    </div>
  );
}

export function PopoverContent({
  children,
  align = 'end',
  className = '',
  style,
}: PopoverContentProps) {
  const { open } = React.useContext(PopoverContext);

  if (!open) return null;

  const alignmentStyle: React.CSSProperties =
    align === 'start'
      ? { left: 0 }
      : align === 'center'
      ? { left: '50%', transform: 'translateX(-50%)' }
      : { right: 0 };

  return (
    <div
      className={`editorial-popover-content ${className}`}
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        zIndex: 50,
        minWidth: 220,
        backgroundColor: 'var(--surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
        padding: '12px',
        animation: 'fadeIn 0.15s ease',
        ...alignmentStyle,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
