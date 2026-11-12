'use client';

import React, { useState } from 'react';

interface CalendarProps {
  selectedYear?: number;
  selectedMonth?: number;
  onSelectPeriod?: (period: { year: number; month: number }) => void;
  minYear?: number;
  maxYear?: number;
  className?: string;
  style?: React.CSSProperties;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export function Calendar({
  selectedYear = 2025,
  selectedMonth = 6,
  onSelectPeriod,
  minYear = 2021,
  maxYear = 2028,
  className = '',
  style,
}: CalendarProps) {
  const [activeYear, setActiveYear] = useState(selectedYear);
  const [activeMonth, setActiveMonth] = useState(selectedMonth);

  const handleMonthClick = (idx: number) => {
    setActiveMonth(idx);
    if (onSelectPeriod) {
      onSelectPeriod({ year: activeYear, month: idx });
    }
  };

  return (
    <div
      className={`editorial-calendar ${className}`}
      style={{
        padding: '16px',
        backgroundColor: 'var(--surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
        width: 280,
        ...style,
      }}
    >
      {/* Year Navigation */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <button
          type="button"
          onClick={() => setActiveYear((y) => Math.max(minYear, y - 1))}
          disabled={activeYear <= minYear}
          style={{
            padding: '4px 8px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-main)',
            color: activeYear <= minYear ? 'var(--text-muted)' : 'var(--text-primary)',
            fontSize: '0.85rem',
            cursor: activeYear <= minYear ? 'not-allowed' : 'pointer',
          }}
          aria-label="Previous Year"
        >
          ‹
        </button>

        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 700,
            fontSize: '1.05rem',
            color: 'var(--text-primary)',
          }}
        >
          {activeYear}
        </span>

        <button
          type="button"
          onClick={() => setActiveYear((y) => Math.min(maxYear, y + 1))}
          disabled={activeYear >= maxYear}
          style={{
            padding: '4px 8px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-main)',
            color: activeYear >= maxYear ? 'var(--text-muted)' : 'var(--text-primary)',
            fontSize: '0.85rem',
            cursor: activeYear >= maxYear ? 'not-allowed' : 'pointer',
          }}
          aria-label="Next Year"
        >
          ›
        </button>
      </div>

      {/* Month Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 6,
        }}
      >
        {MONTHS.map((name, index) => {
          const isSelected = activeYear === selectedYear && activeMonth === index;
          return (
            <button
              key={name}
              type="button"
              onClick={() => handleMonthClick(index)}
              style={{
                padding: '8px 4px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
                fontWeight: isSelected ? 600 : 500,
                backgroundColor: isSelected ? 'var(--primary-accent)' : 'transparent',
                color: isSelected ? '#FFFFFF' : 'var(--text-primary)',
                border: isSelected ? '1px solid var(--primary-accent)' : '1px solid transparent',
                transition: 'all 0.15s ease',
              }}
              className="month-btn"
            >
              {name}
            </button>
          );
        })}
      </div>

      {/* Quick Presets */}
      <div
        style={{
          marginTop: 14,
          paddingTop: 10,
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 6,
        }}
      >
        <button
          type="button"
          onClick={() => {
            setActiveYear(2025);
            setActiveMonth(5);
            onSelectPeriod?.({ year: 2025, month: 5 });
          }}
          style={{
            fontSize: '0.72rem',
            color: 'var(--primary-accent)',
            fontWeight: 600,
          }}
        >
          Last 6 Months
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveYear(2025);
            setActiveMonth(11);
            onSelectPeriod?.({ year: 2025, month: 11 });
          }}
          style={{
            fontSize: '0.72rem',
            color: 'var(--text-secondary)',
          }}
        >
          2021–2025 Full
        </button>
      </div>
    </div>
  );
}
