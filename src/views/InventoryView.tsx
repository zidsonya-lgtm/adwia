import { Plus, Search, ListFilter as Filter, PackageSearch, CreditCard as Edit } from 'lucide-react';
import { Badge } from '../components/Card';
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

interface InventoryViewProps {
  inventory: Medicine[];
  filteredInventory: Medicine[];
  distributionPoints: string[];
  searchQuery: string;
  categoryFilter: Category | 'الكل';
  onSearchChange: (q: string) => void;
  onCategoryChange: (cat: Category | 'الكل') => void;
  onAddMedicine: () => void;
  onEditMedicine: (m: Medicine) => void;
  onDispense: (id: number) => void;
}

export function InventoryView({
  inventory,
  filteredInventory,
  distributionPoints,
  searchQuery,
  categoryFilter,
  onSearchChange,
  onCategoryChange,
  onAddMedicine,
  onEditMedicine,
  onDispense
}: InventoryViewProps) {
  return (
    <div className="space-y-4 pb-24">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">المخزون الطبي</h1>
          <p className="text-xs text-gray-500">إدارة ومتابعة {inventory.length} صنفاً طبياً</p>
        </div>
        <button
          onClick={onAddMedicine}
          className="p-2.5 bg-sky-600 text-white rounded-xl shadow-md shadow-sky-100 hover:bg-sky-700 transition-colors flex items-center gap-2 text-xs font-bold"
        >
          <Plus size={18} />
          إضافة صنف
        </button>
      </header>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="بحث عن صنف أو فئة..."
            className="w-full pr-10 pl-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all text-sm"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="relative">
          <select
            className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-sky-500"
            value={categoryFilter}
            onChange={(e) => onCategoryChange(e.target.value as any)}
          >
            <option value="الكل">الكل</option>
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
        </div>
      </div>

      <div className="space-y-3">
        {filteredInventory.map((m) => {
          const totalDispensed = (Object.values(m.dispensedByPoint) as number[]).reduce((a, b) => a + b, 0);
          const balance = m.received - totalDispensed;
          return (
            <div
              key={m.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onDispense(m.id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold",
                    balance <= 0 ? "bg-red-50 text-red-600" :
                      balance < 5 ? "bg-amber-50 text-amber-600" :
                        "bg-emerald-50 text-emerald-600"
                  )}>
                    {balance}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{m.name}</h4>
                    <p className="text-[10px] text-gray-500">{m.category} • {m.unit}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant={balance <= 0 ? 'error' : balance < 5 ? 'warning' : 'success'}>
                        {balance <= 0 ? 'ناقص' : 'متوفر'}
                      </Badge>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditMedicine(m);
                        }}
                        className="p-1 text-gray-400 hover:text-sky-600 transition-colors"
                      >
                        <Edit size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-[9px] text-gray-400">المستلم: {m.received}</p>
                  {distributionPoints.map((p, i) => (
                    <p key={p} className={cn("text-[9px] font-bold", i % 2 === 0 ? "text-sky-500" : "text-emerald-500")}>
                      {p}: {m.dispensedByPoint[p] || 0}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
        {filteredInventory.length === 0 && (
          <div className="py-20 text-center">
            <PackageSearch size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-500 text-sm">لا توجد نتائج تطابق بحثك</p>
          </div>
        )}
      </div>
    </div>
  );
}
