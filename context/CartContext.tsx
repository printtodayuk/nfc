'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

interface CartItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
  variant?: {
    color?: string;
    size?: string;
  };
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string, variantKey?: string) => void;
  updateQuantity: (id: string, quantity: number, variantKey?: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('swiftshop_cart');
      if (savedCart) {
        try {
          return JSON.parse(savedCart);
        } catch (e) {
          console.error('Failed to parse cart', e);
        }
      }
    }
    return [];
  });

  // Save cart to localStorage on change
  useEffect(() => {
    localStorage.setItem('swiftshop_cart', JSON.stringify(cart));
  }, [cart]);

  const getVariantKey = (item: CartItem) => {
    if (!item.variant) return '';
    return `${item.variant.color || ''}-${item.variant.size || ''}`;
  };

  const addToCart = (item: CartItem) => {
    setCart((prevCart) => {
      const itemKey = getVariantKey(item);
      const existingItemIndex = prevCart.findIndex(
        (i) => i.id === item.id && getVariantKey(i) === itemKey
      );

      if (existingItemIndex > -1) {
        const newCart = [...prevCart];
        newCart[existingItemIndex].quantity += item.quantity;
        toast.success(`Updated ${item.name} quantity in cart`);
        return newCart;
      }

      toast.success(`Added ${item.name} to cart`);
      return [...prevCart, item];
    });
  };

  const removeFromCart = (id: string, variantKey?: string) => {
    setCart((prevCart) => prevCart.filter((i) => {
      const iKey = getVariantKey(i);
      return !(i.id === id && (variantKey === undefined || iKey === variantKey));
    }));
    toast.info('Removed item from cart');
  };

  const updateQuantity = (id: string, quantity: number, variantKey?: string) => {
    if (quantity <= 0) {
      removeFromCart(id, variantKey);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((i) => {
        const iKey = getVariantKey(i);
        if (i.id === id && (variantKey === undefined || iKey === variantKey)) {
          return { ...i, quantity };
        }
        return i;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('swiftshop_cart');
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
