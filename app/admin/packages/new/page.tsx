'use client';

import React, { useState } from 'react';
import { AdminLayoutShell } from '@/features/admin/components/admin-layout-shell';
import { useRouter } from 'next/navigation';

export default function AdminNewPackagePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const res = await fetch('/api/admin/packages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-tenant-slug': 'demo-tenant' },
        body: JSON.stringify({
          name,
          manufacturer,
          model,
          year: year ? Number(year) : null,
          colours: ['Silver', 'Gloss Black', 'Alpine White'],
          wheelPositions: [
            { axle: 'front', x: 120, y: 220 },
            { axle: 'rear', x: 380, y: 220 },
          ],
          assetReferences: [{ type: 'body', url: '/vehicles/default/body.webp' }],
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        router.push(`/admin/packages/${data.data.id}` as never);
      } else {
        throw new Error(data.error?.message || 'Failed to create package');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating package');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayoutShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">Create New Vehicle Package</h2>
          <p className="text-sm text-neutral-500">Initialize a new vehicle authoring draft package.</p>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl border border-neutral-200 shadow-xs space-y-6">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase mb-2">Package Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Toyota Hilux 2025 SR5"
              className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase mb-2">Manufacturer</label>
              <input
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g. Toyota"
                className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase mb-2">Model</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. Hilux"
                className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase mb-2">Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2025"
              className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-neutral-100">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Creating...' : 'Initialize Package Draft'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayoutShell>
  );
}
