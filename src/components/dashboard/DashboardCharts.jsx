import React, { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, Cell,
} from "recharts";
import SectionHeader from "@/components/ui/SectionHeader";
import { format, parseISO } from "date-fns";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[10px] font-mono text-muted-foreground mb-1">{label}</p>
      <p className={`text-sm font-mono font-medium ${val >= 0 ? "text-green" : "text-red"}`}>
        {val >= 0 ? "+" : ""}${Math.abs(val).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    </div>
  );
};

const CumTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[10px] font-mono text-muted-foreground mb-1">{label}</p>
      <p className={`text-sm font-mono font-medium ${val >= 0 ? "text-green" : "text-red"}`}>
        {val >= 0 ? "+" : ""}${Math.abs(val).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    </div>
  );
};

export default function DashboardCharts({ data = [] }) {
  // Build cumulative from filtered data
  const chartData = React.useMemo(() => {
    let cum = 0;
    return data.map(d => {
      cum += d.pnl;
      // Format label — shorten if many points
      let label;
      try {
        label = format(parseISO(d.date), data.length > 14 ? "dd/MM" : "dd MMM");
      } catch {
        label = d.date;
      }
      return { label, pnl: d.pnl, cumulative: Math.round(cum * 100) / 100 };
    });
  }, [data]);

  if (!chartData.length) {
    return (
      <div className="bg-card border border-border rounded-lg h-40 flex items-center justify-center">
        <span className="text-xs font-mono text-muted-foreground">Sin datos para el período seleccionado</span>
      </div>
    );
  }

  const cumEnd = chartData[chartData.length - 1]?.cumulative ?? 0;
  const lineColor = cumEnd >= 0 ? "#22C55E" : "#EF4444";
  const gradId = cumEnd >= 0 ? "gradGreen" : "gradRed";

  const tickInterval = chartData.length > 20 ? "preserveStartEnd" : 0;

  return (
    <div className="space-y-6">
      <SectionHeader title="Daily PNL" tag="DIARIO" />
      <div className="bg-card border border-border rounded-lg p-4">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#555", fontSize: 10, fontFamily: "IBM Plex Mono" }}
              interval={tickInterval}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#555", fontSize: 10, fontFamily: "IBM Plex Mono" }}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.pnl >= 0 ? "#22C55E" : "#EF4444"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <SectionHeader title="Cumulative PNL" tag="ACUMULADO" />
      <div className="bg-card border border-border rounded-lg p-4">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={lineColor} stopOpacity={0.15} />
                <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#555", fontSize: 10, fontFamily: "IBM Plex Mono" }}
              interval={tickInterval}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#555", fontSize: 10, fontFamily: "IBM Plex Mono" }}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip content={<CumTooltip />} cursor={false} />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke={lineColor}
              strokeWidth={2}
              fill={`url(#${gradId})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}