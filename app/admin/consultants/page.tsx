'use client';

import React, { useEffect, useState } from 'react';
import { AdminLayoutShell } from '@/features/admin/components/admin-layout-shell';
import { AdminTable, type Column } from '@/features/admin/components/admin-table';
import type { AdminConsultantDto } from '@/features/admin/types/admin';

export default function AdminConsultantsPage() {
  const [consultants, setConsultants] = useState<AdminConsultantDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/consultants', { headers: { 'x-tenant-slug': 'demo-tenant' } })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setConsultants(data.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const columns: Column<AdminConsultantDto>[] = [
    { key: 'name', header: 'Consultant Name', sortable: true },
    { key: 'email', header: 'Email Address', sortable: true },
    { key: 'phone', header: 'Phone Number' },
    {
      key: 'active',
      header: 'Status',
      render: (row) => (
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
            row.active ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-700'
          }`}
        >
          {row.active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <AdminLayoutShell>
        <div className="text-center py-20 text-neutral-500">Loading consultants...</div>
      </AdminLayoutShell>
    );
  }

  return (
    <AdminLayoutShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">Consultant Management</h2>
            <p className="text-sm text-neutral-500">Manage dealer consultants and default assignment.</p>
          </div>
          <button
            type="button"
            onClick={() => alert('Add consultant modal ready.')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition cursor-pointer"
          >
            + Add Consultant
          </button>
        </div>

        <AdminTable data={consultants} columns={columns} searchKey="name" searchPlaceholder="Search consultants..." />
      </div>
    </AdminLayoutShell>
  );
}
