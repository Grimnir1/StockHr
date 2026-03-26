import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Modal } from './Modal';
import { MOCK_PRODUCTS } from '../../lib/mockData';
import { useAuthStore } from '../../stores/auth.store';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

const movementSchema = z.object({
  product_id: z.string().min(1, 'Please select a product'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  reference: z.string().min(1, 'Reference number is required'),
  notes: z.string().optional(),
});

type MovementFormValues = z.infer<typeof movementSchema>;

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'in' | 'out';
  onSuccess?: (movement: any) => void;
}

export const StockMovementModal: React.FC<StockMovementModalProps> = ({
  isOpen,
  onClose,
  type,
  onSuccess,
}) => {
  const user = useAuthStore((state) => state.user);
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      quantity: 1,
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      reset({
        quantity: 1,
        product_id: '',
        reference: `REF-${Math.floor(Math.random() * 10000)}`,
        notes: '',
      });
    }
  }, [isOpen, reset]);

  const onSubmit = async (data: MovementFormValues) => {
    setIsLoading(true);
    try {
      // Mocking API call
      await new Promise((resolve) => setTimeout(resolve, 800));

      const product = MOCK_PRODUCTS.find((p) => p.id.toString() === data.product_id);
      
      const newMovement = {
        id: Math.floor(Math.random() * 10000),
        product_id: parseInt(data.product_id),
        product_name: product?.name || 'Unknown Product',
        type,
        quantity: data.quantity,
        movement_date: new Date().toISOString(),
        performed_by_id: user?.id || 0,
        performed_by_name: user?.name || 'Unknown User',
        reference_number: data.reference,
        notes: data.notes,
      };

      toast.success(`Stock ${type === 'in' ? 'In' : 'Out'} recorded successfully!`);
      if (onSuccess) onSuccess(newMovement);
      onClose();
    } catch (error) {
      toast.error('Failed to record stock movement');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Record Stock ${type === 'in' ? 'In' : 'Out'}`}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-neutral-700/60 uppercase tracking-wider mb-2">
            Product
          </label>
          <select
            {...register('product_id')}
            className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Select a product...</option>
            {MOCK_PRODUCTS.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} (SKU: {product.sku})
              </option>
            ))}
          </select>
          {errors.product_id && (
            <p className="text-xs text-danger mt-1">{errors.product_id.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700/60 uppercase tracking-wider mb-2">
              Quantity
            </label>
            <input
              type="number"
              {...register('quantity', { valueAsNumber: true })}
              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {errors.quantity && (
              <p className="text-xs text-danger mt-1">{errors.quantity.message}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-700/60 uppercase tracking-wider mb-2">
              Reference #
            </label>
            <input
              type="text"
              {...register('reference')}
              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {errors.reference && (
              <p className="text-xs text-danger mt-1">{errors.reference.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-neutral-700/60 uppercase tracking-wider mb-2">
            Notes (Optional)
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            className="w-full px-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Reason for movement..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className={`px-6 py-2 rounded-lg text-white font-bold text-sm flex items-center gap-2 transition-all active:scale-[0.98] ${
              type === 'in' ? 'bg-success hover:bg-success/90' : 'bg-danger hover:bg-danger/90'
            }`}
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            Confirm Stock {type === 'in' ? 'In' : 'Out'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
