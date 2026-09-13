'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, Legend } from 'recharts';
import { SimulationResult } from '@/lib/physics/types';

interface Props {
  result: SimulationResult;
  targetMin: number;
  targetMax: number;
}

export default function SimResultCharts({ result, targetMin, targetMax }: Props) {
  const chartData = result.timeHours.map((hour, i) => ({
    hour,
    indoorTemp: Number(result.indoorTemp[i]?.toFixed(1) ?? 0),
    ambientTemp: Number(result.ambientTemp[i]?.toFixed(1) ?? 0),
    targetMin,
    targetMax,
  }));

  return (
    <div className="space-y-4">
      <div className="card h-[280px]">
        <div className="card-header">Indoor vs Ambient Temperature</div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="hour" stroke="#94a3b8" tick={{ fontSize: 11 }} label={{ value: 'Hours', position: 'insideBottom', offset: -2, style: { fill: '#94a3b8', fontSize: 11 } }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} label={{ value: '°C', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 11 } }} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '4px', fontSize: 12 }} labelStyle={{ color: '#94a3b8' }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceArea y1={targetMin} y2={targetMax} fill="#10b981" fillOpacity={0.08} />
            <Line type="monotone" dataKey="ambientTemp" stroke="#60a5fa" strokeWidth={1.5} dot={false} name="Ambient [°C]" />
            <Line type="monotone" dataKey="indoorTemp" stroke="#f59e0b" strokeWidth={2} dot={false} name="Indoor [°C]" />
            <Line type="monotone" dataKey="targetMin" stroke="#34d399" strokeWidth={1} dot={false} strokeDasharray="5 5" name="Target Min [°C]" />
            <Line type="monotone" dataKey="targetMax" stroke="#f87171" strokeWidth={1} dot={false} strokeDasharray="5 5" name="Target Max [°C]" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
