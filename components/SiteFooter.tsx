export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-white/90 px-4 py-4 text-center text-sm text-slate-600 backdrop-blur">
      <p>&copy; {year} Salt Management Information System. All rights reserved.</p>
    </footer>
  );
}
