import React from 'react';
import { cn } from '../../lib/utils';

type Status = 'in-stock' | 'low-stock' | 'out-of-stock' | 'fast' | 'moderate' | 'slow';

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<Status, { label: string; classes: string }> = {
  'in-stock': { label: 'In Stock', classes: 'bg-success/10 text-success border-success/20' },
  'low-stock': { label: 'Low Stock', classes: 'bg-warning/10 text-warning border-warning/20' },
  'out-of-stock': { label: 'Out of Stock', classes: 'bg-danger/10 text-danger border-danger/20' },
  'fast': { label: 'Fast Moving', classes: 'bg-success/10 text-success border-success/20' },
  'moderate': { label: 'Moderate', classes: 'bg-warning/10 text-warning border-warning/20' },
  'slow': { label: 'Slow Moving', classes: 'bg-danger/10 text-danger border-danger/20' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border',
        config.classes,
        className
      )}
    >
      {config.label}
    </span>
  );
};
