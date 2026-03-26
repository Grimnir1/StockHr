import React from 'react';
import { History, Search, Filter, Download, Info } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable } from '../components/ui/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { AuditLog } from '../types';
import { formatDate, cn } from '../lib/utils';
import { MOCK_AUDIT_LOGS } from '../lib/mockData';

const auditColumns: ColumnDef<AuditLog>[] = [
  {
    header: 'Timestamp',
    accessorKey: 'created_at',
    cell: ({ getValue }) => formatDate(getValue() as string),
  },
  {
    header: 'User',
    accessorKey: 'user_name',
    cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span>,
  },
  {
    header: 'Action',
    accessorKey: 'action',
    cell: ({ getValue }) => {
      const action = getValue() as string;
      const colors: Record<string, string> = {
        CREATE: 'bg-success/10 text-success border-success/20',
        UPDATE: 'bg-warning/10 text-warning border-warning/20',
        DELETE: 'bg-danger/10 text-danger border-danger/20',
        LOGIN: 'bg-primary/10 text-primary border-primary/20',
      };
      return (
        <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider', colors[action])}>
          {action}
        </span>
      );
    },
  },
  {
    header: 'Entity',
    accessorKey: 'entity_type',
    cell: ({ row }) => (
      <span className="text-xs text-neutral-700/60">
        {row.original.entity_type} <span className="font-mono text-[10px]">#{row.original.entity_id}</span>
      </span>
    ),
  },
  {
    header: 'IP Address',
    accessorKey: 'ip_address',
    cell: ({ getValue }) => <span className="font-mono text-[10px] text-neutral-700/40">{getValue() as string}</span>,
  },
  {
    header: 'Details',
    accessorKey: 'details',
    cell: ({ getValue }) => (
      <div className="max-w-[300px] truncate group relative cursor-help">
        <span className="text-xs text-neutral-700/80">{getValue() as string}</span>
        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-primary-dark text-white text-[10px] p-2 rounded shadow-xl z-50 w-64 whitespace-normal leading-relaxed">
          {getValue() as string}
        </div>
      </div>
    ),
  },
];

export default function AuditTrailPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Trail"
        subtitle="Immutable log of all system events and user actions."
        actions={
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-100 rounded-lg font-medium text-sm hover:bg-neutral-50 transition-colors">
            <Download size={18} />
            Export Audit Log
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="relative md:col-span-2">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-700/40" />
          <input
            type="text"
            placeholder="Search logs by user, entity, or details..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <select className="px-4 py-2.5 bg-white border border-neutral-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="">All Actions</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
          <option value="LOGIN">LOGIN</option>
        </select>
        <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-neutral-100 rounded-xl text-sm font-bold hover:bg-neutral-50 transition-colors">
          <Filter size={18} />
          More Filters
        </button>
      </div>

      <DataTable columns={auditColumns} data={MOCK_AUDIT_LOGS} />
    </div>
  );
}
