import dynamic from 'next/dynamic';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const ConfiguratorSkeleton = () => (
  <div className="min-h-screen bg-gray-50 p-6 animate-pulse">
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="h-12 bg-gray-200 rounded w-1/3"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="bg-white p-6 rounded-xl shadow-sm">
            <div className="h-6 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const Configurator = dynamic(() => import('@/components/Configurator').then(mod => ({ default: mod.Configurator })), {
  loading: () => <ConfiguratorSkeleton />,
  ssr: false,
});

export default function ConfiguratorPage() {
  return (
    <ProtectedRoute>
      <Configurator />
    </ProtectedRoute>
  );
}

