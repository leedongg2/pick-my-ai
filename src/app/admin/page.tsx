import dynamic from 'next/dynamic';

const Admin = dynamic(() => import('@/components/Admin').then(mod => ({ default: mod.Admin })), {
  loading: () => <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div></div>,
  ssr: false,
});

export default function AdminPage() {
  return <Admin />;
}

