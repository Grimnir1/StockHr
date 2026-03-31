import React from 'react';
import { Package, Clock, CheckCircle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Alert, Product } from '../types';
import { formatDate, cn } from '../lib/utils';
import { db } from '../firebase';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../stores/auth.store';
import { logAuditEvent } from '../lib/audit';

export default function AlertsCentrePage() {
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = React.useState<'all' | 'low' | 'slow' | 'out'>('all');
  const [dbAlerts, setDbAlerts] = React.useState<Alert[]>([]);
  const [derivedAlerts, setDerivedAlerts] = React.useState<Alert[]>([]);
  const [loadingDbAlerts, setLoadingDbAlerts] = React.useState(true);
  const [loadingDerivedAlerts, setLoadingDerivedAlerts] = React.useState(true);
  const [acknowledgingId, setAcknowledgingId] = React.useState<string | null>(null);
  const [dismissedDerivedAlertIds, setDismissedDerivedAlertIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    const q = query(collection(db, 'alerts'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mapped = snapshot.docs
        .map((alertDoc) => {
          const data = alertDoc.data() as any;
          const normalizedType = ['low_stock', 'slow_moving', 'out_of_stock'].includes(data.type)
            ? data.type
            : 'low_stock';

          const isAcknowledged =
            data.is_acknowledged === true || data.status === 'acknowledged' || data.status === 'resolved';

          return {
            id: alertDoc.id,
            type: normalizedType,
            message: data.message || 'Inventory alert',
            product_id: data.product_id || '',
            product_name: data.product_name || 'Unknown product',
            severity: data.severity === 'critical' ? 'critical' : 'warning',
            created_at: data.created_at || new Date().toISOString(),
            is_acknowledged: isAcknowledged,
          } as Alert;
        })
        .filter((alert) => !alert.is_acknowledged);

      setDbAlerts(mapped);
      setLoadingDbAlerts(false);
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    const q = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mapped = snapshot.docs.flatMap((productDoc) => {
        const product = { id: productDoc.id, ...productDoc.data() } as Product;
        const currentStock = Number(product.current_stock || 0);
        const reorderPoint = Number(product.reorder_point || 0);
        const createdAt = product.updated_at || product.created_at || new Date().toISOString();

        const alertsForProduct: Alert[] = [];

        if (currentStock <= 0) {
          alertsForProduct.push({
            id: `derived-out-${product.id}`,
            type: 'out_of_stock',
            message: `${product.name || 'Product'} is out of stock (${currentStock} ${product.unit_of_measure || 'units'} remaining).`,
            product_id: product.id,
            product_name: product.name || 'Unknown product',
            severity: 'critical',
            is_acknowledged: false,
            created_at: createdAt,
          });
        } else if (currentStock <= reorderPoint) {
          alertsForProduct.push({
            id: `derived-low-${product.id}`,
            type: 'low_stock',
            message: `${product.name || 'Product'} is below reorder point (${currentStock}/${reorderPoint} ${product.unit_of_measure || 'units'}).`,
            product_id: product.id,
            product_name: product.name || 'Unknown product',
            severity: 'warning',
            is_acknowledged: false,
            created_at: createdAt,
          });
        }

        if (product.velocity === 'slow') {
          alertsForProduct.push({
            id: `derived-slow-${product.id}`,
            type: 'slow_moving',
            message: `${product.name || 'Product'} is marked as slow-moving and may require action.`,
            product_id: product.id,
            product_name: product.name || 'Unknown product',
            severity: 'warning',
            is_acknowledged: false,
            created_at: createdAt,
          });
        }

        return alertsForProduct;
      });

      setDerivedAlerts(mapped);
      setLoadingDerivedAlerts(false);
    });
    return () => unsubscribe();
  }, []);

  const alerts = React.useMemo(() => {
    const merged = new Map<string, Alert>();

    derivedAlerts.forEach((alert) => {
      if (dismissedDerivedAlertIds.includes(alert.id)) return;
      merged.set(`${alert.type}:${alert.product_id}`, alert);
    });

    dbAlerts.forEach((alert) => {
      merged.set(`${alert.type}:${alert.product_id}`, alert);
    });

    return Array.from(merged.values()).sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [dbAlerts, derivedAlerts, dismissedDerivedAlertIds]);

  const loading = loadingDbAlerts || loadingDerivedAlerts;

  const handleAcknowledge = async (alertId: string) => {
    if (!alertId || acknowledgingId) return;

    if (alertId.startsWith('derived-')) {
      const alert = alerts.find((item) => item.id === alertId);
      setDismissedDerivedAlertIds((prev) => [...prev, alertId]);
      await logAuditEvent({
        userId: user?.id,
        action: 'UPDATE',
        entityType: 'Alert',
        entityId: alertId,
        details: `Acknowledged derived alert for ${alert?.product_name || 'unknown product'}`,
      });
      toast.success('Alert acknowledged');
      return;
    }

    setAcknowledgingId(alertId);
    try {
      await updateDoc(doc(db, 'alerts', alertId), {
        is_acknowledged: true,
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
      });
      const alert = alerts.find((item) => item.id === alertId);
      await logAuditEvent({
        userId: user?.id,
        action: 'UPDATE',
        entityType: 'Alert',
        entityId: alertId,
        details: `Acknowledged alert for ${alert?.product_name || 'unknown product'}`,
      });
      toast.success('Alert acknowledged');
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast.error('Failed to acknowledge alert');
    } finally {
      setAcknowledgingId(null);
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (activeTab === 'all') return true;
    if (activeTab === 'low') return alert.type === 'low_stock';
    if (activeTab === 'slow') return alert.type === 'slow_moving';
    if (activeTab === 'out') return alert.type === 'out_of_stock';
    return true;
  });

  const counts = {
    all: alerts.length,
    low: alerts.filter(a => a.type === 'low_stock').length,
    slow: alerts.filter(a => a.type === 'slow_moving').length,
    out: alerts.filter(a => a.type === 'out_of_stock').length,
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
        {loading && (
          <div className="py-20 text-center text-sm text-neutral-700/50">Loading alerts...</div>
        )}

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
            <button
              type="button"
              onClick={() => handleAcknowledge(alert.id)}
              disabled={acknowledgingId === alert.id}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 rounded-lg font-bold text-xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <CheckCircle size={16} />
              {acknowledgingId === alert.id ? 'Acknowledging...' : 'Acknowledge'}
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
