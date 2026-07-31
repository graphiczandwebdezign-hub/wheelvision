export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-8 text-slate-100">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center">
        <h2 className="text-2xl font-semibold">Page not found.</h2>
        <p className="mt-3 text-slate-400">The requested route could not be found.</p>
      </div>
    </div>
  );
}
