'use client';

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-8 text-slate-100">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center">
        <h2 className="text-2xl font-semibold">Something went wrong.</h2>
        <p className="mt-3 text-slate-400">Please try again.</p>
        <button
          className="mt-6 rounded-full bg-cyan-500 px-5 py-2 font-medium text-slate-950"
          onClick={() => reset()}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
