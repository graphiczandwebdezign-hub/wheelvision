'use client';

import React, { useEffect, useState } from 'react';
import { AdminLayoutShell } from '@/features/admin/components/admin-layout-shell';
import type { AdminTenantSettingsDto } from '@/features/admin/types/admin';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminTenantSettingsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings', { headers: { 'x-tenant-slug': 'demo-tenant' } })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSettings(data.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      setSaving(true);
      setMessage(null);
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', 'x-tenant-slug': 'demo-tenant' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage('Settings successfully saved.');
      } else {
        throw new Error(data.error?.message || 'Failed to save settings');
      }
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayoutShell>
        <div className="text-center py-20 text-neutral-500">Loading settings...</div>
      </AdminLayoutShell>
    );
  }

  return (
    <AdminLayoutShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">Tenant & Dealership Settings</h2>
          <p className="text-sm text-neutral-500">Configure dealership details, regional preferences, and quotation rules.</p>
        </div>

        {message && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-medium">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl border border-neutral-200 shadow-xs space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase mb-2">Dealership Name</label>
              <input
                type="text"
                value={settings?.dealerName ?? ''}
                onChange={(e) => setSettings((s) => (s ? { ...s, dealerName: e.target.value } : null))}
                className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase mb-2">Telephone</label>
              <input
                type="text"
                value={settings?.telephone ?? ''}
                onChange={(e) => setSettings((s) => (s ? { ...s, telephone: e.target.value } : null))}
                className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase mb-2">Email Address</label>
              <input
                type="email"
                value={settings?.email ?? ''}
                onChange={(e) => setSettings((s) => (s ? { ...s, email: e.target.value } : null))}
                className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase mb-2">Website</label>
              <input
                type="text"
                value={settings?.website ?? ''}
                onChange={(e) => setSettings((s) => (s ? { ...s, website: e.target.value } : null))}
                className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase mb-2">VAT Number</label>
              <input
                type="text"
                value={settings?.vatNumber ?? ''}
                onChange={(e) => setSettings((s) => (s ? { ...s, vatNumber: e.target.value } : null))}
                className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase mb-2">Company Registration</label>
              <input
                type="text"
                value={settings?.companyRegistration ?? ''}
                onChange={(e) => setSettings((s) => (s ? { ...s, companyRegistration: e.target.value } : null))}
                className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase mb-2">Quote Validity (Days)</label>
              <input
                type="number"
                value={settings?.quoteValidityDays ?? 30}
                onChange={(e) => setSettings((s) => (s ? { ...s, quoteValidityDays: Number(e.target.value) } : null))}
                className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase mb-2">Currency</label>
              <input
                type="text"
                value={settings?.currency ?? 'ZAR'}
                onChange={(e) => setSettings((s) => (s ? { ...s, currency: e.target.value } : null))}
                className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase mb-2">Physical Address</label>
            <textarea
              value={settings?.address ?? ''}
              onChange={(e) => setSettings((s) => (s ? { ...s, address: e.target.value } : null))}
              rows={3}
              className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-neutral-100">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayoutShell>
  );
}
