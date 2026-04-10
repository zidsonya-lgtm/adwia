import { History, Download } from 'lucide-react';
import { Badge } from '../components/Card';
import { Transaction } from '../types';

interface TransactionsViewProps {
  transactions: Transaction[];
  onExportInvoice: (invoice: Transaction[]) => void;
}

export function TransactionsView({ transactions, onExportInvoice }: TransactionsViewProps) {
  const groupedTransactions: { [key: string]: Transaction[] } = {};
  transactions.forEach(t => {
    const id = t.invoiceId || t.id;
    if (!groupedTransactions[id]) groupedTransactions[id] = [];
    groupedTransactions[id].push(t);
  });

  const sortedInvoices = Object.values(groupedTransactions).sort((a, b) => {
    return new Date(b[0].date).getTime() - new Date(a[0].date).getTime();
  });

  return (
    <div className="space-y-6 pb-24">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">سجل الفواتير</h1>
        <p className="text-xs text-gray-500">متابعة دقيقة لجميع فواتير الصرف</p>
      </header>

      <div className="space-y-4">
        {sortedInvoices.map((invoice, idx) => (
          <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-sky-600 text-white rounded-lg flex items-center justify-center">
                  <History size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-900">فاتورة: {invoice[0].invoiceId || invoice[0].id.slice(0, 5)}</p>
                  <p className="text-[9px] text-gray-500">{invoice[0].date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success">{invoice[0].point}</Badge>
                <button
                  onClick={() => onExportInvoice(invoice)}
                  className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                  title="طباعة الفاتورة"
                >
                  <Download size={14} />
                </button>
              </div>
            </div>
            <div className="p-3 space-y-2">
              {invoice.map(t => (
                <div key={t.id} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-[10px]">•</span>
                    <span className="text-gray-700 font-medium">{t.medicineName}</span>
                  </div>
                  <span className="font-bold text-red-600">-{t.quantity}</span>
                </div>
              ))}
              {invoice[0].notes && (
                <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
                  <p className="text-[9px] text-amber-700 italic">ملاحظة: {invoice[0].notes}</p>
                </div>
              )}
            </div>
          </div>
        ))}
        {transactions.length === 0 && (
          <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
            <History size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-400 text-sm">لا توجد عمليات مسجلة حالياً</p>
          </div>
        )}
      </div>
    </div>
  );
}
