"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
      <h2 className="text-lg font-semibold">Something went wrong in the dashboard.</h2>
      <p className="mt-2 text-sm">{error.message || "Please try refreshing this page."}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 inline-flex rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
      >
        Try again
      </button>
    </div>
  );
}
