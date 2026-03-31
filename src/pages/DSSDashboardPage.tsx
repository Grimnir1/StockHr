import React from 'react';
import { LineChart, TrendingUp, TrendingDown, Package, AlertTriangle, DollarSign, Download, CheckCircle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable } from '../components/ui/DataTable';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ColumnDef } from '@tanstack/react-table';
import { Product } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Bar } from 'react-chartjs-2';
import { db } from '../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const getReorderColumns = (supplierNamesById: Record<string, string>): ColumnDef<Product>[] => [
  {
    header: 'Product',
    accessorKey: 'name',
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.name}</p>
        <p className="text-[10px] text-neutral-700/40 font-mono">{row.original.sku}</p>
      </div>
    ),
  },
  {
    header: 'Stock',
    accessorKey: 'current_stock',
    cell: ({ row }) => (
      <span className="font-bold text-danger">{row.original.current_stock} units</span>
    ),
  },
  {
    header: 'ROP',
    accessorKey: 'reorder_point',
  },
  {
    header: 'EOQ (Rec.)',
    accessorKey: 'eoq',
    cell: ({ getValue }) => <span className="font-bold text-primary">{getValue() as number} units</span>,
  },
  {
    header: 'Supplier',
    id: 'supplier_name',
    cell: ({ row }) => supplierNamesById[row.original.supplier_id] || 'N/A',
  },
  {
    header: 'Est. Cost',
    id: 'est_cost',
    cell: ({ row }) => formatCurrency(row.original.eoq * row.original.unit_price),
  },
  {
    header: 'Urgency',
    id: 'urgency',
    cell: ({ row }) => {
      const days = Math.floor(row.original.current_stock / row.original.adu);
      return (
        <span className={cn('text-xs font-bold', days < 5 ? 'text-danger' : 'text-warning')}>
          {days} Days Left
        </span>
      );
    },
  },
  {
    header: 'Action',
    id: 'action',
    cell: () => (
      <button className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded hover:bg-primary/20 transition-colors">
        Mark as Ordered
      </button>
    ),
  },
];

const velocityColumns: ColumnDef<Product>[] = [
  {
    header: 'Product',
    accessorKey: 'name',
  },
  {
    header: 'Category',
    accessorKey: 'category_name',
  },
  {
    header: 'ADU',
    accessorKey: 'adu',
    cell: ({ getValue }) => `${getValue() as number} units/day`,
  },
  {
    header: 'Velocity',
    accessorKey: 'velocity',
    cell: ({ getValue }) => <StatusBadge status={getValue() as any} />,
  },
  {
    header: 'Last Movement',
    accessorKey: 'updated_at',
    cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString(),
  },
  {
    header: '30D Consumption',
    id: 'consumption',
    cell: ({ row }) => `${Math.round(row.original.adu * 30)} units`,
  },
];

export default function DSSDashboardPage() {
  const [activeTab, setActiveTab] = React.useState<'overview' | 'reorder' | 'velocity'>('overview');
  const [products, setProducts] = React.useState<Product[]>([]);
  const [supplierNamesById, setSupplierNamesById] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const qProducts = query(collection(db, 'products'));
    const qSuppliers = query(collection(db, 'suppliers'));

    const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any as Product)));
      setLoading(false);
    });

    const unsubscribeSuppliers = onSnapshot(qSuppliers, (snapshot) => {
      const nextMap: Record<string, string> = {};
      snapshot.docs.forEach((supplierDoc) => {
        const supplierData = supplierDoc.data() as { name?: string };
        nextMap[supplierDoc.id] = supplierData.name || '';
      });
      setSupplierNamesById(nextMap);
    });

    return () => {
      unsubscribeProducts();
      unsubscribeSuppliers();
    };
  }, []);

  const reorderColumns = React.useMemo(() => getReorderColumns(supplierNamesById), [supplierNamesById]);

  const reorderItems = products.filter(p => p.current_stock <= p.reorder_point);
  const outOfStockItems = products.filter(p => p.current_stock === 0);
  const slowMovingItems = products.filter(p => p.velocity === 'slow');
  const totalReorderValue = reorderItems.reduce((acc, p) => acc + (p.eoq * p.unit_price), 0);

  const fastestMovingData = {
    labels: products.sort((a, b) => b.adu - a.adu).slice(0, 5).map(p => p.name),
    datasets: [
      {
        label: 'ADU (Units/Day)',
        data: products.sort((a, b) => b.adu - a.adu).slice(0, 5).map(p => p.adu),
        backgroundColor: '#16A34A',
        borderRadius: 4,
      },
    ],
  };

  const slowestMovingData = {
    labels: products.sort((a, b) => a.adu - b.adu).slice(0, 5).map(p => p.name),
    datasets: [
      {
        label: 'ADU (Units/Day)',
        data: products.sort((a, b) => a.adu - b.adu).slice(0, 5).map(p => p.adu),
        backgroundColor: '#DC2626',
        borderRadius: 4,
      },
    ],
  };

  if (loading) return <div className="p-8 text-center">Loading DSS Analysis...</div>;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Decision Support System"
        subtitle="Analytical insights and stock optimization recommendations."
        actions={
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-100 rounded-lg font-medium text-sm hover:bg-neutral-50 transition-colors">
            <Download size={18} />
            Export Analysis
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-neutral-100 gap-8">
        {(['overview', 'reorder', 'velocity'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'pb-4 text-sm font-bold uppercase tracking-wider transition-all relative',
              activeTab === tab ? 'text-primary' : 'text-neutral-700/40 hover:text-neutral-700'
            )}
          >
            {tab.replace('-', ' ')}
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card bg-danger/5 border-danger/10">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle size={18} className="text-danger" />
                <p className="text-[10px] font-bold text-danger uppercase tracking-widest">Below ROP</p>
              </div>
              <h3 className="text-2xl font-bold">{reorderItems.length} Items</h3>
              <p className="text-xs text-danger/60 mt-1">Require immediate reorder</p>
            </div>
            <div className="card bg-neutral-100 border-neutral-200">
              <div className="flex items-center gap-3 mb-2">
                <Package size={18} className="text-neutral-700/40" />
                <p className="text-[10px] font-bold text-neutral-700/40 uppercase tracking-widest">Zero Stock</p>
              </div>
              <h3 className="text-2xl font-bold">{outOfStockItems.length} Items</h3>
              <p className="text-xs text-neutral-700/40 mt-1">Currently out of stock</p>
            </div>
            <div className="card bg-warning/5 border-warning/10">
              <div className="flex items-center gap-3 mb-2">
                <TrendingDown size={18} className="text-warning" />
                <p className="text-[10px] font-bold text-warning uppercase tracking-widest">Slow Moving</p>
              </div>
              <h3 className="text-2xl font-bold">{slowMovingItems.length} Items</h3>
              <p className="text-xs text-warning/60 mt-1">Low velocity products</p>
            </div>
            <div className="card bg-primary/5 border-primary/10">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign size={18} className="text-primary" />
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Reorder Value</p>
              </div>
              <h3 className="text-2xl font-bold">{formatCurrency(totalReorderValue)}</h3>
              <p className="text-xs text-primary/60 mt-1">Est. cost for all ROP items</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700/60 mb-6">Top 5 Fastest Moving Items</h3>
              <div className="h-[300px]">
                <Bar
                  data={fastestMovingData}
                  options={{
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { x: { grid: { color: '#F1F5F9' } }, y: { grid: { display: false } } },
                  }}
                />
              </div>
            </div>
            <div className="card">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700/60 mb-6">Top 5 Slowest Moving Items</h3>
              <div className="h-[300px]">
                <Bar
                  data={slowestMovingData}
                  options={{
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { x: { grid: { color: '#F1F5F9' } }, y: { grid: { display: false } } },
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reorder' && (
        <div className="animate-in fade-in duration-500">
          <DataTable columns={reorderColumns} data={reorderItems} />
        </div>
      )}

      {activeTab === 'velocity' && (
        <div className="animate-in fade-in duration-500 space-y-6">
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg">All Tiers</button>
            <button className="px-4 py-2 bg-white border border-neutral-100 text-xs font-bold rounded-lg hover:bg-neutral-50">Fast</button>
            <button className="px-4 py-2 bg-white border border-neutral-100 text-xs font-bold rounded-lg hover:bg-neutral-50">Moderate</button>
            <button className="px-4 py-2 bg-white border border-neutral-100 text-xs font-bold rounded-lg hover:bg-neutral-50">Slow</button>
          </div>
          <DataTable columns={velocityColumns} data={products} />
        </div>
      )}
    </div>
  );
}
