import { VehiclePreview } from '@/features/preview/components/vehicle-preview';

export default function PreviewPage() {
  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <VehiclePreview />
      </div>
    </main>
  );
}
