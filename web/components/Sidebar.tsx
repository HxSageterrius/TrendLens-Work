'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDomain } from '@/lib/DomainContext';
import {
  TrendLensLogoIcon,
  HomeIcon,
  ExploreIcon,
  LensIcon,
  TrendsIcon,
  ReportsIcon,
  SettingsIcon,
  HangerIcon,
  CarIcon,
  ChevronDownIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  XIcon,
} from './Icons';

export default function Sidebar() {
  const pathname = usePathname();
  const {
    domain,
    setDomain,
    systemStatus,
    sidebarCollapsed,
    toggleSidebar,
    mobileMenuOpen,
    setMobileMenuOpen,
  } = useDomain();

  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname, setMobileMenuOpen]);

  // Global keyboard shortcut: Ctrl+B or Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar, mobileMenuOpen, setMobileMenuOpen]);

  const navLinks = [
    { label: 'Home', href: '/', icon: HomeIcon },
    { label: 'Explore', href: '/explore', icon: ExploreIcon },
    { label: 'Lens Scan', href: '/lens-scan', icon: LensIcon },
    { label: 'Trends', href: '/trends', icon: TrendsIcon },
    { label: 'Reports', href: '/reports', icon: ReportsIcon },
    { label: 'Settings', href: '/settings', icon: SettingsIcon },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          className="mobile-sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${
          mobileMenuOpen ? 'mobile-open' : ''
        }`}
        aria-label="Main Application Navigation"
      >
        {/* Brand Header Row */}
        <div className="brand-header-row">
          <Link
            href="/"
            className="brand-logo"
            title="TrendLens — Visual Trend Platform"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="brand-icon">
              <TrendLensLogoIcon size={24} />
            </div>
            <div className="brand-text">
              <h2>Trendlens</h2>
              <span className="brand-ai-badge">AI</span>
            </div>
          </Link>

          {/* Desktop Retract / Expand Toggle Button */}
          <button
            type="button"
            className="sidebar-collapse-btn desktop-only-btn"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? undefined : 'Collapse sidebar (Ctrl+B)'}
            aria-label={sidebarCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
          >
            {sidebarCollapsed ? <PanelLeftOpenIcon size={16} /> : <PanelLeftCloseIcon size={16} />}
            {sidebarCollapsed && <span className="nav-tooltip">Expand sidebar (Ctrl+B)</span>}
          </button>

          {/* Mobile Close Button */}
          <button
            type="button"
            className="sidebar-collapse-btn mobile-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            title="Close navigation"
            aria-label="Close navigation"
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Collapsed Rail Divider */}
        {sidebarCollapsed && <div className="collapsed-divider" />}

        {/* Navigation Group Header */}
        {!sidebarCollapsed && (
          <div className="sidebar-group-title">Analytics Navigation</div>
        )}

        {/* Primary Navigation Links */}
        <nav className="nav-group">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${active ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
                title={sidebarCollapsed ? undefined : item.label}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {sidebarCollapsed && <span className="nav-tooltip">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Domain Switcher & System Telemetry */}
        <div className="domain-section">
          {!sidebarCollapsed && <div className="sidebar-group-title">Active Domain</div>}
          <div className="domain-toggle-pill">
            <button
              type="button"
              className={`domain-toggle-btn ${domain === 'fashion' ? 'active' : ''}`}
              onClick={() => setDomain('fashion')}
              aria-pressed={domain === 'fashion'}
              aria-label="Fashion Domain (DeepFashion2)"
            >
              <HangerIcon size={14} />
              <span>Fashion</span>
              {sidebarCollapsed && <span className="nav-tooltip">Fashion (DeepFashion2)</span>}
            </button>
            <button
              type="button"
              className={`domain-toggle-btn ${domain === 'cars' ? 'active' : ''}`}
              onClick={() => setDomain('cars')}
              aria-pressed={domain === 'cars'}
              aria-label="Automotive Domain (Stanford Cars)"
            >
              <CarIcon size={14} />
              <span>Cars</span>
              {sidebarCollapsed && <span className="nav-tooltip">Automotive (Stanford Cars)</span>}
            </button>
          </div>

          {/* System Status Box */}
          <div
            className="system-status-box"
            tabIndex={0}
            role="status"
            aria-label={
              systemStatus.mode === 'loading'
                ? 'Backend Activating (Starting PyTorch & CLIP)...'
                : systemStatus.online
                ? `System Online: ${systemStatus.mode === 'mock' ? 'Demo Mode' : 'Live CLIP ViT-B/32 & Prophet'}`
                : 'Backend Offline'
            }
          >
            <div
              className={`status-dot ${
                systemStatus.mode === 'loading'
                  ? 'loading'
                  : systemStatus.online
                  ? systemStatus.mode === 'mock'
                    ? 'warning'
                    : ''
                  : 'offline'
              }`}
            />
            <div className="system-status-text">
              <strong>
                {systemStatus.mode === 'loading'
                  ? 'Activating Backend...'
                  : systemStatus.online
                  ? systemStatus.mode === 'mock'
                    ? 'Demo Mode'
                    : 'System Online'
                  : 'Backend Offline'}
              </strong>
              <span>
                {systemStatus.mode === 'loading'
                  ? 'Preloading CLIP & ML models'
                  : systemStatus.online
                  ? systemStatus.mode === 'mock'
                    ? 'Synthetic fixture data'
                    : 'CLIP ViT-B/32 & Prophet active'
                  : 'Reconnecting to API...'}
              </span>
            </div>
            {sidebarCollapsed && (
              <span className="nav-tooltip">
                {systemStatus.mode === 'loading'
                  ? 'Backend Activating (Loading ML Models...)'
                  : systemStatus.online
                  ? systemStatus.mode === 'mock'
                    ? 'System Online (Demo Data)'
                    : 'System Online (CLIP ViT-B/32 & Prophet)'
                  : 'Backend Offline (Reconnecting...)'}
              </span>
            )}
          </div>

          {/* User Profile Summary */}
          <div
            className="user-profile-summary"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            role="button"
            tabIndex={0}
            aria-label="User profile: Hamza Khalid"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setShowProfileMenu(!showProfileMenu);
              }
            }}
          >
            <div className="avatar-circle">HK</div>
            <div className="user-profile-info">
              <div className="user-profile-name">Hamza Khalid</div>
              <div className="user-profile-role">BSCS FYP Candidate</div>
            </div>
            <ChevronDownIcon size={14} className="text-muted" />
            {sidebarCollapsed && <span className="nav-tooltip">Hamza Khalid (Profile)</span>}

            {showProfileMenu && (
              <div
                style={{
                  position: 'absolute',
                  bottom: sidebarCollapsed ? 0 : '100%',
                  left: sidebarCollapsed ? 'calc(100% + 10px)' : 0,
                  right: sidebarCollapsed ? 'auto' : 0,
                  width: sidebarCollapsed ? 210 : '100%',
                  backgroundColor: 'var(--surface, #FFFFFF)',
                  border: '1px solid var(--border, rgba(34, 40, 49, 0.12))',
                  borderRadius: 'var(--radius-sm, 6px)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                  padding: '5px',
                  marginBottom: sidebarCollapsed ? 0 : '6px',
                  zIndex: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    padding: '6px 10px 8px',
                    borderBottom: '1px solid var(--border, rgba(34, 40, 49, 0.08))',
                    marginBottom: '3px',
                  }}
                >
                  <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary, #222831)', display: 'block' }}>
                    Hamza Khalid
                  </strong>
                  <span style={{ fontSize: '0.70rem', color: 'var(--text-muted, #6B7280)' }}>
                    BSCS Final Year Project
                  </span>
                </div>
                <Link
                  href="/settings"
                  onClick={() => setShowProfileMenu(false)}
                  style={{
                    padding: '7px 10px',
                    fontSize: '0.82rem',
                    borderRadius: '4px',
                    color: 'var(--text-primary, #222831)',
                    display: 'block',
                    textDecoration: 'none',
                    transition: 'background-color 0.12s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F3F4F6)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  Settings &amp; Model Config
                </Link>
                <Link
                  href="/reports"
                  onClick={() => setShowProfileMenu(false)}
                  style={{
                    padding: '7px 10px',
                    fontSize: '0.82rem',
                    borderRadius: '4px',
                    color: 'var(--text-primary, #222831)',
                    display: 'block',
                    textDecoration: 'none',
                    transition: 'background-color 0.12s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F3F4F6)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  Academic Evaluation Dossier
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setDomain(domain === 'fashion' ? 'cars' : 'fashion');
                    setShowProfileMenu(false);
                  }}
                  style={{
                    padding: '7px 10px',
                    fontSize: '0.82rem',
                    borderRadius: '4px',
                    color: 'var(--text-primary, #222831)',
                    textAlign: 'left',
                    width: '100%',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.12s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F3F4F6)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  Switch to {domain === 'fashion' ? 'Automobiles' : 'Fashion'}
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
