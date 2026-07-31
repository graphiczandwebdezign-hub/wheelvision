'use client';

import React, { useState } from 'react';
import type { QuoteDetail, QuoteStatusDetail } from '@/types/quote';
import { QuoteVerificationBadge } from './quote-verification-badge';
import { QuoteValidityCountdown } from './quote-validity-countdown';
import { QuoteCommercialSummary } from './quote-commercial-summary';
import { QuoteQr } from './quote-qr';
import { QuoteTimeline } from './quote-timeline';

interface QuoteViewerProps {
  readonly initialQuote: QuoteDetail;
  readonly initialStatus: QuoteStatusDetail;
}

export function QuoteViewer({ initialQuote, initialStatus }: QuoteViewerProps) {
  const [quote, setQuote] = useState<QuoteDetail>(initialQuote);
  const [statusDetail, setStatusDetail] = useState<QuoteStatusDetail>(initialStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleStatusChange = async (newStatus: 'ACCEPTED' | 'REJECTED' | 'CANCELLED') => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/quotes/${quote.quoteNumber}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: newStatus, actorName: quote.customer.name }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to update quotation status');
      }
      setQuote(data.data);
      const statusRes = await fetch(`/api/quotes/${quote.quoteNumber}/status`);
      const statusData = await statusRes.json();
      if (statusRes.ok) {
        setStatusDetail(statusData.data);
      }
      setSuccessMessage(`Quotation successfully marked as ${newStatus.toLowerCase()}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const snapshot = quote.snapshot;
  const vehicle = snapshot?.vehicle;
  const wheel = snapshot?.wheel;
  const tyre = snapshot?.tyre;

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 space-y-8">
      <div className="bg-white rounded-2xl border border-neutral-200 p-8 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xl font-extrabold tracking-tight text-neutral-900">{quote.dealer.name}</span>
            <QuoteVerificationBadge status={statusDetail.status} isExpired={statusDetail.isExpired} />
          </div>
          <p className="text-sm font-mono text-neutral-500">Quotation #{quote.quoteNumber}</p>
          <p className="text-xs text-neutral-400 mt-1">Issued: {new Date(quote.createdAt).toLocaleDateString()}</p>
        </div>
        <QuoteQr quoteNumber={quote.quoteNumber} />
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-medium">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <QuoteValidityCountdown validUntil={quote.validUntil} isExpired={statusDetail.isExpired} />

        {statusDetail.canBeAccepted && (
          <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl border border-neutral-200 shadow-xs items-center justify-between">
            <span className="text-sm font-medium text-neutral-700">Customer Action Required:</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleStatusChange('ACCEPTED')}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                Accept Quotation
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleStatusChange('REJECTED')}
                className="px-5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-sm font-semibold transition disabled:opacity-50 cursor-pointer"
              >
                Reject
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs">
          <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Customer Details</h4>
          <p className="text-base font-bold text-neutral-900">{quote.customer.name}</p>
          <p className="text-sm text-neutral-600">{quote.customer.email || 'No email provided'}</p>
          <p className="text-sm text-neutral-600">{quote.customer.phone || 'No phone provided'}</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs">
          <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Consultant Details</h4>
          <p className="text-base font-bold text-neutral-900">{quote.consultantName || 'Authorized Consultant'}</p>
          <p className="text-sm text-neutral-600">{quote.dealer.name}</p>
        </div>
      </div>

      {vehicle && (
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-neutral-900 border-b border-neutral-100 pb-3">Vehicle & Wheel Specification</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <span className="block text-xs font-semibold text-neutral-400 uppercase">Vehicle</span>
              <p className="font-semibold text-neutral-900 mt-1">{vehicle.manufacturer} {vehicle.model} {vehicle.variant}</p>
              {snapshot?.colour && <p className="text-xs text-neutral-500 mt-0.5">Colour: {snapshot.colour}</p>}
            </div>
            <div>
              <span className="block text-xs font-semibold text-neutral-400 uppercase">Wheel Package</span>
              <p className="font-semibold text-neutral-900 mt-1">{wheel?.brand} {wheel?.model}</p>
              {wheel?.finish && <p className="text-xs text-neutral-500 mt-0.5">Finish: {wheel.finish}</p>}
              {wheel?.size && <p className="text-xs text-neutral-500 mt-0.5">Size: {wheel.size.size}</p>}
            </div>
            <div>
              <span className="block text-xs font-semibold text-neutral-400 uppercase">Tyre Package</span>
              <p className="font-semibold text-neutral-900 mt-1">{tyre?.brand} {tyre?.pattern}</p>
              {tyre?.profile && <p className="text-xs text-neutral-500 mt-0.5">Profile: {tyre.profile.profile}</p>}
            </div>
          </div>
        </div>
      )}

      <QuoteCommercialSummary quote={quote} />

      <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-6 text-xs text-neutral-500 space-y-2">
        <h5 className="font-semibold text-neutral-700 uppercase">Terms & Conditions</h5>
        <p>1. This quotation is valid for {Math.round((new Date(quote.validUntil).getTime() - new Date(quote.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days from issue date.</p>
        <p>2. Prices are subject to stock availability upon formal order placement.</p>
        <p>3. All goods remain property of {quote.dealer.name} until paid in full.</p>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs">
        <QuoteTimeline history={statusDetail.history} />
      </div>
    </div>
  );
}
