'use client';

import React, { useState, useMemo } from 'react';

export interface Column<T> {
  readonly key: keyof T | string;
  readonly header: string;
  readonly render?: (row: T) => React.ReactNode;
  readonly sortable?: boolean;
}

interface AdminTableProps<T> {
  readonly data: readonly T[];
  readonly columns: readonly Column<T>[];
  readonly searchKey?: keyof T;
  readonly searchPlaceholder?: string;
  readonly onRowClick?: (row: T) => void;
  readonly actions?: (row: T) => React.ReactNode;
}

export function AdminTable<T extends { readonly id: string }>({
  data,
  columns,
  searchKey,
  searchPlaceholder = 'Search...',
  onRowClick,
  actions,
}: AdminTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filteredData = useMemo(() => {
    if (!searchTerm || !searchKey) return data;
    return data.filter((item) => {
      const val = item[searchKey];
      if (typeof val === 'string') {
        return val.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return false;
    });
  }, [data, searchTerm, searchKey]);

  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortField];
      const bVal = (b as Record<string, unknown>)[sortField];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      const res = aVal < bVal ? -1 : 1;
      return sortDirection === 'asc' ? res : -res;
    });
  }, [filteredData, sortField, sortDirection]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, page, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;

  const handleSort = (field: string, sortable?: boolean) => {
    if (!sortable) return;
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleExportCsv = () => {
    const headers = columns.map((c) => c.header).join(',');
    const rows = sortedData.map((row) =>
      columns.map((c) => JSON.stringify((row as Record<string, unknown>)[c.key as string] ?? '')).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
        {searchKey ? (
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
            className="w-full sm:w-80 px-4 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        ) : <div />}
        <button
          type="button"
          onClick={handleExportCsv}
          className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-sm font-medium transition cursor-pointer"
        >
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold">
                {columns.map((col) => (
                  <th
                    key={String(col.key)}
                    onClick={() => handleSort(String(col.key), col.sortable)}
                    className={`py-3 px-4 ${col.sortable ? 'cursor-pointer hover:bg-neutral-100' : ''}`}
                  >
                    {col.header} {sortField === col.key ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </th>
                ))}
                {actions && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (actions ? 1 : 0)} className="py-8 text-center text-neutral-400">
                    No records found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick?.(row)}
                    className={`hover:bg-neutral-50/80 transition ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    {columns.map((col) => (
                      <td key={String(col.key)} className="py-3 px-4 text-neutral-800">
                        {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key as string] ?? '')}
                      </td>
                    ))}
                    {actions && (
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        {actions(row)}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center px-4 py-3 bg-neutral-50 border-t border-neutral-200 text-sm text-neutral-600">
          <span>
            Showing {paginatedData.length > 0 ? (page - 1) * pageSize + 1 : 0} to{' '}
            {Math.min(page * pageSize, sortedData.length)} of {sortedData.length} entries
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 bg-white border border-neutral-300 rounded-md disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 bg-white border border-neutral-300 rounded-md disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
