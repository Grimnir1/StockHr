import React from 'react';
import { Truck, Search, Plus, Edit, Trash2, Phone, Mail, MapPin } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable } from '../components/ui/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Supplier } from '../types';
import { db } from '../firebase';
import { collection, query, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { Modal } from '../components/ui/Modal';
import { toast } from 'react-hot-toast';

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
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
  });

  React.useEffect(() => {
    const q = query(collection(db, 'suppliers'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any as Supplier)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const supplierRef = doc(collection(db, 'suppliers'));
      await setDoc(supplierRef, {
        ...formData,
        id: supplierRef.id,
        created_at: new Date().toISOString(),
      });
      toast.success('Supplier added successfully!');
      setIsAddModalOpen(false);
      setFormData({ name: '', contact_person: '', email: '', phone: '', address: '' });
    } catch (error) {
      console.error('Error adding supplier:', error);
      toast.error('Failed to add supplier');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Management"
        subtitle="Maintain your network of parts and material providers."
        actions={
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-all"
          >
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

      <DataTable columns={supplierColumns} data={suppliers} />

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Supplier"
        footer={
          <>
            <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded-md">Cancel</button>
            <button 
              form="add-supplier-form"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add Supplier'}
            </button>
          </>
        }
      >
        <form id="add-supplier-form" onSubmit={handleAddSupplier} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Company Name</label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm" 
              placeholder="Industrial Supplies Ltd" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Contact Person</label>
            <input 
              required
              type="text" 
              value={formData.contact_person}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm" 
              placeholder="Jane Smith" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Email</label>
              <input 
                required
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm" 
                placeholder="jane@supplies.com" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Phone</label>
              <input 
                required
                type="tel" 
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm" 
                placeholder="+1 234 567 890" 
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Address</label>
            <textarea 
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm min-h-[80px]" 
              placeholder="123 Supply Road, Logistics City..." 
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
