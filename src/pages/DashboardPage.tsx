import React from 'react';
import {
  Box,
  AlertTriangle,
  ArrowLeftRight,
  TrendingDown,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { KPICard } from '../components/ui/KPICard';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable } from '../components/ui/DataTable';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ColumnDef } from '@tanstack/react-table';
import { StockMovement, Product, Alert } from '../types';
import { formatDate, cn } from '../lib/utils';
import { Line, Doughnut } from 'react-chartjs-2';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { StockMovementModal } from '../components/StockMovementModal';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const movementColumns: ColumnDef<StockMovement>[] = [
  {
    header: 'Date/Time',
    accessorKey: 'movement_date',
    cell: ({ getValue }) => formatDate(getValue() as string),
  },
  {
    header: 'Product',
    accessorKey: 'product_name',
    cell: ({ row }) => (
      <a 
        href={`/products/${row.original.product_id}`}
        className="font-medium hover:text-primary transition-colors"
      >
        {row.original.product_name}
      </a>
    ),
  },
  {
    header: 'Type',
    accessorKey: 'type',
    cell: ({ getValue }) => {
      const type = getValue() as string;
      const statusMap: Record<string, any> = {
        in: 'fast',
        out: 'slow',
        adjustment: 'moderate',
      };
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
    header: 'Performed By',
    accessorKey: 'performed_by_name',
  },
];

export default function DashboardPage() {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [movements, setMovements] = React.useState<StockMovement[]>([]);
  const [alerts, setAlerts] = React.useState<Alert[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isMovementModalOpen, setIsMovementModalOpen] = React.useState(false);
  const [movementType, setMovementType] = React.useState<'in' | 'out'>('in');

  const openMovementModal = (type: 'in' | 'out') => {
    setMovementType(type);
    setIsMovementModalOpen(true);
  };

  React.useEffect(() => {
    const qProducts = query(collection(db, 'products'));
    const qMovements = query(collection(db, 'movements'), orderBy('movement_date', 'desc'), limit(10));
    const qAlerts = query(collection(db, 'alerts'), limit(20));

    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any as Product)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    const unsubMovements = onSnapshot(qMovements, (snapshot) => {
      setMovements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any as StockMovement)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'movements');
    });

    const unsubAlerts = onSnapshot(qAlerts, (snapshot) => {
      setAlerts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any as Alert)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'alerts');
    });

    return () => {
      unsubProducts();
      unsubMovements();
      unsubAlerts();
    };
  }, []);

  const chartData = React.useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const movementCounts: Record<string, number> = {};
    movements.forEach(m => {
      const date = m.movement_date.split('T')[0];
      if (last7Days.includes(date)) {
        movementCounts[date] = (movementCounts[date] || 0) + m.quantity;
      }
    });

    return {
      labels: last7Days.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [
        {
          label: 'Stock Consumption',
          data: last7Days.map(d => movementCounts[d] || 0),
          fill: false,
          borderColor: '#2563EB',
          tension: 0.4,
        },
      ],
    };
  }, [movements]);

  const doughnutData = React.useMemo(() => {
    const categoryCounts: Record<string, number> = {};
    products.forEach(p => {
      const catName = p.category_name || 'Uncategorized';
      categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
    });

    return {
      labels: Object.keys(categoryCounts),
      datasets: [
        {
          data: Object.values(categoryCounts),
          backgroundColor: ['#2563EB', '#16A34A', '#D97706', '#DC2626', '#7C3AED', '#DB2777'],
          borderWidth: 0,
        },
      ],
    };
  }, [products]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle="Welcome back, here is what's happening today."
        actions={
          <div className="flex gap-2">
            <a 
            href="/products/new"
            className="btn-primary flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium text-sm">
              <Plus size={18} />
              New Product
            </a>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Total Products" value={products.length} icon={Box} colour="blue" />
        <KPICard title="Low Stock Alerts" value={alerts.length} icon={AlertTriangle} colour="red" trend={-5} />
        <KPICard title="Stock Movements Today" value={movements.length} icon={ArrowLeftRight} colour="green" />
        <KPICard title="Slow-Moving Items" value="156" icon={TrendingDown} colour="amber" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-700/60">
              Stock Consumption Trend
            </h3>
            <button className="text-xs font-bold text-primary">Export PNG</button>
          </div>
          <div className="h-[300px]">
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
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-700/60">
              Inventory Distribution
            </h3>
          </div>
          <div className="h-[300px] flex items-center justify-center">
            <Doughnut
              data={doughnutData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } },
              }}
            />
          </div>
        </div>
      </div>

      {/* Recent Movements */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-700/60">
            Recent Stock Movements
          </h3>
          <a href="/movements" className="text-xs font-bold text-primary">View All</a>
        </div>
        <DataTable columns={movementColumns} data={movements} pagination={false} />
      </div>

      {/* Quick Action Buttons (Floating) */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-40">
        <button 
          onClick={() => openMovementModal('in')}
          className="flex items-center gap-2 px-4 py-3 bg-success text-white rounded-full shadow-lg hover:scale-105 transition-transform font-bold text-sm"
        >
          <ArrowDownLeft size={18} />
          Record Stock In
        </button>
        <button 
          onClick={() => openMovementModal('out')}
          className="flex items-center gap-2 px-4 py-3 bg-danger text-white rounded-full shadow-lg hover:scale-105 transition-transform font-bold text-sm"
        >
          <ArrowUpRight size={18} />
          Record Stock Out
        </button>
      </div>

      <StockMovementModal 
        isOpen={isMovementModalOpen} 
        onClose={() => setIsMovementModalOpen(false)} 
        defaultType={movementType} 
      />
    </div>
  );
}
