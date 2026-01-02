"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AlertCircle } from 'lucide-react';

export default function CheckoutFailPage() {
  const router = useRouter();
  const params = useSearchParams();
  const message = params.get('message') || '결제에 실패했습니다.';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card variant="bordered" className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2">결제 실패</h2>
          <p className="text-gray-600 mb-4">{message}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => router.push('/checkout')}>결제 다시 시도</Button>
            <Button variant="primary" onClick={() => router.push('/configurator')}>모델 선택으로 이동</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


