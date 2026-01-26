'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Check, Palette } from 'lucide-react';
import { DesignElement } from '@/types/design';

interface ColorEditorPanelProps {
  element: DesignElement | null;
  onClose: () => void;
  onApply: (elementId: string, color: string) => void;
  onPreview: (elementId: string, color: string) => void;
}

const presetColors = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#a855f7', // violet
  '#1f2937', // gray-800
  '#4b5563', // gray-600
  '#9ca3af', // gray-400
  '#ffffff', // white
];

export const ColorEditorPanel: React.FC<ColorEditorPanelProps> = ({
  element,
  onClose,
  onApply,
  onPreview,
}) => {
  const [selectedColor, setSelectedColor] = useState(element?.currentColor || '#3b82f6');
  const [customColor, setCustomColor] = useState(element?.currentColor || '#3b82f6');

  useEffect(() => {
    if (element) {
      setSelectedColor(element.currentColor);
      setCustomColor(element.currentColor);
    }
  }, [element]);

  // 색상 변경 시 즉시 미리보기 (최소 debounce)
  useEffect(() => {
    if (!element || !selectedColor) return;
    
    const timeoutId = setTimeout(() => {
      onPreview(element.id, selectedColor);
    }, 50);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColor, element?.id]);

  if (!element) return null;

  const handleApply = () => {
    onApply(element.id, selectedColor);
  };

  return (
    <div className="fixed bottom-6 right-6 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 animate-in slide-in-from-bottom-4 duration-300">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center space-x-2">
          <Palette className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-gray-900">색상 편집</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/50 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* 내용 */}
      <div className="p-4 space-y-4">
        {/* 선택된 요소 정보 */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">선택된 요소</p>
          <p className="font-semibold text-gray-900">{element.label}</p>
          <p className="text-xs text-gray-500 mt-1">타입: {element.type}</p>
        </div>

        {/* 현재 색상 미리보기 */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">현재 색상</p>
          <div className="flex items-center space-x-3">
            <div
              className="w-16 h-16 rounded-lg border-2 border-gray-300 shadow-sm"
              style={{ backgroundColor: selectedColor }}
            />
            <div className="flex-1">
              <p className="text-xs text-gray-500">HEX</p>
              <p className="font-mono font-semibold text-gray-900">{selectedColor}</p>
            </div>
          </div>
        </div>

        {/* 프리셋 색상 */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">프리셋 색상</p>
          <div className="grid grid-cols-8 gap-2">
            {presetColors.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${
                  selectedColor === color
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : 'border-gray-300'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* 커스텀 색상 선택 */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">커스텀 색상</p>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={customColor}
              onChange={(e) => {
                setCustomColor(e.target.value);
                setSelectedColor(e.target.value);
              }}
              className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="#000000"
            />
          </div>
        </div>
      </div>

      {/* 푸터 */}
      <div className="flex items-center justify-end space-x-2 p-4 border-t border-gray-200 bg-gray-50">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
        >
          취소
        </button>
        <button
          onClick={handleApply}
          className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg transition-all flex items-center space-x-1 shadow-md"
        >
          <Check className="w-4 h-4" />
          <span>적용</span>
        </button>
      </div>
    </div>
  );
};
