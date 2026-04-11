'use client';

import { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification, 
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, User, Chrome } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Sync user to Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        const role = user.email === 'printtodayuk@gmail.com' ? 'admin' : 'user';
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          role: role,
          displayName: user.displayName,
          photoURL: user.photoURL,
          uid: user.uid,
          createdAt: new Date().toISOString(),
          addresses: []
        });
      }
      toast.success('Logged in successfully');
      onClose();
    } catch (error: any) {
      console.error(error);
      if (error.code !== 'auth/popup-closed-by-user') {
        toast.error(error.message || 'Failed to login with Google');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;
        
        await updateProfile(user, { displayName: name });
        await sendEmailVerification(user);

        // Sync to Firestore
        const role = email === 'printtodayuk@gmail.com' ? 'admin' : 'user';
        await setDoc(doc(db, 'users', user.uid), {
          email: email,
          role: role,
          displayName: name,
          uid: user.uid,
          createdAt: new Date().toISOString(),
          addresses: []
        });

        toast.success('Account created! Please check your email for verification.');
        setMode('login');
      } else if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Logged in successfully');
        onClose();
      } else if (mode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        toast.success('Password reset email sent!');
        setMode('login');
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'login' && 'Welcome Back'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'forgot' && 'Reset Password'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'login' && 'Enter your details to access your account'}
            {mode === 'signup' && 'Join us today and start shopping'}
            {mode === 'forgot' && 'We will send you a link to reset your password'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Button 
            variant="outline" 
            onClick={handleGoogleLogin} 
            disabled={isLoading}
            className="w-full gap-2"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Chrome className="h-4 w-4" />}
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleEmailAuth} className="grid gap-4">
            {mode === 'signup' && (
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="name" 
                    placeholder="John Doe" 
                    className="pl-9" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                  />
                </div>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  className="pl-9" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
              </div>
            </div>
            {mode !== 'forgot' && (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === 'login' && (
                    <button 
                      type="button" 
                      onClick={() => setMode('forgot')}
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-9" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                  />
                </div>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'login' && 'Sign In'}
              {mode === 'signup' && 'Sign Up'}
              {mode === 'forgot' && 'Send Reset Link'}
            </Button>
          </form>

          <div className="text-center text-sm">
            {mode === 'login' ? (
              <p>
                Don&apos;t have an account?{' '}
                <button onClick={() => setMode('signup')} className="text-primary font-medium hover:underline">
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button onClick={() => setMode('login')} className="text-primary font-medium hover:underline">
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
