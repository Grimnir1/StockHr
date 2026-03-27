import React from 'react';
import { Tags, Search, Plus, Edit, Trash2, Package } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable } from '../components/ui/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Category } from '../types';
import { db } from '../firebase';
import { collection, query, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { Modal } from '../components/ui/Modal';
import { toast } from 'react-hot-toast';

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
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: '',
    description: '',
    color: '#2563EB',
  });

  React.useEffect(() => {
    const q = query(collection(db, 'categories'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any as Category)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const categoryRef = doc(collection(db, 'categories'));
      await setDoc(categoryRef, {
        ...formData,
        id: categoryRef.id,
        product_count: 0,
        created_at: new Date().toISOString(),
      });
      toast.success('Category added successfully!');
      setIsAddModalOpen(false);
      setFormData({ name: '', description: '', color: '#2563EB' });
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Category Management"
        subtitle="Organize your products into logical groups for better tracking."
        actions={
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-all"
          >
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

      <DataTable columns={categoryColumns} data={categories} />

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Category"
        footer={
          <>
            <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded-md">Cancel</button>
            <button 
              form="add-category-form"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add Category'}
            </button>
          </>
        }
      >
        <form id="add-category-form" onSubmit={handleAddCategory} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Category Name</label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm" 
              placeholder="Electronics" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Description</label>
            <textarea 
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm min-h-[80px]" 
              placeholder="Electronic components and parts..." 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Color Code</label>
            <div className="flex gap-2">
              <input 
                type="color" 
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-10 h-10 p-0 border-none bg-transparent cursor-pointer" 
              />
              <input 
                type="text" 
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="flex-1 px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm font-mono" 
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
