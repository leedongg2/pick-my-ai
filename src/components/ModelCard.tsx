import React, { useCallback, memo } from 'react';
import { AIModel } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getFixedDisplayPriceOrFallback, formatWon } from '@/utils/pricing';
import { cn } from '@/utils/cn';
import { X } from 'lucide-react';
import { useTranslation } from '@/utils/translations';

interface ModelCardProps {
  model: AIModel;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  isSelected: boolean;
}

export const ModelCard: React.FC<ModelCardProps> = React.memo(({
  model,
  quantity,
  onQuantityChange,
  isSelected,
}) => {
  const { t } = useTranslation();
  const isVideoModel = model.series === 'video';
  const priceData = getFixedDisplayPriceOrFallback(model.id, model.piWon);
  const displayPrice = isVideoModel ? (model.pricePerSecond ?? model.piWon) : priceData.price;
  
  const handleQuantityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    onQuantityChange(Math.max(0, value));
  }, [onQuantityChange]);
  
  const handleIncrement = useCallback(() => {
    onQuantityChange(quantity + 1);
  }, [onQuantityChange, quantity]);
  
  const handleDecrement = useCallback(() => {
    onQuantityChange(Math.max(0, quantity - 1));
  }, [onQuantityChange, quantity]);
  
  const handleClear = useCallback(() => {
    onQuantityChange(0);
  }, [onQuantityChange]);
  
  return (
    <div
      className={cn(
        'transition-all duration-200 border rounded-xl relative bg-white',
        isSelected 
          ? 'border-blue-500 shadow-sm' 
          : 'border-gray-200 hover:border-gray-300'
      )}
    >
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-base text-gray-900 mb-1">{model.displayName}</h3>
            {isSelected && (
              <button
                onClick={handleClear}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                {t.configurator.clearSelection}
              </button>
            )}
          </div>
          <span className="text-sm font-medium text-gray-700 flex-shrink-0">
            {formatWon(displayPrice)}/{isVideoModel ? '초' : '회'}
          </span>
        </div>
        
        {model.description && (
          <p className="text-sm text-gray-600 mb-2">
            {(t.modelDesc as any)[model.id] || model.description}
          </p>
        )}

        {isVideoModel && (
          <div className="flex items-center gap-1.5 mb-2 px-2 py-1.5 bg-purple-50 border border-purple-200 rounded-lg">
            <span className="text-xs font-semibold text-purple-700">🎬 최대 50초 영상 생성 가능</span>
          </div>
        )}
        
        <div className="text-xs text-gray-500 mb-4">
          {t.configurator.maxInput}: {model.maxCharacters.toLocaleString()}{t.configurator.characters}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleDecrement}
            className={cn(
              "w-9 h-9 rounded-lg border flex items-center justify-center transition-colors text-base",
              quantity === 0 
                ? "border-gray-200 text-gray-300 cursor-not-allowed" 
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            )}
            disabled={quantity === 0}
          >
            −
          </button>
          
          <div className="flex-1 relative">
            <input
              type="number"
              value={quantity}
              onChange={handleQuantityChange}
              className={cn(
                "w-full px-3 py-2 text-center border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-gray-900 dark:text-gray-100",
                isSelected ? "border-blue-300 bg-blue-50 dark:bg-blue-900/20" : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              )}
              min="0"
              placeholder="0"
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
              {isVideoModel ? '초' : t.configurator.perMonth}
            </span>
          </div>
          
          <button
            onClick={handleIncrement}
            className="w-9 h-9 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 flex items-center justify-center transition-colors text-base"
          >
            +
          </button>
        </div>
        
        {quantity > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{isVideoModel ? '예상 금액' : '월 예상 금액'}</span>
              <span className="text-base font-semibold text-gray-900">
                {formatWon(displayPrice * quantity)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

ModelCard.displayName = 'ModelCard';
