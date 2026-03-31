import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, Package, Loader2, UserPlus, LogIn } from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import { toast } from 'react-hot-toast';
import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, db } from '../firebase';
import { updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { logAuditEvent } from '../lib/audit';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

async function logLoginAudit(user: { id: string; name?: string; email?: string }) {
  try {
    await logAuditEvent({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'Auth',
      entityId: user.id,
      details: `User signed in (${user.email || 'no-email'})`,
    });
  } catch (error) {
    console.error('Failed to write LOGIN audit log:', error);
  }
}

export default function LoginPage() {
  const setUser = useAuthStore((state) => state.setUser);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSignUp, setIsSignUp] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    getValues,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  React.useEffect(() => {
    if (isAuthenticated) {
      window.location.replace('/dashboard');
    }
  }, [isAuthenticated]);

  const handleForgotPassword = async () => {
    const email = getValues('email');
    if (!email) {
      toast.error('Please enter your email address first');
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent! Check your inbox.');
      setIsResetting(false);
    } catch (error: any) {
      console.error('Reset error:', error);
      toast.error('Failed to send reset email. Make sure the email is correct.');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      if (isSignUp) {
        if (!data.name) {
          toast.error('Name is required for sign up');
          setIsLoading(false);
          return;
        }
        if (!data.password) {
          toast.error('Password is required for sign up');
          setIsLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        await updateProfile(userCredential.user, { displayName: data.name });
        
        // Create user document immediately to ensure name is saved
        const userRef = doc(db, 'users', userCredential.user.uid);
        await setDoc(userRef, {
          id: userCredential.user.uid,
          name: data.name,
          email: data.email,
          role: data.email === 'philipojedokun942@gmail.com' ? 'admin' : 'staff',
          status: 'active',
          created_at: serverTimestamp(),
          last_login_at: serverTimestamp(),
        });

        await logLoginAudit({
          id: userCredential.user.uid,
          name: data.name,
          email: data.email,
        });
        
        toast.success('Account created successfully!');
      } else {
        if (!data.password) {
          toast.error('Password is required');
          setIsLoading(false);
          return;
        }
        
        try {
          // 1. Try standard Firebase Auth
          const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);

          await logLoginAudit({
            id: userCredential.user.uid,
            name: userCredential.user.displayName || undefined,
            email: userCredential.user.email || data.email,
          });

          toast.success('Signed in successfully!');
        } catch (authError: any) {
          console.log('Standard auth failed, checking for reset password backdoor...', authError.code);
          
          // 2. Backdoor: Check Firestore for "reset to password" flag
          // This is a workaround for demo purposes where the user wants to "reset to password"
          // without using the Admin SDK or email reset.
          const { collection, query, where, getDocs } = await import('firebase/firestore');
          const q = query(collection(db, 'users'), where('email', '==', data.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();
            
            if (userData.password === data.password) {
              // Manual login success
              setUser({ id: userDoc.id, ...userData } as any, 'demo-token');

              await logLoginAudit({
                id: userDoc.id,
                name: userData.name,
                email: userData.email,
              });

              toast.success('Signed in with reset password!');
              return;
            }
          }
          
          // If both fail, throw the original error
          throw authError;
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      let message = 'An error occurred. Please try again.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = 'Invalid email or password';
      } else if (error.code === 'auth/email-already-in-use') {
        message = 'This email is already registered. Please Sign In instead.';
      }
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20">
            <Package size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-primary-dark">StockHr</h1>
          {/* <p className="text-neutral-700/60 mt-2">Inventory & Decision Intelligence</p> */}
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-xl border border-neutral-100">
          <h2 className="text-xl font-bold mb-6">
            {isResetting ? 'Reset Password' : isSignUp ? 'Create Account' : 'Sign In'}
          </h2>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {isSignUp && (
              <div>
                <label className="block text-xs font-bold text-neutral-700/60 uppercase tracking-wider mb-2">
                  Full Name
                </label>
                <input
                  {...register('name')}
                  type="text"
                  placeholder="John Doe"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                {errors.name && (
                  <p className="text-xs text-danger font-medium mt-1.5">{errors.name.message}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-neutral-700/60 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="your@email.com"
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              {errors.email && (
                <p className="text-xs text-danger font-medium mt-1.5">{errors.email.message}</p>
              )}
            </div>

            {!isResetting && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-neutral-700/60 uppercase tracking-wider">
                    Password
                  </label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => setIsResetting(true)}
                      className="text-[10px] font-bold text-primary hover:underline"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-700/40 hover:text-neutral-700 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-danger font-medium mt-1.5">{errors.password.message}</p>
                )}
              </div>
            )}

            {isResetting ? (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Send Reset Link'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsResetting(false)}
                  className="w-full text-sm font-bold text-neutral-700/40 hover:text-neutral-700 transition-colors"
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : isSignUp ? (
                  <>
                    <UserPlus size={20} />
                    Create Account
                  </>
                ) : (
                  <>
                    <LogIn size={20} />
                    Sign In
                  </>
                )}
              </button>
            )}
          </form>

          {!isResetting && (
            <div className="mt-6 pt-6 border-t border-neutral-100 text-center">
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  reset();
                }}
                className="text-sm font-bold text-primary hover:text-primary-dark transition-colors"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-neutral-700/40 mt-8">
          &copy; 2026 StockSense. All rights reserved.
        </p>
      </div>
    </div>
  );
}
