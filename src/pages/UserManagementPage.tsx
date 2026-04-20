import React from 'react';
import { UserPlus, Search, Edit, Shield, Trash2, CheckCircle, XCircle, Database, RotateCcw } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable } from '../components/ui/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { User } from '../types';
import { formatDate, cn } from '../lib/utils';
import { Modal } from '../components/ui/Modal';
import { db, auth } from '../firebase';
import { collection, query, onSnapshot, doc, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../stores/auth.store';
import { logAuditEvent } from '../lib/audit';

export default function UserManagementPage() {
  const currentUser = useAuthStore((state) => state.user);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingUser, setEditingUser] = React.useState<User | null>(null);
  const [confirmModal, setConfirmModal] = React.useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      await logAuditEvent({
        userId: currentUser?.id,
        action: 'UPDATE',
        entityType: 'UserRole',
        entityId: userId,
        details: `Updated role to ${newRole}`,
      });
      toast.success(`Role updated to ${newRole}`);
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteDoc(doc(db, 'users', userId));
      await logAuditEvent({
        userId: currentUser?.id,
        action: 'DELETE',
        entityType: 'User',
        entityId: userId,
        details: 'Deleted user account',
      });
      toast.success('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !editingUser.name || !editingUser.email) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      const userRef = doc(db, 'users', editingUser.id);
      await updateDoc(userRef, {
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role,
        status: editingUser.status,
        updated_at: new Date().toISOString()
      });
      await logAuditEvent({
        userId: currentUser?.id,
        action: 'UPDATE',
        entityType: 'User',
        entityId: editingUser.id,
        details: `Updated user ${editingUser.name}`,
      });
      toast.success('User updated successfully');
      setIsEditModalOpen(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { 
        password: 'password',
        updated_at: new Date().toISOString()
      });
      await logAuditEvent({
        userId: currentUser?.id,
        action: 'UPDATE',
        entityType: 'UserCredential',
        entityId: userId,
        details: 'Reset user password in Firestore to default value',
      });
      toast.success('Password reset to "password" in database');
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Failed to reset password');
    }
  };

  const handleBootstrap = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Bootstrap Database',
      message: 'This will populate the database with sample categories, suppliers, products, and users. Continue?',
      onConfirm: async () => {
        const batch = writeBatch(db);
        
        // 1. Categories
        const categories = [
          { id: 'cat_1', name: 'Electronics', description: 'Gadgets and devices', color: '#2563EB', product_count: 5 },
          { id: 'cat_2', name: 'Furniture', description: 'Office and home furniture', color: '#16A34A', product_count: 3 },
          { id: 'cat_3', name: 'Stationery', description: 'Office supplies', color: '#D97706', product_count: 2 },
        ];
        categories.forEach(c => batch.set(doc(db, 'categories', c.id), { ...c, created_at: new Date().toISOString() }));

        // 2. Suppliers
        const suppliers = [
          { id: 'sup_1', name: 'TechCorp Solutions', contact_person: 'Alice Smith', email: 'alice@techcorp.com', phone: '+123456789', address: '123 Tech Lane' },
          { id: 'sup_2', name: 'Modern Living', contact_person: 'Bob Jones', email: 'bob@modernliving.com', phone: '+987654321', address: '456 Design St' },
        ];
        suppliers.forEach(s => batch.set(doc(db, 'suppliers', s.id), { ...s, created_at: new Date().toISOString() }));

        // 3. Products
        const products = [
          { id: 'prod_1', sku: 'LAP-001', name: 'MacBook Pro 14"', category_id: 'cat_1', category_name: 'Electronics', supplier_id: 'sup_1', supplier_name: 'TechCorp Solutions', current_stock: 15, reorder_point: 5, unit_price: 1999, unit_of_measure: 'units', velocity: 'fast', storage_location: 'A-101', status: 'active' },
          { id: 'prod_2', sku: 'CHR-002', name: 'Ergonomic Office Chair', category_id: 'cat_2', category_name: 'Furniture', supplier_id: 'sup_2', supplier_name: 'Modern Living', current_stock: 8, reorder_point: 10, unit_price: 299, unit_of_measure: 'units', velocity: 'moderate', storage_location: 'B-202', status: 'active' },
          { id: 'prod_3', sku: 'PEN-003', name: 'Premium Ink Pen', category_id: 'cat_3', category_name: 'Stationery', supplier_id: 'sup_2', supplier_name: 'Modern Living', current_stock: 150, reorder_point: 50, unit_price: 5, unit_of_measure: 'units', velocity: 'slow', storage_location: 'C-303', status: 'active' },
        ];
        products.forEach(p => batch.set(doc(db, 'products', p.id), { ...p, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));

        // 4. Users (Placeholder documents)
        const demoUsers = [
          { id: 'demo_admin', name: 'Demo Admin', email: 'admin@stocksense.com', role: 'admin', status: 'active' },
          { id: 'demo_manager', name: 'Demo Manager', email: 'manager@stocksense.com', role: 'manager', status: 'active' },
          { id: 'demo_staff', name: 'Demo Staff', email: 'staff@stocksense.com', role: 'staff', status: 'active' },
        ];
        demoUsers.forEach(u => batch.set(doc(db, 'users', u.id), { ...u, created_at: new Date().toISOString() }));

        try {
          await batch.commit();
          await logAuditEvent({
            userId: currentUser?.id,
            action: 'CREATE',
            entityType: 'SystemBootstrap',
            entityId: 'bootstrap',
            details: 'Bootstrapped demo categories, suppliers, products, and users',
          });
          toast.success('Database bootstrapped successfully!');
        } catch (error) {
          console.error('Error bootstrapping:', error);
          toast.error('Failed to bootstrap database');
        }
      }
    });
  };

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
      cell: ({ row }) => (
        <span className={cn(
          'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border inline-block',
          row.original.role === 'admin' ? 'text-primary border-primary/20 bg-primary/5' : 
          row.original.role === 'manager' ? 'text-success border-success/20 bg-success/5' : 
          'text-neutral-700/60 border-neutral-200 bg-neutral-50'
        )}>
          {row.original.role}
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
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              setEditingUser(row.original);
              setIsEditModalOpen(true);
            }}
            className="p-1.5 hover:bg-primary/10 rounded text-primary transition-colors"
            title="Edit User"
          >
            <Edit size={14} />
          </button>
          <button 
            onClick={() => {
              setConfirmModal({
                isOpen: true,
                title: 'Reset Password',
                message: `Are you sure you want to reset the password for ${row.original.name} to "password"?`,
                onConfirm: () => handleResetPassword(row.original.id)
              });
            }}
            className="p-1.5 hover:bg-warning/10 rounded text-warning transition-colors"
            title="Reset Password"
          >
            <RotateCcw size={14} />
          </button>
          <button 
            onClick={() => {
              setConfirmModal({
                isOpen: true,
                title: 'Delete User',
                message: `Are you sure you want to delete user ${row.original.name}? This action cannot be undone.`,
                onConfirm: () => handleDeleteUser(row.original.id)
              });
            }}
            className="p-1.5 hover:bg-danger/10 rounded text-danger transition-colors"
            title="Delete User"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const [newUser, setNewUser] = React.useState({ name: '', email: '', role: 'staff', password: '' });

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      // Note: We create a document with a random ID. 
      // The user will still need to sign up with this email to link their Auth account.
      const userRef = doc(collection(db, 'users'));
      const { password, ...userData } = newUser;
      await setDoc(userRef, {
        ...userData,
        id: userRef.id,
        status: 'active',
        created_at: new Date().toISOString()
      });
      await logAuditEvent({
        userId: currentUser?.id,
        action: 'CREATE',
        entityType: 'User',
        entityId: userRef.id,
        details: `Created user document for ${newUser.email}`,
      });
      toast.success('User document created. They can now sign up with this email.');
      setIsAddModalOpen(false);
      setNewUser({ name: '', email: '', role: 'staff', password: '' });
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Failed to create user');
    }
  };

  React.useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any as User)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Manage system users, roles, and access permissions."
        actions={
          <div className="flex gap-2">
            <button
              onClick={handleBootstrap}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-100 text-neutral-700 rounded-lg font-medium text-sm hover:bg-neutral-50 transition-all"
            >
              <Database size={18} />
              Bootstrap Data
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-all"
            >
              <UserPlus size={18} />
              Add User
            </button>
          </div>
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

      <DataTable columns={userColumns} data={users} />

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New User"
        footer={
          <>
            <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded-md">Cancel</button>
            <button onClick={handleCreateUser} className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md">Create User</button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Full Name</label>
            <input 
              type="text" 
              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm" 
              placeholder="John Doe" 
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Email Address</label>
            <input 
              type="email" 
              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm" 
              placeholder="john@example.com" 
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Role</label>
            <select 
              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm"
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            >
              <option value="staff">Regular Staff</option>
              <option value="manager">Store Manager</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Password</label>
            <input 
              type="password" 
              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm" 
              placeholder="••••••••" 
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit User"
        footer={
          <>
            <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded-md">Cancel</button>
            <button onClick={handleUpdateUser} className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md">Update User</button>
          </>
        }
      >
        {editingUser && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Full Name</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm" 
                placeholder="John Doe" 
                value={editingUser.name}
                onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Email Address</label>
              <input 
                type="email" 
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm" 
                placeholder="john@example.com" 
                value={editingUser.email}
                onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Role</label>
              <select 
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm"
                value={editingUser.role}
                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as 'admin' | 'manager' | 'staff' })}
              >
                <option value="staff">Regular Staff</option>
                <option value="manager">Store Manager</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Status</label>
              <select 
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm"
                value={editingUser.status}
                onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as 'active' | 'inactive' })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        )}
      </Modal>
      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        title={confirmModal.title}
        footer={
          <>
            <button 
              onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} 
              className="px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded-md"
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                confirmModal.onConfirm();
                setConfirmModal({ ...confirmModal, isOpen: false });
              }} 
              className={cn(
                "px-4 py-2 text-sm font-medium text-white rounded-md",
                confirmModal.title === 'Delete User' ? "bg-danger hover:bg-danger/90" : "bg-primary hover:bg-primary/90"
              )}
            >
              Confirm
            </button>
          </>
        }
      >
        <p className="text-sm text-neutral-700">{confirmModal.message}</p>
      </Modal>
    </div>
  );
}
