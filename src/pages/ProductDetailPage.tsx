import React from 'react';
import { ArrowLeft, Edit, Trash2, History, LineChart, Info, AlertCircle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { RoleGuard } from '../components/ui/RoleGuard';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { Product, StockMovement } from '../types';
import { DataTable } from '../components/ui/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Line } from 'react-chartjs-2';

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
  // Mock product data
  const product: Product = {
    id: parseInt(id),
    sku: 'WID-001',
    name: 'Industrial Widget A',
    description: 'High-precision widget for industrial applications. Built with durable materials for long-lasting performance in harsh environments.',
    category_id: 1,
    supplier_id: 1,
    unit_price: 12500,
    current_stock: 45,
    reorder_point: 50,
    rop: 50,
    eoq: 120,
    adu: 2.5,
    velocity: 'moderate',
    lead_time_days: 7,
    safety_stock: 10,
    cost_per_order: 500,
    holding_cost: 50,
    storage_location: 'Aisle 4, Shelf B',
    unit_of_measure: 'units',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: { id: 1, name: 'Hardware', color: '#2563EB', description: '' },
    supplier: { id: 1, name: 'Global Parts Corp', contact_person: 'Jane Smith', phone: '+123456789', email: 'jane@globalparts.com', address: '123 Industrial Way', notes: '' },
  };

  const mockMovements: StockMovement[] = [
    {
      id: 1,
      product_id: product.id,
      product_name: product.name,
      type: 'in',
      quantity: 50,
      notes: 'Monthly restock',
      reference_number: 'PO-9921',
      movement_date: new Date().toISOString(),
      performed_by_name: 'Philip Ojedokun',
    },
  ];

  const chartData = {
    labels: ['Mar 19', 'Mar 20', 'Mar 21', 'Mar 22', 'Mar 23', 'Mar 24', 'Mar 25'],
    datasets: [
      {
        label: 'Stock Level',
        data: [40, 45, 42, 38, 50, 48, 45],
        borderColor: '#2563EB',
        backgroundColor: '#2563EB20',
        fill: true,
        tension: 0.4,
      },
    ],
  };

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
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-100 rounded-lg font-medium text-sm hover:bg-neutral-50 transition-colors">
              <Edit size={18} />
              Edit Product
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-danger/10 text-danger rounded-lg font-medium text-sm hover:bg-danger/20 transition-colors">
              <Trash2 size={18} />
              Delete
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
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-bold"
                  style={{ backgroundColor: `${product.category?.color}20`, color: product.category?.color }}
                >
                  {product.category?.name}
                </span>
              </div>
              <div className={cn('text-2xl font-bold', product.current_stock <= product.reorder_point ? 'text-danger' : 'text-success')}>
                {product.current_stock} <span className="text-sm font-medium text-neutral-700/40">{product.unit_of_measure}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-bold text-neutral-700/40 uppercase tracking-widest mb-1">Supplier</p>
                <p className="text-sm font-medium">{product.supplier?.name}</p>
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
                  <span className="text-sm font-bold">{product.reorder_point} units</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-neutral-700/60">Economic Order Qty (EOQ)</span>
                  <span className="text-sm font-bold">{product.eoq} units</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-neutral-700/60">Avg Daily Usage (ADU)</span>
                  <span className="text-sm font-bold">{product.adu} units/day</span>
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
                    <span className="text-sm font-bold">18 Days</span>
                  </div>
                  <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-warning w-[60%]" />
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
            {mockMovements.map((m) => (
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
          </div>
          <button className="w-full py-2 text-xs font-bold text-primary hover:bg-primary/5 rounded-lg transition-colors">
            View All History
          </button>
        </div>
      </div>
    </div>
  );
}
