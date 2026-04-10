import { TriangleAlert as AlertTriangle, CircleCheck as CheckCircle2, ChevronRight } from 'lucide-react';
import { Badge } from '../components/Card';
import { Medicine } from '../types';

interface ShortagesViewProps {
  inventory: Medicine[];
}

export function ShortagesView({ inventory }: ShortagesViewProps) {
  const shortages = inventory.filter(m => {
    const dispensed = (Object.values(m.dispensedByPoint) as number[]).reduce((a, b) => a + b, 0);
    return (m.received - dispensed) <= 0;
  });

  return (
    <div className="space-y-6 pb-24">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">تنبيهات النواقص</h1>
        <p className="text-xs text-gray-500">يوجد حالياً {shortages.length} أصناف خارج المخزون</p>
      </header>

      <div className="space-y-4">
        {shortages.map((m) => {
          const dispensed = (Object.values(m.dispensedByPoint) as number[]).reduce((a, b) => a + b, 0);
          const balance = m.received - dispensed;
          return (
            <div key={m.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 border-r-4 border-r-red-500">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{m.name}</h4>
                    <p className="text-[10px] text-gray-500">{m.category}</p>
                  </div>
                </div>
                <div className="text-left">
                  <Badge variant="error">أولوية عالية</Badge>
                  <p className="text-[10px] text-gray-400 mt-1 font-bold">العجز: {Math.abs(balance)} {m.unit}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                <p className="text-[10px] text-gray-500 italic">توصية: طلب توريد عاجل لتغطية العجز في النقاط</p>
                <button className="text-[10px] font-bold text-red-600 flex items-center gap-1 uppercase">
                  طلب توريد <ChevronRight size={14} />
                </button>
              </div>
            </div>
          );
        })}
        {shortages.length === 0 && (
          <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
            <CheckCircle2 size={48} className="mx-auto text-emerald-200 mb-4" />
            <h3 className="font-bold text-gray-900">المخزون مكتمل</h3>
            <p className="text-gray-500 text-xs">لا توجد نواقص حالياً في أي صنف</p>
          </div>
        )}
      </div>
    </div>
  );
}
