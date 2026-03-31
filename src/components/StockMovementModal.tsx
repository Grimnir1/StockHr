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
  runTransaction,
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
  const [showProductResults, setShowProductResults] = React.useState(false);

  const [formData, setFormData] = React.useState({
    product_id: '',
    type: defaultType,
    quantity: 1,
    notes: '',
  });

  React.useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setSearchTerm('');
      setShowProductResults(false);
      setFormData(prev => ({ ...prev, type: defaultType }));
      fetchProducts();
    }
  }, [isOpen, defaultType]);

  const buildReferenceNumber = (type: 'in' | 'out', sequence: number) => {
    const prefix = type === 'in' ? 'PI' : 'PO';
    return `${prefix}-${String(sequence).padStart(7, '0')}`;
  };

  const getNextReferenceNumber = async (type: 'in' | 'out') => {
    const countersRef = doc(db, 'system', 'reference_counters');
    const sequence = await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(countersRef);
      const currentData = snapshot.data() || {};
      const fieldName = type === 'in' ? 'stock_in' : 'stock_out';
      const currentValue = Number(currentData[fieldName] || 0);
      const nextValue = currentValue + 1;

      transaction.set(
        countersRef,
        {
          [fieldName]: nextValue,
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      );

      return nextValue;
    });

    return buildReferenceNumber(type, sequence);
  };

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
      const generatedReferenceNumber = await getNextReferenceNumber(formData.type);

      const movementData = {
        product_id: formData.product_id,
        product_name: selectedProduct.name,
        type: formData.type,
        quantity: Number(formData.quantity),
        reference_number: generatedReferenceNumber,
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
        notes: '',
      });
      setSearchTerm('');
      setShowProductResults(false);
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

  const selectedProduct = products.find(p => p.id === formData.product_id) || null;

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
              required
              type="text"
              placeholder="Search and select product..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setFormData((prev) => ({ ...prev, product_id: '' }));
                setShowProductResults(true);
              }}
              onFocus={() => setShowProductResults(true)}
              className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm"
            />
            {showProductResults && (
              <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-neutral-100 rounded-lg shadow-lg">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, product_id: p.id }));
                        setSearchTerm(`${p.name} (${p.sku})`);
                        setShowProductResults(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-neutral-50 transition-colors"
                    >
                      <p className="text-sm font-medium text-neutral-800">{p.name}</p>
                      <p className="text-xs text-neutral-700/50">{p.sku} • Stock: {p.current_stock}</p>
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-2 text-xs text-neutral-700/50">No products match your search.</p>
                )}
              </div>
            )}
          </div>
          {selectedProduct && (
            <p className="text-xs text-neutral-700/60">
              Selected: <span className="font-semibold">{selectedProduct.name}</span> ({selectedProduct.sku}) • Current stock: {selectedProduct.current_stock}
            </p>
          )}
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
              value={formData.type === 'in' ? 'PI-0000001, PI-0000002, ...' : 'PO-0000001, PO-0000002, ...'}
              readOnly
              className="w-full px-4 py-2 bg-neutral-100 border border-neutral-100 rounded-lg text-sm text-neutral-700/70"
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
