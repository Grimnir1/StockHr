import React from 'react';
import { Calendar as CalendarIcon, Search, Download, Plus } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable } from '../components/ui/DataTable';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ColumnDef } from '@tanstack/react-table';
import { StockMovement } from '../types';
import { formatDate, cn } from '../lib/utils';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { StockMovementModal } from '../components/StockMovementModal';

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
        className="block max-w-[200px] group"
      >
        <p className="font-medium truncate group-hover:text-primary transition-colors">{row.original.product_name}</p>
        <p className="text-[10px] text-neutral-700/40 font-mono">ID: {row.original.product_id}</p>
      </a>
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
  const [movements, setMovements] = React.useState<StockMovement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [selectedType, setSelectedType] = React.useState('');
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');

  React.useEffect(() => {
    const q = query(collection(db, 'movements'), orderBy('movement_date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMovements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any as StockMovement)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredMovements = React.useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return movements.filter((movement) => {
      const movementDate = new Date(movement.movement_date);
      if (Number.isNaN(movementDate.getTime())) {
        return false;
      }

      const matchesSearch = !searchTerm
        || (movement.product_name || '').toLowerCase().includes(searchTerm)
        || (movement.reference_number || '').toLowerCase().includes(searchTerm)
        || (movement.performed_by_name || '').toLowerCase().includes(searchTerm);

      const matchesType = !selectedType || movement.type === selectedType;

      const startOfDay = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
      const endOfDay = toDate ? new Date(`${toDate}T23:59:59.999`) : null;
      const matchesFromDate = !startOfDay || movementDate >= startOfDay;
      const matchesToDate = !endOfDay || movementDate <= endOfDay;

      return matchesSearch && matchesType && matchesFromDate && matchesToDate;
    });
  }, [movements, search, selectedType, fromDate, toDate]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Movements"
        subtitle="Complete log of all inventory ins, outs, and adjustments."
        actions={
          <>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-100 rounded-lg font-medium text-sm hover:bg-neutral-50 transition-colors">
              <Download size={18} />
              Export Log
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-all"
            >
              <Plus size={18} />
              Record Movement
            </button>
          </>
        }
      />

      <StockMovementModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="relative md:col-span-2">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-700/40" />
          <input
            type="text"
            placeholder="Search by product name or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <div className="relative">
          <CalendarIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-700/40" />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-neutral-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2.5 bg-white border border-neutral-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All Types</option>
            <option value="in">Stock In</option>
            <option value="out">Stock Out</option>
            <option value="adjustment">Adjustment</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={() => {
            setSearch('');
            setSelectedType('');
            setFromDate('');
            setToDate('');
          }}
          className="px-3 py-1.5 text-xs font-medium bg-white border border-neutral-100 rounded-md hover:bg-neutral-50 transition-colors"
        >
          Clear Filters
        </button>
      </div>

      <DataTable columns={movementColumns} data={filteredMovements} isLoading={loading} />
    </div>
  );
}
