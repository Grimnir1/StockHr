import React from 'react';
import { ArrowLeft, Edit, Trash2, History, LineChart, Info, AlertCircle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { RoleGuard } from '../components/ui/RoleGuard';
import { ConfirmModal } from '../components/ui/Modal';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { Product, StockMovement } from '../types';
import { DataTable } from '../components/ui/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Line } from 'react-chartjs-2';
import { db } from '../firebase';
import { doc, onSnapshot, collection, query, where, orderBy, limit, getDocs, writeBatch } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const movementColumns: ColumnDef<StockMovement>[] = [
  {
    header: 'Date',
    accessorKey: 'movement_date',
    cell: ({ getValue }) => formatDate(getValue() as string),
  },
  {
    header: 'Type',
    accessorKey: 'type',
    cell: ({ getValue }) => {
      const type = getValue() as string;
      const statusMap: Record<string, any> = { in: 'fast', out: 'slow', adjustment: 'moderate' };
      return <StatusBadge status={statusMap[type]} />;
    },
  },
  {
    header: 'Quantity',
    accessorKey: 'quantity',
    cell: ({ row }) => (
      <span className={cn('font-bold', row.original.type === 'in' ? 'text-success' : 'text-danger')}>
        {row.original.type === 'out' ? '-' : '+'}
        {row.original.quantity}
      </span>
    ),
  },
  {
    header: 'Notes',
    accessorKey: 'notes',
  },
  {
    header: 'Performed By',
    accessorKey: 'performed_by_name',
  },
];

export default function ProductDetailPage({ id }: { id: string }) {
  const [product, setProduct] = React.useState<Product | null>(null);
  const [movements, setMovements] = React.useState<StockMovement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);

  React.useEffect(() => {
    const unsubProduct = onSnapshot(doc(db, 'products', id), (docSnap) => {
      if (docSnap.exists()) {
        setProduct({ id: docSnap.id, ...docSnap.data() } as any as Product);
      }
      setLoading(false);
    });

    const qMovements = query(
      collection(db, 'movements'),
      where('product_id', '==', id),
      orderBy('movement_date', 'desc'),
      limit(10)
    );

    const unsubMovements = onSnapshot(qMovements, (snapshot) => {
      setMovements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any as StockMovement)));
    });

    return () => {
      unsubProduct();
      unsubMovements();
    };
  }, [id]);

  const navigateTo = React.useCallback((nextPath: string) => {
    window.history.pushState({}, '', nextPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  const handleEditProduct = React.useCallback(() => {
    navigateTo(`/products/${id}/edit`);
  }, [id, navigateTo]);

  const openDeleteModal = React.useCallback(() => {
    if (!product || isDeleting) return;
    setIsDeleteModalOpen(true);
  }, [isDeleting, product]);

  const handleDeleteProduct = React.useCallback(async () => {
    if (!product || isDeleting) return;

    setIsDeleting(true);
    try {
      const batch = writeBatch(db);
      const movementSnapshot = await getDocs(query(collection(db, 'movements'), where('product_id', '==', id)));

      movementSnapshot.forEach((movementDoc) => {
        batch.delete(movementDoc.ref);
      });
      batch.delete(doc(db, 'products', id));

      await batch.commit();
      toast.success('Product deleted successfully');
      setIsDeleteModalOpen(false);
      navigateTo('/products');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  }, [id, isDeleting, navigateTo, product]);

  const chartData = React.useMemo(() => {
    try {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
      });

      const movementCounts: Record<string, number> = {};
      movements.forEach(m => {
        if (!m.movement_date) return;
        
        let dateStr = '';
        if (typeof m.movement_date === 'string') {
          dateStr = m.movement_date;
        } else if (m.movement_date && typeof (m.movement_date as any).toDate === 'function') {
          dateStr = (m.movement_date as any).toDate().toISOString();
        } else if (m.movement_date && (m.movement_date as any).seconds) {
          dateStr = new Date((m.movement_date as any).seconds * 1000).toISOString();
        }
        
        if (!dateStr) return;
        const date = dateStr.split('T')[0];
        if (last7Days.includes(date)) {
          const qty = Number(m.quantity) || 0;
          // For "Stock Level" chart, we might want to show net movement or just volume
          // Here we'll show net movement (in - out)
          const netQty = m.type === 'out' ? -qty : qty;
          movementCounts[date] = (movementCounts[date] || 0) + netQty;
        }
      });

      return {
        labels: last7Days.map(d => {
          const date = new Date(d);
          return isNaN(date.getTime()) ? d : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }),
        datasets: [
          {
            label: 'Net Movement',
            data: last7Days.map(d => movementCounts[d] || 0),
            borderColor: '#2563EB',
            backgroundColor: '#2563EB20',
            fill: true,
            tension: 0.4,
          },
        ],
      };
    } catch (error) {
      console.error('Error calculating chart data:', error);
      return { labels: [], datasets: [] };
    }
  }, [movements]);

  if (loading) return <div className="p-8 text-center">Loading product details...</div>;
  if (!product) return <div className="p-8 text-center">Product not found.</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => window.history.back()} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-neutral-700/40 uppercase tracking-widest">Products</span>
          <span className="text-neutral-700/20">/</span>
          <span className="text-xs font-bold text-primary uppercase tracking-widest">{product.sku}</span>
        </div>
      </div>

      <PageHeader
        title={product.name}
        subtitle={product.sku}
        actions={
          <RoleGuard roles={['admin', 'manager']}>
            <button
              type="button"
              onClick={handleEditProduct}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-100 rounded-lg font-medium text-sm hover:bg-neutral-50 transition-colors"
            >
              <Edit size={18} />
              Edit Product
            </button>
            <button
              type="button"
              onClick={openDeleteModal}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 bg-danger/10 text-danger rounded-lg font-medium text-sm hover:bg-danger/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Trash2 size={18} />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </RoleGuard>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Info & Metrics */}
        <div className="lg:col-span-2 space-y-8">
          {/* Info Panel */}
          <div className="card">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <StatusBadge status={product.velocity} />
                {product.category_name && (
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary"
                  >
                    {product.category_name}
                  </span>
                )}
              </div>
              <div className={cn('text-2xl font-bold', (product.current_stock || 0) <= (product.reorder_point || 0) ? 'text-danger' : 'text-success')}>
                {product.current_stock || 0} <span className="text-sm font-medium text-neutral-700/40">{product.unit_of_measure}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-bold text-neutral-700/40 uppercase tracking-widest mb-1">Supplier</p>
                <p className="text-sm font-medium">{product.supplier_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-neutral-700/40 uppercase tracking-widest mb-1">Storage Location</p>
                <p className="text-sm font-medium">{product.storage_location}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] font-bold text-neutral-700/40 uppercase tracking-widest mb-1">Description</p>
                <p className="text-sm text-neutral-700/80 leading-relaxed">{product.description}</p>
              </div>
            </div>
          </div>

          {/* DSS Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card border-l-4 border-l-primary">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <LineChart size={16} className="text-primary" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700/60">DSS Analysis</h3>
                </div>
                <Info size={14} className="text-neutral-700/20 cursor-help" />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-neutral-700/60">Reorder Point (ROP)</span>
                  <span className="text-sm font-bold">{product.reorder_point || 0} units</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-neutral-700/60">Economic Order Qty (EOQ)</span>
                  <span className="text-sm font-bold">{Math.round(product.eoq || 0)} units</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-neutral-700/60">Avg Daily Usage (ADU)</span>
                  <span className="text-sm font-bold">{(product.adu || 0).toFixed(2)} units/day</span>
                </div>
              </div>
            </div>
            <div className="card border-l-4 border-l-warning">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="text-warning" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700/60">Stockout Risk</h3>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-neutral-700/60">Days Until Stockout</span>
                    <span className="text-sm font-bold">
                      {(product.adu || 0) > 0 ? Math.floor((product.current_stock || 0) / (product.adu || 1)) : '∞'} Days
                    </span>
                  </div>
                  <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all duration-500",
                        (product.current_stock || 0) <= (product.reorder_point || 0) ? "bg-danger" : "bg-warning"
                      )} 
                      style={{ 
                        width: `${Math.max(0, Math.min(100, ((product.current_stock || 0) / ((product.reorder_point || 1) * 2)) * 100)) || 0}%` 
                      }} 
                    />
                  </div>
                </div>
                <p className="text-[10px] text-neutral-700/40 italic">Based on current ADU and stock levels.</p>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="card">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700/60 mb-6">Stock Consumption Chart</h3>
            <div className="h-[250px]">
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: { beginAtZero: true, grid: { color: '#F1F5F9' } },
                    x: { grid: { display: false } },
                  },
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Recent Movements */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={16} className="text-neutral-700/40" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700/60">Recent Movements</h3>
            </div>
          </div>
          <div className="space-y-4">
            {movements.map((m) => (
              <div key={m.id} className="card p-4">
                <div className="flex justify-between items-start mb-2">
                  <StatusBadge status={m.type === 'in' ? 'fast' : m.type === 'out' ? 'slow' : 'moderate'} />
                  <span className="text-[10px] text-neutral-700/40">{formatDate(m.movement_date)}</span>
                </div>
                <p className="text-sm font-bold mb-1">
                  {m.type === 'out' ? '-' : '+'}
                  {m.quantity} Units
                </p>
                <p className="text-xs text-neutral-700/60 truncate">{m.notes}</p>
                <div className="mt-3 pt-3 border-t border-neutral-100 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-neutral-700/40 uppercase">{m.performed_by_name}</span>
                  <span className="text-[10px] font-mono text-neutral-700/40">{m.reference_number}</span>
                </div>
              </div>
            ))}
            {movements.length === 0 && (
              <p className="text-center py-8 text-xs text-neutral-700/40">No recent movements.</p>
            )}
          </div>
          <button className="w-full py-2 text-xs font-bold text-primary hover:bg-primary/5 rounded-lg transition-colors">
            View All History
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete Product"
        message={`Are you sure you want to delete ${product.name}? This will also remove its stock movement history.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Product'}
        confirmVariant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteProduct}
        onCancel={() => {
          if (!isDeleting) setIsDeleteModalOpen(false);
        }}
      />
    </div>
  );
}
