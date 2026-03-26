import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  colour?: 'blue' | 'red' | 'amber' | 'green';
  onClick?: () => void;
}

const colourClasses = {
  blue: 'text-primary bg-primary/10',
  red: 'text-danger bg-danger/10',
  amber: 'text-warning bg-warning/10',
  green: 'text-success bg-success/10',
};

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  colour = 'blue',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'card flex flex-col justify-between transition-transform hover:scale-[1.02]',
        onClick && 'cursor-pointer'
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-neutral-700/60 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold mt-1">{value}</h3>
        </div>
        <div className={cn('p-2 rounded-lg', colourClasses[colour])}>
          <Icon size={20} />
        </div>
      </div>
      {trend !== undefined && (
        <div className="mt-4 flex items-center gap-1">
          {trend >= 0 ? (
            <TrendingUp size={14} className="text-success" />
          ) : (
            <TrendingDown size={14} className="text-danger" />
          )}
          <span className={cn('text-xs font-medium', trend >= 0 ? 'text-success' : 'text-danger')}>
            {Math.abs(trend)}%
          </span>
          <span className="text-xs text-neutral-700/40 ml-1">vs last month</span>
        </div>
      )}
    </div>
  );
};
