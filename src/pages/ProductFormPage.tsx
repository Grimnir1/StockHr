import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Save, Info } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { FormField } from '../components/ui/FormField';
import { toast } from 'react-hot-toast';
import { db } from '../firebase';
import { collection, doc, getDoc, setDoc, onSnapshot, runTransaction } from 'firebase/firestore';
import { Category, Supplier } from '../types';

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU is required'),
  description: z.string().optional(),
  category_id: z.string().min(1, 'Category is required'),
  supplier_id: z.string().min(1, 'Supplier is required'),
  unit_of_measure: z.string().min(1, 'Unit of measure is required'),
  unit_price: z.number().min(0, 'Price must be non-negative'),
  storage_location: z.string().optional(),
  initial_stock: z.number().min(0).optional(),
  reorder_point: z.number().min(0),
  lead_time_days: z.number().int().positive('Lead time must be a positive integer'),
  safety_stock: z.number().int().positive('Safety stock must be a positive integer'),
  cost_per_order: z.number().min(0).optional(),
  holding_cost: z.number().min(0).optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function ProductFormPage({ id }: { id?: string }) {
  const isEdit = !!id;
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGeneratingSku, setIsGeneratingSku] = React.useState(false);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [fetchingData, setFetchingData] = React.useState(isEdit);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      unit_price: 0,
      reorder_point: 0,
      lead_time_days: 7,
      safety_stock: 10,
    },
  });

  const formatSku = React.useCallback((value: number) => {
    return `SKU-${String(value).padStart(6, '0')}`;
  }, []);

  const getSkuSequencePreview = React.useCallback(async () => {
    const counterRef = doc(db, 'system', 'sku_counter');
    const snap = await getDoc(counterRef);
    const current = Number(snap.data()?.last_sku_number || 0);
    return current + 1;
  }, []);

  const reserveNextSkuSequence = React.useCallback(async () => {
    const counterRef = doc(db, 'system', 'sku_counter');
    return runTransaction(db, async (transaction) => {
      const snap = await transaction.get(counterRef);
      const current = Number(snap.data()?.last_sku_number || 0);
      const next = current + 1;

      transaction.set(
        counterRef,
        {
          last_sku_number: next,
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      );

      return next;
    });
  }, []);

  React.useEffect(() => {
    // Fetch categories and suppliers
    const unsubCats = onSnapshot(collection(db, 'categories'), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any as Category)));
    });
    const unsubSups = onSnapshot(collection(db, 'suppliers'), (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any as Supplier)));
    });

    if (isEdit && id) {
      const fetchProduct = async () => {
        try {
          const docSnap = await getDoc(doc(db, 'products', id));
          if (docSnap.exists()) {
            const data = docSnap.data();
            reset({
              ...data,
              initial_stock: data.current_stock, // For display if needed, though hidden in edit
            } as any);
          } else {
            toast.error('Product not found');
            window.location.href = '/products';
          }
        } catch (error) {
          console.error('Error fetching product:', error);
          toast.error('Failed to load product');
        } finally {
          setFetchingData(false);
        }
      };
      fetchProduct();
    } else {
      const prepareSku = async () => {
        setIsGeneratingSku(true);
        try {
          const previewSequence = await getSkuSequencePreview();
          setValue('sku', formatSku(previewSequence));
        } catch (error) {
          console.error('Error generating SKU preview:', error);
          toast.error('Failed to generate SKU');
        } finally {
          setIsGeneratingSku(false);
        }
      };
      prepareSku();
    }

    return () => {
      unsubCats();
      unsubSups();
    };
  }, [formatSku, getSkuSequencePreview, id, isEdit, reset, setValue]);

  const onSubmit = async (data: ProductFormValues) => {
    setIsLoading(true);
    try {
      const selectedCategory = categories.find(c => c.id === data.category_id);

      const productData = {
        ...data,
        category_name: selectedCategory?.name || '',
        updated_at: new Date().toISOString(),
        // DSS calculations (simplified for now)
        adu: 0, 
        velocity: 'moderate',
        eoq: Math.sqrt((2 * (data.initial_stock || 0) * (data.cost_per_order || 500)) / (data.holding_cost || 50)) || 0,
      };

      if (isEdit && id) {
        await setDoc(doc(db, 'products', id), productData, { merge: true });
        toast.success('Product updated successfully');
      } else {
        const nextSkuSequence = await reserveNextSkuSequence();
        const generatedSku = formatSku(nextSkuSequence);
        const productRef = doc(collection(db, 'products'));
        const newProduct = {
          ...productData,
          sku: generatedSku,
          id: productRef.id,
          status: 'active',
          current_stock: data.initial_stock || 0,
          created_at: new Date().toISOString(),
        };
        delete (newProduct as any).initial_stock;
        await setDoc(productRef, newProduct);
        toast.success('Product created successfully');
      }
      window.location.href = '/products';
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product');
    } finally {
      setIsLoading(false);
    }
  };

  if (fetchingData) return <div className="p-8 text-center">Loading product data...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => window.history.back()} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-neutral-700/40 uppercase tracking-widest">Products</span>
          <span className="text-neutral-700/20">/</span>
          <span className="text-xs font-bold text-primary uppercase tracking-widest">
            {isEdit ? 'Edit Product' : 'Add New Product'}
          </span>
        </div>
      </div>

      <PageHeader title={isEdit ? 'Edit Product' : 'Add New Product'} subtitle={isEdit ? 'Update existing product details.' : 'Create a new item in your inventory.'} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-20">
        {/* Section A: Basic Info */}
        <div className="card">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-700/60 mb-6">Section A: Basic Info</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <FormField label="Product Name" name="name" error={errors.name?.message} required>
              <input
                {...register('name')}
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. Industrial Widget A"
              />
            </FormField>
            <FormField label="SKU" name="sku" error={errors.sku?.message} required>
              <input
                {...register('sku')}
                readOnly={!isEdit}
                disabled={isGeneratingSku}
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                placeholder={isGeneratingSku ? 'Generating SKU...' : 'SKU-000001'}
              />
            </FormField>
            <FormField label="Category" name="category_id" error={errors.category_id?.message} required className="md:col-span-1">
              <select
                {...register('category_id')}
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select Category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Supplier" name="supplier_id" error={errors.supplier_id?.message} required className="md:col-span-1">
              <select
                {...register('supplier_id')}
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select Supplier</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Description" name="description" error={errors.description?.message} className="md:col-span-2">
              <textarea
                {...register('description')}
                rows={3}
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                placeholder="Describe the product..."
              />
            </FormField>
          </div>
        </div>

        {/* Section B: Stock Config */}
        <div className="card">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-700/60 mb-6">Section B: Stock Config</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <FormField label="Unit of Measure" name="unit_of_measure" error={errors.unit_of_measure?.message} required>
              <input
                {...register('unit_of_measure')}
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. units, kg, litres"
              />
            </FormField>
            <FormField label="Unit Purchase Price" name="unit_price" error={errors.unit_price?.message} required>
              <input
                {...register('unit_price', { valueAsNumber: true })}
                type="number"
                step="0.01"
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </FormField>
            <FormField label="Storage Location" name="storage_location" error={errors.storage_location?.message}>
              <input
                {...register('storage_location')}
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. Aisle 4, Shelf B"
              />
            </FormField>
            {!isEdit && (
              <FormField label="Initial Stock Quantity" name="initial_stock" error={errors.initial_stock?.message}>
                <input
                  {...register('initial_stock', { valueAsNumber: true })}
                  type="number"
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </FormField>
            )}
            <FormField label="Minimum Stock Level / ROP" name="reorder_point" error={errors.reorder_point?.message} required>
              <input
                {...register('reorder_point', { valueAsNumber: true })}
                type="number"
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </FormField>
          </div>
        </div>

        {/* Section C: DSS Inputs */}
        <div className="card border-l-4 border-l-primary">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-700/60">Section C: DSS Inputs</h3>
            <div className="flex items-center gap-2 text-primary">
              <Info size={14} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Decision Support</span>
            </div>
          </div>
          <div className="bg-primary/5 p-4 rounded-lg mb-6 flex items-start gap-3">
            <Info size={18} className="text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-primary-dark/80 leading-relaxed">
              These fields power the Decision Support calculations (ROP, EOQ). Leave blank to use system defaults.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <FormField label="Lead Time in Days" name="lead_time_days" error={errors.lead_time_days?.message}>
              <input
                {...register('lead_time_days', { valueAsNumber: true })}
                type="number"
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </FormField>
            <FormField label="Safety Stock Quantity" name="safety_stock" error={errors.safety_stock?.message}>
              <input
                {...register('safety_stock', { valueAsNumber: true })}
                type="number"
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </FormField>
            <FormField label="Cost Per Order" name="cost_per_order" error={errors.cost_per_order?.message}>
              <input
                {...register('cost_per_order', { valueAsNumber: true })}
                type="number"
                step="0.01"
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </FormField>
            <FormField label="Annual Holding Cost Per Unit" name="holding_cost" error={errors.holding_cost?.message}>
              <input
                {...register('holding_cost', { valueAsNumber: true })}
                type="number"
                step="0.01"
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </FormField>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-100 p-4 z-40 md:left-[240px]">
          <div className="max-w-4xl mx-auto flex justify-end gap-3">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-6 py-2.5 text-sm font-bold text-neutral-700 hover:bg-neutral-50 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-2.5 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2"
            >
              {isLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
              {isEdit ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
