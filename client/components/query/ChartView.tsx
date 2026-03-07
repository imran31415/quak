import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { QueryResult } from '@shared/types';

export type ChartType = 'bar' | 'line' | 'pie';

interface ChartViewProps {
  result: QueryResult;
  chartType: ChartType;
  xColumn: string;
  yColumns: string[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export function ChartView({ result, chartType, xColumn, yColumns }: ChartViewProps) {
  if (!result.rows.length || !xColumn || yColumns.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        No data to chart. Select X and Y columns.
      </div>
    );
  }

  const data = result.rows.map((row) => {
    const item: Record<string, unknown> = { [xColumn]: row[xColumn] };
    for (const yCol of yColumns) {
      item[yCol] = Number(row[yCol]) || 0;
    }
    return item;
  });

  if (chartType === 'pie') {
    const pieData = data.map((d, i) => ({
      name: String(d[xColumn]),
      value: Number(d[yColumns[0]]) || 0,
      fill: COLORS[i % COLORS.length],
    }));

    return (
      <div data-testid="chart-view">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
              {pieData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const ChartComponent = chartType === 'line' ? LineChart : BarChart;
  const DataComponent = chartType === 'line' ? Line : Bar;

  return (
    <div data-testid="chart-view">
      <ResponsiveContainer width="100%" height={300}>
        <ChartComponent data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xColumn} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          {yColumns.map((yCol, i) => (
            <DataComponent
              key={yCol}
              type="monotone"
              dataKey={yCol}
              fill={COLORS[i % COLORS.length]}
              stroke={COLORS[i % COLORS.length]}
            />
          ))}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}
