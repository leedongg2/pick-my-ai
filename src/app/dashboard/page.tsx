import dynamic from 'next/dynamic';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const DashboardSkeleton = () => (
  <div className="min-h-screen bg-gray-50 p-6 animate-pulse">
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="h-10 bg-gray-200 rounded w-1/4"></div>
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {[1, 2, 3, 4, 5, 6, 7].map(i => (
          <div key={i} className="bg-white p-5 rounded-xl">
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-6 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
      <div className="bg-white p-6 rounded-xl">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded"></div>)}
        </div>
      </div>
    </div>
  </div>
);

const Dashboard = dynamic(() => import('@/components/Dashboard').then(mod => ({ default: mod.Dashboard })), {
  loading: () => <DashboardSkeleton />,
  ssr: false,
});

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}

