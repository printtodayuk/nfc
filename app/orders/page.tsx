'use client';

import { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ShoppingBag, Package, Truck, CheckCircle, XCircle, Clock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variant?: {
    color?: string;
    size?: string;
  };
}

interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: any;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setOrders([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'orders');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'processing': return <Package className="h-4 w-4" />;
      case 'shipped': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'shipped': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-20 px-4 text-center">
        <ShoppingBag className="h-16 w-16 mx-auto mb-6 text-muted-foreground opacity-20" />
        <h1 className="text-3xl font-bold mb-4">Please login to view your orders</h1>
        <p className="text-muted-foreground mb-8">You need to be authenticated to access your order history.</p>
        <Link href="/">
          <button className="bg-primary text-primary-foreground px-8 py-3 rounded-full font-medium hover:opacity-90 transition-opacity">
            Go to Shop
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4 max-w-5xl">
      <div className="flex items-center gap-4 mb-8">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <ShoppingBag className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
          <p className="text-muted-foreground">Track and manage your recent purchases.</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
            <p className="text-lg font-medium text-muted-foreground">No orders found</p>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-xs">
              You haven&apos;t placed any orders yet. Start shopping to see your orders here!
            </p>
            <Link href="/">
              <button className="text-primary font-medium hover:underline">
                Browse Products
              </button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <Card key={order.id} className="overflow-hidden border-none shadow-sm bg-muted/30">
              <CardHeader className="bg-white border-b">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-mono uppercase text-muted-foreground">
                      Order #{order.id.slice(0, 8)}
                    </CardTitle>
                    <CardDescription>
                      Placed on {order.createdAt?.toDate().toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right mr-4">
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="text-lg font-bold">£{order.totalAmount.toFixed(2)}</p>
                    </div>
                    <Badge className={`gap-2 py-1.5 px-3 border ${getStatusColor(order.status)}`} variant="outline">
                      {getStatusIcon(order.status)}
                      {order.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {order.items.map((item, idx) => (
                      <TableRow key={idx} className="hover:bg-transparent border-none">
                        <TableCell className="w-20 py-4 pl-6">
                          <div className="relative h-16 w-16 rounded-xl overflow-hidden bg-white border">
                            {item.image ? (
                              <Image 
                                src={item.image} 
                                alt={item.name} 
                                fill 
                                className="object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-muted">
                                <Package className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="space-y-1">
                            <p className="font-medium line-clamp-1">{item.name}</p>
                            {item.variant && (
                              <div className="flex gap-2 text-xs text-muted-foreground">
                                {item.variant.color && <span>Color: {item.variant.color}</span>}
                                {item.variant.size && <span>Size: {item.variant.size}</span>}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-center">
                          <span className="text-sm text-muted-foreground">Qty: {item.quantity}</span>
                        </TableCell>
                        <TableCell className="py-4 text-right pr-6">
                          <span className="font-medium">£{(item.price * item.quantity).toFixed(2)}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
