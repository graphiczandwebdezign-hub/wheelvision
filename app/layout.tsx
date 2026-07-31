import './globals.css';
import type { Metadata } from 'next';
import { QueryProvider } from '@/components/providers/query-provider';

export const metadata: Metadata = {
  title: 'WheelVision',
  description: 'Metadata-driven wheel and tyre preview SaaS',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{<QueryProvider>{children}</QueryProvider>}</body>
    </html>
  );
}
