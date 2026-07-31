'use client';

import React, { useEffect, useState } from 'react';
import { AdminLayoutShell } from '@/features/admin/components/admin-layout-shell';
import { AdminTable, type Column } from '@/features/admin/components/admin-table';
import type { VehiclePackageDto } from '@/features/packages/types/package';
import Link from 'next/link';

export default function AdminPackagesPage() {
  const [packages, setPackages] = useState<VehiclePackageDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/packages', { headers: { 'x-tenant-slug': 'demo-tenant' } })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPackages(data.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const columns: Column<VehiclePackageDto>[] = [
    { key: 'name', header: 'Package Name', sortable: true },
    { key: 'manufacturer', header: 'Manufacturer', sortable: true },
    { key: 'model', header: 'Model', sortable: true },
    { key: 'version', header: 'Version', sortable: true },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
            row.status === 'PUBLISHED'
              ? 'bg-emerald-100 text-emerald-800'
              : row.status === 'ARCHIVED'
              ? 'bg-neutral-200 text-neutral-700'
              : 'bg-blue-100 text-blue-800'
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <Link
          href={`/admin/packages/${row.id}` as never}
          className="text-blue-600 hover:text-blue-800 font-semibold text-xs"
        >
          Edit / Author →
        </Link>
      ),
    },
  ];

  if (loading) {
    return (
      <AdminLayoutShell>
        <div className="text-center py-20 text-neutral-500">Loading vehicle packages...</div>
      </AdminLayoutShell>
    );
  }

  return (
    <AdminLayoutShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">Vehicle Package Authoring</h2>
            <p className="text-sm text-neutral-500">Create, validate, author metadata, and publish vehicle packages.</p>
          </div>
          <Link
            href={'/admin/packages/new' as never}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
          >
            + New Vehicle Package
          </Link>
        </div>

        <AdminTable data={packages} columns={columns} searchKey="name" searchPlaceholder="Search packages..." />
      </div>
    </AdminLayoutShell>
  );
}
