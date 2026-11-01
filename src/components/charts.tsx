"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "./theme";
import { Empty } from "./ui";

// Palet kategorikal, urutan tetap (tidak diputar ulang). Tiap mode punya step warnanya sendiri.
const PALET = {
  dark: {
    series: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"],
    axis: "#8b94b0",
    tick: "#c3c9db",
    grid: "rgba(255,255,255,0.06)",
    cursor: "rgba(255,255,255,0.04)",
    surface: "#0e1529",
  },
  light: {
    series: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"],
    axis: "#5b6478",
    tick: "#374151",
    grid: "rgba(15,23,42,0.07)",
    cursor: "rgba(15,23,42,0.04)",
    surface: "#ffffff",
  },
};

function usePalet() {
  return PALET[useTheme()];
}

function Tip({
  active,
  payload,
  label,
  unit = "orang",
}: {
  active?: boolean;
  payload?: { value: number; name?: string; payload?: { name?: string } }[];
  label?: string;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-line-strong bg-surface-solid px-3 py-2 text-xs shadow-xl">
      <div className="text-muted">{label ?? p.payload?.name ?? p.name}</div>
      <div className="mt-0.5 font-semibold text-ink">
        {p.value} {unit}
      </div>
    </div>
  );
}

/** Bar horizontal satu seri — cocok untuk label kategori yang panjang */
export function HBar({
  data,
  series = 0,
  unit,
  max = 12,
}: {
  data: { name: string; value: number }[];
  /** indeks warna di palet kategorikal */
  series?: number;
  unit?: string;
  max?: number;
}) {
  const p = usePalet();
  const color = p.series[series];
  if (!data.length) return <Empty>Belum ada data.</Empty>;
  const rows = data.slice(0, max);
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, rows.length * 34 + 20)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 0, right: 28, top: 4, bottom: 4 }} barCategoryGap={6}>
        <CartesianGrid horizontal={false} stroke={p.grid} />
        <XAxis type="number" allowDecimals={false} tick={{ fill: p.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={150}
          tick={{ fill: p.tick, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<Tip unit={unit} />} cursor={{ fill: p.cursor }} />
        <Bar
          dataKey="value"
          fill={color}
          radius={[0, 4, 4, 0]}
          maxBarSize={22}
          label={{ position: "right", fill: p.tick, fontSize: 11 }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Donut dengan legenda + persentase (identitas tidak hanya lewat warna) */
export function Donut({ data, unit }: { data: { name: string; value: number }[]; unit?: string }) {
  const p = usePalet();
  const SERIES = p.series;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <Empty>Belum ada data.</Empty>;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative h-44 w-44 shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={52}
              outerRadius={80}
              paddingAngle={2}
              stroke={p.surface}
              strokeWidth={2}
            >
              {data.map((d, i) => (
                <Cell key={d.name} fill={SERIES[i % SERIES.length]} />
              ))}
            </Pie>
            <Tooltip content={<Tip unit={unit} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-2xl font-bold">{total}</div>
            <div className="text-[11px] text-muted">total</div>
          </div>
        </div>
      </div>
      <ul className="min-w-[140px] flex-1 space-y-2 text-sm">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES[i % SERIES.length] }} />
            <span className="flex-1 text-muted">{d.name}</span>
            <span className="font-medium">{d.value}</span>
            <span className="w-10 text-right text-xs text-faint">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Tren kehadiran per minggu */
export function TrendArea({ data, height = 220 }: { data: { name: string; value: number }[]; height?: number }) {
  const p = usePalet();
  const SERIES = p.series;
  if (!data.length) return <Empty>Belum ada data absensi.</Empty>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="trend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES[0]} stopOpacity={0.35} />
            <stop offset="100%" stopColor={SERIES[0]} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={p.grid} />
        <XAxis dataKey="name" tick={{ fill: p.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fill: p.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<Tip />} cursor={{ stroke: p.axis }} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={SERIES[0]}
          strokeWidth={2}
          fill="url(#trend)"
          dot={{ r: 3, fill: SERIES[0], stroke: p.surface, strokeWidth: 2 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
