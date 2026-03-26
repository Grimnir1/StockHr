import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, Package, Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import { toast } from 'react-hot-toast';
import { MOCK_USERS } from '../lib/mockData';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const setUser = useAuthStore((state) => state.setUser);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  React.useEffect(() => {
    if (isAuthenticated) {
      console.log('User is authenticated, redirecting...');
      // Use replace to avoid back-button issues
      window.location.replace('/dashboard');
    }
  }, [isAuthenticated]);

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    console.log('Attempting login for:', data.email);
    try {
      // Mocking API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      // Find user in mock data
      const user = MOCK_USERS.find(u => u.email.toLowerCase() === data.email.toLowerCase());
      
      if (!user) {
        throw new Error('User not found');
      }

      if (user.status === 'inactive') {
        throw new Error('Account is inactive. Please contact your administrator.');
      }

      console.log('User found:', user.name, 'Role:', user.role);

      // In a real app, we'd call /api/auth/login and verify password
      const mockUser = {
        ...user,
        last_login_at: new Date().toISOString(),
      };
      const mockToken = 'mock-jwt-token-' + Math.random().toString(36).substring(7);
      
      setUser(mockUser, mockToken);
      toast.success(`Welcome back, ${user.name}!`);
      
      // The useEffect will handle the redirect, but we can also trigger it here
      setTimeout(() => {
        window.location.replace('/dashboard');
      }, 100);
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error instanceof Error ? error.message : 'Invalid email or password');
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
          <h1 className="text-3xl font-bold text-primary-dark">StockSense</h1>
          <p className="text-neutral-700/60 mt-2">Inventory & Decision Intelligence</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-xl border border-neutral-100">
          <h2 className="text-xl font-bold mb-6">Sign In</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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

            <div>
              <label className="block text-xs font-bold text-neutral-700/60 uppercase tracking-wider mb-2">
                Password
              </label>
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-neutral-700/40 mt-8">
          &copy; 2026 StockSense. All rights reserved.
        </p>
      </div>
    </div>
  );
}
