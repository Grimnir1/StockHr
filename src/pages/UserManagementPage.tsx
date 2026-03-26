import React from 'react';
import { UserPlus, Search, Edit, Shield, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable } from '../components/ui/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { User } from '../types';
import { formatDate, cn } from '../lib/utils';
import { Modal } from '../components/ui/Modal';
import { MOCK_USERS } from '../lib/mockData';

const userColumns: ColumnDef<User>[] = [
  {
    header: 'Name',
    accessorKey: 'name',
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
          {row.original.name.charAt(0)}
        </div>
        <span className="font-medium">{row.original.name}</span>
      </div>
    ),
  },
  {
    header: 'Email',
    accessorKey: 'email',
  },
  {
    header: 'Role',
    accessorKey: 'role',
    cell: ({ getValue }) => (
      <span className={cn(
        'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border',
        getValue() === 'admin' ? 'bg-primary/10 text-primary border-primary/20' : 
        getValue() === 'manager' ? 'bg-success/10 text-success border-success/20' : 
        'bg-neutral-100 text-neutral-700/60 border-neutral-200'
      )}>
        {getValue() as string}
      </span>
    ),
  },
  {
    header: 'Status',
    accessorKey: 'status',
    cell: ({ getValue }) => (
      <div className="flex items-center gap-1.5">
        {getValue() === 'active' ? (
          <CheckCircle size={14} className="text-success" />
        ) : (
          <XCircle size={14} className="text-danger" />
        )}
        <span className={cn('text-xs font-medium', getValue() === 'active' ? 'text-success' : 'text-danger')}>
          {getValue() === 'active' ? 'Active' : 'Inactive'}
        </span>
      </div>
    ),
  },
  {
    header: 'Last Login',
    accessorKey: 'last_login_at',
    cell: ({ getValue }) => getValue() ? formatDate(getValue() as string) : 'Never',
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

export default function UserManagementPage() {
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Manage system users, roles, and access permissions."
        actions={
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-all"
          >
            <UserPlus size={18} />
            Add User
          </button>
        }
      />

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-700/40" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      </div>

      <DataTable columns={userColumns} data={MOCK_USERS} />

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New User"
        footer={
          <>
            <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded-md">Cancel</button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md">Create User</button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Full Name</label>
            <input type="text" className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm" placeholder="John Doe" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Email Address</label>
            <input type="email" className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm" placeholder="john@example.com" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Role</label>
            <select className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm">
              <option value="staff">Regular Staff</option>
              <option value="manager">Store Manager</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Password</label>
            <input type="password" className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm" placeholder="••••••••" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
