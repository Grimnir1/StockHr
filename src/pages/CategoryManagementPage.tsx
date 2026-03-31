import React from 'react';
import { Search, Plus, Edit, Trash2, Package } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable } from '../components/ui/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Category, Product } from '../types';
import { db } from '../firebase';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Modal, ConfirmModal } from '../components/ui/Modal';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../stores/auth.store';
import { logAuditEvent } from '../lib/audit';

function hslToHex(h: number, s: number, l: number) {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
  } else if (h >= 120 && h < 180) {
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const toHex = (value: number) => Math.round((value + m) * 255).toString(16).padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function generateCategoryColor(name: string) {
  const normalized = name.trim().toLowerCase();
  let hash = 0;

  for (let i = 0; i < normalized.length; i += 1) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  return hslToHex(hue, 68, 48);
}

export default function CategoryManagementPage() {
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = React.useState('');
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [productCountByCategory, setProductCountByCategory] = React.useState<Record<string, number>>({});
  const [loadingCategories, setLoadingCategories] = React.useState(true);
  const [loadingProducts, setLoadingProducts] = React.useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = React.useState<Category | null>(null);
  const [formData, setFormData] = React.useState({
    name: '',
    description: '',
  });
  const [editFormData, setEditFormData] = React.useState({
    name: '',
    description: '',
  });

  React.useEffect(() => {
    const categoriesQuery = query(collection(db, 'categories'));
    const productsQuery = query(collection(db, 'products'));

    const unsubCategories = onSnapshot(categoriesQuery, (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any as Category)));
      setLoadingCategories(false);
    });

    const unsubProducts = onSnapshot(productsQuery, (snapshot) => {
      const counts = snapshot.docs.reduce((acc, productDoc) => {
        const product = productDoc.data() as Product;
        const categoryId = product.category_id;
        if (!categoryId) return acc;
        acc[categoryId] = (acc[categoryId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      setProductCountByCategory(counts);
      setLoadingProducts(false);
    });

    return () => {
      unsubCategories();
      unsubProducts();
    };
  }, []);

  const loading = loadingCategories || loadingProducts;

  const categoriesWithCounts = React.useMemo(() => {
    return categories.map((category) => ({
      ...category,
      color: category.color || generateCategoryColor(category.name || ''),
      product_count: productCountByCategory[category.id] || 0,
    }));
  }, [categories, productCountByCategory]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const categoryRef = doc(collection(db, 'categories'));
      const generatedColor = generateCategoryColor(formData.name);
      await setDoc(categoryRef, {
        ...formData,
        color: generatedColor,
        id: categoryRef.id,
        product_count: 0,
        created_at: new Date().toISOString(),
      });
      await logAuditEvent({
        userId: user?.id,
        action: 'CREATE',
        entityType: 'Category',
        entityId: categoryRef.id,
        details: `Created category ${formData.name}`,
      });
      toast.success('Category added successfully!');
      setIsAddModalOpen(false);
      setFormData({ name: '', description: '' });
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setEditFormData({
      name: category.name || '',
      description: category.description || '',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    setIsSubmitting(true);
    try {
      const generatedColor = generateCategoryColor(editFormData.name);
      await setDoc(doc(db, 'categories', editingCategory.id), {
        ...editingCategory,
        ...editFormData,
        color: generatedColor,
        updated_at: new Date().toISOString(),
      }, { merge: true });
      await logAuditEvent({
        userId: user?.id,
        action: 'UPDATE',
        entityType: 'Category',
        entityId: editingCategory.id,
        details: `Updated category ${editFormData.name}`,
      });
      toast.success('Category updated successfully!');
      setIsEditModalOpen(false);
      setEditingCategory(null);
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Failed to update category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteModal = (category: Category) => {
    setCategoryToDelete(category);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    const categoryProductCount = productCountByCategory[categoryToDelete.id] || 0;
    if (categoryProductCount > 0) {
      toast.error('Cannot delete category with assigned products');
      setIsDeleteModalOpen(false);
      return;
    }

    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'categories', categoryToDelete.id));
      await logAuditEvent({
        userId: user?.id,
        action: 'DELETE',
        entityType: 'Category',
        entityId: categoryToDelete.id,
        details: `Deleted category ${categoryToDelete.name}`,
      });
      toast.success('Category deleted successfully!');
      setIsDeleteModalOpen(false);
      setCategoryToDelete(null);
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    } finally {
      setIsDeleting(false);
    }
  };

  const categoryColumns = React.useMemo<ColumnDef<Category>[]>(() => [
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
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openEditModal(row.original)}
            className="p-1.5 hover:bg-neutral-100 rounded text-primary transition-colors"
            title="Edit category"
          >
            <Edit size={14} />
          </button>
          <button
            type="button"
            onClick={() => openDeleteModal(row.original)}
            className="p-1.5 hover:bg-danger/10 rounded text-danger transition-colors"
            title="Delete category"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ], [productCountByCategory]);

  const filteredCategories = React.useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    if (!searchTerm) return categoriesWithCounts;

    return categoriesWithCounts.filter((category) => {
      const name = (category.name || '').toLowerCase();
      const description = (category.description || '').toLowerCase();
      return name.includes(searchTerm) || description.includes(searchTerm);
    });
  }, [categoriesWithCounts, search]);

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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      </div>

      <DataTable columns={categoryColumns} data={filteredCategories} isLoading={loading} />

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingCategory(null);
        }}
        title="Edit Category"
        footer={
          <>
            <button
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingCategory(null);
              }}
              className="px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded-md"
            >
              Cancel
            </button>
            <button
              form="edit-category-form"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <form id="edit-category-form" onSubmit={handleUpdateCategory} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Category Name</label>
            <input
              required
              type="text"
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm"
              placeholder="Electronics"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Description</label>
            <textarea
              value={editFormData.description}
              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm min-h-[80px]"
              placeholder="Electronic components and parts..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Category Color</label>
            <div className="flex items-center gap-3 px-3 py-2 bg-neutral-50 border border-neutral-100 rounded-lg">
              <span
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: generateCategoryColor(editFormData.name || editingCategory?.name || '') }}
              />
              <span className="text-xs text-neutral-700/60">Auto-generated from category name</span>
            </div>
          </div>
        </form>
      </Modal>

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
            <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Category Color</label>
            <div className="flex items-center gap-3 px-3 py-2 bg-neutral-50 border border-neutral-100 rounded-lg">
              <span
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: generateCategoryColor(formData.name) }}
              />
              <span className="text-xs text-neutral-700/60">Auto-generated from category name</span>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete Category"
        message={
          categoryToDelete
            ? `Delete ${categoryToDelete.name}? Categories with assigned products cannot be deleted.`
            : 'Delete this category?'
        }
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Category'}
        confirmVariant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteCategory}
        onCancel={() => {
          if (isDeleting) return;
          setIsDeleteModalOpen(false);
          setCategoryToDelete(null);
        }}
      />
    </div>
  );
}
