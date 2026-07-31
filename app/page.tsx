import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-10 shadow-2xl">
          <p className="mb-3 text-sm uppercase tracking-[0.35em] text-cyan-400">WheelVision SaaS</p>
          <h1 className="text-4xl font-semibold sm:text-6xl">Metadata-driven wheel previews for modern dealers.</h1>
          <p className="mt-6 max-w-3xl text-lg text-slate-300">
            A scalable multi-tenant platform for tyre shops and wheel dealers, built around a generic renderer that consumes metadata and assets rather than hardcoded vehicle logic.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/preview" className="rounded-full bg-cyan-500 px-6 py-3 font-medium text-slate-950 transition hover:bg-cyan-400">
              Open preview demo
            </Link>
            <Link href="/admin" className="rounded-full border border-slate-700 px-6 py-3 font-medium text-slate-100 transition hover:border-cyan-400 hover:text-cyan-300">
              Admin workspace
            </Link>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-xl font-semibold">Data-driven renderer</h2>
            <p className="mt-3 text-sm text-slate-400">Vehicle placement and wheel scaling are driven by metadata, enabling new vehicles without renderer changes.</p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-xl font-semibold">Multi-tenant by design</h2>
            <p className="mt-3 text-sm text-slate-400">Shared PostgreSQL with row-level security keeps each dealer isolated and scalable.</p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-xl font-semibold">Production foundation</h2>
            <p className="mt-3 text-sm text-slate-400">The structure reflects Next.js, React, TypeScript, and a testable architecture from day one.</p>
          </article>
        </section>
      </div>
    </main>
  );
}
