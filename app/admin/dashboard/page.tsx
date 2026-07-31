'use client';

import React, { useEffect, useState } from 'react';
import { AdminLayoutShell } from '@/features/admin/components/admin-layout-shell';
import type { AdminDashboardMetrics } from '@/features/admin/types/admin';

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/dashboard', { headers: { 'x-tenant-slug': 'demo-tenant' } })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setMetrics(data.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(cents / 100);
  };

  if (loading) {
    return (
      <AdminLayoutShell>
        <div className="text-center py-20 text-neutral-500">Loading dashboard...</div>
      </AdminLayoutShell>
    );
  }

  return (
    <AdminLayoutShell>
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Total Quotations</span>
            <p className="text-3xl font-extrabold text-neutral-900 mt-2">{metrics?.totalQuotes ?? 0}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Accepted Quotes</span>
            <p className="text-3xl font-extrabold text-emerald-600 mt-2">{metrics?.acceptedQuotes ?? 0}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Conversion Rate</span>
            <p className="text-3xl font-extrabold text-blue-600 mt-2">{metrics?.conversionRatePercent ?? 0}%</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Estimated Revenue</span>
            <p className="text-3xl font-extrabold text-neutral-900 mt-2">{formatCurrency(metrics?.estimatedRevenueCents ?? 0)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs lg:col-span-2 space-y-4">
            <h3 className="text-base font-bold text-neutral-900">Recent Quote Activity</h3>
            <div className="divide-y divide-neutral-100">
              {(metrics?.recentActivity ?? []).length === 0 ? (
                <p className="py-4 text-sm text-neutral-400">No recent quotes issued.</p>
              ) : (
                (metrics?.recentActivity ?? []).map((q) => (
                  <div key={q.id} className="py-3 flex justify-between items-center text-sm">
                    <div>
                      <p className="font-semibold text-neutral-900">#{q.quoteNumber} — {q.customerName}</p>
                      <p className="text-xs text-neutral-500">{new Date(q.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-neutral-900">{formatCurrency(q.totalCents)}</p>
                      <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                        {q.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-bold text-neutral-900 mb-3">Top Wheel Brands</h3>
              <div className="space-y-2">
                {(metrics?.topWheelBrands ?? []).map((wb) => (
                  <div key={wb.brand} className="flex justify-between items-center text-sm">
                    <span className="font-medium text-neutral-800">{wb.brand}</span>
                    <span className="px-2.5 py-1 bg-neutral-100 rounded-lg text-xs font-semibold text-neutral-700">{wb.count} quotes</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-6">
              <h3 className="text-base font-bold text-neutral-900 mb-3">Top Tyre Brands</h3>
              <div className="space-y-2">
                {(metrics?.topTyreBrands ?? []).map((tb) => (
                  <div key={tb.brand} className="flex justify-between items-center text-sm">
                    <span className="font-medium text-neutral-800">{tb.brand}</span>
                    <span className="px-2.5 py-1 bg-neutral-100 rounded-lg text-xs font-semibold text-neutral-700">{tb.count} quotes</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-6">
              <h3 className="text-base font-bold text-neutral-900 mb-3">System Health</h3>
              <div className="flex items-center justify-between text-sm bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                <span className="text-neutral-600 font-medium">Database Status</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-xs font-semibold">
                  {metrics?.systemHealth.databaseStatus}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayoutShell>
  );
}
