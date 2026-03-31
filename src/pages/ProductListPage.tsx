import React from 'react';
import { Plus, Search, Filter, Download } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable } from '../components/ui/DataTable';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ColumnDef } from '@tanstack/react-table';
import { Product, Category } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { RoleGuard } from '../components/ui/RoleGuard';
import { Modal } from '../components/ui/Modal';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { addDoc, collection, query, onSnapshot, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../stores/auth.store';
import { logAuditEvent } from '../lib/audit';

const getProductColumns = (categories: Category[]): ColumnDef<Product>[] => [
  {
    header: 'SKU',
    accessorKey: 'sku',
    cell: ({ getValue }) => <span className="font-mono text-xs">{getValue() as string}</span>,
  },
  {
    header: 'Product Name',
    accessorKey: 'name',
    cell: ({ row }) => (
      <a 
        href={`/products/${row.original.id}`}
        onClick={(e) => e.stopPropagation()}
        className="block max-w-[200px] group"
      >
        <p className="font-medium truncate group-hover:text-primary transition-colors">{row.original.name}</p>
        <p className="text-[10px] text-neutral-700/40 truncate">{row.original.description}</p>
      </a>
    ),
  },
  {
    header: 'Category',
    accessorKey: 'category_id',
    cell: ({ row }) => {
      const category = categories.find(c => c.id === row.original.category_id);
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
          <a 
            href={`/products/${row.original.id}`}
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 hover:bg-neutral-100 rounded text-primary transition-colors"
            title="View Details"
          >
            <Search size={14} />
          </a>
        </div>
      </RoleGuard>
    ),
  },
];

export default function ProductListPage() {
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState('');
  const [products, setProducts] = React.useState<Product[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [suppliers, setSuppliers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form state
  const [formData, setFormData] = React.useState({
    sku: '',
    name: '',
    description: '',
    category_id: '',
    supplier_id: '',
    current_stock: 0,
    reorder_point: 0,
    unit_price: 0,
    unit_of_measure: 'units',
    velocity: 'moderate' as const,
    storage_location: '',
    lead_time_days: 7,
    cost_per_order: 50,
    holding_cost: 5,
  });

  React.useEffect(() => {
    const qProducts = query(collection(db, 'products'));
    const qCategories = query(collection(db, 'categories'));

    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any as Product)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    const unsubCategories = onSnapshot(qCategories, (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any as Category)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'categories');
    });

    const unsubSuppliers = onSnapshot(query(collection(db, 'suppliers')), (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'suppliers');
    });

    return () => {
      unsubProducts();
      unsubCategories();
      unsubSuppliers();
    };
  }, []);

  const filteredProducts = React.useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return products.filter((p) => {
      const matchesSearch = !searchTerm
        || p.name.toLowerCase().includes(searchTerm)
        || p.sku.toLowerCase().includes(searchTerm)
        || (p.description || '').toLowerCase().includes(searchTerm);

      const matchesCategory = !selectedCategory || p.category_id === selectedCategory;

      const matchesStatus = !selectedStatus || (() => {
        const currentStock = Number(p.current_stock || 0);
        const reorderPoint = Number(p.reorder_point || 0);

        if (selectedStatus === 'out-of-stock') return currentStock <= 0;
        if (selectedStatus === 'low-stock') return currentStock > 0 && currentStock <= reorderPoint;
        if (selectedStatus === 'in-stock') return currentStock > reorderPoint;
        return true;
      })();

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, search, selectedCategory, selectedStatus]);

  const columns = React.useMemo(() => getProductColumns(categories), [categories]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const selectedCategory = categories.find(c => c.id === formData.category_id);
      
      // Calculate basic DSS metrics for the new product
      const adu = 0; // Initial ADU is 0
      const rop = Number(formData.reorder_point);
      const annualDemand = 0; // Placeholder for annual demand
      const costPerOrder = Number(formData.cost_per_order) || 50;
      const holdingCost = Number(formData.holding_cost) || 5;
      
      const eoq = holdingCost > 0 ? Math.sqrt((2 * costPerOrder * annualDemand) / holdingCost) : 0;

      const productRef = doc(collection(db, 'products'));
      await setDoc(productRef, {
        ...formData,
        id: productRef.id,
        category_name: selectedCategory?.name || '',
        current_stock: Number(formData.current_stock),
        reorder_point: Number(formData.reorder_point),
        unit_price: Number(formData.unit_price),
        lead_time_days: Number(formData.lead_time_days),
        cost_per_order: costPerOrder,
        holding_cost: holdingCost,
        adu,
        rop,
        eoq,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      await logAuditEvent({
        userId: user?.id,
        action: 'CREATE',
        entityType: 'Product',
        entityId: productRef.id,
        details: `Created product ${formData.name} (${formData.sku}) from list page modal`,
      });
      toast.success('Product added successfully!');
      setIsAddModalOpen(false);
      setFormData({
        sku: '',
        name: '',
        description: '',
        category_id: '',
        supplier_id: '',
        current_stock: 0,
        reorder_point: 0,
        unit_price: 0,
        unit_of_measure: 'units',
        velocity: 'moderate',
        storage_location: '',
        lead_time_days: 7,
        cost_per_order: 50,
        holding_cost: 5,
      });
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Failed to add product');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            {/* <RoleGuard roles={['admin', 'manager']}>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-all"
              >
                <Plus size={18} />
                Add Product
              </button>
            </RoleGuard> */}
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
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2.5 bg-white border border-neutral-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2.5 bg-white border border-neutral-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All Statuses</option>
            <option value="in-stock">In Stock</option>
            <option value="low-stock">Low Stock</option>
            <option value="out-of-stock">Out of Stock</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedCategory('');
              setSelectedStatus('');
            }}
            className="p-2.5 bg-white border border-neutral-100 rounded-xl hover:bg-neutral-50 transition-colors"
            title="Clear search and filters"
          >
            <Filter size={18} />
          </button>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        isLoading={loading}
        data={filteredProducts} 
        onRowClick={(p: Product) => {
          window.history.pushState({}, '', `/products/${p.id}`);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }} 
      />

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Product"
        footer={
          <>
            <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded-md">Cancel</button>
            <button 
              form="add-product-form"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add Product'}
            </button>
          </>
        }
      >
        <form id="add-product-form" onSubmit={handleAddProduct} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">SKU</label>
              <input 
                required
                type="text" 
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm" 
                placeholder="SKU-001" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Product Name</label>
              <input 
                required
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm" 
                placeholder="Industrial Bearing" 
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Description</label>
            <textarea 
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm min-h-[80px]" 
              placeholder="High-precision steel bearing..." 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Category</label>
              <select 
                required
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm"
              >
                <option value="">Select Category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Storage Location</label>
              <input 
                required
                type="text" 
                value={formData.storage_location}
                onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm" 
                placeholder="Aisle 4, Shelf B" 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Unit Price</label>
              <input 
                required
                type="number" 
                step="0.01"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Unit of Measure</label>
              <select 
                value={formData.unit_of_measure}
                onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm"
              >
                <option value="units">Units</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="liters">Liters (L)</option>
                <option value="meters">Meters (m)</option>
                <option value="boxes">Boxes</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Current Stock</label>
              <input 
                required
                type="number" 
                value={formData.current_stock}
                onChange={(e) => setFormData({ ...formData, current_stock: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Reorder Point</label>
              <input 
                required
                type="number" 
                value={formData.reorder_point}
                onChange={(e) => setFormData({ ...formData, reorder_point: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm" 
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
