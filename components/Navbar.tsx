'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, User, LogIn, LogOut, LayoutDashboard, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { auth, db } from '@/lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';
import { useCart } from '@/context/CartContext';

interface SiteSettings {
  navbarName?: string;
  logoUrl?: string;
}

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [mounted, setMounted] = useState(false);
  const { totalItems } = useCart();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (!userDoc.exists()) {
          const role = currentUser.email === 'printtodayuk@gmail.com' ? 'admin' : 'user';
          await setDoc(doc(db, 'users', currentUser.uid), {
            email: currentUser.email,
            role: role
          });
          setIsAdmin(role === 'admin');
        } else {
          setIsAdmin(userDoc.data().role === 'admin');
        }
      } else {
        setIsAdmin(false);
      }
    });

    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'site'), (doc) => {
      if (doc.exists()) {
        setSettings(prev => ({ ...prev, ...doc.data() as SiteSettings }));
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSettings();
    };
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success('Logged in successfully');
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        toast.info('Login cancelled. The popup was closed.');
        return;
      }
      if (error.code === 'auth/cancelled-popup-request') return; 
      if (error.code === 'auth/popup-blocked') {
        toast.error('Popup blocked. Please allow popups for this site.');
        return;
      }
      toast.error('Failed to login. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to logout');
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
            {settings?.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="h-8 w-auto" />
            ) : (
              <ShoppingBag className="h-6 w-6 text-primary" />
            )}
            <span>{settings?.navbarName || 'Today AI'}</span>
          </Link>
          <div className="hidden md:flex items-center gap-4">
            <Link 
              href="/" 
              className={`text-sm font-medium transition-colors hover:text-primary ${pathname === '/' ? 'text-primary' : 'text-muted-foreground'}`}
            >
              Shop
            </Link>
            {user && (
              <Link 
                href="/orders" 
                className={`text-sm font-medium transition-colors hover:text-primary ${pathname === '/orders' ? 'text-primary' : 'text-muted-foreground'}`}
              >
                My Orders
              </Link>
            )}
            {isAdmin && (
              <Link 
                href="/admin" 
                className={`text-sm font-medium transition-colors hover:text-primary ${pathname === '/admin' ? 'text-primary' : 'text-muted-foreground'}`}
              >
                Admin Panel
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {mounted && totalItems > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {totalItems}
                </span>
              )}
            </Button>
          </Link>
          {user ? (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-medium">{user.displayName}</span>
                <span className="text-xs text-muted-foreground">{isAdmin ? 'Administrator' : 'Customer'}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <Button onClick={handleLogin} className="gap-2">
              <LogIn className="h-4 w-4" />
              Login
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
