import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import dynamic from 'next/dynamic';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/ThemeProvider';
import { SessionInitializer } from '@/components/SessionInitializer';
import './globals.css';

// 동적 임포트로 초기 로딩 최적화
const Header = dynamic(() => import('@/components/Header').then(mod => ({ default: mod.Header })), {
  ssr: true,
  loading: () => <div className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700" />
});

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Pick-My-AI - 커스텀 AI 선택 플랫폼',
  description: 'AI, 내가 고르고 내가 정한다. 원하는 모델 × 원하는 횟수 = 딱 그만큼만 결제',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <ThemeProvider>
          <SessionInitializer />
          <Header />
          {children}
          <Toaster 
            position="top-right"
            closeButton
            toastOptions={{
              classNames: {
                toast: 'dark:bg-gray-800 dark:text-white dark:border-gray-700',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}

