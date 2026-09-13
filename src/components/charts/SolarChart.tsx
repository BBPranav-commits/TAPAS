'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ClimateDataPoint } from '@/lib/physics/types';

interface Props {
  data: ClimateDataPoint[];
}

export default function SolarChart({ data }: Props) {
  const chartData = data.map((d, i) => ({
    hour: i,
    ghi: Math.round(d.ghi),
    dni: Math.round(d.dni),
    dhi: Math.round(d.dhi),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="hour" stroke="#94a3b8" tick={{ fontSize: 11 }} label={{ value: 'Time [hours]', position: 'insideBottom', offset: -2, style: { fill: '#94a3b8', fontSize: 11 } }} />
        <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} label={{ value: 'W/m²', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 11 } }} />
        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '4px', fontSize: 12 }} labelStyle={{ color: '#94a3b8' }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area type="monotone" dataKey="ghi" stroke="#f59e0b" fill="#f59e0b20" strokeWidth={1.5} name="GHI [W/m²]" />
        <Area type="monotone" dataKey="dni" stroke="#ef4444" fill="#ef444410" strokeWidth={1} name="DNI [W/m²]" />
        <Area type="monotone" dataKey="dhi" stroke="#3b82f6" fill="#3b82f610" strokeWidth={1} name="DHI [W/m²]" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
