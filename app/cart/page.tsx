'use client';

import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Loader2, MapPin, ChevronLeft, CreditCard, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, addDoc, Timestamp, doc, getDoc, updateDoc, runTransaction, onSnapshot, setDoc } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '@/components/CheckoutForm';

interface Address {
  id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  isDefault: boolean;
}

interface UserProfile {
  email: string;
  role: string;
  addresses: Address[];
}

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, totalPrice, totalItems, clearCart } = useCart();
  const [step, setStep] = useState(0); // 0: Review, 1: Payment
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [newAddress, setNewAddress] = useState<Omit<Address, 'id' | 'isDefault'>>({
    name: '', street: '', city: '', state: '', zip: '', country: 'UK', phone: ''
  });
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [stripePromise, setStripePromise] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [loadingStripe, setLoadingStripe] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (auth.currentUser) {
      const unsubscribe = onSnapshot(doc(db, 'users', auth.currentUser.uid), (doc) => {
        if (doc.exists()) {
          const data = doc.data() as UserProfile;
          setUserProfile(data);
          const defaultAddr = data.addresses?.find(a => a.isDefault);
          if (defaultAddr) setSelectedAddressId(defaultAddr.id);
          else if (data.addresses?.length > 0) setSelectedAddressId(data.addresses[0].id);
        }
      });
      return () => unsubscribe();
    }
  }, []);

  useEffect(() => {
    // Fetch Stripe Public Key
    const fetchStripeKey = async () => {
      const settingsDoc = await getDoc(doc(db, 'settings', 'site'));
      const publicKey = settingsDoc.data()?.stripePublicKey;
      if (publicKey) {
        setStripePromise(loadStripe(publicKey));
      }
    };
    fetchStripeKey();
  }, []);

  const handleNextStep = async () => {
    if (step === 0) {
      if (!auth.currentUser) {
        toast.error('Please login to continue');
        return;
      }
      setIsAddressModalOpen(true);
    }
  };

  const handleAddressConfirmed = async () => {
    const isAddingNew = showNewAddressForm || !userProfile?.addresses?.length;
    
    if (!selectedAddressId && !isAddingNew) {
      toast.error('Please select or add a shipping address');
      return;
    }
    
    let finalAddressId = selectedAddressId;
    
    if (isAddingNew) {
      if (!newAddress.name || !newAddress.street || !newAddress.city || !newAddress.zip || !newAddress.phone) {
        toast.error('Please fill in all required address fields');
        return;
      }
      
      // Save new address
      const addrId = Math.random().toString(36).substr(2, 9);
      const addr: Address = { ...newAddress, id: addrId, isDefault: !userProfile?.addresses?.length };
      
      try {
        const userRef = doc(db, 'users', auth.currentUser!.uid);
        const email = auth.currentUser?.email;
        
        if (!email) {
          toast.error('User email not found. Please try logging in again.');
          return;
        }

        // Use setDoc with merge to ensure doc exists and fields are valid
        await setDoc(userRef, {
          email: email,
          role: userProfile?.role || 'user',
          addresses: [...(userProfile?.addresses || []), addr]
        }, { merge: true });
        
        finalAddressId = addrId;
        setSelectedAddressId(addrId);
        setShowNewAddressForm(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${auth.currentUser?.uid}`);
        toast.error('Failed to save address. Please try again.');
        return;
      }
    }

    setIsAddressModalOpen(false);
    
    // Initialize Stripe Payment Intent
    setLoadingStripe(true);
    try {
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: totalPrice }),
      });
      const data = await response.json();
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setStep(1); // Move to Payment step
      } else {
        toast.error(data.error || 'Failed to initialize payment');
      }
    } catch (error) {
      toast.error('Payment initialization failed');
    } finally {
      setLoadingStripe(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    setIsCheckingOut(true);
    try {
      const selectedAddr = userProfile?.addresses.find(a => a.id === selectedAddressId);
      
      // Use transaction to update stock and create order
      await runTransaction(db, async (transaction) => {
        // 1. Check and update stock for each item
        for (const item of cart) {
          const productRef = doc(db, 'products', item.id);
          const productDoc = await transaction.get(productRef);
          
          if (!productDoc.exists()) throw new Error(`Product ${item.name} not found`);
          
          const currentStock = productDoc.data().stock || 0;
          if (currentStock < item.quantity) {
            throw new Error(`Insufficient stock for ${item.name}`);
          }
          
          transaction.update(productRef, {
            stock: currentStock - item.quantity
          });
        }

        // 2. Create Order
        const orderRef = doc(collection(db, 'orders'));
        transaction.set(orderRef, {
          userId: auth.currentUser!.uid,
          userEmail: auth.currentUser!.email,
          items: cart,
          totalAmount: totalPrice,
          status: 'pending',
          paymentStatus: 'paid',
          paymentIntentId,
          createdAt: Timestamp.now(),
          shippingAddress: selectedAddr
        });
      });

      toast.success('Order placed successfully!');
      clearCart();
      router.push('/orders');
    } catch (error: any) {
      toast.error(error.message || 'Failed to place order');
    } finally {
      setIsCheckingOut(false);
    }
  };

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
      <div className="flex items-center gap-4 mb-8">
        {step > 0 && (
          <Button variant="ghost" size="icon" onClick={() => setStep(step - 1)}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
        )}
        <h1 className="text-3xl font-bold">
          {step === 0 ? 'Your Shopping Cart' : 'Payment'}
        </h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {step === 0 && (
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
                      <p className="text-primary font-bold">£{item.price.toFixed(2)}</p>
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
              <div className="flex justify-between items-center pt-4">
                <Button variant="outline" onClick={clearCart}>Clear Cart</Button>
                <Link href="/">
                  <Button variant="ghost">Continue Shopping</Button>
                </Link>
              </div>
            </AnimatePresence>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" /> Secure Payment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stripePromise && clientSecret ? (
                    <Elements stripe={stripePromise} options={{ clientSecret }}>
                      <CheckoutForm 
                        clientSecret={clientSecret} 
                        amount={totalPrice} 
                        onPaymentSuccess={handlePaymentSuccess} 
                      />
                    </Elements>
                  ) : (
                    <div className="flex flex-col items-center py-10 space-y-4">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-muted-foreground">Initializing secure payment gateway...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <div className="flex items-center gap-2 p-4 bg-muted/30 rounded-lg text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Your payment is encrypted and secure.
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal ({totalItems} items)</span>
                <span>£{totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-green-600 font-medium">Free</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-4">
                <span>Total</span>
                <span>£{totalPrice.toFixed(2)}</span>
              </div>
            </CardContent>
            {step === 0 && (
              <CardFooter>
                <Button 
                  className="w-full rounded-full h-12 gap-2 text-lg" 
                  onClick={handleNextStep}
                  disabled={loadingStripe}
                >
                  {loadingStripe ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" /> Initializing...
                    </>
                  ) : (
                    <>
                      Proceed to Checkout
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </Button>
              </CardFooter>
            )}
          </Card>
          
          {step === 1 && selectedAddressId && (
            <div className="p-4 border rounded-lg bg-muted/10">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Shipping to:
              </h4>
              <p className="text-xs text-muted-foreground">
                {userProfile?.addresses.find(a => a.id === selectedAddressId)?.name}<br />
                {userProfile?.addresses.find(a => a.id === selectedAddressId)?.street}<br />
                {userProfile?.addresses.find(a => a.id === selectedAddressId)?.city}, {userProfile?.addresses.find(a => a.id === selectedAddressId)?.zip}
              </p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isAddressModalOpen} onOpenChange={setIsAddressModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Shipping Address</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-6">
            {userProfile?.addresses && userProfile.addresses.length > 0 && !showNewAddressForm && (
              <div className="space-y-4">
                <RadioGroup value={selectedAddressId} onValueChange={setSelectedAddressId}>
                  <div className="grid gap-4">
                    {userProfile.addresses.map((addr) => (
                      <div key={addr.id} className="flex items-center space-x-3 border p-4 rounded-lg cursor-pointer hover:bg-muted/50">
                        <RadioGroupItem value={addr.id} id={`modal-${addr.id}`} />
                        <Label htmlFor={`modal-${addr.id}`} className="flex-grow cursor-pointer">
                          <div className="font-bold">{addr.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {addr.street}, {addr.city}, {addr.state} {addr.zip}, {addr.country}
                          </div>
                        </Label>
                        {addr.isDefault && <Badge variant="secondary">Default</Badge>}
                      </div>
                    ))}
                  </div>
                </RadioGroup>
                <Button variant="outline" className="w-full" onClick={() => setShowNewAddressForm(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add New Address
                </Button>
              </div>
            )}

            {(showNewAddressForm || !userProfile?.addresses?.length) && (
              <div className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Full Name</Label>
                    <Input value={newAddress.name} onChange={e => setNewAddress({...newAddress, name: e.target.value})} placeholder="John Doe" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Street Address</Label>
                    <Input value={newAddress.street} onChange={e => setNewAddress({...newAddress, street: e.target.value})} placeholder="123 Main St" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Phone Number</Label>
                    <Input value={newAddress.phone} onChange={e => setNewAddress({...newAddress, phone: e.target.value})} placeholder="+44 123 456 7890" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>City</Label>
                      <Input value={newAddress.city} onChange={e => setNewAddress({...newAddress, city: e.target.value})} placeholder="London" />
                    </div>
                    <div className="grid gap-2">
                      <Label>State / County</Label>
                      <Input value={newAddress.state} onChange={e => setNewAddress({...newAddress, state: e.target.value})} placeholder="Greater London" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Postcode</Label>
                      <Input value={newAddress.zip} onChange={e => setNewAddress({...newAddress, zip: e.target.value})} placeholder="SW1A 1AA" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Country</Label>
                      <Input value={newAddress.country} onChange={e => setNewAddress({...newAddress, country: e.target.value})} placeholder="UK" />
                    </div>
                  </div>
                </div>
                {userProfile?.addresses && userProfile.addresses.length > 0 && (
                  <Button variant="ghost" className="w-full" onClick={() => setShowNewAddressForm(false)}>Back to saved addresses</Button>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              className="w-full rounded-full h-12 gap-2" 
              onClick={handleAddressConfirmed}
              disabled={loadingStripe}
            >
              {loadingStripe ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Initializing Payment...
                </>
              ) : (
                <>
                  Confirm Address & Proceed to Payment
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
