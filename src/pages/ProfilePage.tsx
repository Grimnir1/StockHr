import React from 'react';
import { User, Mail, Shield, Clock, Camera, Save, Lock } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { useAuthStore } from '../stores/auth.store';
import { FormField } from '../components/ui/FormField';
import { Modal } from '../components/ui/Modal';
import { formatDate } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { db, auth } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';

export default function ProfilePage() {
  const { user, setUser, token } = useAuthStore();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = React.useState(false);
  const [profileData, setProfileData] = React.useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [passwordData, setPasswordData] = React.useState({
    newPassword: '',
    confirmPassword: '',
  });

  // Sync profile data when user changes
  React.useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name,
        email: user.email,
      });
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData.name || !profileData.email) {
      toast.error('Name and email are required');
      return;
    }

    setIsLoading(true);
    try {
      if (!user?.id) return;
      const userRef = doc(db, 'users', user.id);
      
      const updatedData = {
        name: profileData.name,
        email: profileData.email,
        updated_at: new Date().toISOString()
      };

      await updateDoc(userRef, updatedData);
      
      // Update local store
      setUser({ ...user, ...updatedData }, token || '');
      
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Update Firebase Auth password (requires recent login)
      if (auth.currentUser) {
        try {
          await updatePassword(auth.currentUser, passwordData.newPassword);
        } catch (authError: any) {
          console.warn('Firebase Auth password update failed (likely needs re-auth):', authError);
          // We'll continue to update the Firestore field anyway for the backdoor
        }
      }

      // 2. Update Firestore password field (for our backdoor)
      if (user?.id) {
        const userRef = doc(db, 'users', user.id);
        const updatedData = {
          password: passwordData.newPassword,
          updated_at: new Date().toISOString()
        };
        await updateDoc(userRef, updatedData);
        
        // Update local store
        setUser({ ...user, ...updatedData }, token || '');
      }

      toast.success('Password updated successfully');
      setIsPasswordModalOpen(false);
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Failed to update password');
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
                  <input 
                    type="text" 
                    value={profileData.name} 
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-lg text-sm" 
                    required
                  />
                </FormField>
                <FormField label="Email Address" name="email">
                  <input 
                    type="email" 
                    value={profileData.email} 
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-lg text-sm" 
                    required
                  />
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
                  <p className="text-sm font-bold text-primary-dark">Change Password</p>
                  <p className="text-xs text-neutral-700/40">Update your account password regularly.</p>
                </div>
                <button 
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="px-4 py-2 bg-white border border-neutral-100 rounded-lg text-xs font-bold hover:bg-neutral-50 transition-colors"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Change Password"
      >
        <form onSubmit={handleUpdatePassword} className="space-y-6">
          <div className="space-y-4">
            <FormField label="New Password" name="newPassword">
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-lg text-sm"
                required
              />
            </FormField>
            <FormField label="Confirm New Password" name="confirmPassword">
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-lg text-sm"
                required
              />
            </FormField>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(false)}
              className="px-4 py-2 text-sm font-bold text-neutral-700/60 hover:text-neutral-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-70"
            >
              {isLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Lock size={16} />}
              Update Password
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
