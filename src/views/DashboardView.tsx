import React from 'react';
import { Download, MapPin, History, PackageSearch, Clock } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Card, Badge } from '../components/Card';
import { Medicine, Transaction } from '../types';
import { cn } from '../lib/utils';

const CATEGORIES_COLORS = ['#0284c7', '#16a34a', '#d97706', '#dc2626', '#0891b2', '#7c3aed', '#ea580c'];

interface DashboardViewProps {
  inventory: Medicine[];
  transactions: Transaction[];
  distributionPoints: string[];
  lastUpdated: string;
  stats: {
    totalReceived: number;
    pointTotals: { [point: string]: number };
    totalDispensed: number;
    totalBalance: number;
    shortageCount: number;
    availabilityRate: number;
  };
  chartData: {
    categoryData: { name: string; value: number }[];
    pointData: { name: string; value: number }[];
    statusData: { name: string; value: number }[];
  };
  onExport: () => void;
  onViewTransactions: () => void;
  onViewPoints: () => void;
  onSelectPoint: (point: string) => void;
}

export function DashboardView({
  inventory,
  transactions,
  distributionPoints,
  lastUpdated,
  stats,
  chartData,
  onExport,
  onViewTransactions,
  onViewPoints,
  onSelectPoint
}: DashboardViewProps) {
  const groupedRecent: { [key: string]: Transaction[] } = {};
  transactions.slice(0, 15).forEach(t => {
    const id = t.invoiceId || t.id;
    if (!groupedRecent[id]) groupedRecent[id] = [];
    groupedRecent[id].push(t);
  });
  const recentInvoices = Object.values(groupedRecent).slice(0, 5);

  return (
    <div className="space-y-6 pb-24">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">لوحة التحكم</h1>
          <p className="text-xs text-gray-500">آخر تحديث: {lastUpdated}</p>
        </div>
        <button
          onClick={onExport}
          className="p-2.5 bg-white border border-gray-200 rounded-xl shadow-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Download size={20} />
        </button>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-sky-600 text-white border-none">
          <p className="text-sky-100 text-[10px] font-bold uppercase tracking-wider">إجمالي المستلم</p>
          <h3 className="text-2xl font-bold mt-1">{stats.totalReceived}</h3>
          <p className="text-sky-200 text-[9px] mt-2">وحدة طبية مسجلة</p>
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
                <span className={cn("font-bold", i % 2 === 0 ? "text-sky-600" : "text-emerald-600")}>
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
            <MapPin size={16} className="text-sky-600" />
            نقاط التوزيع
          </h3>
          <button
            onClick={onViewPoints}
            className="text-[10px] text-sky-600 font-bold uppercase"
          >
            عرض الكل
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {distributionPoints.slice(0, 2).map((p) => (
            <Card
              key={p}
              className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => onSelectPoint(p)}
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
            <History size={16} className="text-sky-600" />
            آخر 5 عمليات صرف
          </h3>
          <button
            onClick={onViewTransactions}
            className="text-[10px] text-sky-600 font-bold uppercase"
          >
            عرض الكل
          </button>
        </div>
        <div className="divide-y divide-gray-50">
          {recentInvoices.map((invoice, idx) => (
            <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    distributionPoints.indexOf(invoice[0].point) % 2 === 0
                      ? "bg-sky-50 text-sky-600"
                      : "bg-emerald-50 text-emerald-600"
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
          ))}
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
                  <Cell key={`cell-${index}`} fill={CATEGORIES_COLORS[index % CATEGORIES_COLORS.length]} />
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
}
