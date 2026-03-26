import React from 'react';
import { cn } from '../../lib/utils';

interface FormFieldProps {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  error,
  required,
  children,
  className,
}) => {
  return (
    <div className={cn('flex flex-col gap-1.5 mb-4', className)}>
      <label htmlFor={name} className="text-xs font-semibold text-neutral-700/80">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] font-medium text-danger">{error}</p>}
    </div>
  );
};
