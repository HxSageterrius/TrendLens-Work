'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API } from './api';

export type DomainType = 'fashion' | 'cars';

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
}

interface DomainContextType {
  domain: DomainType;
  setDomain: (domain: DomainType) => void;
  systemStatus: {
    online: boolean;
    mode: 'live' | 'mock' | 'loading' | 'offline';
    timeline: 'real' | 'simulated';
    error?: string;
  };
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  notifications: SystemNotification[];
  unreadNotificationCount: number;
  markAllNotificationsRead: () => void;
}

const DomainContext = createContext<DomainContextType>({
  domain: 'fashion',
  setDomain: () => {},
  systemStatus: { online: false, mode: 'loading', timeline: 'simulated' },
  searchQuery: '',
  setSearchQuery: () => {},
  sidebarCollapsed: false,
  setSidebarCollapsed: () => {},
  toggleSidebar: () => {},
  mobileMenuOpen: false,
  setMobileMenuOpen: () => {},
  notifications: [],
  unreadNotificationCount: 0,
  markAllNotificationsRead: () => {},
});

export function DomainProvider({ children }: { children: React.ReactNode }) {
  const [domain, setDomainState] = useState<DomainType>('fashion');
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [systemStatus, setSystemStatus] = useState<{
    online: boolean;
    mode: 'live' | 'mock' | 'loading' | 'offline';
    timeline: 'real' | 'simulated';
    error?: string;
  }>({
    online: false,
    mode: 'loading',
    timeline: 'simulated',
  });

  const [notifications, setNotifications] = useState<SystemNotification[]>([
    {
      id: 'notif-1',
      title: 'ML Pipeline Synchronized',
      message: 'CLIP ViT-B/32 embeddings & K-Means clusters active for Fashion domain.',
      timestamp: 'Just now',
      type: 'success',
      read: false,
    },
    {
      id: 'notif-2',
      title: 'Academic Timeline Disclosure',
      message: 'DeepFashion2 timeline is running in simulated drift mode (Rule D1).',
      timestamp: '12m ago',
      type: 'info',
      read: false,
    },
    {
      id: 'notif-3',
      title: 'Prophet Forecasting Ready',
      message: '36-month trend projections calculated with 80% confidence interval.',
      timestamp: '1h ago',
      type: 'info',
      read: true,
    },
  ]);

  // Persist domain selection & sidebar state in localStorage
  useEffect(() => {
    try {
      const savedDomain = localStorage.getItem('trendlens_domain');
      if (savedDomain === 'fashion' || savedDomain === 'cars') {
        setDomainState(savedDomain);
      }
      const savedCollapse = localStorage.getItem('trendlens_sidebar_collapsed');
      if (savedCollapse === 'true') {
        setSidebarCollapsedState(true);
      }
    } catch {}

    // Check backend health & status with active polling
    let isSubscribed = true;

    const checkHealth = async () => {
      try {
        const res = await fetch(`${API}/health`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Health check status: ' + res.status);
        const data = await res.json();
        if (!isSubscribed) return;
        setSystemStatus({
          online: data.status === 'ok',
          mode: data.mode === 'mock' ? 'mock' : 'live',
          timeline: domain === 'cars' ? 'real' : 'simulated',
        });
      } catch (err: any) {
        if (!isSubscribed) return;
        setSystemStatus({
          online: false,
          mode: 'loading',
          timeline: domain === 'cars' ? 'real' : 'simulated',
          error: err.message,
        });
      }
    };

    checkHealth();
    // Poll every 5 seconds to accurately reflect backend state transitions
    const interval = setInterval(checkHealth, 5000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [domain]);

  const setDomain = useCallback((newDomain: DomainType) => {
    setDomainState(newDomain);
    setSystemStatus((prev) => ({
      ...prev,
      timeline: newDomain === 'cars' ? 'real' : 'simulated',
    }));
    try {
      localStorage.setItem('trendlens_domain', newDomain);
    } catch {}
  }, []);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setSidebarCollapsedState(collapsed);
    try {
      localStorage.setItem('trendlens_sidebar_collapsed', String(collapsed));
    } catch {}
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsedState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('trendlens_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  return (
    <DomainContext.Provider
      value={{
        domain,
        setDomain,
        systemStatus,
        searchQuery,
        setSearchQuery,
        sidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebar,
        mobileMenuOpen,
        setMobileMenuOpen,
        notifications,
        unreadNotificationCount,
        markAllNotificationsRead,
      }}
    >
      {children}
    </DomainContext.Provider>
  );
}

export function useDomain() {
  return useContext(DomainContext);
}
