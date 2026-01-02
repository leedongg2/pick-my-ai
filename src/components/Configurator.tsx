'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import { ModelCard } from '@/components/ModelCard';
import { PriceSummary } from '@/components/PriceSummary';
import { calculatePrice, calculatePMCEarn } from '@/utils/pricing';
import { seriesInfo } from '@/data/models';
import { cn } from '@/utils/cn';
import { Gift, Percent, Sparkles, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

const categories = [
  { id: 'all', name: '전체' },
  { id: 'gpt', name: 'GPT 시리즈' },
  { id: 'claude', name: 'Claude 시리즈' },
  { id: 'perplexity', name: 'Perplexity 시리즈' },
  { id: 'coding', name: '코딩' },
  { id: 'image', name: '이미지' },
];

export const Configurator: React.FC = () => {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('all');
  const { models, selections, policy, hasFirstPurchase, updateSelection, userPlan } = useStore();
  
  const filteredModels = useMemo(() => {
    if (activeCategory === 'all') {
      return models.filter(m => m.enabled);
    }
    return models.filter(m => m.enabled && m.series === activeCategory);
  }, [models, activeCategory]);
  
  const priceCalculation = useMemo(() => {
    return calculatePrice(models, selections, policy, !hasFirstPurchase);
  }, [models, selections, policy, hasFirstPurchase]);
  
  const pmcCalculation = useMemo(() => {
    return calculatePMCEarn(models, selections, priceCalculation.finalTotal, userPlan);
  }, [models, selections, priceCalculation.finalTotal, userPlan]);
  
  const handleCheckout = () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('🛒 결제하기 버튼 클릭:', {
        selectedModelsCount: priceCalculation.selectedModelsCount,
        selections: selections,
        totalAmount: priceCalculation.finalTotal
      });
    }
    
    if (priceCalculation.selectedModelsCount === 0) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('⚠️ 선택된 모델이 없음');
      }
      toast.error('모델을 먼저 선택해주세요.');
      return;
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ 결제 페이지로 이동 중...');
    }
    // Next.js router로 이동 (상태 유지)
    router.push('/checkout');
  };
  
  const getQuantity = (modelId: string) => {
    const selection = selections.find(s => s.modelId === modelId);
    return selection?.quantity || 0;
  };
  
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">AI 모델 선택</h1>
          <p className="text-gray-600 text-sm">원하는 모델과 월 사용 횟수를 선택해주세요</p>
        </div>
        
        {/* PMC 광고 배너 */}
        <div className="mb-6 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 rounded-2xl p-1 shadow-lg">
          <div className="bg-white rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    🎉 모델을 많이 선택할수록 더 많은 PMC 적립!
                  </h3>
                  <p className="text-sm text-gray-600">
                    2개 이상 선택 시 <span className="font-bold text-orange-600">최대 30% PMC 적립</span> • 1 PMC = 1원으로 다음 결제 시 사용 가능
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-3">
                <div className="bg-gradient-to-r from-yellow-100 to-orange-100 px-4 py-2 rounded-lg border-2 border-yellow-400">
                  <p className="text-xs text-gray-600 mb-1">예상 적립</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {pmcCalculation.earnAmount > 0 ? `+${pmcCalculation.earnAmount.toLocaleString()}` : '0'} PMC
                  </p>
                </div>
                <button
                  onClick={() => router.push('/docs')}
                  className="group flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <span>PMC 가이드 보기</span>
                  <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-6">
          {/* 왼쪽: 모델 리스트 */}
          <div className="flex-1">
            {/* 카테고리 탭 */}
            <div className="mb-6 bg-gray-100 rounded-lg p-1 flex space-x-1">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    activeCategory === category.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  {category.name}
                </button>
              ))}
            </div>
            
            {/* 시리즈 정보 섹션 제거됨 */}
            
            {/* 모델 카드 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredModels.map(model => (
                <ModelCard
                  key={model.id}
                  model={model}
                  quantity={getQuantity(model.id)}
                  onQuantityChange={(quantity) => updateSelection(model.id, quantity)}
                  isSelected={getQuantity(model.id) > 0}
                />
              ))}
            </div>
            
            {filteredModels.length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-500 text-sm">이 카테고리에 사용 가능한 모델이 없습니다.</p>
              </div>
            )}
          </div>
          
          {/* 오른쪽: 가격 요약 */}
          <div className="w-96">
            <PriceSummary
              calculation={priceCalculation}
              pmcCalculation={pmcCalculation}
              onCheckout={handleCheckout}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
