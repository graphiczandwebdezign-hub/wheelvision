'use client';

import React, { useEffect, useState } from 'react';
import { AdminLayoutShell } from '@/features/admin/components/admin-layout-shell';
import { AdminTable, type Column } from '@/features/admin/components/admin-table';
import type { AdminPromotionDto } from '@/features/admin/types/admin';

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<AdminPromotionDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/promotions', { headers: { 'x-tenant-slug': 'demo-tenant' } })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPromotions(data.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const columns: Column<AdminPromotionDto>[] = [
    { key: 'name', header: 'Promotion Name', sortable: true },
    { key: 'kind', header: 'Type', sortable: true },
    {
      key: 'value',
      header: 'Discount Value',
      render: (row) =>
        row.kind === 'PERCENT'
          ? `${(row.percentBasisPoints ?? 0) / 100}%`
          : `R ${((row.amountCents ?? 0) / 100).toFixed(2)}`,
    },
    { key: 'priority', header: 'Priority', sortable: true },
    {
      key: 'active',
      header: 'Status',
      render: (row) => (
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
            row.active ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-700'
          }`}
        >
          {row.active ? 'Active' : 'Disabled'}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <AdminLayoutShell>
        <div className="text-center py-20 text-neutral-500">Loading promotions...</div>
      </AdminLayoutShell>
    );
  }

  return (
    <AdminLayoutShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">Promotion Management</h2>
            <p className="text-sm text-neutral-500">Configure percentage and fixed discount campaigns.</p>
          </div>
          <button
            type="button"
            onClick={() => alert('Create promotion modal ready.')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition cursor-pointer"
          >
            + New Promotion
          </button>
        </div>

        <AdminTable data={promotions} columns={columns} searchKey="name" searchPlaceholder="Search promotions..." />
      </div>
    </AdminLayoutShell>
  );
}
