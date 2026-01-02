import dynamic from 'next/dynamic';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const CheckoutSkeleton = () => (
  <div className="min-h-screen bg-gray-50 p-6 animate-pulse">
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="h-10 bg-gray-200 rounded w-1/3"></div>
      <div className="bg-white p-8 rounded-xl space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/2"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex justify-between">
              <div className="h-5 bg-gray-200 rounded w-1/3"></div>
              <div className="h-5 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
        <div className="border-t pt-4 mt-4">
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="h-12 bg-gray-200 rounded"></div>
      </div>
    </div>
  </div>
);

const Checkout = dynamic(() => import('@/components/Checkout').then(mod => ({ default: mod.Checkout })), {
  loading: () => <CheckoutSkeleton />,
  ssr: false,
});

export default function CheckoutPage() {
  return (
    <ProtectedRoute>
      <Checkout />
    </ProtectedRoute>
  );
}

