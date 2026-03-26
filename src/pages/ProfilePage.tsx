import React from 'react';
import { User, Mail, Shield, Clock, Camera, Save } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { useAuthStore } from '../stores/auth.store';
import { FormField } from '../components/ui/FormField';
import { formatDate } from '../lib/utils';
import { toast } from 'react-hot-toast';

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <PageHeader
        title="My Profile"
        subtitle="Manage your personal information and account security."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left: Avatar & Quick Info */}
        <div className="space-y-6">
          <div className="card flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl font-bold">
                {user?.name.charAt(0)}
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-white border border-neutral-100 rounded-full shadow-lg text-neutral-700/60 hover:text-primary transition-colors">
                <Camera size={16} />
              </button>
            </div>
            <h2 className="text-lg font-bold">{user?.name}</h2>
            <p className="text-xs text-neutral-700/40 uppercase font-bold tracking-widest mt-1">{user?.role}</p>
            
            <div className="w-full h-px bg-neutral-100 my-6" />
            
            <div className="w-full space-y-4">
              <div className="flex items-center gap-3 text-sm text-neutral-700/60">
                <Mail size={16} className="shrink-0" />
                <span className="truncate">{user?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-neutral-700/60">
                <Shield size={16} className="shrink-0" />
                <span>{user?.role === 'admin' ? 'Full System Access' : 'Limited Access'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-neutral-700/60">
                <Clock size={16} className="shrink-0" />
                <span>Last login: {user?.last_login_at ? formatDate(user.last_login_at) : 'Never'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Edit Form */}
        <div className="md:col-span-2 space-y-6">
          <div className="card">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-700/60 mb-6">Personal Information</h3>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField label="Full Name" name="name">
                  <input type="text" defaultValue={user?.name} className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-lg text-sm" />
                </FormField>
                <FormField label="Email Address" name="email">
                  <input type="email" defaultValue={user?.email} className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-lg text-sm" />
                </FormField>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-70"
                >
                  {isLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>

          <div className="card">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-700/60 mb-6">Security</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                <div>
                  <p className="text-sm font-bold text-primary-dark">Two-Factor Authentication</p>
                  <p className="text-xs text-neutral-700/40">Add an extra layer of security to your account.</p>
                </div>
                <button className="px-4 py-2 bg-white border border-neutral-100 rounded-lg text-xs font-bold hover:bg-neutral-50 transition-colors">
                  Enable
                </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                <div>
                  <p className="text-sm font-bold text-primary-dark">Change Password</p>
                  <p className="text-xs text-neutral-700/40">Update your account password regularly.</p>
                </div>
                <button className="px-4 py-2 bg-white border border-neutral-100 rounded-lg text-xs font-bold hover:bg-neutral-50 transition-colors">
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
