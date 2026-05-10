export default function DashboardPageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div className="h-8 w-64 rounded-xl bg-slate-200/80" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-44 rounded-lg border border-slate-200 bg-white/90 p-5">
              <div className="h-4 w-28 rounded bg-slate-200/80" />
              <div className="mt-6 h-8 w-36 rounded bg-slate-200/80" />
              <div className="mt-8 h-4 w-44 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="h-8 w-72 rounded-xl bg-slate-200/80" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-44 rounded-lg border border-slate-200 bg-white/90 p-5">
              <div className="h-4 w-24 rounded bg-slate-200/80" />
              <div className="mt-6 h-8 w-32 rounded bg-slate-200/80" />
              <div className="mt-8 h-4 w-40 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-[34rem] rounded-lg border border-slate-200 bg-white/90 p-5" />
        <div className="h-[34rem] rounded-lg border border-slate-200 bg-white/90 p-5" />
      </div>
    </div>
  );
}
