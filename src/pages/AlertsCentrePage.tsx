import React from 'react';
import { Bell, AlertTriangle, Package, Clock, CheckCircle, Filter } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Alert } from '../types';
import { formatDate, cn } from '../lib/utils';
import { MOCK_ALERTS } from '../lib/mockData';

export default function AlertsCentrePage() {
  const [activeTab, setActiveTab] = React.useState<'all' | 'low' | 'slow' | 'out'>('all');

  const filteredAlerts = MOCK_ALERTS.filter(alert => {
    if (activeTab === 'all') return true;
    if (activeTab === 'low') return alert.type === 'low_stock';
    if (activeTab === 'slow') return alert.type === 'slow_moving';
    if (activeTab === 'out') return alert.type === 'out_of_stock';
    return true;
  });

  const counts = {
    all: MOCK_ALERTS.length,
    low: MOCK_ALERTS.filter(a => a.type === 'low_stock').length,
    slow: MOCK_ALERTS.filter(a => a.type === 'slow_moving').length,
    out: MOCK_ALERTS.filter(a => a.type === 'out_of_stock').length,
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Alerts Centre"
        subtitle="Real-time notifications for stock levels and item velocity."
      />

      {/* Tabs */}
      <div className="flex border-b border-neutral-100 gap-8">
        {[
          { id: 'all', label: 'All Alerts', count: counts.all },
          { id: 'low', label: 'Low Stock', count: counts.low },
          { id: 'slow', label: 'Slow Moving', count: counts.slow },
          { id: 'out', label: 'Out of Stock', count: counts.out },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'pb-4 text-sm font-bold uppercase tracking-wider transition-all relative flex items-center gap-2',
              activeTab === tab.id ? 'text-primary' : 'text-neutral-700/40 hover:text-neutral-700'
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={cn(
                'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                activeTab === tab.id ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-700/40'
              )}>
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredAlerts.map((alert) => (
          <div
            key={alert.id}
            className={cn(
              'card flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4',
              alert.severity === 'critical' ? 'border-l-danger' : 'border-l-warning'
            )}
          >
            <div className="flex items-start gap-4">
              <div className={cn(
                'p-2 rounded-lg shrink-0',
                alert.severity === 'critical' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'
              )}>
                {alert.type === 'low_stock' ? <Package size={20} /> : <Clock size={20} />}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    'text-[10px] font-bold uppercase tracking-widest',
                    alert.severity === 'critical' ? 'text-danger' : 'text-warning'
                  )}>
                    {alert.severity}
                  </span>
                  <span className="text-neutral-700/20">•</span>
                  <span className="text-[10px] text-neutral-700/40">{formatDate(alert.created_at)}</span>
                </div>
                <p className="text-sm font-medium text-neutral-700 mb-2">{alert.message}</p>
                <a
                  href={`/products/${alert.product_id}`}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                  View Product
                </a>
              </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 rounded-lg font-bold text-xs transition-colors">
              <CheckCircle size={16} />
              Acknowledge
            </button>
          </div>
        ))}

        {filteredAlerts.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} />
            </div>
            <h3 className="text-lg font-bold text-primary-dark">All Clear!</h3>
            <p className="text-sm text-neutral-700/40">No unacknowledged alerts at this time.</p>
          </div>
        )}
      </div>
    </div>
  );
}
