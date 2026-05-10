export default function TransactionsPageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="p-4">
        <div className="h-8 w-56 rounded-xl bg-slate-200/80" />
        <div className="mt-3 h-4 w-80 rounded bg-slate-100" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-slate-200 bg-white/90 p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="h-6 w-48 rounded bg-slate-200/80" />
                <div className="mt-3 h-9 w-28 rounded-lg bg-slate-100" />
              </div>
              <div className="h-10 w-32 rounded-lg bg-slate-100" />
            </div>
            <div className="mt-6 space-y-3">
              {Array.from({ length: 5 }).map((_, rowIndex) => (
                <div key={rowIndex} className="h-12 rounded-lg bg-slate-50" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
