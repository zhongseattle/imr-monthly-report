'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { MonthlyBurnRate } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/date-utils';

interface BurnRateChartProps {
  data: MonthlyBurnRate[];
}

export function BurnRateChart({ data }: BurnRateChartProps) {
  const chartData = data.map((item) => ({
    month: item.monthName.split(' ')[0], // Just the month name
    'Total Spend': item.totalSpend,
    'Daily Burn Rate': item.dailyBurnRate,
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Monthly Spend and Burn Rate
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-600" />
          <XAxis
            dataKey="month"
            className="text-gray-600 dark:text-gray-400"
          />
          <YAxis
            className="text-gray-600 dark:text-gray-400"
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
          />
          <Tooltip
            formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : ''}
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
            }}
          />
          <Legend />
          <Bar dataKey="Total Spend" fill="#3b82f6" />
          <Bar dataKey="Daily Burn Rate" fill="#10b981" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
