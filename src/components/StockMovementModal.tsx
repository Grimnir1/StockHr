import React from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  increment, 
  getDocs, 
  query, 
  orderBy,
} from 'firebase/firestore';
import { useAuthStore } from '../stores/auth.store';
import { Modal } from './ui/Modal';
import { Product } from '../types';
import { toast } from 'react-hot-toast';
import { Search } from 'lucide-react';

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'in' | 'out';
}

export const StockMovementModal: React.FC<StockMovementModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'in',
}) => {
  const { user } = useAuthStore();
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');

  const [formData, setFormData] = React.useState({
    product_id: '',
    type: defaultType,
    quantity: 1,
    reference_number: '',
    notes: '',
  });

  React.useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({ ...prev, type: defaultType }));
      fetchProducts();
    }
  }, [isOpen, defaultType]);

  const fetchProducts = async () => {
    try {
      const q = query(collection(db, 'products'), orderBy('name', 'asc'));
      const snapshot = await getDocs(q);
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any as Product)));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'products');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_id || formData.quantity <= 0) {
      toast.error('Please select a product and enter a valid quantity');
      return;
    }

    const selectedProduct = products.find(p => p.id === formData.product_id);
    if (!selectedProduct) return;

    if (formData.type === 'out' && selectedProduct.current_stock < formData.quantity) {
      toast.error('Insufficient stock for this operation');
      return;
    }

    setSubmitting(true);
    try {
      const movementData = {
        product_id: formData.product_id,
        product_name: selectedProduct.name,
        type: formData.type,
        quantity: Number(formData.quantity),
        reference_number: formData.reference_number,
        notes: formData.notes,
        movement_date: new Date().toISOString(),
        performed_by_id: user?.id,
        performed_by_name: user?.name || 'Unknown User',
        created_at: new Date().toISOString(),
      };

      // 1. Record the movement
      await addDoc(collection(db, 'movements'), movementData);

      // 2. Update product stock
      const productRef = doc(db, 'products', formData.product_id);
      const qty = Number(formData.quantity);
      await updateDoc(productRef, {
        current_stock: increment(formData.type === 'in' ? qty : -qty),
        updated_at: new Date().toISOString(),
      });

      // 3. Create audit log
      await addDoc(collection(db, 'audit_logs'), {
        user_id: user?.id,
        user_name: user?.name,
        action: 'CREATE',
        entity_type: 'StockMovement',
        entity_id: formData.product_id,
        details: `Recorded stock ${formData.type}: ${formData.quantity} ${selectedProduct.unit_of_measure} for ${selectedProduct.name}`,
        created_at: new Date().toISOString(),
      });

      toast.success(`Stock ${formData.type === 'in' ? 'received' : 'issued'} successfully`);
      onClose();
      setFormData({
        product_id: '',
        type: defaultType,
        quantity: 1,
        reference_number: '',
        notes: '',
      });
    } catch (error) {
      console.error('Error recording movement:', error);
      toast.error('Failed to record stock movement');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={formData.type === 'in' ? 'Record Stock In (Receive)' : 'Record Stock Out (Issue)'}
      size="md"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || loading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-all flex items-center gap-2 ${
              formData.type === 'in' ? 'bg-success hover:bg-success/90' : 'bg-danger hover:bg-danger/90'
            }`}
          >
            {submitting ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : null}
            {formData.type === 'in' ? 'Confirm Receipt' : 'Confirm Issue'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Select Product</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-700/40" />
            <input
              type="text"
              placeholder="Search product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm mb-2"
            />
          </div>
          <select
            required
            value={formData.product_id}
            onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
            className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm"
          >
            <option value="">-- Choose a product --</option>
            {filteredProducts.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku}) - Stock: {p.current_stock}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Quantity</label>
            <input
              required
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Reference #</label>
            <input
              type="text"
              placeholder="PO-12345"
              value={formData.reference_number}
              onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-700/60 uppercase tracking-widest">Notes</label>
          <textarea
            placeholder="Reason for movement..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm min-h-[80px]"
          />
        </div>
      </form>
    </Modal>
  );
};
