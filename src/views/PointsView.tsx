import { MapPin, ChevronRight, ArrowRightLeft, Clock } from 'lucide-react';
import { Card, Badge } from '../components/Card';
import { Medicine, Transaction } from '../types';

interface PointsViewProps {
  distributionPoints: string[];
  inventory: Medicine[];
  transactions: Transaction[];
  selectedPoint: string | null;
  onSelectPoint: (point: string) => void;
  onBack: () => void;
  pointTotals: { [point: string]: number };
}

export function PointsView({ distributionPoints, inventory, transactions, selectedPoint, onSelectPoint, onBack, pointTotals }: PointsViewProps) {
  if (selectedPoint) {
    const pointTransactions = transactions.filter(t => t.point === selectedPoint);
    const pointInventory = inventory.map(m => ({
      name: m.name,
      dispensed: m.dispensedByPoint[selectedPoint] || 0,
      unit: m.unit
    })).filter(m => m.dispensed > 0);

    return (
      <div className="space-y-6 pb-24">
        <header className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-sky-600 transition-colors"
          >
            <ArrowRightLeft size={20} className="rotate-180" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{selectedPoint}</h1>
            <p className="text-xs text-gray-500">تفاصيل العهدة والعمليات الخاصة بالنقطة</p>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-sky-600 text-white border-none">
            <p className="text-sky-100 text-[10px] font-bold uppercase tracking-wider">إجمالي العهدة</p>
            <h3 className="text-2xl font-bold mt-1">{pointTotals[selectedPoint] || 0}</h3>
            <p className="text-sky-200 text-[9px] mt-2">وحدة طبية مستلمة</p>
          </Card>
          <Card className="bg-emerald-600 text-white border-none">
            <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider">عدد الأصناف</p>
            <h3 className="text-2xl font-bold mt-1">{pointInventory.length}</h3>
            <p className="text-emerald-200 text-[9px] mt-2">صنف طبي مختلف</p>
          </Card>
        </div>

        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-gray-50 bg-gray-50/50">
            <h3 className="font-bold text-gray-900 text-sm">قائمة العهدة الحالية</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {pointInventory.map((m, i) => (
              <div key={i} className="p-4 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">{m.name}</span>
                <Badge variant="success">{m.dispensed} {m.unit}</Badge>
              </div>
            ))}
            {pointInventory.length === 0 && (
              <div className="p-8 text-center text-gray-400 text-xs italic">
                لا توجد عهدة مسجلة لهذه النقطة
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-3">
          <h3 className="font-bold text-gray-900 text-sm px-1">آخر العمليات</h3>
          {pointTransactions.slice(0, 10).map((t) => (
            <div key={t.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{t.medicineName}</p>
                  <p className="text-[10px] text-gray-400">{t.date}</p>
                </div>
              </div>
              <span className="font-bold text-sky-600">+{t.quantity}</span>
            </div>
          ))}
          {pointTransactions.length === 0 && (
            <div className="py-8 text-center text-gray-400 text-xs italic">
              لا توجد عمليات مسجلة
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">نقاط التوزيع</h1>
        <p className="text-xs text-gray-500">إدارة ومتابعة كافة النقاط الميدانية</p>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {distributionPoints.map((p) => (
          <Card
            key={p}
            className="cursor-pointer hover:shadow-md transition-shadow group"
            onClick={() => onSelectPoint(p)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-colors">
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{p}</h3>
                  <p className="text-[10px] text-gray-500">إجمالي المصروف: {pointTotals[p] || 0} وحدة</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-300 group-hover:text-sky-600 transition-colors" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
