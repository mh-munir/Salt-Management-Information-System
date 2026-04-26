export default async function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer-shell border-t border-slate-200/80 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-7xl justify-center px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-1 text-center text-sm text-slate-500">
          <p>&copy; {year} All rights reserved. Designed and maintained by Munir</p>
        </div>
      </div>
    </footer>
  );
}
