'use client';

import React, { useEffect, useState } from 'react';
import { AdminLayoutShell } from '@/features/admin/components/admin-layout-shell';
import type { AdminPricingDto } from '@/features/admin/types/admin';

export default function AdminPricingPage() {
  const [pricing, setPricing] = useState<AdminPricingDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/pricing', { headers: { 'x-tenant-slug': 'demo-tenant' } })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPricing(data.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: pricing?.currency || 'ZAR' }).format(cents / 100);
  };

  if (loading) {
    return (
      <AdminLayoutShell>
        <div className="text-center py-20 text-neutral-500">Loading pricing...</div>
      </AdminLayoutShell>
    );
  }

  return (
    <AdminLayoutShell>
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">{pricing?.priceListName}</h2>
            <p className="text-sm text-neutral-500">Price Book & Labour Rates (VAT: {pricing ? pricing.vatBasisPoints / 100 : 15}%)</p>
          </div>
          <button
            type="button"
            onClick={() => alert('Save pricing changes workflow.')}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition cursor-pointer"
          >
            Save Pricing Rules
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-neutral-900 border-b border-neutral-100 pb-3">Wheel Pricing</h3>
            <div className="space-y-3">
              {(pricing?.wheelPrices ?? []).map((wp) => (
                <div key={wp.id} className="flex justify-between items-center text-sm py-2 border-b border-neutral-50 last:border-0">
                  <span className="font-medium text-neutral-800">{wp.wheelName}</span>
                  <span className="font-bold text-neutral-900">{formatCurrency(wp.amountCents)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-neutral-900 border-b border-neutral-100 pb-3">Tyre Pricing</h3>
            <div className="space-y-3">
              {(pricing?.tyrePrices ?? []).map((tp) => (
                <div key={tp.id} className="flex justify-between items-center text-sm py-2 border-b border-neutral-50 last:border-0">
                  <span className="font-medium text-neutral-800">{tp.tyreName}</span>
                  <span className="font-bold text-neutral-900">{formatCurrency(tp.amountCents)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-neutral-900 border-b border-neutral-100 pb-3">Labour & Service Fees</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {(pricing?.labourPrices ?? []).map((lp) => (
              <div key={lp.id} className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{lp.serviceType} ({lp.unit})</span>
                <p className="text-xl font-bold text-neutral-900 mt-2">{formatCurrency(lp.amountCents)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayoutShell>
  );
}
