import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { fgColor } from "@/lib/utils/format";

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[10px] font-mono text-muted-foreground mb-1">{item.label}</p>
      <p className="text-sm font-mono font-medium" style={{ color: fgColor(item.value).color }}>
        {item.value} — {item.classification}
      </p>
    </div>
  );
};

export default function FearGreedHistory({ data, isLoading }) {
  if (isLoading || !data.length) {
    return (
      <div className="bg-card border border-border rounded-lg h-56 flex items-center justify-center">
        <span className="text-xs font-mono text-muted-foreground">Cargando...</span>
      </div>
    );
  }

  const chartData = data.map(d => ({
    label: new Date(parseInt(d.ts) * 1000).toLocaleDateString("es", { day: "numeric", month: "short" }),
    value: d.value,
    classification: d.label,
  }));

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <ResponsiveContainer width="100%" height={230}>
        <BarChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#555", fontSize: 10, fontFamily: "IBM Plex Mono" }}
            interval="preserveStartEnd"
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#555", fontSize: 10, fontFamily: "IBM Plex Mono" }}
            domain={[0, 100]}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <ReferenceLine y={25} stroke="#EF4444" strokeDasharray="3 3" strokeOpacity={0.35} />
          <ReferenceLine y={75} stroke="#22C55E" strokeDasharray="3 3" strokeOpacity={0.35} />
          <Bar dataKey="value" radius={[2, 2, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={fgColor(entry.value).color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}