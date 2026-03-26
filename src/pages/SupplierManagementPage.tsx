import React from 'react';
import { Truck, Search, Plus, Edit, Trash2, Phone, Mail, MapPin } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable } from '../components/ui/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Supplier } from '../types';
import { MOCK_SUPPLIERS } from '../lib/mockData';

const supplierColumns: ColumnDef<Supplier>[] = [
  {
    header: 'Company Name',
    accessorKey: 'name',
    cell: ({ getValue }) => <span className="font-bold">{getValue() as string}</span>,
  },
  {
    header: 'Contact Person',
    accessorKey: 'contact_person',
  },
  {
    header: 'Contact Info',
    id: 'contact_info',
    cell: ({ row }) => (
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-neutral-700/60">
          <Phone size={12} />
          {row.original.phone}
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-700/60">
          <Mail size={12} />
          {row.original.email}
        </div>
      </div>
    ),
  },
  {
    header: 'Address',
    accessorKey: 'address',
    cell: ({ getValue }) => (
      <div className="flex items-start gap-2 max-w-[200px]">
        <MapPin size={14} className="text-neutral-700/20 shrink-0 mt-0.5" />
        <span className="text-xs text-neutral-700/60 leading-relaxed truncate">{getValue() as string}</span>
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

export default function SupplierManagementPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Management"
        subtitle="Maintain your network of parts and material providers."
        actions={
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-all">
            <Plus size={18} />
            Add Supplier
          </button>
        }
      />

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-700/40" />
          <input
            type="text"
            placeholder="Search suppliers by name or contact..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      </div>

      <DataTable columns={supplierColumns} data={MOCK_SUPPLIERS} />
    </div>
  );
}
