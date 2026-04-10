'use client';

import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, totalPrice, totalItems, clearCart } = useCart();

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center space-y-6">
        <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto">
          <ShoppingBag className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-bold">Your cart is empty</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Looks like you haven&apos;t added anything to your cart yet. Explore our products and find something you love!
        </p>
        <Link href="/">
          <Button size="lg" className="rounded-full px-8 mt-4">
            Start Shopping
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-8">Your Shopping Cart</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence mode="popLayout">
            {cart.map((item) => (
              <motion.div
                key={`${item.id}-${item.variant?.color || ''}-${item.variant?.size || ''}`}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <Card className="flex flex-col sm:flex-row items-center p-4 gap-4 overflow-hidden">
                  <div className="relative h-24 w-24 flex-shrink-0 rounded-lg overflow-hidden">
                    <Image 
                      src={item.image || `https://picsum.photos/seed/${item.id}/200/200`} 
                      alt={item.name} 
                      fill 
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-grow space-y-1 text-center sm:text-left">
                    <h3 className="font-bold text-lg">{item.name}</h3>
                    {item.variant && (
                      <div className="flex flex-wrap justify-center sm:justify-start gap-2 text-xs text-muted-foreground">
                        {item.variant.color && <span>Color: {item.variant.color}</span>}
                        {item.variant.size && <span>Size: {item.variant.size}</span>}
                      </div>
                    )}
                    <p className="text-primary font-bold">${item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border rounded-full px-2 py-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full"
                        onClick={() => updateQuantity(item.id, item.quantity - 1, `${item.variant?.color || ''}-${item.variant?.size || ''}`)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full"
                        onClick={() => updateQuantity(item.id, item.quantity + 1, `${item.variant?.color || ''}-${item.variant?.size || ''}`)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => removeFromCart(item.id, `${item.variant?.color || ''}-${item.variant?.size || ''}`)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
          
          <div className="flex justify-between items-center pt-4">
            <Button variant="outline" onClick={clearCart}>Clear Cart</Button>
            <Link href="/">
              <Button variant="ghost">Continue Shopping</Button>
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal ({totalItems} items)</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-green-600 font-medium">Free</span>
              </div>
              <div className="border-t pt-4 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full rounded-full h-12 gap-2 text-lg">
                Checkout <ArrowRight className="h-5 w-5" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
