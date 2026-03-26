import React from 'react';
import { Filter, Calendar as CalendarIcon, Search, Download, Plus } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable } from '../components/ui/DataTable';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ColumnDef } from '@tanstack/react-table';
import { StockMovement } from '../types';
import { formatDate, cn } from '../lib/utils';
import { RoleGuard } from '../components/ui/RoleGuard';
import { MOCK_MOVEMENTS } from '../lib/mockData';
import { StockMovementModal } from '../components/ui/StockMovementModal';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

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
      <div className="max-w-[200px]">
        <p className="font-medium truncate">{row.original.product_name}</p>
        <p className="text-[10px] text-neutral-700/40 font-mono">ID: {row.original.product_id}</p>
      </div>
    ),
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
    header: 'Reference #',
    accessorKey: 'reference_number',
    cell: ({ getValue }) => <span className="font-mono text-xs">{getValue() as string || '-'}</span>,
  },
  {
    header: 'Performed By',
    accessorKey: 'performed_by_name',
  },
];

export default function StockMovementsPage() {
  const [isMovementModalOpen, setIsMovementModalOpen] = React.useState(false);
  const [movementType, setMovementType] = React.useState<'in' | 'out'>('in');
  const [movements, setMovements] = React.useState(MOCK_MOVEMENTS);

  const handleRecordMovement = (type: 'in' | 'out') => {
    setMovementType(type);
    setIsMovementModalOpen(true);
  };

  const handleMovementSuccess = (newMovement: StockMovement) => {
    setMovements([newMovement, ...movements]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Movements"
        subtitle="Complete log of all inventory ins, outs, and adjustments."
        actions={
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-100 rounded-lg font-medium text-sm hover:bg-neutral-50 transition-colors">
              <Download size={18} />
              Export Log
            </button>
            <button 
              onClick={() => handleRecordMovement('in')}
              className="flex items-center gap-2 px-4 py-2 bg-success text-white rounded-lg font-medium text-sm hover:bg-success/90 transition-all"
            >
              <ArrowDownLeft size={18} />
              Stock In
            </button>
            <button 
              onClick={() => handleRecordMovement('out')}
              className="flex items-center gap-2 px-4 py-2 bg-danger text-white rounded-lg font-medium text-sm hover:bg-danger/90 transition-all"
            >
              <ArrowUpRight size={18} />
              Stock Out
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="relative md:col-span-2">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-700/40" />
          <input
            type="text"
            placeholder="Search by product name or reference..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <div className="relative">
          <CalendarIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-700/40" />
          <input
            type="text"
            placeholder="Date Range"
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        <select className="px-4 py-2.5 bg-white border border-neutral-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="">All Types</option>
          <option value="in">Stock In</option>
          <option value="out">Stock Out</option>
          <option value="adjustment">Adjustment</option>
        </select>
      </div>

      <DataTable columns={movementColumns} data={movements} />

      <StockMovementModal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        type={movementType}
        onSuccess={handleMovementSuccess}
      />
    </div>
  );
}
