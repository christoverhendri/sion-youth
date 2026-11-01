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
import { Empty } from "./ui";

// Palet kategorikal (versi mode gelap), urutan tetap — tidak diputar ulang.
export const SERIES = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];
const AXIS = "#8b94b0";
const GRID = "rgba(255,255,255,0.06)";

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
  color = SERIES[0],
  unit,
  max = 12,
}: {
  data: { name: string; value: number }[];
  color?: string;
  unit?: string;
  max?: number;
}) {
  if (!data.length) return <Empty>Belum ada data.</Empty>;
  const rows = data.slice(0, max);
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, rows.length * 34 + 20)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 0, right: 28, top: 4, bottom: 4 }} barCategoryGap={6}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" allowDecimals={false} tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={150}
          tick={{ fill: "#c3c9db", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<Tip unit={unit} />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar
          dataKey="value"
          fill={color}
          radius={[0, 4, 4, 0]}
          maxBarSize={22}
          label={{ position: "right", fill: "#c3c9db", fontSize: 11 }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Donut dengan legenda + persentase (identitas tidak hanya lewat warna) */
export function Donut({ data, unit }: { data: { name: string; value: number }[]; unit?: string }) {
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
              stroke="#0e1529"
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
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="name" tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<Tip />} cursor={{ stroke: "rgba(255,255,255,0.2)" }} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={SERIES[0]}
          strokeWidth={2}
          fill="url(#trend)"
          dot={{ r: 3, fill: SERIES[0], stroke: "#0e1529", strokeWidth: 2 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
