import Link from "next/link";

type ContactEntry = {
  id: string;
  href: string;
  typeLabel: string;
  accentClass: string;
  name: string;
  phone: string;
};

type Props = {
  language: "en" | "bn";
  contactStream: ContactEntry[];
  contactDirectoryLabel: string;
  liveContactStreamLabel: string;
  noContactsFoundLabel: string;
  viewLabel: string;
};

export default function DashboardContactStreamSection({
  contactStream,
  contactDirectoryLabel,
  liveContactStreamLabel,
  noContactsFoundLabel,
  viewLabel,
}: Props) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{contactDirectoryLabel}</p>
          <p className="mt-1 text-xs text-slate-500">{liveContactStreamLabel}</p>
        </div>
        <span className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-slate-600">{contactStream.length}</span>
      </div>

      <div className="scroll-pause-shell relative mt-4 h-72 overflow-hidden">
        {contactStream.length > 0 ? (
          <div className="vertical-scroll-up space-y-3">
            {[...contactStream, ...contactStream].map((entry, index) => (
              <div
                key={`${entry.id}-${index}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{entry.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{entry.phone}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-lg px-3 py-1 text-[11px] font-semibold ${entry.accentClass}`}>{entry.typeLabel}</span>
                  {entry.href ? (
                    <Link
                      href={entry.href}
                      prefetch
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      {viewLabel}
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/80 px-4 text-center text-sm text-slate-500">
            {noContactsFoundLabel}
          </div>
        )}
      </div>
    </div>
  );
}
