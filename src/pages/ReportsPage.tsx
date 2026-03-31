import React from 'react';
import { FileText, Download, Calendar as CalendarIcon, Filter, Loader2 } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import { useAuthStore } from '../stores/auth.store';
import { logAuditEvent } from '../lib/audit';

interface ReportType {
  id: string;
  name: string;
  description: string;
  formats: ('PDF' | 'CSV')[];
}

const reportTypes: ReportType[] = [
  {
    id: 'valuation',
    name: 'Stock Valuation Report',
    description: 'Current stock × unit price for all products, grouped by category.',
    formats: ['PDF', 'CSV'],
  },
  {
    id: 'history',
    name: 'Transaction History Report',
    description: 'All stock movements in a date range, with filters.',
    formats: ['PDF', 'CSV'],
  },
  {
    id: 'reorder',
    name: 'Low Stock / Reorder Report',
    description: 'All items at or below ROP with EOQ recommendations.',
    formats: ['PDF', 'CSV'],
  },
  {
    id: 'consumption',
    name: 'Consumption Trend Report',
    description: 'Stock consumed per product per month over a selectable period.',
    formats: ['PDF', 'CSV'],
  },
  {
    id: 'audit',
    name: 'Audit Log Report',
    description: 'Full audit trail for a date range (Admin only).',
    formats: ['PDF', 'CSV'],
  },
];

export default function ReportsPage() {
  const user = useAuthStore((state) => state.user);
  const [generating, setGenerating] = React.useState<string | null>(null);

  const handleGenerate = async (reportId: string, format: 'PDF' | 'CSV') => {
    setGenerating(`${reportId}-${format}`);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await logAuditEvent({
        userId: user?.id,
        action: 'CREATE',
        entityType: 'Report',
        entityId: reportId,
        details: `Generated ${format} report for ${reportId}`,
      });
      toast.success(`${format} report generated successfully!`);
      // In a real app: download blob
    } catch (error) {
      toast.error('Report generation failed. Please try again.');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reports"
        subtitle="Generate and download detailed inventory and audit reports."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {reportTypes.map((report) => (
          <div key={report.id} className="card flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <FileText size={20} />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider">{report.name}</h3>
              </div>
              <p className="text-sm text-neutral-700/60 leading-relaxed mb-6">{report.description}</p>

              {/* Configuration Panel (Simplified) */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-700/40 uppercase tracking-widest">Date From</label>
                  <div className="relative">
                    <CalendarIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-700/40" />
                    <input type="text" placeholder="01/03/2026" className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-xs" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-700/40 uppercase tracking-widest">Date To</label>
                  <div className="relative">
                    <CalendarIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-700/40" />
                    <input type="text" placeholder="25/03/2026" className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-xs" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-6 border-t border-neutral-100">
              {report.formats.map((format) => (
                <button
                  key={format}
                  disabled={!!generating}
                  onClick={() => handleGenerate(report.id, format)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-xs transition-all',
                    format === 'PDF' ? 'bg-primary text-white hover:bg-primary/90' : 'bg-white border border-neutral-100 text-neutral-700 hover:bg-neutral-50'
                  )}
                >
                  {generating === `${report.id}-${format}` ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Download size={14} />
                  )}
                  {format === 'PDF' ? 'Generate PDF' : 'Export CSV'}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
