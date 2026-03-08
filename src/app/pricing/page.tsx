'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Sparkles, Lock } from 'lucide-react';
import { useStore } from '@/store';
import { initialModels, seriesInfo } from '@/data/models';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatWon, getFixedDisplayPriceOrFallback } from '@/utils/pricing';

export default function PricingPage() {
  const language = useStore((state) => state.language);

  const ui = useMemo(() => {
    if (language === 'en') {
      return {
        title: 'AI Pricing',
        subtitle: 'Browse all supported AI model prices before logging in.',
        badge: 'Public pricing',
        login: 'Login to use AI',
        guide: 'Open guide',
        guest: 'Login required to actually use this model',
      };
    }

    if (language === 'ja') {
      return {
        title: 'AI料金表',
        subtitle: 'ログイン前でも、対応AIモデルの価格を確認できます。',
        badge: '公開料金表',
        login: 'ログインしてAIを使う',
        guide: 'ガイドを見る',
        guest: '実際の利用にはログインが必要です',
      };
    }

    return {
      title: 'AI 모델 가격표',
      subtitle: '로그인하지 않아도 지원 모델과 가격을 미리 볼 수 있어요.',
      badge: '공개 가격표',
      login: '로그인하고 AI 사용하기',
      guide: '가이드 보기',
      guest: '실제 사용은 로그인 후 가능합니다',
    };
  }, [language]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
            <Sparkles className="h-4 w-4" />
            {ui.badge}
          </div>
          <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">{ui.title}</h1>
          <p className="mt-3 text-base text-gray-600 dark:text-gray-300">{ui.subtitle}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login">
              <Button>{ui.login}</Button>
            </Link>
            <Link href="/guide">
              <Button variant="outline">{ui.guide}</Button>
            </Link>
          </div>
        </div>

        <div className="space-y-8">
          {Object.entries(seriesInfo).map(([seriesKey, info]) => {
            const seriesModels = initialModels.filter((model) => model.series === seriesKey);
            if (seriesModels.length === 0) return null;

            return (
              <section key={seriesKey} className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm md:p-8">
                <div className="mb-6 flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{info.name}</h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{info.description}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {seriesModels.map((model) => {
                    const price = getFixedDisplayPriceOrFallback(model.id, model.piWon).price;
                    return (
                      <Card key={model.id} variant="bordered" className="border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/40">
                        <CardContent className="space-y-3 p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{model.displayName}</h3>
                              <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{model.description}</p>
                            </div>
                            <Lock className="h-4 w-4 shrink-0 text-gray-400" />
                          </div>
                          <div className="text-lg font-bold text-blue-600 dark:text-blue-300">{formatWon(price)}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{ui.guest}</div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
