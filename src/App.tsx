import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Package, History, TriangleAlert as AlertTriangle, ChartBar as BarChart3, MapPin, CirclePlus as PlusCircle, ArrowRightLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

import { INITIAL_MEDICINES } from './constants';
import { Medicine, Transaction, Category, InventoryState } from './types';
import { NavButton } from './components/NavButton';
import { MedicineForm } from './components/MedicineForm';
import { DispenseForm } from './components/DispenseForm';
import { DashboardView } from './views/DashboardView';
import { InventoryView } from './views/InventoryView';
import { TransactionsView } from './views/TransactionsView';
import { PointsView } from './views/PointsView';
import { ShortagesView } from './views/ShortagesView';
import { AnalyticsView } from './views/AnalyticsView';

const STORAGE_KEY = 'medical_inventory_v1';

const CATEGORIES: Category[] = [
  'محاليل وريدية',
  'فيتامينات',
  'مضادات حيوية',
  'مسكنات',
  'جهاز هضمي',
  'أدوية عامة',
  'مستلزمات طبية'
];

type ActiveTab = 'dashboard' | 'inventory' | 'transactions' | 'shortages' | 'analytics' | 'points';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);
  const [printingInvoice, setPrintingInvoice] = useState<Transaction[] | null>(null);
  const invoiceRef = React.useRef<HTMLDivElement>(null);

  const [inventory, setInventory] = useState<Medicine[]>(INITIAL_MEDICINES);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [distributionPoints, setDistributionPoints] = useState<string[]>(['الرباط', 'التواهي']);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleString('ar-YE'));

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'الكل'>('الكل');
  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [showMedicineModal, setShowMedicineModal] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [selectedMedicineId, setSelectedMedicineId] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: InventoryState = JSON.parse(saved);
        setInventory(parsed.medicines);
        setTransactions(parsed.transactions);
        setDistributionPoints(parsed.distributionPoints || ['الرباط', 'التواهي']);
        setLastUpdated(parsed.lastUpdated);
      } catch (e) {
        console.error("Failed to load inventory", e);
      }
    }
  }, []);

  useEffect(() => {
    const state: InventoryState = { medicines: inventory, transactions, distributionPoints, lastUpdated };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [inventory, transactions, lastUpdated]);

  const handleDispense = (items: { medicineId: number; quantity: number }[], point: string, notes?: string) => {
    let newInventory = [...inventory];
    const newTransactions: Transaction[] = [];
    const invoiceId = Math.random().toString(36).substr(2, 9);
    const date = new Date().toLocaleString('ar-YE');

    for (const item of items) {
      const medicine = newInventory.find(m => m.id === item.medicineId);
      if (!medicine) continue;

      const totalDispensed = (Object.values(medicine.dispensedByPoint) as number[]).reduce((a, b) => a + b, 0);
      const currentBalance = medicine.received - totalDispensed;

      if (item.quantity > currentBalance) return;

      newInventory = newInventory.map(m => {
        if (m.id !== item.medicineId) return m;
        const updated = { ...m, dispensedByPoint: { ...m.dispensedByPoint } };
        updated.dispensedByPoint[point] = (updated.dispensedByPoint[point] || 0) + item.quantity;
        const newTotal = (Object.values(updated.dispensedByPoint) as number[]).reduce((a, b) => a + b, 0);
        updated.status = updated.received - newTotal <= 0 ? 'ناقص' : 'متوفر';
        return updated;
      });

      newTransactions.push({
        id: Math.random().toString(36).substr(2, 9),
        invoiceId,
        medicineId: item.medicineId,
        medicineName: medicine.name,
        point,
        quantity: item.quantity,
        date,
        notes
      });
    }

    if (!distributionPoints.includes(point)) {
      setDistributionPoints([...distributionPoints, point]);
    }

    setInventory(newInventory);
    setTransactions([...newTransactions, ...transactions]);
    setLastUpdated(date);
    setShowDispenseModal(false);
    setSelectedMedicineId(null);
  };

  const handleSaveMedicine = (medicineData: Partial<Medicine>) => {
    const date = new Date().toLocaleString('ar-YE');
    if (editingMedicine) {
      setInventory(inventory.map(m => {
        if (m.id !== editingMedicine.id) return m;
        const updated = { ...m, ...medicineData } as Medicine;
        const totalDispensed = (Object.values(updated.dispensedByPoint) as number[]).reduce((a, b) => a + b, 0);
        updated.status = (updated.received - totalDispensed) <= 0 ? 'ناقص' : 'متوفر';
        return updated;
      }));
    } else {
      const newMedicine: Medicine = {
        id: Math.max(0, ...inventory.map(m => m.id)) + 1,
        name: medicineData.name || '',
        category: medicineData.category || CATEGORIES[0],
        received: medicineData.received || 0,
        dispensedByPoint: {},
        unit: medicineData.unit || 'وحدة',
        status: (medicineData.received || 0) > 0 ? 'متوفر' : 'ناقص'
      };
      setInventory([...inventory, newMedicine]);
    }
    setLastUpdated(date);
    setShowMedicineModal(false);
    setEditingMedicine(null);
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const invData = inventory.map(m => {
      const row: Record<string, unknown> = {
        'اسم الصنف': m.name,
        'الفئة': m.category,
        'المستلم': m.received,
      };
      distributionPoints.forEach(p => { row[`مصروف ${p}`] = m.dispensedByPoint[p] || 0; });
      const totalDispensed = (Object.values(m.dispensedByPoint) as number[]).reduce((a, b) => a + b, 0);
      row['الرصيد'] = m.received - totalDispensed;
      row['الوحدة'] = m.unit;
      row['الحالة'] = m.status;
      return row;
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invData), "المخزون");
    const transData = transactions.map(t => ({
      'التاريخ': t.date,
      'رقم الفاتورة': t.invoiceId || 'N/A',
      'الصنف': t.medicineName,
      'النقطة': t.point,
      'الكمية': t.quantity,
      'ملاحظات': t.notes || ''
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(transData), "سجل العمليات");
    XLSX.writeFile(wb, `تقرير_المخزون_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  useEffect(() => {
    if (printingInvoice && invoiceRef.current) {
      const capture = async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        const canvas = await html2canvas(invoiceRef.current!, {
          scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff'
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        const invoiceId = printingInvoice[0].invoiceId || printingInvoice[0].id.slice(0, 5);
        pdf.save(`Invoice_${invoiceId}.pdf`);
        setPrintingInvoice(null);
      };
      capture();
    }
  }, [printingInvoice]);

  const stats = useMemo(() => {
    const totalReceived = inventory.reduce((acc, m) => acc + m.received, 0);
    const pointTotals: { [point: string]: number } = {};
    distributionPoints.forEach(p => {
      pointTotals[p] = inventory.reduce((acc, m) => acc + (m.dispensedByPoint[p] || 0), 0);
    });
    const totalDispensed = (Object.values(pointTotals) as number[]).reduce((a, b) => a + b, 0);
    const totalBalance = totalReceived - totalDispensed;
    const shortageCount = inventory.filter(m => {
      const dispensed = (Object.values(m.dispensedByPoint) as number[]).reduce((a, b) => a + b, 0);
      return (m.received - dispensed) <= 0;
    }).length;
    const availabilityRate = Math.round(((inventory.length - shortageCount) / inventory.length) * 100);
    return { totalReceived, pointTotals, totalDispensed, totalBalance, shortageCount, availabilityRate };
  }, [inventory, distributionPoints]);

  const chartData = useMemo(() => {
    const categoryData = CATEGORIES.map(cat => ({
      name: cat,
      value: inventory.filter(m => m.category === cat).length
    }));
    const pointData = distributionPoints.map(p => ({ name: p, value: stats.pointTotals[p] || 0 }));
    const statusData = [
      { name: 'متوفر', value: inventory.length - stats.shortageCount },
      { name: 'ناقص', value: stats.shortageCount }
    ];
    return { categoryData, pointData, statusData };
  }, [inventory, stats, distributionPoints]);

  const filteredInventory = useMemo(() => {
    return inventory.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'الكل' || m.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchQuery, categoryFilter]);

  return (
    <div className="min-h-screen bg-[#f0f4f8] font-sans selection:bg-sky-100" dir="rtl">
      <main className="max-w-md mx-auto px-4 pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && (
              <DashboardView
                inventory={inventory}
                transactions={transactions}
                distributionPoints={distributionPoints}
                lastUpdated={lastUpdated}
                stats={stats}
                chartData={chartData}
                onExport={exportToExcel}
                onViewTransactions={() => setActiveTab('transactions')}
                onViewPoints={() => setActiveTab('points')}
                onSelectPoint={(p) => { setSelectedPoint(p); setActiveTab('points'); }}
              />
            )}
            {activeTab === 'inventory' && (
              <InventoryView
                inventory={inventory}
                filteredInventory={filteredInventory}
                distributionPoints={distributionPoints}
                searchQuery={searchQuery}
                categoryFilter={categoryFilter}
                onSearchChange={setSearchQuery}
                onCategoryChange={setCategoryFilter}
                onAddMedicine={() => { setEditingMedicine(null); setShowMedicineModal(true); }}
                onEditMedicine={(m) => { setEditingMedicine(m); setShowMedicineModal(true); }}
                onDispense={(id) => { setSelectedMedicineId(id); setShowDispenseModal(true); }}
              />
            )}
            {activeTab === 'transactions' && (
              <TransactionsView
                transactions={transactions}
                onExportInvoice={setPrintingInvoice}
              />
            )}
            {activeTab === 'points' && (
              <PointsView
                distributionPoints={distributionPoints}
                inventory={inventory}
                transactions={transactions}
                selectedPoint={selectedPoint}
                onSelectPoint={setSelectedPoint}
                onBack={() => setSelectedPoint(null)}
                pointTotals={stats.pointTotals}
              />
            )}
            {activeTab === 'shortages' && <ShortagesView inventory={inventory} />}
            {activeTab === 'analytics' && <AnalyticsView chartData={chartData} stats={stats} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <button
        onClick={() => { setSelectedMedicineId(null); setShowDispenseModal(true); }}
        className="fixed bottom-24 left-6 w-14 h-14 bg-sky-600 text-white rounded-full shadow-lg shadow-sky-200 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-40"
      >
        <PlusCircle size={28} />
      </button>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex justify-between items-center z-50 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="الرئيسية" />
        <NavButton active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} icon={<Package size={20} />} label="المخزون" />
        <NavButton active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} icon={<History size={20} />} label="السجل" />
        <NavButton active={activeTab === 'points'} onClick={() => { setSelectedPoint(null); setActiveTab('points'); }} icon={<MapPin size={20} />} label="النقاط" />
        <div className="w-12 h-12" />
        <NavButton active={activeTab === 'shortages'} onClick={() => setActiveTab('shortages')} icon={<AlertTriangle size={20} />} label="النواقص" />
        <NavButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={<BarChart3 size={20} />} label="تحليلات" />
      </nav>

      <AnimatePresence>
        {showDispenseModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDispenseModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl overflow-hidden"
            >
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 sm:hidden" />
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <ArrowRightLeft className="text-sky-600" />
                عملية صرف جديدة
              </h2>
              <DispenseForm
                medicines={inventory}
                distributionPoints={distributionPoints}
                onSubmit={handleDispense}
                initialMedicineId={selectedMedicineId}
                onCancel={() => setShowDispenseModal(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMedicineModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMedicineModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl overflow-hidden"
            >
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 sm:hidden" />
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Package className="text-sky-600" />
                {editingMedicine ? 'تعديل بيانات الصنف' : 'إضافة صنف طبي جديد'}
              </h2>
              <MedicineForm
                medicine={editingMedicine}
                onSubmit={handleSaveMedicine}
                onCancel={() => setShowMedicineModal(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="fixed -left-[9999px] top-0">
        <div ref={invoiceRef} className="w-[210mm] min-h-[297mm] bg-white p-[20mm] font-sans" dir="rtl">
          {printingInvoice && (
            <div className="space-y-8">
              <div className="flex justify-between items-start border-b-4 border-sky-600 pb-6">
                <div>
                  <h1 className="text-4xl font-bold text-sky-600 mb-2">فاتورة صرف رسمية</h1>
                  <p className="text-gray-500 text-sm">نظام إدارة المخزون الطبي - طبية الفرقة</p>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-gray-900">رقم الفاتورة: #INV-{printingInvoice[0].invoiceId || printingInvoice[0].id.slice(0, 5)}</p>
                  <p className="text-sm text-gray-500">التاريخ: {printingInvoice[0].date}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">جهة الصرف</p>
                  <p className="text-lg font-bold text-gray-900">المستودع المركزي</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">نقطة التوزيع المستلمة</p>
                  <p className="text-lg font-bold text-sky-600">{printingInvoice[0].point}</p>
                </div>
              </div>

              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-sky-600 text-white">
                    <th className="p-4 text-right rounded-tr-xl">الصنف الطبي</th>
                    <th className="p-4 text-center">الكمية</th>
                    <th className="p-4 text-left rounded-tl-xl">الوحدة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {printingInvoice.map((t, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                      <td className="p-4 text-sm font-bold text-gray-900">{t.medicineName}</td>
                      <td className="p-4 text-center text-sm font-bold text-sky-600">{t.quantity}</td>
                      <td className="p-4 text-left text-xs text-gray-500">وحدة طبية</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {printingInvoice[0].notes && (
                <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100">
                  <p className="text-xs font-bold text-amber-800 mb-2">ملاحظات إضافية:</p>
                  <p className="text-sm text-amber-700 leading-relaxed">{printingInvoice[0].notes}</p>
                </div>
              )}

              <div className="pt-20 grid grid-cols-3 gap-8 text-center">
                {['توقيع المستلم', 'ختم النقطة', 'اعتماد الإدارة'].map(label => (
                  <div key={label}>
                    <div className="w-32 h-px bg-gray-200 mx-auto mb-2" />
                    <p className="text-[10px] font-bold text-gray-400">{label}</p>
                  </div>
                ))}
              </div>

              <div className="pt-20 text-center border-t border-gray-100">
                <p className="text-[10px] text-gray-400">تم إنشاء هذه الفاتورة إلكترونياً وهي معتمدة لأغراض الجرد والمتابعة.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
