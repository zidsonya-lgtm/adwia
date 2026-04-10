import { useState } from 'react';
import { Medicine, Category } from '../types';
import { cn } from '../lib/utils';

const CATEGORIES: Category[] = [
  'محاليل وريدية',
  'فيتامينات',
  'مضادات حيوية',
  'مسكنات',
  'جهاز هضمي',
  'أدوية عامة',
  'مستلزمات طبية'
];

interface MedicineFormProps {
  medicine: Medicine | null;
  onSubmit: (data: Partial<Medicine>) => void;
  onCancel: () => void;
}

export function MedicineForm({ medicine, onSubmit, onCancel }: MedicineFormProps) {
  const [name, setName] = useState(medicine?.name || '');
  const [category, setCategory] = useState<Category>(medicine?.category || CATEGORIES[0]);
  const [received, setReceived] = useState<number>(medicine?.received || 0);
  const [unit, setUnit] = useState(medicine?.unit || 'وحدة');

  const inputClass = "w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-500 transition-all";

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">اسم الصنف الطبي</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: محلول ملحي 500 مل"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">الفئة</label>
          <select
            className={inputClass}
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
          >
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">الكمية المستلمة</label>
            <input
              type="number"
              value={received || ''}
              onChange={(e) => setReceived(Number(e.target.value))}
              placeholder="0"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">الوحدة</label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="وحدة، فيال، شريط..."
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={onCancel}
          className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-colors"
        >
          إلغاء
        </button>
        <button
          onClick={() => onSubmit({ name, category, received, unit })}
          disabled={!name || received < 0}
          className={cn(
            "flex-[2] py-3.5 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg transition-all",
            "bg-sky-600 hover:bg-sky-700 shadow-sky-100 disabled:opacity-50 disabled:shadow-none"
          )}
        >
          {medicine ? 'حفظ التعديلات' : 'إضافة للمخزون'}
        </button>
      </div>
    </div>
  );
}
