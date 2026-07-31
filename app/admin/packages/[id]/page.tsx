'use client';

import React, { useEffect, useState, use } from 'react';
import { AdminLayoutShell } from '@/features/admin/components/admin-layout-shell';
import type { VehiclePackageDto } from '@/features/packages/types/package';

interface PageProps {
  readonly params: Promise<{ id: string }>;
}

export default function AdminPackageDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const [pkg, setPkg] = useState<VehiclePackageDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/packages/${id}`, { headers: { 'x-tenant-slug': 'demo-tenant' } })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPkg(data.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkg) return;
    try {
      setSaving(true);
      setMessage(null);
      const res = await fetch(`/api/admin/packages/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', 'x-tenant-slug': 'demo-tenant' },
        body: JSON.stringify(pkg),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPkg(data.data);
        setMessage('Package draft successfully updated and validated.');
      } else {
        throw new Error(data.error?.message || 'Failed to update package');
      }
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Error updating package');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!pkg) return;
    try {
      setPublishing(true);
      setMessage(null);
      const res = await fetch(`/api/admin/packages/${id}/publish`, {
        method: 'POST',
        headers: { 'x-tenant-slug': 'demo-tenant' },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPkg(data.data);
        setMessage('Package successfully published and indexed into catalog.');
      } else {
        throw new Error(data.error?.message || 'Publishing validation failed');
      }
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Error publishing package');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <AdminLayoutShell>
        <div className="text-center py-20 text-neutral-500">Loading package...</div>
      </AdminLayoutShell>
    );
  }

  if (!pkg) {
    return (
      <AdminLayoutShell>
        <div className="text-center py-20 text-rose-600">Package not found.</div>
      </AdminLayoutShell>
    );
  }

  return (
    <AdminLayoutShell>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-neutral-900">{pkg.name}</h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  pkg.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                }`}
              >
                {pkg.status} (v{pkg.version})
              </span>
            </div>
            <p className="text-sm text-neutral-500 mt-1">{pkg.manufacturer} {pkg.model} ({pkg.year || 'N/A'})</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={publishing}
              onClick={handlePublish}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {publishing ? 'Publishing...' : 'Validate & Publish'}
            </button>
          </div>
        </div>

        {message && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-medium">
            {message}
          </div>
        )}

        <div className="bg-white p-8 rounded-2xl border border-neutral-200 shadow-xs space-y-6">
          <h3 className="text-base font-bold text-neutral-900 border-b border-neutral-100 pb-3">Validation & Status Report</h3>
          <div className="flex items-center justify-between text-sm bg-neutral-50 p-4 rounded-xl border border-neutral-200">
            <span className="font-medium text-neutral-700">Package Validation State</span>
            <span className={`font-semibold ${pkg.validationState.isValid ? 'text-emerald-600' : 'text-rose-600'}`}>
              {pkg.validationState.isValid ? '✔ Ready for Publishing' : `⚠ Errors: ${pkg.validationState.errors.join(', ')}`}
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="bg-white p-8 rounded-2xl border border-neutral-200 shadow-xs space-y-6">
          <h3 className="text-base font-bold text-neutral-900 border-b border-neutral-100 pb-3">Metadata & Asset References</h3>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase mb-2">Package Name</label>
            <input
              type="text"
              value={pkg.name}
              onChange={(e) => setPkg({ ...pkg, name: e.target.value })}
              className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase mb-2">Manufacturer</label>
              <input
                type="text"
                value={pkg.manufacturer}
                onChange={(e) => setPkg({ ...pkg, manufacturer: e.target.value })}
                className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase mb-2">Model</label>
              <input
                type="text"
                value={pkg.model}
                onChange={(e) => setPkg({ ...pkg, model: e.target.value })}
                className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-neutral-100">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Saving Draft...' : 'Save Draft'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayoutShell>
  );
}
