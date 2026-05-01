function SkeletonCard() {
  return <div className="h-36 animate-pulse rounded-3xl border border-slate-200 bg-white/80" />;
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-4 w-80 animate-pulse rounded bg-slate-200" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-[32rem] animate-pulse rounded-3xl border border-slate-200 bg-white/80" />
        <div className="h-[32rem] animate-pulse rounded-3xl border border-slate-200 bg-white/80" />
      </div>
    </div>
  );
}
