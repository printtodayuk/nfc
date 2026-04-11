'use client';

import { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { onAuthStateChanged, updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, User, MapPin, Lock, Plus, Trash2, Phone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';

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
  displayName?: string;
  addresses: Address[];
}

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Profile Form
  const [displayName, setDisplayName] = useState('');
  
  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Address Form
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState<Omit<Address, 'id' | 'isDefault'>>({
    name: '', street: '', city: '', state: '', zip: '', country: 'UK', phone: ''
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        setDisplayName(u.displayName || '');
        const unsubscribeProfile = onSnapshot(doc(db, 'users', u.uid), (doc) => {
          if (doc.exists()) {
            setProfile(doc.data() as UserProfile);
          }
          setLoading(false);
        });
        return () => unsubscribeProfile();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsUpdating(true);
    try {
      await updateProfile(user, { displayName });
      await updateDoc(doc(db, 'users', user.uid), { displayName });
      toast.success('Profile updated successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      toast.error('Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
    
    setIsUpdating(true);
    try {
      // Re-authenticate user if they are using email/password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to update password. Make sure current password is correct.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!user || !profile) return;
    if (!addressForm.name || !addressForm.street || !addressForm.city || !addressForm.zip || !addressForm.phone) {
      return toast.error('Please fill in all required fields');
    }

    setIsUpdating(true);
    try {
      let updatedAddresses = [...(profile.addresses || [])];
      
      if (editingAddress) {
        updatedAddresses = updatedAddresses.map(a => 
          a.id === editingAddress.id ? { ...a, ...addressForm } : a
        );
      } else {
        const newAddr: Address = {
          ...addressForm,
          id: Math.random().toString(36).substr(2, 9),
          isDefault: updatedAddresses.length === 0
        };
        updatedAddresses.push(newAddr);
      }

      await updateDoc(doc(db, 'users', user.uid), { addresses: updatedAddresses });
      toast.success(editingAddress ? 'Address updated' : 'Address added');
      setIsAddressModalOpen(false);
      setEditingAddress(null);
      setAddressForm({ name: '', street: '', city: '', state: '', zip: '', country: 'UK', phone: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      toast.error('Failed to save address');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!user || !profile) return;
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
      const updatedAddresses = profile.addresses.filter(a => a.id !== id);
      // If we deleted the default, make another one default
      if (profile.addresses.find(a => a.id === id)?.isDefault && updatedAddresses.length > 0) {
        updatedAddresses[0].isDefault = true;
      }
      await updateDoc(doc(db, 'users', user.uid), { addresses: updatedAddresses });
      toast.success('Address deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const setAsDefault = async (id: string) => {
    if (!user || !profile) return;
    try {
      const updatedAddresses = profile.addresses.map(a => ({
        ...a,
        isDefault: a.id === id
      }));
      await updateDoc(doc(db, 'users', user.uid), { addresses: updatedAddresses });
      toast.success('Default address updated');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
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
      <div className="container mx-auto py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Please login to view your profile</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
          <p className="text-muted-foreground">Manage your personal information and preferences.</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="addresses">Addresses</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your display name and email address.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" value={user.email} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Display Name</Label>
                <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your Name" />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleUpdateProfile} disabled={isUpdating}>
                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="addresses">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Saved Addresses</h3>
              <Button onClick={() => {
                setEditingAddress(null);
                setAddressForm({ name: '', street: '', city: '', state: '', zip: '', country: 'UK', phone: '' });
                setIsAddressModalOpen(true);
              }} size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Add New
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {profile?.addresses && profile.addresses.length > 0 ? (
                profile.addresses.map((addr) => (
                  <Card key={addr.id} className={addr.isDefault ? 'border-primary' : ''}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base">{addr.name}</CardTitle>
                        {addr.isDefault && <Badge>Default</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-1">
                      <p>{addr.street}</p>
                      <p>{addr.city}, {addr.state} {addr.zip}</p>
                      <p>{addr.country}</p>
                      <div className="flex items-center gap-2 mt-2 text-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{addr.phone}</span>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-2 border-t flex justify-between">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => {
                          setEditingAddress(addr);
                          setAddressForm({
                            name: addr.name,
                            street: addr.street,
                            city: addr.city,
                            state: addr.state,
                            zip: addr.zip,
                            country: addr.country,
                            phone: addr.phone
                          });
                          setIsAddressModalOpen(true);
                        }}>Edit</Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteAddress(addr.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {!addr.isDefault && (
                        <Button variant="outline" size="sm" onClick={() => setAsDefault(addr.id)}>Set Default</Button>
                      )}
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <div className="col-span-2 text-center py-12 border-2 border-dashed rounded-xl">
                  <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                  <p className="text-muted-foreground">No addresses saved yet.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Ensure your account is using a long, random password to stay secure.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="current">Current Password</Label>
                <Input id="current" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new">New Password</Label>
                <Input id="new" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm">Confirm New Password</Label>
                <Input id="confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleUpdatePassword} disabled={isUpdating}>
                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isAddressModalOpen} onOpenChange={setIsAddressModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAddress ? 'Edit Address' : 'Add New Address'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Full Name</Label>
              <Input value={addressForm.name} onChange={e => setAddressForm({...addressForm, name: e.target.value})} placeholder="John Doe" required />
            </div>
            <div className="grid gap-2">
              <Label>Phone Number</Label>
              <Input value={addressForm.phone} onChange={e => setAddressForm({...addressForm, phone: e.target.value})} placeholder="+44 123 456 7890" required />
            </div>
            <div className="grid gap-2">
              <Label>Street Address</Label>
              <Input value={addressForm.street} onChange={e => setAddressForm({...addressForm, street: e.target.value})} placeholder="123 Main St" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>City</Label>
                <Input value={addressForm.city} onChange={e => setAddressForm({...addressForm, city: e.target.value})} placeholder="London" required />
              </div>
              <div className="grid gap-2">
                <Label>State / County</Label>
                <Input value={addressForm.state} onChange={e => setAddressForm({...addressForm, state: e.target.value})} placeholder="Greater London" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Postcode</Label>
                <Input value={addressForm.zip} onChange={e => setAddressForm({...addressForm, zip: e.target.value})} placeholder="SW1A 1AA" required />
              </div>
              <div className="grid gap-2">
                <Label>Country</Label>
                <Input value={addressForm.country} onChange={e => setAddressForm({...addressForm, country: e.target.value})} placeholder="UK" required />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddressModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAddress} disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Address
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
