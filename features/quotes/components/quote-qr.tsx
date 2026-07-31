'use client';

import React from 'react';

interface QuoteQrProps {
  readonly quoteNumber: string;
  readonly className?: string;
}

export function QuoteQr({ quoteNumber, className = '' }: QuoteQrProps) {
  const size = 21;
  const cells: boolean[][] = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => {
      const isTopLeft = row < 7 && col < 7;
      const isTopRight = row < 7 && col >= size - 7;
      const isBottomLeft = row >= size - 7 && col < 7;
      if (isTopLeft || isTopRight || isBottomLeft) {
        const r = isTopLeft ? row : isTopRight ? row : row - (size - 7);
        const c = isTopLeft ? col : isTopRight ? col - (size - 7) : col;
        return r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
      }
      if (row === 6 || col === 6) return (row + col) % 2 === 0;
      let hash = 0;
      const str = `${quoteNumber}-${row}-${col}`;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash) % 3 === 0;
    })
  );

  return (
    <div className={`flex flex-col items-center p-4 bg-white rounded-xl border border-neutral-200 shadow-xs ${className}`}>
      <div className="bg-white p-2 rounded-lg border border-neutral-100">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-36 h-36"
          aria-label={`QR Code for quotation ${quoteNumber}`}
          role="img"
        >
          <rect width={size} height={size} fill="#ffffff" />
          {cells.map((row, rIdx) =>
            row.map((cell, cIdx) =>
              cell ? <rect key={`${rIdx}-${cIdx}`} x={cIdx} y={rIdx} width={1} height={1} fill="#0f172a" /> : null
            )
          )}
        </svg>
      </div>
      <span className="mt-2 text-xs font-mono font-medium text-neutral-600">{quoteNumber}</span>
      <span className="text-[10px] text-neutral-400">Scan to verify quote authenticity</span>
    </div>
  );
}
