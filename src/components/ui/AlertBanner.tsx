import React from 'react';
import { AlertCircle, X, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AlertBannerProps {
  count: number;
  onDismiss: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ count, onDismiss }) => {
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    const dismissed = sessionStorage.getItem('alert-banner-dismissed');
    if (dismissed) {
      setIsVisible(false);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('alert-banner-dismissed', 'true');
    onDismiss();
  };

  if (!isVisible || count === 0) return null;

  return (
    <div className="bg-warning text-white px-6 py-3 flex items-center justify-between animate-in slide-in-from-top duration-500 sticky top-16 z-10 shadow-lg">
      <div className="flex items-center gap-3">
        <AlertCircle size={20} className="animate-pulse" />
        <p className="text-sm font-bold">
          {count} items require attention (low stock or slow moving)
        </p>
        <a
          href="/alerts"
          className="flex items-center gap-1 text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors ml-4"
        >
          View Alerts
          <ArrowRight size={14} />
        </a>
      </div>
      <button
        onClick={handleDismiss}
        className="p-1 hover:bg-white/20 rounded-full transition-colors"
      >
        <X size={18} />
      </button>
    </div>
  );
};
