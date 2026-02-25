"use client";

import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function HeroChart() {
  // Generate a log-normal-like distribution curve for the Monte Carlo visualization
  const data = useMemo(() => {
    const points = [];
    for (let i = 0; i <= 50; i++) {
      const x = i * 100000;
      const mean = 15;
      const std = 5;
      const z = (i - mean) / std;
      const y = (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
      
      points.push({
        loss: x,
        probability: i === 0 ? 0 : y * 100,
      });
    }
    return points;
  }, []);

  const formatDollar = (value: number) => {
    if (value === 0) return "$0";
    return `$${(value / 1000000).toFixed(1)}M`;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorProb" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,120,255,0.06)" vertical={false} />
        <XAxis 
          dataKey="loss" 
          tickFormatter={formatDollar} 
          stroke="#4a6080"
          tick={{ fill: '#4a6080', fontSize: 12 }} 
          minTickGap={30}
        />
        <YAxis hide />
        <Tooltip 
          contentStyle={{ backgroundColor: 'rgba(4,8,28,0.95)', borderColor: 'rgba(0,180,255,0.15)', color: '#f8fafc', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
          itemStyle={{ color: '#06b6d4', fontWeight: 'bold' }}
          labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
          labelFormatter={(val) => `Simulated Loss: ${formatDollar(val as number)}`}
          formatter={(val: number) => [`${val.toFixed(2)}%`, 'Likelihood']}
        />
        <ReferenceLine x={1245000} stroke="#06b6d4" strokeDasharray="4 4" label={{ position: 'top', value: 'ALE Median', fill: '#06b6d4', fontSize: 12, fontWeight: 'bold' }} />
        <ReferenceLine x={3500000} stroke="#ef4444" strokeDasharray="4 4" label={{ position: 'top', value: 'PML (95th %ile)', fill: '#ef4444', fontSize: 12, fontWeight: 'bold' }} />
        <Area 
          type="monotone" 
          dataKey="probability" 
          stroke="#06b6d4" 
          strokeWidth={3}
          fillOpacity={1} 
          fill="url(#colorProb)" 
          animationDuration={2000}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
