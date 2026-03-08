'use client';

import dynamic from 'next/dynamic';

const Landing = dynamic(() => import('@/components/Landing').then(mod => ({ default: mod.Landing })), {
  ssr: true,
});

export default function HomePage() {
  return <Landing />;
}

