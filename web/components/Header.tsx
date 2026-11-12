'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDomain } from '@/lib/DomainContext';
import {
  SearchIcon,
  BellIcon,
  ChevronDownIcon,
  HangerIcon,
  CarIcon,
  MenuIcon,
  SparklesIcon,
  TrendingUpIcon,
} from './Icons';

export default function Header() {
  const router = useRouter();
  const {
    searchQuery,
    setSearchQuery,
    domain,
    setDomain,
    mobileMenuOpen,
    setMobileMenuOpen,
    notifications,
    unreadNotificationCount,
    markAllNotificationsRead,
  } = useDomain();

  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Global Ctrl+K / Cmd+K listener to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchFocused(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setShowProfileDropdown(false);
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchFocused(false);
    if (searchQuery.trim()) {
      router.push(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/explore');
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setSearchFocused(false);
    router.push(`/explore?q=${encodeURIComponent(suggestion)}`);
  };

  const quickSuggestions =
    domain === 'fashion'
      ? ['Oversized Coat', 'Ribbed Knitwear', 'Cognac Leather', 'Minimalist Sneaker', 'Tailored Suiting']
      : ['Fastback Coupe', 'Luxury SUV', 'Sports Coupe', 'Executive Sedan', 'Aerodynamic Trim'];

  return (
    <header className="top-header" ref={headerRef} aria-label="Application Header">
      <div className="header-left">
        {/* Mobile Hamburger Menu Toggle */}
        <button
          type="button"
          className="mobile-hamburger-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation drawer"
          aria-expanded={mobileMenuOpen}
        >
          <MenuIcon size={22} />
        </button>

        {/* Global Search Field with Autocomplete & Keyboard Cue */}
        <div className="search-container" style={{ position: 'relative', width: 360, maxWidth: '100%' }}>
          <form onSubmit={handleSearchSubmit} className="header-search">
            <SearchIcon className="header-search-icon" size={17} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 220)}
              placeholder={`Search ${domain === 'fashion' ? 'fashion trends, fabrics...' : 'cars, body styles...'}`}
              aria-label="Search visual clusters, trends, and attributes"
            />
            <kbd className="search-kbd-hint">⌘K</kbd>
          </form>

          {/* Quick Search Suggestions Popover */}
          {searchFocused && (
            <div className="search-suggestions-popover">
              <div className="search-suggestions-header">
                <SparklesIcon size={12} />
                <span>Suggested Clusters ({domain === 'fashion' ? 'Fashion' : 'Automotive'})</span>
              </div>
              <div className="search-suggestions-list">
                {quickSuggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="suggestion-chip"
                    onMouseDown={() => handleSuggestionClick(item)}
                  >
                    <TrendingUpIcon size={13} />
                    <span>{item}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="header-right">
        {/* Header Domain Switcher Pill (Quick Switcher) */}
        <div className="header-domain-pill">
          <button
            type="button"
            className={`header-domain-btn ${domain === 'fashion' ? 'active' : ''}`}
            onClick={() => setDomain('fashion')}
            aria-pressed={domain === 'fashion'}
            title="Switch to Fashion (DeepFashion2)"
          >
            <HangerIcon size={15} />
            <span>Fashion</span>
          </button>
          <button
            type="button"
            className={`header-domain-btn ${domain === 'cars' ? 'active' : ''}`}
            onClick={() => setDomain('cars')}
            aria-pressed={domain === 'cars'}
            title="Switch to Automobiles (Stanford Cars)"
          >
            <CarIcon size={15} />
            <span>Cars</span>
          </button>
        </div>

        {/* Notifications Popover */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className={`icon-btn ${showNotifications ? 'active' : ''}`}
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileDropdown(false);
            }}
            aria-label="System notifications and pipeline alerts"
            aria-expanded={showNotifications}
            title="Notifications & Pipeline Alerts"
          >
            <BellIcon size={19} />
            {unreadNotificationCount > 0 && <span className="notification-badge">{unreadNotificationCount}</span>}
          </button>

          {showNotifications && (
            <div className="notifications-popover" role="dialog" aria-label="Notifications panel">
              <div className="notifications-header">
                <div>
                  <strong>System Telemetry &amp; Alerts</strong>
                  <span className="notifications-subtext">Active FYP pipeline events</span>
                </div>
                {unreadNotificationCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllNotificationsRead}
                    className="notifications-mark-read"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="notifications-list">
                {notifications.map((notif) => (
                  <div key={notif.id} className={`notification-item ${!notif.read ? 'unread' : ''}`}>
                    <div className="notification-dot" />
                    <div className="notification-content">
                      <div className="notification-title">{notif.title}</div>
                      <div className="notification-message">{notif.message}</div>
                      <div className="notification-time">{notif.timestamp}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="user-profile-btn"
            onClick={() => {
              setShowProfileDropdown(!showProfileDropdown);
              setShowNotifications(false);
            }}
            aria-label="User account menu"
            aria-expanded={showProfileDropdown}
          >
            <div className="avatar-circle-sm">HK</div>
            <span className="user-name-label">Hamza K.</span>
            <ChevronDownIcon size={14} className="text-muted" />
          </button>

          {showProfileDropdown && (
            <div className="profile-dropdown-menu" role="menu">
              <div className="profile-dropdown-header">
                <strong>Hamza Khalid</strong>
                <span>BSCS Final Year Project</span>
                <span className="profile-role-badge">Lead Developer</span>
              </div>

              <Link
                href="/settings"
                className="profile-menu-item"
                onClick={() => setShowProfileDropdown(false)}
                role="menuitem"
              >
                Settings &amp; Model Configurations
              </Link>
              <Link
                href="/reports"
                className="profile-menu-item"
                onClick={() => setShowProfileDropdown(false)}
                role="menuitem"
              >
                Academic Evaluation Dossier
              </Link>
              <Link
                href="/about"
                className="profile-menu-item"
                onClick={() => setShowProfileDropdown(false)}
                role="menuitem"
              >
                Methodology &amp; Architecture
              </Link>

              <div className="profile-menu-divider" />

              <button
                type="button"
                className="profile-menu-item"
                onClick={() => {
                  setDomain(domain === 'fashion' ? 'cars' : 'fashion');
                  setShowProfileDropdown(false);
                }}
                role="menuitem"
              >
                Switch to {domain === 'fashion' ? 'Automotive (Cars)' : 'Fashion'} Domain
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
