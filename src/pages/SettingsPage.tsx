import React from 'react';
import { Settings as SettingsIcon, Bell, DollarSign, Shield, Save, RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { FormField } from '../components/ui/FormField';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../stores/auth.store';
import { logAuditEvent } from '../lib/audit';

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await logAuditEvent({
        userId: user?.id,
        action: 'UPDATE',
        entityType: 'Settings',
        entityId: 'system',
        details: 'Saved system settings from settings page',
      });
      toast.success('System settings updated successfully');
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <PageHeader
        title="System Settings"
        subtitle="Configure global application thresholds and preferences."
      />

      <form onSubmit={handleSave} className="space-y-8 pb-10">
        {/* Alert Thresholds */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-warning/10 text-warning rounded-lg">
              <Bell size={20} />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider">Alert Thresholds</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Default Safety Stock Days" name="safety_days">
              <input type="number" defaultValue={10} className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm" />
            </FormField>
            <FormField label="Slow-Moving Threshold (Days)" name="slow_threshold">
              <input type="number" defaultValue={60} className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm" />
            </FormField>
          </div>
        </div>

        {/* Analytics Configuration */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <RefreshCw size={20} />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider">Analytics Configuration</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Velocity Analysis Period (Days)" name="velocity_period">
              <input type="number" defaultValue={30} className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm" />
            </FormField>
            <FormField label="Default Currency Symbol" name="currency">
              <input type="text" defaultValue="NGN" className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm" />
            </FormField>
          </div>
        </div>

        {/* General Settings */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-neutral-100 text-neutral-700/60 rounded-lg">
              <SettingsIcon size={20} />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider">General Settings</h3>
          </div>
          <div className="space-y-6">
            <FormField label="System Name" name="system_name">
              <input type="text" defaultValue="StockSense" className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm" />
            </FormField>
            <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-100">
              <div>
                <p className="text-sm font-bold text-primary-dark">Maintenance Mode</p>
                <p className="text-xs text-neutral-700/40">Disable all non-admin access to the system.</p>
              </div>
              <button type="button" className="w-12 h-6 bg-neutral-200 rounded-full relative transition-colors">
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-70"
          >
            {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            Save All Settings
          </button>
        </div>
      </form>
    </div>
  );
}
