import { getSharedSiteSettingsSnapshot } from "@/lib/site-settings.server";

export default async function SiteFooter() {
  const year = new Date().getFullYear();
  const siteSettings = await getSharedSiteSettingsSnapshot();
  const siteTitle = siteSettings.siteTitle?.trim() || "Salt Management Information System";

  return (
    <footer className="border-t border-slate-200/80 bg-white/92 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-[-0.02em] text-slate-900">{siteTitle}</p>
          <p className="mt-1 text-sm text-slate-500">
            Operational workspace for inventory, transactions, supplier records, and customer accounts.
          </p>
        </div>

        <div className="flex flex-col gap-1 text-sm text-slate-500 lg:items-end">
          <p>&copy; {year} All rights reserved.</p>
          <p>Designed and maintained by Munir</p>
        </div>
      </div>
    </footer>
  );
}
