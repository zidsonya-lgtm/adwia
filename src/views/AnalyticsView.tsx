import { Card } from '../components/Card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

interface AnalyticsViewProps {
  chartData: {
    pointData: { name: string; value: number }[];
    statusData: { name: string; value: number }[];
  };
  stats: {
    totalDispensed: number;
    pointTotals: { [point: string]: number };
  };
}

export function AnalyticsView({ chartData, stats }: AnalyticsViewProps) {
  const mostActive = (Object.entries(stats.pointTotals) as [string, number][]).sort((a, b) => b[1] - a[1])[0]?.[0] || 'لا يوجد';

  return (
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
              <Tooltip cursor={{ fill: '#f8f9fa' }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                {chartData.pointData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#0284c7' : '#16a34a'} />
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
                <Cell fill="#16a34a" />
                <Cell fill="#dc2626" />
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
            <span className="font-bold text-sky-600 text-sm">محاليل وريدية</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
            <span className="text-xs text-gray-600">النقطة الأكثر نشاطاً</span>
            <span className="font-bold text-emerald-600 text-sm">{mostActive}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
