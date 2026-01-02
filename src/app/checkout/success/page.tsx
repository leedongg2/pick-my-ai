"use client";

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CheckCircle } from 'lucide-react';
import { useStore } from '@/store';
import { toast } from 'sonner';

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { addCredits, clearSelections, wallet, initWallet, currentUser } = useStore();

  useEffect(() => {
    const run = async () => {
      // 결제 승인(confirm) 처리 (선택): Toss 결제 승인 API 호출
      const paymentKey = params.get('paymentKey');
      const amount = params.get('amount');
      const orderId = params.get('orderId');

      if (paymentKey && amount && orderId) {
        try {
          const res = await fetch('/api/payments/toss/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) })
          });
          if (!res.ok) {
            const err = await res.json();
            console.error('Confirm failed:', err);
          }
        } catch (e) {
          console.error('Confirm error', e);
        }
      }

      // 로컬 저장된 pending_purchase로 크레딧 지급
      const raw = localStorage.getItem('pending_purchase');
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { orderId: string; credits: { [k: string]: number } };
          // 지갑 준비
          if (!wallet && currentUser) {
            initWallet(currentUser.id);
          }
          await new Promise(r => setTimeout(r, 200));
          addCredits(parsed.credits);
          localStorage.removeItem('pending_purchase');
          toast.success('결제가 완료되었습니다. 크레딧이 지급되었습니다.');
        } catch {}
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


