import React from 'react';
import { Plus, Search, Filter, Download } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable } from '../components/ui/DataTable';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ColumnDef } from '@tanstack/react-table';
import { Product } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { RoleGuard } from '../components/ui/RoleGuard';
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from '../lib/mockData';

const productColumns: ColumnDef<Product>[] = [
  {
    header: 'SKU',
    accessorKey: 'sku',
    cell: ({ getValue }) => <span className="font-mono text-xs">{getValue() as string}</span>,
  },
  {
    header: 'Product Name',
    accessorKey: 'name',
    cell: ({ row }) => (
      <div className="max-w-[200px]">
        <p className="font-medium truncate">{row.original.name}</p>
        <p className="text-[10px] text-neutral-700/40 truncate">{row.original.description}</p>
      </div>
    ),
  },
  {
    header: 'Category',
    accessorKey: 'category.name',
    cell: ({ row }) => {
      const category = MOCK_CATEGORIES.find(c => c.id === row.original.category_id);
      return (
        <span
          className="px-2 py-0.5 rounded text-[10px] font-bold"
          style={{ backgroundColor: `${category?.color || '#ccc'}20`, color: category?.color || '#ccc' }}
        >
          {category?.name || 'Uncategorized'}
        </span>
      );
    },
  },
  {
    header: 'Current Stock',
    accessorKey: 'current_stock',
    cell: ({ row }) => (
      <span className={cn('font-bold', row.original.current_stock <= row.original.reorder_point ? 'text-danger' : 'text-success')}>
        {row.original.current_stock} {row.original.unit_of_measure}
      </span>
    ),
  },
  {
    header: 'Unit Price',
    accessorKey: 'unit_price',
    cell: ({ getValue }) => formatCurrency(getValue() as number),
  },
  {
    header: 'Velocity',
    accessorKey: 'velocity',
    cell: ({ getValue }) => <StatusBadge status={getValue() as any} />,
  },
  {
    header: 'ROP',
    accessorKey: 'reorder_point',
  },
  {
    header: 'Actions',
    id: 'actions',
    cell: ({ row }) => (
      <RoleGuard roles={['admin', 'manager']}>
        <div className="flex items-center gap-2">
          <button className="p-1.5 hover:bg-neutral-100 rounded text-primary transition-colors">
            <Search size={14} />
          </button>
        </div>
      </RoleGuard>
    ),
  },
];

export default function ProductListPage() {
  const [search, setSearch] = React.useState('');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        subtitle="Manage your inventory items and stock levels."
        actions={
          <>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-100 rounded-lg font-medium text-sm hover:bg-neutral-50 transition-colors">
              <Download size={18} />
              Export CSV
            </button>
            <RoleGuard roles={['admin', 'manager']}>
              <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-all">
                <Plus size={18} />
                Add Product
              </button>
            </RoleGuard>
          </>
        }
      />

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-700/40" />
          <input
            type="text"
            placeholder="Search by SKU, name, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <div className="flex gap-2">
          <select className="px-4 py-2.5 bg-white border border-neutral-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="">All Categories</option>
          </select>
          <select className="px-4 py-2.5 bg-white border border-neutral-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="">All Statuses</option>
            <option value="in-stock">In Stock</option>
            <option value="low-stock">Low Stock</option>
            <option value="out-of-stock">Out of Stock</option>
          </select>
          <button className="p-2.5 bg-white border border-neutral-100 rounded-xl hover:bg-neutral-50 transition-colors">
            <Filter size={18} />
          </button>
        </div>
      </div>

      <DataTable columns={productColumns} data={MOCK_PRODUCTS} onRowClick={(p) => window.location.href = `/products/${p.id}`} />
    </div>
  );
}
