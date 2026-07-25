import { Wrench } from 'lucide-react';

interface MaintenancePageProps {
  message?: string | null;
}

export default function MaintenancePage({ message }: MaintenancePageProps) {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#F4F6FB] px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mb-6">
        <Wrench className="w-10 h-10 text-amber-500" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Maintenance en cours</h1>
      <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
        {message || "L'application est temporairement indisponible. Veuillez réessayer dans quelques instants."}
      </p>
    </div>
  );
}
