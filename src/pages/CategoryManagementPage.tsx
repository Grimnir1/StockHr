import React from 'react';
import { Tags, Search, Plus, Edit, Trash2, Package } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable } from '../components/ui/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Category } from '../types';
import { MOCK_CATEGORIES } from '../lib/mockData';

const categoryColumns: ColumnDef<Category>[] = [
  {
    header: 'Category Name',
    accessorKey: 'name',
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: row.original.color }}
        />
        <span className="font-bold">{row.original.name}</span>
      </div>
    ),
  },
  {
    header: 'Description',
    accessorKey: 'description',
    cell: ({ getValue }) => <span className="text-xs text-neutral-700/60">{getValue() as string || '-'}</span>,
  },
  {
    header: 'Products',
    accessorKey: 'product_count',
    cell: ({ getValue }) => (
      <div className="flex items-center gap-2">
        <Package size={14} className="text-neutral-700/20" />
        <span className="font-medium">{getValue() as number || 0} Items</span>
      </div>
    ),
  },
  {
    header: 'Actions',
    id: 'actions',
    cell: () => (
      <div className="flex items-center gap-2">
        <button className="p-1.5 hover:bg-neutral-100 rounded text-primary transition-colors">
          <Edit size={14} />
        </button>
        <button className="p-1.5 hover:bg-danger/10 rounded text-danger transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    ),
  },
];

export default function CategoryManagementPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Category Management"
        subtitle="Organize your products into logical groups for better tracking."
        actions={
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-all">
            <Plus size={18} />
            Add Category
          </button>
        }
      />

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-700/40" />
          <input
            type="text"
            placeholder="Search categories..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      </div>

      <DataTable columns={categoryColumns} data={MOCK_CATEGORIES} />
    </div>
  );
}
