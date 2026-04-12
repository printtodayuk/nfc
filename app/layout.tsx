import type {Metadata} from 'next';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CartProvider } from "@/context/CartContext";
import { SettingsProvider } from "@/context/SettingsContext";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'Today AI | Modern E-Commerce',
  description: 'Your one-stop shop for digital business cards.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <head>
        <link rel="dns-prefetch" href="https://picsum.photos" />
        <link rel="dns-prefetch" href="https://eu2.contabostorage.com" />
        <link rel="preconnect" href="https://picsum.photos" />
        <link rel="preconnect" href="https://eu2.contabostorage.com" />
        <link rel="preconnect" href="https://lh3.googleusercontent.com" />
      </head>
      <body suppressHydrationWarning>
        <SettingsProvider>
          <CartProvider>
            <Navbar />
            <main className="min-h-screen bg-background">
              {children}
            </main>
            <Footer />
            <Toaster position="top-center" />
          </CartProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
