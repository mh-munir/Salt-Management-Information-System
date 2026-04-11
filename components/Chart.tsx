"use client";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type RevenuePoint = {
  label: string;
  orders: number;
  refunds: number;
};

type SalesChartProps = {
  data: RevenuePoint[];
};

const formatAxisAmount = (value: number) =>
  new Intl.NumberFormat("en-BD", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const formatTooltipAmount = (value: number) =>
  `Tk ${new Intl.NumberFormat("en-BD", { maximumFractionDigits: 0 }).format(value)}`;

const getTooltipAmount = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (Array.isArray(value) && value.length > 0) {
    return getTooltipAmount(value[0]);
  }

  return 0;
};

export default function SalesChart({ data }: SalesChartProps) {
  return (
    <div className="h-60 w-full min-w-0 min-h-60 sm:h-75 sm:min-h-75">
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        minHeight={240}
        initialDimension={{ width: 320, height: 240 }}
      >
        <LineChart data={data} margin={{ top: 10, right: 6, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 4" vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            tickFormatter={(value: string) => {
              const day = Number.parseInt(value, 10);
              if (Number.isNaN(day)) return value;
              return day % 2 === 1 ? value : "";
            }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#64748b", fontSize: 11 }}
            tickFormatter={formatAxisAmount}
            width={42}
          />
          <Tooltip
            cursor={{ fill: "rgba(226, 232, 240, 0.5)" }}
            formatter={(value, name) => [
              formatTooltipAmount(getTooltipAmount(value)),
              name === "refunds" ? "Refunds" : "Revenue",
            ]}
            labelStyle={{ color: "#0f172a", fontWeight: 600 }}
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              background: "rgba(255,255,255,0.95)",
              boxShadow: "0 10px 20px rgba(15,23,42,0.08)",
            }}
          />
          <Line
            type="monotone"
            dataKey="orders"
            stroke="#3b82f6"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: "#3b82f6" }}
          />
          <Line
            type="monotone"
            dataKey="refunds"
            stroke="#14b8a6"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: "#14b8a6" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
