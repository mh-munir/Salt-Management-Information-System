type ProfitRingSegment = {
  color: string;
  label: string;
  value: number;
  percent: number;
  dashArray: string;
  dashOffset: number;
};

type ProfitDetailRow = {
  color: string;
  label: string;
  value: number;
  percent: number;
};

type Props = {
  language: "en" | "bn";
  totalProfitAmount: number;
  totalProfitPercent: number;
  totalBusinessInvestment: number;
  totalBusinessReturn: number;
  profitPieRingSegments: ProfitRingSegment[];
  investmentMixRows: ProfitDetailRow[];
  returnMixRows: ProfitDetailRow[];
  formatFullCurrency: (amount: number) => string;
  formatPercent: (amount: number) => string;
};

export default function DashboardChartsSection({
  language,
  totalProfitAmount,
  totalProfitPercent,
  totalBusinessInvestment,
  totalBusinessReturn,
  profitPieRingSegments,
  investmentMixRows,
  returnMixRows,
  formatFullCurrency,
  formatPercent,
}: Props) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/90 p-4 flex flex-col items-center">
      <h3 className="mb-2 text-lg font-semibold">{language === "bn" ? "লাভের পাই চার্ট" : "Profit Pie Chart"}</h3>
      <div className="flex w-full flex-col items-center" style={{ minHeight: 260, maxWidth: 340 }}>
        {profitPieRingSegments.length > 0 ? (
          <>
            <div className="relative grid h-56 w-56 place-items-center">
              <svg viewBox="0 0 120 120" className="h-56 w-56 -rotate-90">
                <circle cx="60" cy="60" r="42" fill="none" stroke="#e2e8f0" strokeWidth="16" />
                {profitPieRingSegments.map((segment) => (
                  <circle
                    key={segment.label}
                    cx="60"
                    cy="60"
                    r="42"
                    fill="none"
                    stroke={segment.color}
                    strokeWidth="16"
                    strokeLinecap="round"
                    pathLength="100"
                    strokeDasharray={segment.dashArray}
                    strokeDashoffset={segment.dashOffset}
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {totalProfitAmount >= 0 ? (language === "bn" ? "নিট লাভ" : "Net Profit") : language === "bn" ? "নিট ক্ষতি" : "Net Loss"}
                </span>
                <span className={`mt-1 text-2xl font-bold ${totalProfitAmount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {`${totalProfitAmount < 0 ? "-" : ""}${formatPercent(Math.abs(totalProfitPercent))}%`}
                </span>
                <span className="mt-1 text-xs text-slate-500">
                  {`${totalProfitAmount < 0 ? "-" : ""}Tk ${formatFullCurrency(Math.abs(totalProfitAmount))}`}
                </span>
              </div>
            </div>

            <div className="mt-2 grid w-full gap-2">
              {profitPieRingSegments.map((segment) => (
                <div key={segment.label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: segment.color }} aria-hidden="true" />
                    <span>{segment.label}</span>
                  </div>
                  <span className="font-medium text-slate-900">
                    {`Tk ${formatFullCurrency(segment.value)} (${formatPercent(segment.percent)}%)`}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex h-56 w-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
            {language === "bn" ? "চার্ট দেখানোর মতো ডেটা নেই" : "No data available for chart"}
          </div>
        )}
      </div>
      <div className="mt-4 grid w-full gap-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {language === "bn" ? "বিনিয়োগের হিসাব" : "Investment Mix"}
            </span>
            <span className="text-sm font-semibold text-slate-900">{`Tk ${formatFullCurrency(totalBusinessInvestment)}`}</span>
          </div>
          <div className="mt-2 grid gap-2">
            {investmentMixRows.map((segment) => (
              <div key={segment.label} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: segment.color }} aria-hidden="true" />
                  <span>{segment.label}</span>
                </div>
                <span className="font-medium text-slate-900">{`Tk ${formatFullCurrency(segment.value)} (${formatPercent(segment.percent)}%)`}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {language === "bn" ? "রিটার্নের হিসাব" : "Return Mix"}
            </span>
            <span className="text-sm font-semibold text-slate-900">{`Tk ${formatFullCurrency(totalBusinessReturn)}`}</span>
          </div>
          <div className="mt-2 grid gap-2">
            {returnMixRows.map((segment) => (
              <div key={segment.label} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: segment.color }} aria-hidden="true" />
                  <span>{segment.label}</span>
                </div>
                <span className="font-medium text-slate-900">{`Tk ${formatFullCurrency(segment.value)} (${formatPercent(segment.percent)}%)`}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
