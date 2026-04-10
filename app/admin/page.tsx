'use client';

import { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, addDoc, getDocs, onSnapshot, query, orderBy, Timestamp, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Package, FolderPlus, Loader2, Edit, Settings, Image as ImageIcon, X, Facebook, Twitter, Instagram, Linkedin, Github, Mail, Phone, MapPin, ExternalLink, Play, Users, ShoppingCart as OrdersIcon, CheckCircle, Clock, Truck as ShippingIcon, XCircle } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string;
}

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
  createdAt: any;
}

interface SiteSettings {
  navbarName: string;
  logoUrl: string;
  heroTitle: string;
  heroSubtitle: string;
  heroMediaUrl: string;
  heroMediaType: 'image' | 'video';
  footerText: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  footerLinks: { label: string; url: string; icon?: string }[];
}

interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'user';
  displayName?: string;
  photoURL?: string;
}

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
  userEmail: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: any;
  shippingAddress?: string;
}

const AVAILABLE_ICONS = [
  { name: 'Facebook', icon: Facebook },
  { name: 'Twitter', icon: Twitter },
  { name: 'Instagram', icon: Instagram },
  { name: 'Linkedin', icon: Linkedin },
  { name: 'Github', icon: Github },
  { name: 'Mail', icon: Mail },
  { name: 'Phone', icon: Phone },
  { name: 'MapPin', icon: MapPin },
  { name: 'ExternalLink', icon: ExternalLink }
];

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    navbarName: 'Today AI',
    logoUrl: '',
    heroTitle: 'Shop the Future of Style',
    heroSubtitle: 'Discover our curated collection of premium products designed for modern living.',
    heroMediaUrl: 'https://picsum.photos/seed/ecommerce/1920/1080?blur=4',
    heroMediaType: 'image',
    footerText: 'Your premium destination for modern lifestyle products. Quality and style delivered to your doorstep.',
    contactEmail: 'support@todayai.com',
    contactPhone: '+1 (555) 123-4567',
    contactAddress: '123 E-commerce St, Digital City',
    footerLinks: []
  });

  // Category Form State
  const [catForm, setCatForm] = useState({ name: '', description: '', image: '' });
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  // Product Form State
  const [prodForm, setProdForm] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    image: '',
    images: [] as string[],
    stock: '',
    variants: [] as Variant[]
  });
  const [editingProd, setEditingProd] = useState<Product | null>(null);
  const [selectedFooterIcon, setSelectedFooterIcon] = useState('ExternalLink');

  // Variant helper
  const [newVariant, setNewVariant] = useState<Variant>({ color: '', size: '', stock: 0 });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDocs(query(collection(db, 'users')));
        const userData = userDoc.docs.find(d => d.id === user.uid)?.data();
        setIsAdmin(userData?.role === 'admin' || user.email === 'printtodayuk@gmail.com');
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    const unsubscribeCats = onSnapshot(collection(db, 'categories'), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'categories'));

    const unsubscribeProds = onSnapshot(query(collection(db, 'products'), orderBy('createdAt', 'desc')), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'products'));

    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'site'), (doc) => {
      if (doc.exists()) {
        setSiteSettings(prev => ({ ...prev, ...doc.data() as SiteSettings }));
      }
      setLoadingSettings(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'settings');
      setLoadingSettings(false);
    });

    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    const unsubscribeOrders = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'orders'));

    return () => {
      unsubscribeAuth();
      unsubscribeCats();
      unsubscribeProds();
      unsubscribeSettings();
      unsubscribeUsers();
      unsubscribeOrders();
    };
  }, []);

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name) return toast.error('Category name is required');

    try {
      if (editingCat) {
        await updateDoc(doc(db, 'categories', editingCat.id), catForm);
        toast.success('Category updated');
      } else {
        await addDoc(collection(db, 'categories'), {
          ...catForm,
          image: catForm.image || `https://picsum.photos/seed/${catForm.name}/400/300`
        });
        toast.success('Category added');
      }
      setCatForm({ name: '', description: '', image: '' });
      setEditingCat(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'categories');
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodForm.name || !prodForm.price || !prodForm.categoryId) return toast.error('Required fields missing');

    const data = {
      ...prodForm,
      price: parseFloat(prodForm.price),
      stock: parseInt(prodForm.stock) || 0,
      image: prodForm.image || `https://picsum.photos/seed/${prodForm.name}/400/300`,
      createdAt: editingProd ? editingProd.createdAt : Timestamp.now()
    };

    try {
      if (editingProd) {
        await updateDoc(doc(db, 'products', editingProd.id), data);
        toast.success('Product updated');
      } else {
        await addDoc(collection(db, 'products'), data);
        toast.success('Product added');
      }
      setProdForm({
        name: '', description: '', price: '', categoryId: '', image: '', images: [], stock: '', variants: []
      });
      setEditingProd(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'products');
    }
  };

  const handleSaveSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'site'), siteSettings);
      toast.success('Settings saved');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
      toast.success(`Order status updated to ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'orders');
    }
  };

  const handleDelete = async (coll: string, id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await deleteDoc(doc(db, coll, id));
      toast.success('Item deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, coll);
    }
  };

  const addVariant = () => {
    if (!newVariant.color && !newVariant.size) return toast.error('Add at least color or size');
    setProdForm(prev => ({
      ...prev,
      variants: [...prev.variants, newVariant]
    }));
    setNewVariant({ color: '', size: '', stock: 0 });
  };

  const removeVariant = (index: number) => {
    setProdForm(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index)
    }));
  };

  const addImage = (url: string) => {
    if (!url) return;
    setProdForm(prev => ({
      ...prev,
      images: [...prev.images, url]
    }));
  };

  const removeImage = (index: number) => {
    setProdForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!isAdmin) return <div className="flex h-[80vh] items-center justify-center text-xl font-semibold">Access Denied. Admin only.</div>;

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your store&apos;s inventory, categories, and settings.</p>
        </div>
      </div>

      <Tabs defaultValue="products" className="space-y-6">
        <TabsList className="grid w-full max-xl grid-cols-5">
          <TabsTrigger value="products" className="gap-2">
            <Package className="h-4 w-4" /> Products
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <FolderPlus className="h-4 w-4" /> Categories
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <OrdersIcon className="h-4 w-4" /> Orders
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" /> Users
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" /> Settings
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>{editingProd ? 'Edit Product' : 'Add New Product'}</CardTitle>
                <CardDescription>Enter product details, variants, and images.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProduct} className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Product Name *</Label>
                    <Input value={prodForm.name} onChange={(e) => setProdForm({...prodForm, name: e.target.value})} placeholder="e.g. Wireless Headphones" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Description</Label>
                    <Input value={prodForm.description} onChange={(e) => setProdForm({...prodForm, description: e.target.value})} placeholder="Product features..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Price (£) *</Label>
                      <Input type="number" step="0.01" value={prodForm.price} onChange={(e) => setProdForm({...prodForm, price: e.target.value})} placeholder="99.99" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Base Stock *</Label>
                      <Input type="number" value={prodForm.stock} onChange={(e) => setProdForm({...prodForm, stock: e.target.value})} placeholder="50" />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Category *</Label>
                    <Select value={prodForm.categoryId} onValueChange={(val) => setProdForm({...prodForm, categoryId: val || ''})}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => <SelectItem key={cat.id} value={cat.id || ''}>{cat.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Main Image URL</Label>
                    <Input value={prodForm.image} onChange={(e) => setProdForm({...prodForm, image: e.target.value})} placeholder="https://..." />
                  </div>
                  
                  {/* Additional Images */}
                  <div className="space-y-2">
                    <Label>Additional Images</Label>
                    <div className="flex gap-2">
                      <Input id="newImg" placeholder="Image URL" onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addImage((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ''; } }} />
                      <Button type="button" size="icon" onClick={() => { const el = document.getElementById('newImg') as HTMLInputElement; addImage(el.value); el.value = ''; }}><Plus className="h-4 w-4" /></Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {prodForm.images.map((img, i) => (
                        <div key={i} className="relative h-12 w-12 rounded border overflow-hidden">
                          <img src={img} className="h-full w-full object-cover" />
                          <button type="button" onClick={() => removeImage(i)} className="absolute top-0 right-0 bg-destructive text-white p-0.5"><X className="h-3 w-3" /></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Variants */}
                  <div className="space-y-2 border-t pt-4">
                    <Label>Variants (Color, Size, Stock)</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Input placeholder="Color" value={newVariant.color} onChange={e => setNewVariant({...newVariant, color: e.target.value})} />
                      <Input placeholder="Size" value={newVariant.size} onChange={e => setNewVariant({...newVariant, size: e.target.value})} />
                      <Input type="number" placeholder="Stock" value={newVariant.stock} onChange={e => setNewVariant({...newVariant, stock: parseInt(e.target.value) || 0})} />
                    </div>
                    <Button type="button" variant="outline" className="w-full gap-2" onClick={addVariant}><Plus className="h-4 w-4" /> Add Variant</Button>
                    <div className="space-y-1">
                      {prodForm.variants.map((v, i) => (
                        <div key={i} className="flex items-center justify-between text-xs bg-muted p-2 rounded">
                          <span>{v.color} / {v.size} - Stock: {v.stock}</span>
                          <button type="button" onClick={() => removeVariant(i)}><X className="h-3 w-3 text-destructive" /></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" className="flex-grow gap-2">
                      {editingProd ? 'Update Product' : 'Add Product'}
                    </Button>
                    {editingProd && <Button type="button" variant="ghost" onClick={() => { setEditingProd(null); setProdForm({name:'', description:'', price:'', categoryId:'', image:'', images:[], stock:'', variants:[]}); }}>Cancel</Button>}
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Product Inventory</CardTitle>
                <CardDescription>Manage your products and real-time stock.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((prod) => (
                        <TableRow key={prod.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded bg-muted overflow-hidden flex-shrink-0">
                                <img src={prod.image} className="h-full w-full object-cover" />
                              </div>
                              <span>{prod.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>£{prod.price.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={prod.stock > 0 ? "outline" : "destructive"}>{prod.stock}</Badge>
                            {prod.variants && prod.variants.length > 0 && <span className="ml-2 text-[10px] text-muted-foreground">({prod.variants.length} variants)</span>}
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button variant="ghost" size="icon" onClick={() => {
                              setEditingProd(prod);
                              setProdForm({
                                name: prod.name,
                                description: prod.description || '',
                                price: prod.price.toString(),
                                categoryId: prod.categoryId,
                                image: prod.image || '',
                                images: prod.images || [],
                                stock: prod.stock.toString(),
                                variants: prod.variants || []
                              });
                            }}>
                              <Edit className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete('products', prod.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{editingCat ? 'Edit Category' : 'Add New Category'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveCategory} className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Category Name *</Label>
                    <Input value={catForm.name} onChange={(e) => setCatForm({...catForm, name: e.target.value})} placeholder="e.g. Electronics" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Description</Label>
                    <Input value={catForm.description} onChange={(e) => setCatForm({...catForm, description: e.target.value})} placeholder="Category details..." />
                  </div>
                  <div className="grid gap-2">
                    <Label>Image URL</Label>
                    <Input value={catForm.image} onChange={(e) => setCatForm({...catForm, image: e.target.value})} placeholder="https://..." />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-grow">{editingCat ? 'Update' : 'Add'}</Button>
                    {editingCat && <Button type="button" variant="ghost" onClick={() => { setEditingCat(null); setCatForm({name:'', description:'', image:''}); }}>Cancel</Button>}
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Categories</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {categories.map((cat) => (
                      <TableRow key={cat.id}>
                        <TableCell className="font-medium">{cat.name}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingCat(cat); setCatForm({name: cat.name, description: cat.description || '', image: cat.image || ''}); }}>
                            <Edit className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete('categories', cat.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Site Customization</CardTitle>
              <CardDescription>Update your store&apos;s branding, hero section, and footer details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="flex justify-end">
                <Button onClick={handleSaveSettings} className="gap-2">
                  <Settings className="h-4 w-4" /> Save All Settings
                </Button>
              </div>
              {loadingSettings ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Loading site settings...</p>
                </div>
              ) : (
                <>
                  {/* Branding Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Branding</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Navbar Name</Label>
                        <Input value={siteSettings.navbarName} onChange={e => setSiteSettings({...siteSettings, navbarName: e.target.value})} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Logo URL</Label>
                        <Input value={siteSettings.logoUrl} onChange={e => setSiteSettings({...siteSettings, logoUrl: e.target.value})} />
                      </div>
                    </div>
                  </div>

                  {/* Hero Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Hero Section</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Hero Title</Label>
                        <Input value={siteSettings.heroTitle} onChange={e => setSiteSettings({...siteSettings, heroTitle: e.target.value})} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Hero Subtitle</Label>
                        <Input value={siteSettings.heroSubtitle} onChange={e => setSiteSettings({...siteSettings, heroSubtitle: e.target.value})} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Hero Media URL (Image or Video)</Label>
                        <Input value={siteSettings.heroMediaUrl} onChange={e => setSiteSettings({...siteSettings, heroMediaUrl: e.target.value})} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Media Type</Label>
                        <Select value={siteSettings.heroMediaType} onValueChange={(val: 'image' | 'video' | null) => setSiteSettings({...siteSettings, heroMediaType: val || 'image'})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="image">Image</SelectItem>
                            <SelectItem value="video">Video</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Contact Information</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label>Email</Label>
                        <Input value={siteSettings.contactEmail} onChange={e => setSiteSettings({...siteSettings, contactEmail: e.target.value})} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Phone</Label>
                        <Input value={siteSettings.contactPhone} onChange={e => setSiteSettings({...siteSettings, contactPhone: e.target.value})} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Address</Label>
                        <Input value={siteSettings.contactAddress} onChange={e => setSiteSettings({...siteSettings, contactAddress: e.target.value})} />
                      </div>
                    </div>
                  </div>

                  {/* Footer Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Footer & Quick Links</h3>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label>Footer About Text</Label>
                        <Input value={siteSettings.footerText} onChange={e => setSiteSettings({...siteSettings, footerText: e.target.value})} />
                      </div>
                      <div className="space-y-4">
                        <Label>Add Quick Link with Icon</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <Input id="linkLab" placeholder="Label" className="sm:col-span-1" />
                          <Input id="linkUrl" placeholder="URL" className="sm:col-span-1" />
                          <Select value={selectedFooterIcon} onValueChange={(val) => setSelectedFooterIcon(val || 'ExternalLink')}>
                            <SelectTrigger className="sm:col-span-1">
                              <SelectValue placeholder="Select Icon" />
                            </SelectTrigger>
                            <SelectContent>
                              {AVAILABLE_ICONS.map(item => (
                                <SelectItem key={item.name} value={item.name}>
                                  <div className="flex items-center gap-2">
                                    <item.icon className="h-4 w-4" />
                                    {item.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button onClick={() => {
                            const lab = document.getElementById('linkLab') as HTMLInputElement;
                            const url = document.getElementById('linkUrl') as HTMLInputElement;
                            
                            if(lab.value && url.value) {
                              setSiteSettings({
                                ...siteSettings, 
                                footerLinks: [...siteSettings.footerLinks, {label: lab.value, url: url.value, icon: selectedFooterIcon}]
                              });
                              lab.value = ''; url.value = '';
                              setSelectedFooterIcon('ExternalLink');
                            }
                          }} className="sm:col-span-1"><Plus className="h-4 w-4 mr-2" /> Add Link</Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {siteSettings.footerLinks.map((link, i) => {
                            const IconComp = AVAILABLE_ICONS.find(ic => ic.name === link.icon)?.icon || ExternalLink;
                            return (
                              <Badge key={i} variant="secondary" className="gap-2 py-1.5 px-3">
                                <IconComp className="h-3.5 w-3.5" />
                                {link.label}
                                <X className="h-3.5 w-3.5 cursor-pointer hover:text-destructive transition-colors" onClick={() => setSiteSettings({...siteSettings, footerLinks: siteSettings.footerLinks.filter((_, idx) => idx !== i)})} />
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleSaveSettings} className="w-full h-12 text-lg shadow-lg shadow-primary/20">Save All Site Settings</Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Orders</CardTitle>
              <CardDescription>View and manage customer orders and their statuses.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">{order.id}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{order.userEmail}</span>
                          <span className="text-[10px] text-muted-foreground">{order.userId}</span>
                        </div>
                      </TableCell>
                      <TableCell>{order.createdAt?.toDate().toLocaleDateString()}</TableCell>
                      <TableCell>£{order.totalAmount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          order.status === 'delivered' ? 'outline' : 
                          order.status === 'cancelled' ? 'destructive' : 
                          'default'
                        }>
                          {order.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Select 
                            value={order.status} 
                            onValueChange={(val: Order['status']) => handleUpdateOrderStatus(order.id, val)}
                          >
                            <SelectTrigger className="w-[130px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="processing">Processing</SelectItem>
                              <SelectItem value="shipped">Shipped</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete('orders', order.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Registered Users</CardTitle>
              <CardDescription>View and manage registered customers and administrators.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>User ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            {user.photoURL ? (
                              <img src={user.photoURL} alt="" className="h-full w-full rounded-full object-cover" />
                            ) : (
                              <Users className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <span className="font-medium">{user.displayName || 'No Name'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{user.id}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
