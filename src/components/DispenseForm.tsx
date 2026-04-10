import { useState, useEffect } from 'react';
import { CirclePlus as PlusCircle, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Medicine } from '../types';
import { cn } from '../lib/utils';

interface DispenseFormProps {
  medicines: Medicine[];
  distributionPoints: string[];
  onSubmit: (items: { medicineId: number; quantity: number }[], point: string, notes?: string) => void;
  initialMedicineId: number | null;
  onCancel: () => void;
}

export function DispenseForm({ medicines, distributionPoints, onSubmit, initialMedicineId, onCancel }: DispenseFormProps) {
  const [items, setItems] = useState<{ medicineId: number; quantity: number; medicineName: string }[]>([]);
  const [medicineId, setMedicineId] = useState<number>(initialMedicineId || medicines[0]?.id || 0);
  const [point, setPoint] = useState<string>(distributionPoints[0] || '');
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState('');
  const [showNewPointInput, setShowNewPointInput] = useState(false);
  const [newPointName, setNewPointName] = useState('');

  const selectedMedicine = medicines.find(m => m.id === medicineId);
  const totalDispensed = selectedMedicine ? (Object.values(selectedMedicine.dispensedByPoint) as number[]).reduce((a, b) => a + b, 0) : 0;
  const itemsInInvoice = items.filter(item => item.medicineId === medicineId).reduce((acc, item) => acc + item.quantity, 0);
  const balance = selectedMedicine ? selectedMedicine.received - totalDispensed - itemsInInvoice : 0;

  useEffect(() => {
    if (initialMedicineId) setMedicineId(initialMedicineId);
  }, [initialMedicineId]);

  const handleAddPoint = () => {
    if (newPointName.trim()) {
      setPoint(newPointName.trim());
      setShowNewPointInput(false);
      setNewPointName('');
    }
  };

  const handleAdd = () => {
    if (!selectedMedicine || quantity <= 0 || quantity > balance) return;

    setItems(prev => {
      const existingIndex = prev.findIndex(item => item.medicineId === medicineId);
      if (existingIndex > -1) {
        const newItems = [...prev];
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity: newItems[existingIndex].quantity + quantity
        };
        return newItems;
      }
      return [...prev, { medicineId, quantity, medicineName: selectedMedicine.name }];
    });
    setQuantity(1);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-5 max-h-[80vh] overflow-y-auto pr-1">
      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
        <div className="flex justify-between items-center mb-3">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">نقطة التوزيع</label>
          <button
            type="button"
            onClick={() => setShowNewPointInput(!showNewPointInput)}
            className="text-[10px] font-bold text-sky-600 uppercase flex items-center gap-1"
          >
            {showNewPointInput ? 'إلغاء' : '+ نقطة جديدة'}
          </button>
        </div>

        {showNewPointInput ? (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="اسم النقطة الجديدة..."
              className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
              value={newPointName}
              onChange={(e) => setNewPointName(e.target.value)}
              autoFocus
            />
            <button
              onClick={handleAddPoint}
              className="px-4 bg-sky-600 text-white rounded-xl text-xs font-bold"
            >
              إضافة
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {distributionPoints.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPoint(p)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold border transition-all",
                  point === p
                    ? "bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-100"
                    : "bg-white text-gray-500 border-gray-200 hover:border-sky-200"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4 border-b border-gray-100 pb-5">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">اختر الصنف الطبي</label>
          <select
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-sky-500 transition-all"
            value={medicineId}
            onChange={(e) => setMedicineId(Number(e.target.value))}
          >
            {medicines.map(m => {
              const dispensed = (Object.values(m.dispensedByPoint) as number[]).reduce((a, b) => a + b, 0);
              const inCurrent = items.filter(i => i.medicineId === m.id).reduce((acc, i) => acc + i.quantity, 0);
              const cur = m.received - dispensed - inCurrent;
              return (
                <option key={m.id} value={m.id}>{m.name} (المتاح: {cur} {m.unit})</option>
              );
            })}
          </select>
        </div>

        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">الكمية</label>
            <input
              type="number"
              min="1"
              step="1"
              value={quantity || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') { setQuantity(0); return; }
                const num = parseInt(val, 10);
                if (!isNaN(num)) setQuantity(num);
              }}
              className={cn(
                "w-full bg-gray-50 border rounded-xl px-4 py-3 text-sm outline-none transition-all",
                quantity > balance ? "border-red-400 focus:ring-2 focus:ring-red-200" : "border-gray-100 focus:ring-2 focus:ring-sky-500"
              )}
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={quantity <= 0 || quantity > balance}
            className="h-[46px] px-6 bg-sky-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-sky-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-md shadow-sky-100"
          >
            <PlusCircle size={16} />
            إضافة
          </button>
        </div>
        {quantity > balance && (
          <p className="text-[9px] text-red-600 font-bold animate-pulse">
            الكمية تتجاوز الرصيد المتاح ({balance})
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">أصناف الفاتورة ({items.length})</label>
          {items.length > 0 && (
            <button
              onClick={() => setItems([])}
              className="text-[9px] font-bold text-red-500 uppercase hover:underline"
            >
              مسح الكل
            </button>
          )}
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto bg-gray-50/50 p-2 rounded-2xl border border-dashed border-gray-200">
          {items.map((item, index) => (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              key={index}
              className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-sky-50 text-sky-600 rounded-lg flex items-center justify-center font-bold text-xs">
                  {item.quantity}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{item.medicineName}</p>
                  <p className="text-[9px] text-gray-400">صنف طبي</p>
                </div>
              </div>
              <button
                onClick={() => removeItem(index)}
                className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </motion.div>
          ))}
          {items.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-xs text-gray-400 italic">لم يتم إضافة أي أصناف بعد</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">ملاحظات الفاتورة</label>
        <textarea
          placeholder="أضف أي ملاحظات أو تفاصيل عن الفاتورة هنا..."
          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-500 h-20 resize-none transition-all"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex gap-3 pt-4 sticky bottom-0 bg-white pb-1">
        <button
          onClick={onCancel}
          className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-colors"
        >
          إلغاء
        </button>
        <button
          onClick={() => onSubmit(items.map(i => ({ medicineId: i.medicineId, quantity: i.quantity })), point, notes)}
          disabled={items.length === 0 || !point}
          className="flex-[2] py-3.5 bg-sky-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-sky-100 hover:bg-sky-700 disabled:opacity-50 disabled:shadow-none transition-all"
        >
          تأكيد صرف الفاتورة
        </button>
      </div>
    </div>
  );
}
