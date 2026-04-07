import React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[10px] font-mono text-muted-foreground mb-1">{payload[0].payload.label}</p>
      <p className="text-sm font-mono font-medium text-foreground">
        ${val.toLocaleString("en", { maximumFractionDigits: 0 })}
      </p>
    </div>
  );
};

export default function BtcPriceChart({ data, isLoading }) {
  if (isLoading || !data.length) {
    return (
      <div className="bg-card border border-border rounded-lg h-60 flex items-center justify-center">
        <span className="text-xs font-mono text-muted-foreground">Cargando...</span>
      </div>
    );
  }

  const chartData = data.map(d => ({
    label: new Date(d.ts).toLocaleDateString("es", { day: "numeric", month: "short" }),
    price: d.price,
  }));

  const pStart = chartData[0].price;
  const pEnd = chartData[chartData.length - 1].price;
  const lineColor = pEnd >= pStart ? "#22C55E" : "#EF4444";
  const gradId = pEnd >= pStart ? "btcGradGreen" : "btcGradRed";
  const gradColor = pEnd >= pStart ? "#22C55E" : "#EF4444";

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={gradColor} stopOpacity={0.12} />
              <stop offset="100%" stopColor={gradColor} stopOpacity={0} />
            </linearGradient>
          </defs>
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
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            domain={["auto", "auto"]}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Area
            type="monotone"
            dataKey="price"
            stroke={lineColor}
            strokeWidth={2}
            fill={`url(#${gradId})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}