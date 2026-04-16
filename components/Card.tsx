type CardProps = {
  title: string;
  value: string | number;
  className?: string;
  emphasis?: "default" | "featured";
  pieSegments?: Array<{
    label: string;
    value: number;
    color: string;
    valueLabel?: string;
  }>;
  trendPercent?: string;
  trendDetail?: string;
  trendDirection?: "up" | "down" | "neutral";
  visual?: "sparkline" | "ring";
  sparklinePoints?: number[];
  ringPercent?: number;
  icon?: "sales" | "users" | "suppliers" | "activity" | "warning";
  tone?: "sky" | "emerald" | "amber" | "violet" | "rose";
  accentValue?: boolean;
};

const toneClasses = {
  sky: {
    accent: "from-sky-500/18 via-sky-500/8 to-transparent",
    border: "border-sky-100/80",
    iconShell: "bg-sky-50",
    iconColor: "text-sky-600",
    iconColorDark: "dark:text-sky-300",
    titleColor: "text-sky-700 dark:text-sky-300",
    valueColor: "text-sky-700 dark:text-sky-100",
    chartColor: "text-sky-700",
    ringColor: "text-sky-700",
  },
  emerald: {
    accent: "from-emerald-500/18 via-emerald-500/8 to-transparent",
    border: "border-emerald-100/80",
    iconShell: "bg-emerald-50",
    iconColor: "text-emerald-600",
    iconColorDark: "dark:text-emerald-300",
    titleColor: "text-emerald-700 dark:text-emerald-300",
    valueColor: "text-emerald-700 dark:text-slate-100",
    chartColor: "text-emerald-700",
    ringColor: "text-emerald-700",
  },
  amber: {
    accent: "from-amber-500/18 via-amber-500/8 to-transparent",
    border: "border-amber-100/80",
    iconShell: "bg-amber-50",
    iconColor: "text-amber-600",
    iconColorDark: "dark:text-amber-300",
    titleColor: "text-amber-700 dark:text-amber-300",
    valueColor: "text-amber-700 dark:text-slate-100",
    chartColor: "text-amber-700",
    ringColor: "text-amber-700",
  },
  violet: {
    accent: "from-violet-500/18 via-violet-500/8 to-transparent",
    border: "border-violet-100/80",
    iconShell: "bg-violet-50",
    iconColor: "text-violet-600",
    iconColorDark: "dark:text-violet-300",
    titleColor: "text-violet-700 dark:text-violet-300",
    valueColor: "text-violet-700 dark:text-slate-100",
    chartColor: "text-violet-700",
    ringColor: "text-violet-700",
  },
  rose: {
    accent: "from-rose-500/18 via-rose-500/8 to-transparent",
    border: "border-rose-100/80",
    iconShell: "bg-rose-50",
    iconColor: "text-rose-600",
    iconColorDark: "dark:text-rose-300",
    titleColor: "text-rose-700 dark:text-rose-300",
    valueColor: "text-rose-700 dark:text-slate-100",
    chartColor: "text-rose-700",
    ringColor: "text-rose-700",
  },
} as const;

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

const buildPieSegments = (
  segments: NonNullable<CardProps["pieSegments"]>
) => {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  if (total <= 0) return [];

  let currentAngle = -90;

  return segments
    .filter((segment) => segment.value > 0)
    .map((segment) => {
      const sweep = (segment.value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sweep;
      currentAngle = endAngle;

      return {
        ...segment,
        path: describePieSlice(50, 50, 46, startAngle, endAngle),
      };
    });
};

const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
};

const describePieSlice = (
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number
) => {
  const start = polarToCartesian(centerX, centerY, radius, endAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    `M ${centerX} ${centerY}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
};

const buildSparklinePath = (points: number[]) => {
  if (points.length < 2) return null;

  const width = 152;
  const height = 44;
  const xStart = 8;
  const yStart = 8;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;

  const coords = points.map((point, index) => {
    const x = xStart + (index / (points.length - 1)) * width;
    const y = yStart + (1 - (point - min) / range) * height;
    return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
  });

  const path = coords
    .map((coord, index) => `${index === 0 ? "M" : "L"}${coord.x} ${coord.y}`)
    .join(" ");

  return { path, lastPoint: coords[coords.length - 1] };
};

function CardIcon({
  icon,
  className,
}: {
  icon: NonNullable<CardProps["icon"]>;
  className: string;
}) {
  if (icon === "sales") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
        <path d="M4 18h16" />
        <path d="M7 15V9" />
        <path d="M12 15V6" />
        <path d="M17 15v-4" />
      </svg>
    );
  }

  if (icon === "suppliers") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
        <path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9.5Z" />
        <path d="M9 21v-6h6v6" />
      </svg>
    );
  }

  if (icon === "activity") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
        <path d="M3 12h4l2.2-4 4.3 8 2.3-4H21" />
      </svg>
    );
  }

  if (icon === "warning") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
        <path d="M12 4 21 20H3L12 4Z" />
        <path d="M12 9v5" />
        <path d="M12 17h.01" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 17c1.2-2.5 3.1-3.7 5.5-3.7s4.3 1.2 5.5 3.7" />
      <circle cx="17.5" cy="9.5" r="2.2" />
      <path d="M14.8 16.7c.8-1.7 2.1-2.5 3.7-2.5s2.9.8 3.7 2.5" />
    </svg>
  );
}

export default function Card({
  title,
  value,
  className = "",
  emphasis = "default",
  pieSegments = [],
  trendPercent = "--",
  trendDetail = "",
  trendDirection = "up",
  visual,
  sparklinePoints = [],
  ringPercent,
  icon = "users",
  tone = "sky",
  accentValue = false,
}: CardProps) {
  const palette = toneClasses[tone];
  const selectedVisual = visual ?? (tone === "emerald" || tone === "violet" ? "ring" : "sparkline");
  const sparkline = buildSparklinePath(sparklinePoints);
  const ringValue = clampPercent(ringPercent ?? 0);
  const isFeatured = emphasis === "featured";
  const pieChartSegments = buildPieSegments(pieSegments);
  const hasPieChart = pieChartSegments.length > 0;

  return (
    <div
      className={`dashboard-card-shell group relative h-full overflow-hidden rounded-lg border border-gray-200 bg-white/95 px-4 py-5 transition duration-300 hover:-translate-y-0.5 dark:border-slate-700 dark:bg-[#1F2128] sm:px-5 ${className}`.trim()}
    >
      <div
        className={`dashboard-card-gradient pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-br ${palette.accent} opacity-90`}
      />
      <div className="dashboard-card-glow pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.85),transparent_42%)]" />

      <div className="relative flex h-full flex-col">
        <p
          className={`font-bold uppercase ${
            isFeatured
              ? `text-sm tracking-[0.24em] sm:text-base ${palette.titleColor}`
              : "text-xs tracking-[0.2em] text-slate-600 dark:text-slate-200"
          }`}
        >
          {title}
        </p>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={`dashboard-card-surface grid shrink-0 place-items-center rounded-2xl ${palette.iconShell} ring-1 ring-black/5 dark:bg-slate-800 dark:ring-white/10 ${
                isFeatured ? "h-12 w-12" : "h-11 w-11"
              }`}
            >
              <CardIcon
                icon={icon}
                className={`${isFeatured ? "h-5.5 w-5.5" : "h-5 w-5"} ${palette.iconColor} ${palette.iconColorDark}`}
              />
            </span>
            <div className="min-w-0">
              <div
                className={`truncate font-semibold tracking-[-0.03em] ${
                  isFeatured
                    ? `text-3xl sm:text-4xl ${palette.valueColor}`
                    : accentValue
                    ? `text-xl sm:text-2xl ${palette.valueColor}`
                    : "text-xl text-slate-800 dark:text-slate-100 sm:text-2xl"
                }`}
              >
                {value}
              </div>
            </div>
          </div>

          {hasPieChart ? null : selectedVisual === "sparkline" ? (
            <div className="dashboard-card-surface rounded-2xl bg-white/70 p-2.5 ring-1 ring-slate-200/70 backdrop-blur-sm dark:bg-slate-900/80 dark:ring-slate-800">
              <svg
                viewBox="0 0 160 60"
                className={`h-12 w-full max-w-[9rem] shrink-0 self-end sm:w-36 ${palette.chartColor}`}
              >
                {sparkline ? (
                  <>
                    <path
                      d={sparkline.path}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                    />
                    <circle cx={sparkline.lastPoint.x} cy={sparkline.lastPoint.y} r="3.2" fill="currentColor" />
                  </>
                ) : (
                  <path
                    d="M8 48 L152 48"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeDasharray="3 4"
                    strokeLinecap="round"
                    className="opacity-40"
                  />
                )}
              </svg>
            </div>
          ) : (
            <div className="dashboard-card-ring-shell dashboard-card-surface grid h-[4.5rem] w-[4.5rem] shrink-0 place-items-center rounded-2xl bg-white/70 ring-1 ring-slate-200/70 backdrop-blur-sm dark:bg-slate-900/80 dark:ring-slate-800">
              <svg viewBox="0 0 40 40" className="h-14 w-14">
                <circle
                  cx="20"
                  cy="20"
                  r="14"
                  fill="none"
                  stroke="rgb(226 232 240)"
                  strokeWidth="4.5"
                  className="dashboard-card-ring-track"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  pathLength="100"
                  strokeDasharray={`${ringValue} 100`}
                  transform="rotate(-90 20 20)"
                  className={palette.ringColor}
                />
              </svg>
            </div>
          )}
        </div>

        {hasPieChart ? (
          <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center">
            <div className="dashboard-card-surface mx-auto grid h-48 w-48 shrink-0 place-items-center rounded-full bg-white/80 p-2 ring-1 ring-slate-200/70 backdrop-blur-sm dark:bg-slate-900/80 dark:ring-slate-800 md:mx-0">
              <svg viewBox="0 0 100 100" className="h-full w-full">
                {pieChartSegments.map((segment) => (
                  <path
                    key={segment.label}
                    d={segment.path}
                    fill={segment.color}
                    stroke="#ffffff"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                ))}
              </svg>
            </div>

            <div className="grid flex-1 gap-2.5">
              {pieChartSegments.map((segment) => (
                <div
                  key={segment.label}
                  className="dashboard-card-surface flex items-center justify-between gap-3 rounded-2xl bg-white/70 px-3 py-2 ring-1 ring-slate-200/70 backdrop-blur-sm dark:bg-slate-900/80 dark:ring-slate-800"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: segment.color }}
                      aria-hidden="true"
                    />
                    <span className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                      {segment.label}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {segment.valueLabel ?? segment.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4 text-sm">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 font-semibold ${
              trendDirection === "up"
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"
                : trendDirection === "down"
                ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {trendPercent}
          </span>
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className={`h-3.5 w-3.5 ${
              trendDirection === "up"
                ? "text-emerald-500"
                : trendDirection === "down"
                ? "text-rose-500"
                : "text-slate-400"
            }`}
          >
            {trendDirection === "up" ? (
              <path d="m4 12 4-4 3 3 5-5" />
            ) : trendDirection === "down" ? (
              <path d="m4 8 4 4 3-3 5 5" />
            ) : (
              <path d="M4 10h12" />
            )}
          </svg>
          {trendDetail ? (
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{trendDetail}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
