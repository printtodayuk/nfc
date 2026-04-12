'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface SiteSettings {
  navbarName?: string;
  logoUrl?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroMediaUrl?: string;
  heroMediaType?: 'image' | 'video';
  footerText?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  footerLinks?: { label: string; url: string; icon?: string }[];
}

interface SettingsContextType {
  settings: SiteSettings | null;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'site'), (doc) => {
      if (doc.exists()) {
        setSettings(doc.data() as SiteSettings);
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching settings:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
