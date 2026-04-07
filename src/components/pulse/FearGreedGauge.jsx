import React from "react";
import { fgColor } from "@/lib/utils/format";

const ZONES = [
  { min: 0,  max: 24,  label: "Miedo Extremo", color: "#EF4444" },
  { min: 25, max: 44,  label: "Miedo",         color: "#F97316" },
  { min: 45, max: 55,  label: "Neutral",        color: "#EAB308" },
  { min: 56, max: 74,  label: "Codicia",        color: "#84CC16" },
  { min: 75, max: 100, label: "Codicia Extrema",color: "#22C55E" },
];

// Converts a value 0-100 to an angle in a half-circle
// 0 (Fear) → 0° (left), 100 (Greed) → 180° (right)
function valueToAngle(v) {
  return (Math.max(0, Math.min(100, v)) / 100) * 180;
}

// Polar to cartesian helper
function polar(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 180) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// Builds a donut-arc path for a given angle range on the half-circle
function arcPath(cx, cy, r1, r2, startDeg, endDeg) {
  const s1 = polar(cx, cy, r1, startDeg);
  const e1 = polar(cx, cy, r1, endDeg);
  const s2 = polar(cx, cy, r2, startDeg);
  const e2 = polar(cx, cy, r2, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${s2.x.toFixed(2)} ${s2.y.toFixed(2)}`,
    `A ${r2} ${r2} 0 ${large} 1 ${e2.x.toFixed(2)} ${e2.y.toFixed(2)}`,
    `L ${e1.x.toFixed(2)} ${e1.y.toFixed(2)}`,
    `A ${r1} ${r1} 0 ${large} 0 ${s1.x.toFixed(2)} ${s1.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

export default function FearGreedGauge({ value }) {
  const { color, label } = fgColor(value);

  const W = 280, H = 160;
  const cx = W / 2, cy = H - 20;
  const rOuter = 110, rInner = 72;

  // Needle tip angle
  const needleAngle = valueToAngle(value);
  const needleTip = polar(cx, cy, rOuter - 10, needleAngle);
  const needleL   = polar(cx, cy, 14, needleAngle + 90);
  const needleR   = polar(cx, cy, 14, needleAngle - 90);

  // Map zones to angle ranges (0–100 → 0°–180° → rendered as 0°…180° in our system)
  const zoneArcs = ZONES.map(z => ({
    color: z.color,
    start: (z.min / 100) * 180,
    end:   (z.max / 100) * 180,
  }));

  return (
    <div>
      <div className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-[2px] mb-1">
        Fear &amp; Greed Index
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ overflow: "visible" }}
      >
        <defs>
          <filter id="fgg-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <path
          d={arcPath(cx, cy, rInner, rOuter, 0, 180)}
          fill="hsl(0 0% 10%)"
        />

        {/* Colored zone segments */}
        {zoneArcs.map((z, i) => (
          <path
            key={i}
            d={arcPath(cx, cy, rInner, rOuter, z.start, z.end)}
            fill={z.color}
            opacity={0.82}
          />
        ))}

        {/* Thin gap lines between zones */}
        {ZONES.slice(0, -1).map((z, i) => {
          const angle = ((z.max + 1) / 100) * 180;
          const p1 = polar(cx, cy, rInner - 2, angle);
          const p2 = polar(cx, cy, rOuter + 2, angle);
          return (
            <line
              key={i}
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke="hsl(0 0% 4%)" strokeWidth="2"
            />
          );
        })}

        {/* Needle */}
        <polygon
          points={`${needleL.x.toFixed(2)},${needleL.y.toFixed(2)} ${needleTip.x.toFixed(2)},${needleTip.y.toFixed(2)} ${needleR.x.toFixed(2)},${needleR.y.toFixed(2)}`}
          fill={color}
          filter="url(#fgg-glow)"
        />

        {/* Needle pivot */}
        <circle cx={cx} cy={cy} r="11" fill="hsl(0 0% 4%)" stroke={color} strokeWidth="2" />
        <circle cx={cx} cy={cy} r="5"  fill={color} />

        {/* Value number */}
        <text
          x={cx} y={cy - 26}
          textAnchor="middle"
          fontFamily="IBM Plex Mono, monospace"
          fontSize="44"
          fontWeight="400"
          fill={color}
        >
          {value}
        </text>

        {/* Label */}
        <text
          x={cx} y={cy - 6}
          textAnchor="middle"
          fontFamily="IBM Plex Mono, monospace"
          fontSize="10"
          fill={color}
          letterSpacing="2"
        >
          {label.toUpperCase()}
        </text>

        {/* Edge labels */}
        <text x="14"     y={cy + 18} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="#444">MIEDO</text>
        <text x={W - 14} y={cy + 18} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="#444">CODICIA</text>
      </svg>
    </div>
  );
}