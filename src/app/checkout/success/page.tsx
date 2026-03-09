"use client";

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CheckCircle } from 'lucide-react';
import { useStore } from '@/store';
import { csrfFetch } from '@/lib/csrfFetch';
import { toast } from 'sonner';

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { clearSelections } = useStore();

  useEffect(() => {
    const run = async () => {
      // 결제 승인(confirm) 처리 (선택): Toss 결제 승인 API 호출
      const paymentKey = params.get('paymentKey');
      const amount = params.get('amount');
      const orderId = params.get('orderId');

      if (paymentKey && amount && orderId) {
        try {
          const res = await csrfFetch('/api/payments/toss/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) })
          });

          const body = await res.json().catch(() => ({}));
          if (!res.ok) {
            console.error('Confirm failed:', body);
            toast.error(body?.error || '결제 승인에 실패했습니다.');
          } else {
            useStore.setState((state) => ({
              wallet: body?.wallet
                ? {
                    userId: body.wallet.userId,
                    credits: body.wallet.credits || {},
                    transactions: state.wallet?.transactions || [],
                  }
                : state.wallet,
              hasFirstPurchase: body?.hasFirstPurchase ?? state.hasFirstPurchase,
              pmcBalance: body?.pmcBalance || state.pmcBalance,
            }));
            toast.success('결제가 완료되었습니다. 크레딧이 지급되었습니다.');
          }
        } catch (e) {
          console.error('Confirm error', e);
          toast.error('결제 확인 중 오류가 발생했습니다.');
        }
      }

      clearSelections();
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orderId = params.get('orderId') || '';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card variant="elevated" className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2">결제 완료</h2>
          <p className="text-gray-600 mb-4">주문번호: {orderId}</p>
          <Button variant="primary" onClick={() => router.push('/dashboard')}>대시보드로 이동</Button>
        </CardContent>
      </Card>
    </div>
  );
}


