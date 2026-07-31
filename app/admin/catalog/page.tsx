'use client';

import React, { useEffect, useState } from 'react';
import { AdminLayoutShell } from '@/features/admin/components/admin-layout-shell';
import { AdminTable, type Column } from '@/features/admin/components/admin-table';
import type { AdminCatalogItemDto } from '@/features/admin/types/admin';

export default function AdminCatalogPage() {
  const [items, setItems] = useState<AdminCatalogItemDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/catalog', { headers: { 'x-tenant-slug': 'demo-tenant' } })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setItems(data.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const columns: Column<AdminCatalogItemDto>[] = [
    { key: 'category', header: 'Category', sortable: true },
    { key: 'name', header: 'Item Name', sortable: true },
    { key: 'brand', header: 'Brand', sortable: true },
    {
      key: 'active',
      header: 'Visibility',
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
    {
      key: 'createdAt',
      header: 'Created',
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
      sortable: true,
    },
  ];

  if (loading) {
    return (
      <AdminLayoutShell>
        <div className="text-center py-20 text-neutral-500">Loading catalog...</div>
      </AdminLayoutShell>
    );
  }

  return (
    <AdminLayoutShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">Catalog Management</h2>
            <p className="text-sm text-neutral-500">Manage vehicles, wheels, and tyres available in your showroom.</p>
          </div>
          <button
            type="button"
            onClick={() => alert('Add catalog item modal / form ready for integration.')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition cursor-pointer"
          >
            + Add Catalog Item
          </button>
        </div>

        <AdminTable data={items} columns={columns} searchKey="name" searchPlaceholder="Search catalog items..." />
      </div>
    </AdminLayoutShell>
  );
}
