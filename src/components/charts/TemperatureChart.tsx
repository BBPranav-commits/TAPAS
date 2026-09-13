'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ClimateDataPoint } from '@/lib/physics/types';

interface Props {
  data: ClimateDataPoint[];
}

export default function TemperatureChart({ data }: Props) {
  const chartData = data.map((d, i) => ({
    hour: i,
    temperature: Math.round(d.temperature * 10) / 10,
    dewPoint: d.dewPoint !== undefined ? Math.round(d.dewPoint * 10) / 10 : undefined,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="hour" stroke="#94a3b8" tick={{ fontSize: 11 }} label={{ value: 'Time [hours]', position: 'insideBottom', offset: -2, style: { fill: '#94a3b8', fontSize: 11 } }} />
        <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} label={{ value: '°C', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 11 } }} />
        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '4px', fontSize: 12 }} labelStyle={{ color: '#94a3b8' }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="temperature" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Temperature [°C]" />
        {chartData.some(d => d.dewPoint !== undefined) && (
          <Line type="monotone" dataKey="dewPoint" stroke="#06b6d4" strokeWidth={1} dot={false} name="Dew Point [°C]" strokeDasharray="4 4" />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
