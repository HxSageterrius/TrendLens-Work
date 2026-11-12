import React from 'react';

export function Table({
  className = '',
  children,
  style,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div
      style={{
        width: '100%',
        overflowX: 'auto',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        backgroundColor: 'var(--surface)',
      }}
    >
      <table
        className={`editorial-table ${className}`}
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.88rem',
          textAlign: 'left',
          ...style,
        }}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHeader({
  children,
  style,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        ...style,
      }}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TableBody({
  children,
  style,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody style={{ ...style }} {...props}>
      {children}
    </tbody>
  );
}

export function TableFooter({
  children,
  style,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tfoot
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
        fontWeight: 600,
        ...style,
      }}
      {...props}
    >
      {children}
    </tfoot>
  );
}

export function TableRow({
  children,
  style,
  className = '',
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={`editorial-tr ${className}`}
      style={{
        borderBottom: '1px solid var(--border-subtle)',
        transition: 'background-color 0.15s ease',
        ...style,
      }}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({
  children,
  style,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      style={{
        padding: '12px 16px',
        fontWeight: 600,
        fontSize: '0.78rem',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        color: 'var(--text-secondary)',
        ...style,
      }}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  style,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      style={{
        padding: '14px 16px',
        color: 'var(--text-primary)',
        verticalAlign: 'middle',
        ...style,
      }}
      {...props}
    >
      {children}
    </td>
  );
}

export function TableCaption({
  children,
  style,
  ...props
}: React.HTMLAttributes<HTMLTableCaptionElement>) {
  return (
    <caption
      style={{
        padding: '10px 16px',
        fontSize: '0.78rem',
        color: 'var(--text-muted)',
        textAlign: 'left',
        captionSide: 'bottom',
        ...style,
      }}
      {...props}
    >
      {children}
    </caption>
  );
}
