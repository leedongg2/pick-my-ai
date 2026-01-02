import React from 'react';
import { PriceCalculation, PMCCalculation } from '@/types';
import { Card, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatWon, formatPercent } from '@/utils/pricing';
import { ShoppingCart, AlertCircle, Sparkles, Gift, Coins } from 'lucide-react';
import { cn } from '@/utils/cn';

interface PriceSummaryProps {
  calculation: PriceCalculation;
  pmcCalculation?: PMCCalculation;
  onCheckout: () => void;
  isLoading?: boolean;
}

export const PriceSummary: React.FC<PriceSummaryProps> = ({
  calculation,
  pmcCalculation,
  onCheckout,
  isLoading = false,
}) => {
  const hasDiscount = calculation.discountRate > 0;
  const isMinimumApplied = calculation.totalAfterRounding < calculation.finalTotal;
  
  return (
    <div className="sticky top-4 bg-white border border-gray-200 rounded-xl">
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-5 text-gray-900">
          주문 요약
        </h3>
        
        <div className="space-y-3">
          {/* 선택된 모델 수 */}
          {calculation.selectedModelsCount > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">선택한 AI 모델</span>
              <span className="font-medium text-gray-900">{calculation.selectedModelsCount}개</span>
            </div>
          )}
          
          {/* 상품 원가 합계 */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">상품 원가 합계</span>
            <span className="text-gray-900">{formatWon(calculation.subtotal)}</span>
          </div>
          
          {/* 수수료 */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">수수료</span>
            <span className="text-gray-900">{formatWon(calculation.subtotalWithMargin - calculation.subtotal)}</span>
          </div>
          
          {/* 상품 금액 (수수료 포함) */}
          <div className="flex justify-between items-center text-sm font-medium pt-2 border-t border-gray-200 mt-2">
            <span className="text-gray-700">상품 금액</span>
            <span className="font-semibold text-gray-900">{formatWon(calculation.subtotalWithMargin)}</span>
          </div>
          
          <div className="border-t border-gray-200 pt-4 mt-4">
            {/* 최종 금액 */}
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-900">총 결제 금액</span>
              <span className="text-2xl font-semibold text-gray-900">
                {formatWon(calculation.finalTotal)}
              </span>
            </div>
          </div>
          
          {/* PMC 적립 예정 */}
          {pmcCalculation && pmcCalculation.earnAmount > 0 && (
            <div className="mt-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm font-semibold text-gray-800">결제 후 적립 예정</span>
                </div>
                <span className="text-lg font-bold text-yellow-600">
                  +{pmcCalculation.earnAmount.toLocaleString()} PMC
                </span>
              </div>
              <div className="text-xs text-gray-600">
                적립률 {(pmcCalculation.totalRate * 100).toFixed(1)}% • 90일 유효
              </div>
            </div>
          )}
          
        </div>
      </div>
      
      <div className="p-6 pt-0">
        <button
          onClick={onCheckout}
          disabled={calculation.selectedModelsCount === 0 || isLoading}
          className={cn(
            "w-full py-3 px-4 rounded-lg font-medium text-sm transition-colors",
            calculation.selectedModelsCount === 0 || isLoading
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-black text-white hover:bg-gray-800"
          )}
        >
          {isLoading ? '처리 중...' : calculation.selectedModelsCount === 0 
            ? 'AI 모델을 선택해주세요'
            : `${formatWon(calculation.finalTotal)} 결제하기`
          }
        </button>
      </div>
    </div>
  );
};
