'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';
import { useSettings } from '@/context/SettingsContext';
import { Facebook, Twitter, Instagram, Linkedin, Github, Mail, Phone, MapPin, ExternalLink } from 'lucide-react';

interface SiteSettings {
  navbarName?: string;
  footerText?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  footerLinks?: { label: string; url: string; icon?: string }[];
}

const ICON_MAP: Record<string, any> = {
  Facebook, Twitter, Instagram, Linkedin, Github, Mail, Phone, MapPin, ExternalLink
};

export default function Footer() {
  const { settings } = useSettings();

  return (
    <footer className="w-full border-t bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-6">
            <h3 className="text-xl font-bold">About {settings?.navbarName || 'Today AI'}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {settings?.footerText || 'Your premium destination for modern lifestyle products. Quality and style delivered to your doorstep.'}
            </p>
          </div>
          <div className="space-y-6">
            <h3 className="text-xl font-bold">Quick Links</h3>
            <div className="flex flex-wrap gap-4">
              {settings?.footerLinks && settings.footerLinks.length > 0 ? (
                settings.footerLinks.map((link, idx) => {
                  const IconComp = ICON_MAP[link.icon || 'ExternalLink'] || ExternalLink;
                  return (
                    <Link 
                      key={idx} 
                      href={link.url} 
                      className="p-3 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-all duration-300 group"
                      title={link.label}
                    >
                      <IconComp className="h-5 w-5" />
                    </Link>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground italic">No links configured.</p>
              )}
            </div>
          </div>
          <div className="space-y-6">
            <h3 className="text-xl font-bold">Contact Us</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 text-primary" />
                <span>{settings?.contactEmail || 'support@todayai.com'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 text-primary" />
                <span>{settings?.contactPhone || '+1 (555) 123-4567'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{settings?.contactAddress || '123 E-commerce St, Digital City'}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-16 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {settings?.navbarName || 'Today AI'}. All rights reserved. <br />Developed by RemotizedIT</p>
        </div>
      </div>
    </footer>
  );
}
