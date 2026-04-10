'use client';

import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart, Tag, Filter, Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '@/context/CartContext';

interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  image?: string;
  stock: number;
  createdAt: any;
}

interface SiteSettings {
  heroTitle?: string;
  heroSubtitle?: string;
  heroMediaUrl?: string;
  heroMediaType?: 'image' | 'video';
}

export default function LandingPage() {
  const { addToCart } = useCart();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsubscribeCats = onSnapshot(collection(db, 'categories'), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'categories'));

    const unsubscribeProds = onSnapshot(query(collection(db, 'products'), orderBy('createdAt', 'desc')), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'products'));

    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'site'), (doc) => {
      if (doc.exists()) {
        setSettings(prev => ({ ...prev, ...doc.data() as SiteSettings }));
      }
    });

    return () => {
      unsubscribeCats();
      unsubscribeProds();
      unsubscribeSettings();
    };
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory ? p.categoryId === selectedCategory : true;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1
    });
  };

  return (
    <div className="flex flex-col gap-8 pb-20">
      {/* Hero Section */}
      <section className="relative h-[500px] w-full overflow-hidden bg-primary/10 flex items-center justify-center px-4">
        <div className="absolute inset-0 z-0">
          {settings?.heroMediaType === 'video' ? (
            <video 
              key={settings.heroMediaUrl}
              autoPlay 
              loop 
              muted 
              playsInline 
              className="h-full w-full object-cover opacity-40"
            >
              <source src={settings.heroMediaUrl} type="video/webm" />
              <source src={settings.heroMediaUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          ) : (
            <Image 
              src={settings?.heroMediaUrl || "https://picsum.photos/seed/ecommerce/1920/1080?blur=4"} 
              alt="Hero Background" 
              fill 
              className="object-cover opacity-20"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background" />
        </div>
        <div className="container relative z-10 text-center space-y-6">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight"
          >
            {settings?.heroTitle?.split(' ').map((word, i) => (
              <span key={i} className={i === settings.heroTitle!.split(' ').length - 1 ? "text-primary" : ""}>
                {word}{' '}
              </span>
            )) || (
              <>Shop the Future of <span className="text-primary">Style</span></>
            )}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto font-medium"
          >
            {settings?.heroSubtitle || "Discover our curated collection of premium products designed for modern living."}
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-4"
          >
            <Button size="lg" className="rounded-full px-10 h-14 text-lg shadow-xl shadow-primary/20">Shop Now</Button>
            <Button size="lg" variant="outline" className="rounded-full px-10 h-14 text-lg bg-background/50 backdrop-blur-sm">Learn More</Button>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 space-y-12">
        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between sticky top-[65px] z-40 bg-background/80 backdrop-blur-md py-4 border-b">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search products..." 
              className="w-full pl-10 pr-4 py-2 rounded-full border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto no-scrollbar">
            <Button 
              variant={selectedCategory === null ? "default" : "outline"} 
              size="sm" 
              className="rounded-full whitespace-nowrap"
              onClick={() => setSelectedCategory(null)}
            >
              All Products
            </Button>
            {categories.map(cat => (
              <Button 
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"} 
                size="sm" 
                className="rounded-full whitespace-nowrap"
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              {selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : 'Featured Products'}
            </h2>
            <p className="text-sm text-muted-foreground">{filteredProducts.length} items found</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="aspect-square w-full rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredProducts.map((product) => (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Link href={`/product/${product.id}`}>
                      <Card className="group overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl bg-card/50 backdrop-blur-sm h-full flex flex-col">
                        <div className="relative aspect-square overflow-hidden">
                          <Image 
                            src={product.image || `https://picsum.photos/seed/${product.id}/400/400`} 
                            alt={product.name} 
                            fill 
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                            referrerPolicy="no-referrer"
                          />
                          {product.stock === 0 && (
                            <div className="absolute inset-0 bg-background/60 flex items-center justify-center backdrop-blur-[2px]">
                              <Badge variant="destructive" className="text-lg px-4 py-1">Out of Stock</Badge>
                            </div>
                          )}
                        </div>
                        <CardHeader className="p-4 space-y-1 flex-grow">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                              {categories.find(c => c.id === product.categoryId)?.name}
                            </span>
                            <span className="text-lg font-bold">${product.price.toFixed(2)}</span>
                          </div>
                          <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors">{product.name}</CardTitle>
                          <CardDescription className="line-clamp-2 text-xs h-8">{product.description}</CardDescription>
                        </CardHeader>
                        <CardFooter className="p-4 pt-0">
                          <Button 
                            className="w-full rounded-xl gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-all" 
                            disabled={product.stock === 0}
                            onClick={(e) => handleAddToCart(e, product)}
                          >
                            <ShoppingCart className="h-4 w-4" />
                            Add to Cart
                          </Button>
                        </CardFooter>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {!loading && filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="bg-muted p-6 rounded-full">
                <Search className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold">No products found</h3>
              <p className="text-muted-foreground max-w-xs">We couldn&apos;t find any products matching your current filters. Try adjusting your search or category.</p>
              <Button variant="outline" onClick={() => { setSelectedCategory(null); setSearchQuery(''); }}>
                Clear All Filters
              </Button>
            </div>
          )}
        </section>

        {/* Categories Section */}
        {!selectedCategory && !searchQuery && categories.length > 0 && (
          <section className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              Browse by Category
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map((cat) => (
                <button 
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className="group relative h-40 rounded-2xl overflow-hidden border hover:border-primary transition-all text-left"
                >
                  <Image 
                    src={cat.image || `https://picsum.photos/seed/${cat.name}/400/300`} 
                    alt={cat.name} 
                    fill 
                    className="object-cover opacity-60 group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
                    <h3 className="text-white font-bold text-lg">{cat.name}</h3>
                    <p className="text-white/70 text-xs line-clamp-1">{cat.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
