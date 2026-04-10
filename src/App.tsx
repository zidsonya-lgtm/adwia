/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  PlusCircle, 
  AlertTriangle, 
  BarChart3, 
  Search, 
  Filter, 
  Download, 
  History,
  ChevronRight,
  ArrowRightLeft,
  MapPin,
  Clock,
  CheckCircle2,
  PackageSearch,
  Trash2,
  Edit,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { cn } from './lib/utils';
import { INITIAL_MEDICINES } from './constants';
import { Medicine, Transaction, Category, DistributionPoint, InventoryState } from './types';

// --- Constants ---
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

const COLORS = ['#6200ea', '#2e7d32', '#f57f17', '#c62828', '#0091ea', '#d500f9', '#ffab00'];

// --- Components ---

const Card = ({ children, className, ...props }: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn("bg-white rounded-2xl shadow-sm border border-gray-100 p-4", className)}
    {...props}
  >
    {children}
  </div>
);

const Badge = ({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'error' }) => {
  const variants = {
    default: "bg-gray-100 text-gray-700",
    success: "bg-green-50 text-green-700 border border-green-100",
    warning: "bg-amber-50 text-amber-700 border border-amber-100",
    error: "bg-red-50 text-red-700 border border-red-100"
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", variants[variant])}>
      {children}
    </span>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'transactions' | 'shortages' | 'analytics' | 'points'>('dashboard');
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

  // --- Persistence ---
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
    const state: InventoryState = {
      medicines: inventory,
      transactions,
      distributionPoints,
      lastUpdated
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [inventory, transactions, lastUpdated]);

  // --- Logic ---
  const handleDispense = (items: { medicineId: number, quantity: number }[], point: string, notes?: string) => {
    let newInventory = [...inventory];
    const newTransactions: Transaction[] = [];
    const invoiceId = Math.random().toString(36).substr(2, 9);
    const date = new Date().toLocaleString('ar-YE');

    for (const item of items) {
      const medicine = newInventory.find(m => m.id === item.medicineId);
      if (!medicine) continue;

      const totalDispensed = (Object.values(medicine.dispensedByPoint) as number[]).reduce((a, b) => a + b, 0);
      const currentBalance = medicine.received - totalDispensed;
      
      if (item.quantity > currentBalance) {
        console.error(`الكمية المطلوبة للصنف (${medicine.name}) تتجاوز الرصيد المتاح!`);
        return;
      }

      newInventory = newInventory.map(m => {
        if (m.id === item.medicineId) {
          const updated = { ...m };
          updated.dispensedByPoint = { ...m.dispensedByPoint };
          updated.dispensedByPoint[point] = (updated.dispensedByPoint[point] || 0) + item.quantity;
          
          const newTotalDispensed = (Object.values(updated.dispensedByPoint) as number[]).reduce((a, b) => a + b, 0);
          const newBalance = updated.received - newTotalDispensed;
          updated.status = newBalance <= 0 ? 'ناقص' : 'متوفر';
          return updated;
        }
        return m;
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
      // Update existing
      setInventory(inventory.map(m => {
        if (m.id === editingMedicine.id) {
          const updated = { ...m, ...medicineData } as Medicine;
          const totalDispensed = (Object.values(updated.dispensedByPoint) as number[]).reduce((a, b) => a + b, 0);
          updated.status = (updated.received - totalDispensed) <= 0 ? 'ناقص' : 'متوفر';
          return updated;
        }
        return m;
      }));
    } else {
      // Add new
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
    
    // Inventory Sheet
    const invData = inventory.map(m => {
      const row: any = {
        'اسم الصنف': m.name,
        'الفئة': m.category,
        'المستلم': m.received,
      };
      
      distributionPoints.forEach(p => {
        row[`مصروف ${p}`] = m.dispensedByPoint[p] || 0;
      });

      const totalDispensed = (Object.values(m.dispensedByPoint) as number[]).reduce((a, b) => a + b, 0);
      row['الرصيد'] = m.received - totalDispensed;
      row['الوحدة'] = m.unit;
      row['الحالة'] = m.status;
      
      return row;
    });
    const invWS = XLSX.utils.json_to_sheet(invData);
    XLSX.utils.book_append_sheet(wb, invWS, "المخزون");

    // Transactions Sheet
    const transData = transactions.map(t => ({
      'التاريخ': t.date,
      'رقم الفاتورة': t.invoiceId || 'N/A',
      'الصنف': t.medicineName,
      'النقطة': t.point,
      'الكمية': t.quantity,
      'ملاحظات': t.notes || ''
    }));
    const transWS = XLSX.utils.json_to_sheet(transData);
    XLSX.utils.book_append_sheet(wb, transWS, "سجل العمليات");

    const fileName = `تقرير_المخزون_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  useEffect(() => {
    if (printingInvoice && invoiceRef.current) {
      const capture = async () => {
        // Small delay to ensure rendering and fonts
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const canvas = await html2canvas(invoiceRef.current!, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
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

  const exportInvoicePDF = (invoice: Transaction[]) => {
    setPrintingInvoice(invoice);
  };

  const renderPoints = () => (
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
            onClick={() => {
              setSelectedPoint(p);
              setActiveTab('points');
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{p}</h3>
                  <p className="text-[10px] text-gray-500">إجمالي المصروف: {stats.pointTotals[p] || 0} وحدة</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-300 group-hover:text-indigo-600 transition-colors" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderPointDetail = (pointName: string) => {
    const pointTransactions = transactions.filter(t => t.point === pointName);
    const pointInventory = inventory.map(m => ({
      name: m.name,
      dispensed: m.dispensedByPoint[pointName] || 0,
      unit: m.unit
    })).filter(m => m.dispensed > 0);

    return (
      <div className="space-y-6 pb-24">
        <header className="flex items-center gap-3">
          <button 
            onClick={() => setSelectedPoint(null)}
            className="p-2 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-indigo-600 transition-colors"
          >
            <ArrowRightLeft size={20} className="rotate-180" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{pointName}</h1>
            <p className="text-xs text-gray-500">تفاصيل العهدة والعمليات الخاصة بالنقطة</p>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-indigo-600 text-white border-none">
            <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-wider">إجمالي العهدة</p>
            <h3 className="text-2xl font-bold mt-1">{stats.pointTotals[pointName] || 0}</h3>
            <p className="text-indigo-200 text-[9px] mt-2">وحدة طبية مستلمة</p>
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
              <span className="font-bold text-indigo-600">+{t.quantity}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // --- Computed Stats ---
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

    return {
      totalReceived,
      pointTotals,
      totalDispensed,
      totalBalance,
      shortageCount,
      availabilityRate
    };
  }, [inventory, distributionPoints]);

  const chartData = useMemo(() => {
    const categoryData = CATEGORIES.map(cat => ({
      name: cat,
      value: inventory.filter(m => m.category === cat).length
    }));

    const pointData = distributionPoints.map(p => ({
      name: p,
      value: stats.pointTotals[p] || 0
    }));

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

  // --- Render Sections ---

  const renderTransactions = () => {
    // Group transactions by invoiceId
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
                  <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center">
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
                    onClick={() => exportInvoicePDF(invoice)}
                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
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
  };

  const renderDashboard = () => (
    <div className="space-y-6 pb-24">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">لوحة التحكم</h1>
          <p className="text-xs text-gray-500">آخر تحديث: {lastUpdated}</p>
        </div>
        <button 
          onClick={exportToExcel}
          className="p-2.5 bg-white border border-gray-200 rounded-xl shadow-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Download size={20} />
        </button>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-indigo-600 text-white border-none">
          <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-wider">إجمالي المستلم</p>
          <h3 className="text-2xl font-bold mt-1">{stats.totalReceived}</h3>
          <p className="text-indigo-200 text-[9px] mt-2">وحدة طبية مسجلة</p>
        </Card>
        <Card className="bg-emerald-600 text-white border-none">
          <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider">إجمالي الرصيد</p>
          <h3 className="text-2xl font-bold mt-1">{stats.totalBalance}</h3>
          <p className="text-emerald-200 text-[9px] mt-2">متاح حالياً للصرف</p>
        </Card>
        <Card>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">المصروف الإجمالي</p>
          <h3 className="text-xl font-bold text-gray-900 mt-1">{stats.totalDispensed}</h3>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-[9px]">
            {distributionPoints.map((p, i) => (
              <React.Fragment key={p}>
                <span className={cn("font-bold", i % 2 === 0 ? "text-indigo-600" : "text-emerald-600")}>
                  {p}: {stats.pointTotals[p] || 0}
                </span>
                {i < distributionPoints.length - 1 && <span className="text-gray-300">|</span>}
              </React.Fragment>
            ))}
          </div>
        </Card>
        <Card>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">نسبة التوفر</p>
          <h3 className="text-xl font-bold text-gray-900 mt-1">{stats.availabilityRate}%</h3>
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-1000" 
              style={{ width: `${stats.availabilityRate}%` }}
            />
          </div>
        </Card>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <MapPin size={16} className="text-indigo-600" />
            نقاط التوزيع
          </h3>
          <button 
            onClick={() => setActiveTab('points')}
            className="text-[10px] text-indigo-600 font-bold uppercase"
          >
            عرض الكل
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {distributionPoints.slice(0, 2).map((p) => (
            <Card 
              key={p} 
              className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => {
                setSelectedPoint(p);
                setActiveTab('points');
              }}
            >
              <p className="text-[10px] font-bold text-gray-400 uppercase">{p}</p>
              <p className="text-sm font-bold text-gray-900 mt-1">{stats.pointTotals[p] || 0} وحدة</p>
            </Card>
          ))}
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
            <History size={16} className="text-indigo-600" />
            آخر 5 عمليات صرف
          </h3>
          <button 
            onClick={() => setActiveTab('transactions')}
            className="text-[10px] text-indigo-600 font-bold uppercase"
          >
            عرض الكل
          </button>
        </div>
        <div className="divide-y divide-gray-50">
          {(() => {
            const groupedRecent: { [key: string]: Transaction[] } = {};
            transactions.slice(0, 15).forEach(t => {
              const id = t.invoiceId || t.id;
              if (!groupedRecent[id]) groupedRecent[id] = [];
              groupedRecent[id].push(t);
            });
            
            return Object.values(groupedRecent).slice(0, 5).map((invoice, idx) => (
              <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      distributionPoints.indexOf(invoice[0].point) % 2 === 0 ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"
                    )}>
                      <PackageSearch size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">فاتورة: {invoice[0].invoiceId || invoice[0].id.slice(0, 5)}</p>
                      <p className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Clock size={10} /> {invoice[0].date}
                      </p>
                    </div>
                  </div>
                  <Badge variant="success">{invoice[0].point}</Badge>
                </div>
                <div className="pr-12 space-y-1">
                  {invoice.map(t => (
                    <div key={t.id} className="flex justify-between items-center text-[11px]">
                      <span className="text-gray-600">{t.medicineName}</span>
                      <span className="font-bold text-red-600">-{t.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            ));
          })()}
          {transactions.length === 0 && (
            <div className="p-10 text-center text-gray-400 text-xs italic">
              لا توجد عمليات صرف مسجلة بعد
            </div>
          )}
        </div>
      </Card>

      <Card>
        <h3 className="font-bold text-gray-900 mb-4 text-sm">توزيع الفئات العلاجية</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData.categoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.categoryData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ fontSize: '10px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );

  const renderInventory = () => (
    <div className="space-y-4 pb-24">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">المخزون الطبي</h1>
          <p className="text-xs text-gray-500">إدارة ومتابعة {inventory.length} صنفاً طبياً</p>
        </div>
        <button 
          onClick={() => {
            setEditingMedicine(null);
            setShowMedicineModal(true);
          }}
          className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-colors flex items-center gap-2 text-xs font-bold"
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
            className="w-full pr-10 pl-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative">
          <select 
            className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
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
              onClick={() => {
                setSelectedMedicineId(m.id);
                setShowDispenseModal(true);
              }}
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
                          setEditingMedicine(m);
                          setShowMedicineModal(true);
                        }}
                        className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                      >
                        <Edit size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-[9px] text-gray-400">المستلم: {m.received}</p>
                  {distributionPoints.map((p, i) => (
                    <p key={p} className={cn("text-[9px] font-bold", i % 2 === 0 ? "text-indigo-500" : "text-emerald-500")}>
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

  const renderShortages = () => {
    const shortages = inventory.filter(m => {
      const dispensed = (Object.values(m.dispensedByPoint) as number[]).reduce((a, b) => a + b, 0);
      return (m.received - dispensed) <= 0;
    });
    return (
      <div className="space-y-6 pb-24">
        <header>
          <h1 className="text-2xl font-bold text-gray-900">تنبيهات النواقص</h1>
          <p className="text-xs text-gray-500">يوجد حالياً {shortages.length} أصناف خارج المخزون (رصيد صفر أو سالب)</p>
        </header>

        <div className="space-y-4">
          {shortages.map((m) => {
            const dispensed = (Object.values(m.dispensedByPoint) as number[]).reduce((a, b) => a + b, 0);
            const balance = m.received - dispensed;
            return (
              <div key={m.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 border-r-4 border-r-red-600">
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
  };

  const renderAnalytics = () => (
    <div className="space-y-6 pb-24">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">التحليلات المرئية</h1>
        <p className="text-xs text-gray-500">تقارير بيانية دقيقة عن حالة الصرف والمخزون</p>
      </header>

      <Card>
        <h3 className="font-bold text-gray-900 mb-6 text-sm">نسبة الصرف حسب نقطة التوزيع</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData.pointData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <Tooltip cursor={{fill: '#f8f9fa'}} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                {chartData.pointData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6200ea' : '#2e7d32'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h3 className="font-bold text-gray-900 mb-6 text-sm">حالة الأرصدة العامة (متوفر vs ناقص)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData.statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                <Cell fill="#2e7d32" />
                <Cell fill="#c62828" />
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h3 className="font-bold text-gray-900 mb-4 text-sm">مؤشرات الكفاءة</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
            <span className="text-xs text-gray-600">متوسط الصرف اليومي</span>
            <span className="font-bold text-gray-900 text-sm">{(stats.totalDispensed / 30).toFixed(1)} وحدة</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
            <span className="text-xs text-gray-600">أكثر فئة استهلاكاً</span>
            <span className="font-bold text-indigo-600 text-sm">محاليل وريدية</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
            <span className="text-xs text-gray-600">النقطة الأكثر نشاطاً</span>
            <span className="font-bold text-emerald-600 text-sm">
              {(Object.entries(stats.pointTotals) as [string, number][]).sort((a, b) => b[1] - a[1])[0]?.[0] || 'لا يوجد'}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans selection:bg-indigo-100" dir="rtl">
      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'inventory' && renderInventory()}
            {activeTab === 'transactions' && renderTransactions()}
            {activeTab === 'points' && (selectedPoint ? renderPointDetail(selectedPoint) : renderPoints())}
            {activeTab === 'shortages' && renderShortages()}
            {activeTab === 'analytics' && renderAnalytics()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating Action Button */}
      <button 
        onClick={() => {
          setSelectedMedicineId(null);
          setShowDispenseModal(true);
        }}
        className="fixed bottom-24 left-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-200 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-40"
      >
        <PlusCircle size={28} />
      </button>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
        <NavButton 
          active={activeTab === 'dashboard'} 
          onClick={() => setActiveTab('dashboard')} 
          icon={<LayoutDashboard size={20} />} 
          label="الرئيسية" 
        />
        <NavButton 
          active={activeTab === 'inventory'} 
          onClick={() => setActiveTab('inventory')} 
          icon={<Package size={20} />} 
          label="المخزون" 
        />
        <NavButton 
          active={activeTab === 'transactions'} 
          onClick={() => setActiveTab('transactions')} 
          icon={<History size={20} />} 
          label="السجل" 
        />
        <NavButton 
          active={activeTab === 'points'} 
          onClick={() => setActiveTab('points')} 
          icon={<MapPin size={20} />} 
          label="النقاط" 
        />
        <div className="w-12 h-12" /> {/* Spacer for FAB */}
        <NavButton 
          active={activeTab === 'shortages'} 
          onClick={() => setActiveTab('shortages')} 
          icon={<AlertTriangle size={20} />} 
          label="النواقص" 
        />
        <NavButton 
          active={activeTab === 'analytics'} 
          onClick={() => setActiveTab('analytics')} 
          icon={<BarChart3 size={20} />} 
          label="تحليلات" 
        />
      </nav>

      {/* Dispense Modal */}
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
                <ArrowRightLeft className="text-indigo-600" />
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

      {/* Offline Indicator */}
      <div className="fixed top-4 left-4 z-[200]">
        {!navigator.onLine && (
          <Badge variant="warning">يعمل بدون اتصال</Badge>
        )}
      </div>

      {/* Medicine Management Modal */}
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
                <Package className="text-indigo-600" />
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

      {/* Hidden Invoice Template for PDF Generation */}
      <div className="fixed -left-[9999px] top-0">
        <div 
          ref={invoiceRef} 
          className="w-[210mm] min-h-[297mm] bg-white p-[20mm] font-sans" 
          dir="rtl"
        >
          {printingInvoice && (
            <div className="space-y-8">
              <div className="flex justify-between items-start border-b-4 border-indigo-600 pb-6">
                <div>
                  <h1 className="text-4xl font-bold text-indigo-600 mb-2">فاتورة صرف رسمية</h1>
                  <p className="text-gray-500 text-sm">نظام إدارة المخزون الطبي الذكي</p>
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
                  <p className="text-lg font-bold text-indigo-600">{printingInvoice[0].point}</p>
                </div>
              </div>

              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-indigo-600 text-white">
                    <th className="p-4 text-right rounded-tr-xl">الصنف الطبي</th>
                    <th className="p-4 text-center">الكمية</th>
                    <th className="p-4 text-left rounded-tl-xl">الوحدة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {printingInvoice.map((t, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                      <td className="p-4 text-sm font-bold text-gray-900">{t.medicineName}</td>
                      <td className="p-4 text-center text-sm font-bold text-indigo-600">{t.quantity}</td>
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
                <div>
                  <div className="w-32 h-px bg-gray-200 mx-auto mb-2" />
                  <p className="text-[10px] font-bold text-gray-400">توقيع المستلم</p>
                </div>
                <div>
                  <div className="w-32 h-px bg-gray-200 mx-auto mb-2" />
                  <p className="text-[10px] font-bold text-gray-400">ختم النقطة</p>
                </div>
                <div>
                  <div className="w-32 h-px bg-gray-200 mx-auto mb-2" />
                  <p className="text-[10px] font-bold text-gray-400">اعتماد الإدارة</p>
                </div>
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

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-0.5 transition-colors",
        active ? "text-indigo-600" : "text-gray-400"
      )}
    >
      <div className={cn(
        "p-1 rounded-lg transition-colors",
        active ? "bg-indigo-50" : "transparent"
      )}>
        {React.cloneElement(icon as React.ReactElement, { size: 18 })}
      </div>
      <span className="text-[8px] font-bold">{label}</span>
    </button>
  );
}

function MedicineForm({ medicine, onSubmit, onCancel }: { 
  medicine: Medicine | null, 
  onSubmit: (data: Partial<Medicine>) => void,
  onCancel: () => void
}) {
  const [name, setName] = useState(medicine?.name || '');
  const [category, setCategory] = useState<Category>(medicine?.category || CATEGORIES[0]);
  const [received, setReceived] = useState<number>(medicine?.received || 0);
  const [unit, setUnit] = useState(medicine?.unit || 'وحدة');

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
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">الفئة</label>
          <select 
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
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
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">الوحدة</label>
            <input 
              type="text" 
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="وحدة، فيال، شريط..."
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
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
          className="flex-[2] py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all"
        >
          {medicine ? 'حفظ التعديلات' : 'إضافة للمخزون'}
        </button>
      </div>
    </div>
  );
}

function DispenseForm({ medicines, distributionPoints, onSubmit, initialMedicineId, onCancel }: { 
  medicines: Medicine[], 
  distributionPoints: string[],
  onSubmit: (items: { medicineId: number, quantity: number }[], point: string, notes?: string) => void,
  initialMedicineId: number | null,
  onCancel: () => void
}) {
  const [items, setItems] = useState<{ medicineId: number, quantity: number, medicineName: string }[]>([]);
  const [medicineId, setMedicineId] = useState<number>(initialMedicineId || medicines[0]?.id || 0);
  const [point, setPoint] = useState<string>(distributionPoints[0] || '');
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState('');
  const [showNewPointInput, setShowNewPointInput] = useState(false);
  const [newPointName, setNewPointName] = useState('');

  const selectedMedicine = medicines.find(m => m.id === medicineId);
  const totalDispensed = selectedMedicine ? (Object.values(selectedMedicine.dispensedByPoint) as number[]).reduce((a, b) => a + b, 0) : 0;
  
  // Calculate balance considering items already in the current invoice
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

  const removeItemFromInvoice = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const clearInvoice = () => {
    setItems([]);
  };

  return (
    <div className="space-y-5 max-h-[80vh] overflow-y-auto pr-1">
      {/* Distribution Point Section */}
      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
        <div className="flex justify-between items-center mb-3">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">نقطة التوزيع (الفاتورة)</label>
          <button 
            type="button"
            onClick={() => setShowNewPointInput(!showNewPointInput)}
            className="text-[10px] font-bold text-indigo-600 uppercase flex items-center gap-1"
          >
            {showNewPointInput ? 'إلغاء' : '+ نقطة جديدة'}
          </button>
        </div>
        
        {showNewPointInput ? (
          <div className="flex gap-2">
            <input 
              type="text"
              placeholder="اسم النقطة الجديدة..."
              className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              value={newPointName}
              onChange={(e) => setNewPointName(e.target.value)}
              autoFocus
            />
            <button 
              onClick={handleAddPoint}
              className="px-4 bg-indigo-600 text-white rounded-xl text-xs font-bold"
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
                  point === p ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100" : "bg-white text-gray-500 border-gray-200"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Item Selection Section */}
      <div className="space-y-4 border-b border-gray-100 pb-5">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">اختر الصنف الطبي</label>
            <select 
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              value={medicineId}
              onChange={(e) => setMedicineId(Number(e.target.value))}
            >
              {medicines.map(m => {
                const dispensed = (Object.values(m.dispensedByPoint) as number[]).reduce((a, b) => a + b, 0);
                const inCurrentInvoice = items.filter(item => item.medicineId === m.id).reduce((acc, item) => acc + item.quantity, 0);
                const currentBalance = m.received - dispensed - inCurrentInvoice;
                return (
                  <option key={m.id} value={m.id}>{m.name} (المتاح: {currentBalance} {m.unit})</option>
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
                  if (val === '') {
                    setQuantity(0);
                    return;
                  }
                  const num = parseInt(val, 10);
                  if (!isNaN(num)) {
                    setQuantity(num);
                  }
                }}
                className={cn(
                  "w-full bg-gray-50 border rounded-xl px-4 py-3 text-sm outline-none transition-all",
                  quantity > balance ? "border-red-500 focus:ring-2 focus:ring-red-200" : "border-gray-100 focus:ring-2 focus:ring-indigo-500"
                )}
              />
            </div>
            <button 
              type="button"
              onClick={handleAdd}
              disabled={quantity <= 0 || quantity > balance}
              className="h-[46px] px-6 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-md shadow-indigo-100"
            >
              <PlusCircle size={16} />
              إضافة
            </button>
          </div>
          {quantity > balance && (
            <p className="text-[9px] text-red-600 font-bold animate-pulse">
              ⚠️ الكمية تتجاوز الرصيد المتاح ({balance})
            </p>
          )}
        </div>
      </div>

      {/* Invoice Items List */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">أصناف الفاتورة الحالية ({items.length})</label>
          {items.length > 0 && (
            <button 
              onClick={clearInvoice}
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
                <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-xs">
                  {item.quantity}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{item.medicineName}</p>
                  <p className="text-[9px] text-gray-400">صنف طبي</p>
                </div>
              </div>
              <button 
                onClick={() => removeItemFromInvoice(index)}
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
          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 h-20 resize-none transition-all"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex gap-3 pt-4 sticky bottom-0 bg-white">
        <button 
          onClick={onCancel}
          className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-colors"
        >
          إلغاء
        </button>
        <button 
          onClick={() => onSubmit(items.map(i => ({ medicineId: i.medicineId, quantity: i.quantity })), point, notes)}
          disabled={items.length === 0 || !point}
          className="flex-[2] py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all"
        >
          تأكيد صرف الفاتورة
        </button>
      </div>
    </div>
  );
}

/**
 * 📝 دليل الاستخدام والتعليمات التقنية:
 * 
 * 1. كيفية الحفظ والمزامنة:
 *    - التطبيق يستخدم تقنية LocalStorage لحفظ البيانات تلقائياً في متصفحك عند كل عملية صرف.
 *    - البيانات تظل محفوظة حتى لو أغلقت المتصفح أو أعدت تشغيل الجهاز.
 *    - التطبيق يعمل 100% بدون إنترنت (Offline) بعد التحميل الأول.
 * 
 * 2. الإضافة للشاشة الرئيسية (PWA):
 *    - على Android: افتح التطبيق في Chrome، اضغط على النقاط الثلاث (⋮) ثم اختر "Add to Home screen".
 *    - على iOS: افتح التطبيق في Safari، اضغط على زر المشاركة (Share) ثم اختر "Add to Home Screen".
 *    - سيظهر التطبيق كأيقونة مستقلة على شاشتك ويعمل كتطبيق أصلي.
 * 
 * 3. النسخ الاحتياطي اليدوي:
 *    - استخدم زر "تصدير" (أيقونة التحميل) في لوحة التحكم لتوليد ملف Excel كامل.
 *    - يحتوي ملف Excel على نسختين: (المخزون الحالي) و (سجل كافة العمليات).
 *    - يُنصح بتصدير التقرير يومياً لضمان وجود نسخة احتياطية خارج الجهاز.
 * 
 * 4. ملاحظات تقنية:
 *    - الحسابات تتم برمجياً: الرصيد = المستلم - (صرف الرباط + صرف التواهي).
 *    - يتم تلوين الأرصدة تلقائياً: أخضر (متوفر)، أصفر (منخفض < 5)، أحمر (ناقص ≤ 0).
 */
