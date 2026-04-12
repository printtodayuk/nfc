'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart, ArrowLeft, Check, Star, ShieldCheck, Truck, RotateCcw } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { cn, calculateDiscountedPrice } from '@/lib/utils';
import { toast } from 'sonner';

interface Variant {
  color?: string;
  size?: string;
  stock: number;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  image?: string;
  images?: string[];
  stock: number;
  variants?: Variant[];
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
    active: boolean;
  };
}

export default function ProductDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!id) return;

    const unsubscribe = onSnapshot(doc(db, 'products', id as string), (doc) => {
      if (doc.exists()) {
        const data = { id: doc.id, ...doc.data() } as Product;
        setProduct(data);
        setSelectedImage(data.image || '');
        
        if (data.variants && data.variants.length > 0) {
          const colors = Array.from(new Set(data.variants.map(v => v.color).filter(Boolean)));
          const sizes = Array.from(new Set(data.variants.map(v => v.size).filter(Boolean)));
          if (colors.length > 0) setSelectedColor(colors[0] as string);
          if (sizes.length > 0) setSelectedSize(sizes[0] as string);
        }
      } else {
        toast.error('Product not found');
        router.push('/');
      }
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, `products/${id}`));

    return () => unsubscribe();
  }, [id, router]);

  const allImages = product ? [product.image, ...(product.images || [])].filter(Boolean) as string[] : [];
  const colors = product?.variants ? Array.from(new Set(product.variants.map(v => v.color).filter(Boolean))) : [];
  const sizes = product?.variants ? Array.from(new Set(product.variants.map(v => v.size).filter(Boolean))) : [];

  const currentVariant = product?.variants?.find(v => 
    (selectedColor ? v.color === selectedColor : true) && 
    (selectedSize ? v.size === selectedSize : true)
  );

  const availableStock = currentVariant ? currentVariant.stock : (product?.stock || 0);

  const handleAddToCart = () => {
    if (!product) return;
    const finalPrice = calculateDiscountedPrice(product.price, product.discount);
    addToCart({
      id: product.id,
      name: product.name,
      price: finalPrice,
      image: product.image,
      quantity: quantity,
      variant: {
        color: selectedColor,
        size: selectedSize
      }
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10 space-y-8">
        <Skeleton className="h-10 w-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="space-y-6">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="container mx-auto px-4 py-10">
      <Link href="/">
        <Button variant="ghost" className="mb-8 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Shop
        </Button>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-4">
          <div className="relative aspect-square rounded-3xl overflow-hidden bg-muted">
            <Image 
              src={selectedImage || `https://picsum.photos/seed/${product.id}/800/800`} 
              alt={product.name} 
              fill 
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          {allImages.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
              {allImages.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={cn(
                    "relative h-20 w-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all",
                    selectedImage === img ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                  )}
                >
                  <Image src={img} alt={`${product.name} ${idx}`} fill className="object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-8">
          <div className="space-y-2">
            <Badge variant="outline" className="rounded-full px-3">Premium Collection</Badge>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{product.name}</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center text-yellow-500">
                {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                <span className="ml-2 text-sm text-muted-foreground">(4.8 / 5.0)</span>
              </div>
              <span className="text-sm text-muted-foreground">|</span>
              <span className="text-sm text-green-600 font-medium">In Stock</span>
            </div>
          </div>

          <div className="flex items-baseline gap-4">
            {product.discount?.active ? (
              <>
                <div className="text-3xl font-bold text-destructive">
                  £{calculateDiscountedPrice(product.price, product.discount).toFixed(2)}
                </div>
                <div className="text-xl text-muted-foreground line-through">
                  £{product.price.toFixed(2)}
                </div>
                <Badge variant="destructive" className="animate-pulse">
                  {product.discount.type === 'percentage' ? `${product.discount.value}% OFF` : `£${product.discount.value} OFF`}
                </Badge>
              </>
            ) : (
              <div className="text-3xl font-bold text-primary">
                £{product.price.toFixed(2)}
              </div>
            )}
          </div>

          <p className="text-lg text-muted-foreground leading-relaxed">
            {product.description || 'Experience the perfect blend of style and functionality with our premium product. Crafted with care and designed for modern living.'}
          </p>

          <div className="space-y-6 border-y py-8">
            {colors.length > 0 && (
              <div className="space-y-3">
                <label className="text-sm font-bold uppercase tracking-wider">Color: <span className="text-muted-foreground font-normal">{selectedColor}</span></label>
                <div className="flex flex-wrap gap-3">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color as string)}
                      className={cn(
                        "px-4 py-2 rounded-full border-2 transition-all text-sm font-medium",
                        selectedColor === color ? "border-primary bg-primary/5 text-primary" : "border-muted hover:border-primary/50"
                      )}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sizes.length > 0 && (
              <div className="space-y-3">
                <label className="text-sm font-bold uppercase tracking-wider">Size: <span className="text-muted-foreground font-normal">{selectedSize}</span></label>
                <div className="flex flex-wrap gap-3">
                  {sizes.map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size as string)}
                      className={cn(
                        "px-4 py-2 rounded-full border-2 transition-all text-sm font-medium",
                        selectedSize === size ? "border-primary bg-primary/5 text-primary" : "border-muted hover:border-primary/50"
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <label className="text-sm font-bold uppercase tracking-wider">Quantity</label>
                <div className="flex items-center border rounded-full px-2 py-1 w-fit">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</Button>
                  <span className="w-10 text-center font-medium">{quantity}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}>+</Button>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Available Stock</p>
                <p className="font-bold">{availableStock} units</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              size="lg" 
              className="flex-grow rounded-full h-14 text-lg gap-2 shadow-lg shadow-primary/20"
              disabled={availableStock === 0}
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-5 w-5" /> Add to Cart
            </Button>
            <Button size="lg" variant="outline" className="rounded-full h-14 px-8">
              Buy Now
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/50">
              <Truck className="h-5 w-5 text-primary" />
              <div className="text-xs">
                <p className="font-bold">Free Shipping</p>
                <p className="text-muted-foreground">On orders over £50</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/50">
              <RotateCcw className="h-5 w-5 text-primary" />
              <div className="text-xs">
                <p className="font-bold">30 Days Return</p>
                <p className="text-muted-foreground">Hassle-free returns</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/50">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div className="text-xs">
                <p className="font-bold">Secure Payment</p>
                <p className="text-muted-foreground">100% secure checkout</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/50">
              <Check className="h-5 w-5 text-primary" />
              <div className="text-xs">
                <p className="font-bold">Quality Assured</p>
                <p className="text-muted-foreground">Certified products</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
