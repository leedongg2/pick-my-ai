'use client';

import React, { useEffect, useState } from 'react';

interface GraphData {
  equations: string[];
  points: Array<[number, number]>;
}

function parseGraphData(text: string): GraphData | null {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  const equations: string[] = [];
  const points: Array<[number, number]> = [];

  for (const line of lines) {
    if (line.startsWith('y=') || line.startsWith('Y=')) {
      equations.push(line);
    } else if (line.match(/^\([-\d.]+,[-\d.]+\)$/)) {
      const match = line.match(/\(([-\d.]+),([-\d.]+)\)/);
      if (match) points.push([parseFloat(match[1]), parseFloat(match[2])]);
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      const content = line.slice(2).trim();
      if (content.startsWith('y=') || content.startsWith('Y=')) {
        equations.push(content);
      } else if (content.match(/^\([-\d.]+,[-\d.]+\)$/)) {
        const match = content.match(/\(([-\d.]+),([-\d.]+)\)/);
        if (match) points.push([parseFloat(match[1]), parseFloat(match[2])]);
      }
    }
  }

  if (equations.length === 0 && points.length === 0) return null;
  return { equations, points };
}

function evaluateEquation(eq: string, x: number): number | null {
  try {
    let expr = eq.replace(/^[yY]\s*=\s*/, '');
    expr = expr.replace(/\^/g, '**');
    expr = expr.replace(/x/gi, `(${x})`);
    // eslint-disable-next-line no-eval
    return eval(expr);
  } catch {
    return null;
  }
}

export const GraphRenderer: React.FC<{ text: string }> = ({ text }) => {
  const [RechartsComponents, setRechartsComponents] = useState<any>(null);

  useEffect(() => {
    import('recharts').then((mod) => {
      setRechartsComponents(mod);
    }).catch(() => {});
  }, []);

  const graphData = parseGraphData(text);
  if (!graphData) return <div className="text-red-500 text-sm">그래프 데이터 파싱 실패</div>;
  if (!RechartsComponents) return <div className="my-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-500">그래프 로딩 중...</div>;

  const { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } = RechartsComponents;
  const { equations, points } = graphData;

  let minX = -10, maxX = 10;
  if (points.length > 0) {
    const xs = points.map((p: [number, number]) => p[0]);
    minX = Math.min(...xs, minX) - 2;
    maxX = Math.max(...xs, maxX) + 2;
  }

  const step = (maxX - minX) / 100;
  const chartData: any[] = [];
  for (let x = minX; x <= maxX; x += step) {
    const dataPoint: any = { x: parseFloat(x.toFixed(2)) };
    equations.forEach((eq: string, idx: number) => {
      const y = evaluateEquation(eq, x);
      if (y !== null && !isNaN(y) && isFinite(y)) {
        dataPoint[`y${idx}`] = parseFloat(y.toFixed(2));
      }
    });
    chartData.push(dataPoint);
  }

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

  return (
    <div className="my-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="x" label={{ value: 'x', position: 'insideBottomRight', offset: -5 }} />
          <YAxis label={{ value: 'y', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          {equations.map((eq: string, idx: number) => (
            <Line key={idx} type="monotone" dataKey={`y${idx}`} stroke={colors[idx % colors.length]} name={eq} dot={false} strokeWidth={2} />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
        {equations.map((eq: string, i: number) => <div key={i}>• {eq}</div>)}
        {points.map((p: [number, number], i: number) => <div key={`p${i}`}>• 점: ({p[0]}, {p[1]})</div>)}
      </div>
    </div>
  );
};
