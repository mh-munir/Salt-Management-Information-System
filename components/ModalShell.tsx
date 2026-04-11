"use client";

import { ReactNode } from "react";

type ModalTone = "sky" | "emerald" | "rose" | "amber" | "slate";

type ModalShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  widthClassName?: string;
  tone?: ModalTone;
};

const toneMap: Record<ModalTone, { badge: string; glow: string; line: string }> = {
  sky: {
    badge: "bg-sky-100 text-sky-700",
    glow: "bg-sky-300/30",
    line: "from-sky-500 via-cyan-400 to-transparent",
  },
  emerald: {
    badge: "bg-emerald-100 text-emerald-700",
    glow: "bg-emerald-300/30",
    line: "from-emerald-500 via-teal-400 to-transparent",
  },
  rose: {
    badge: "bg-rose-100 text-rose-700",
    glow: "bg-rose-300/30",
    line: "from-rose-500 via-orange-400 to-transparent",
  },
  amber: {
    badge: "bg-amber-100 text-amber-700",
    glow: "bg-amber-300/30",
    line: "from-amber-500 via-yellow-400 to-transparent",
  },
  slate: {
    badge: "bg-slate-100 text-slate-700",
    glow: "bg-slate-300/30",
    line: "from-slate-600 via-slate-400 to-transparent",
  },
};

export default function ModalShell({
  title,
  description,
  children,
  footer,
  onClose,
  widthClassName = "max-w-lg",
  tone = "sky",
}: ModalShellProps) {
  const styles = toneMap[tone];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-x-hidden overflow-y-auto bg-slate-950/55 px-4 py-4 backdrop-blur-sm sm:items-center sm:py-6">
      <div
        className={`relative max-h-[calc(100vh-2rem)] w-full overflow-x-hidden overflow-y-auto rounded-md border border-white/70 bg-white shadow-[0_32px_80px_rgba(15,23,42,0.28)] sm:max-h-[calc(100vh-3rem)] ${widthClassName}`}
      >
        <div className={`absolute inset-x-0 top-0 h-1.5 bg-linear-to-r ${styles.line}`} />
        <div className={`pointer-events-none absolute -right-12 top-8 h-28 w-28 rounded-full blur-3xl ${styles.glow}`} />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-24 w-24 rounded-full bg-slate-200/50 blur-3xl" />

        <div className="relative min-w-0 overflow-x-hidden px-6 pb-6 pt-5 sm:px-7 sm:pb-7">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-4">
              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${styles.badge}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                  <path d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4Z" />
                  <path d="M9.5 12.5l1.7 1.7 3.6-4.2" />
                </svg>
              </div>

              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">{title}</h2>
                {description ? <p className="mt-1.5 text-sm leading-6 text-slate-500">{description}</p> : null}
              </div>
            </div>

            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                aria-label="Close dialog"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            ) : null}
          </div>

          <div className="mt-6 min-w-0 overflow-x-hidden">{children}</div>

          {footer ? <div className="mt-6 flex flex-wrap items-center justify-end gap-3 overflow-x-hidden">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
