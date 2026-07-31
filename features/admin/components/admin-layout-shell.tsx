'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: 'Dashboard', href: '/admin/dashboard' },
  { label: 'Catalog', href: '/admin/catalog' },
  { label: 'Pricing', href: '/admin/pricing' },
  { label: 'Promotions', href: '/admin/promotions' },
  { label: 'Consultants', href: '/admin/consultants' },
  { label: 'Settings', href: '/admin/settings' },
];

export function AdminLayoutShell({ children }: { readonly children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-neutral-900 text-white flex flex-col border-r border-neutral-800">
        <div className="p-6 border-b border-neutral-800">
          <h2 className="text-xl font-black tracking-tight text-white">WheelVision Admin</h2>
          <p className="text-xs text-neutral-400 mt-1">Dealer Management Platform</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href as never}
                className={`block px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-neutral-800">
          <Link
            href={'/preview' as never}
            className="block text-center px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-semibold transition"
          >
            ← Back to Configurator
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-neutral-200 px-8 py-4 flex justify-between items-center shadow-xs">
          <h1 className="text-lg font-bold text-neutral-900 capitalize">
            {pathname.split('/').pop() || 'Dashboard'}
          </h1>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            Tenant: Demo Dealership
          </span>
        </header>
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
