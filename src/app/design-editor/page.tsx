'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PreviewFrame } from '@/components/design/PreviewFrame';
import { ColorEditorPanel } from '@/components/design/ColorEditorPanel';
import { DesignElement, DesignTheme, defaultTheme, elementClassMap } from '@/types/design';
import { ArrowLeft, Save, RotateCcw, Eye, Code } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '@/store';

export default function DesignEditorPage() {
  const router = useRouter();
  const { customDesignTheme, setCustomDesignTheme } = useStore();
  const [theme, setTheme] = useState<DesignTheme>(defaultTheme);
  const [elementColors, setElementColors] = useState<Record<string, string>>({});
  const [selectedElement, setSelectedElement] = useState<DesignElement | null>(null);
  const [currentPage, setCurrentPage] = useState<'chat' | 'dashboard' | 'settings'>('chat');
  const [showCode, setShowCode] = useState(false);
  
  // 컴포넌트 마운트 시 저장된 커스텀 테마 불러오기
  useEffect(() => {
    if (customDesignTheme.theme) {
      setTheme({ ...customDesignTheme.theme });
    }
    if (customDesignTheme.elementColors) {
      setElementColors({ ...customDesignTheme.elementColors });
    }
  }, []);

  const handleElementClick = (element: DesignElement) => {
    const resolvedScope: 'element' | 'global' =
      element.scope ?? (element.type === 'button' ? 'element' : 'global');

    // 현재 적용된 색상 가져오기
    let currentColor = element.currentColor;
    
    if (resolvedScope === 'element') {
      // 개별 요소: elementColors에서 가져오기
      currentColor = elementColors[element.id] || element.currentColor;
    } else {
      // 전역 테마: theme에서 가져오기
      const elementId = element.id;
      if (elementId.includes('header') && !elementId.includes('text') && !elementId.includes('title')) {
        currentColor = theme.headerColor;
      } else if (elementId.includes('button') || elementId.includes('cta-section') || elementId.includes('badge')) {
        currentColor = theme.buttonColor;
      } else if (elementId.includes('card')) {
        currentColor = theme.cardColor;
      } else if (elementId.includes('text') || elementId.includes('title') || elementId.includes('description')) {
        currentColor = theme.textColor;
      } else if (elementId === 'background' || elementId.includes('background')) {
        currentColor = theme.backgroundColor;
      }
    }

    setSelectedElement({
      ...element,
      scope: resolvedScope,
      currentColor,
    });
  };

  // 실시간 미리보기 - 바로 상태 업데이트
  const handleColorPreview = (elementId: string, color: string) => {
    if (!selectedElement) return;

    if (selectedElement.scope === 'element') {
      // 개별 요소 색상 즉시 업데이트
      setElementColors(prev => ({
        ...prev,
        [elementId]: color,
      }));
    } else {
      // 전역 테마 색상 즉시 업데이트
      setTheme(prev => {
        const newTheme = { ...prev };

        if (elementId.includes('header') && !elementId.includes('text') && !elementId.includes('title')) {
          newTheme.headerColor = color;
        } else if (elementId.includes('button') || elementId.includes('cta-section') || elementId.includes('badge')) {
          newTheme.buttonColor = color;
        } else if (elementId.includes('card')) {
          newTheme.cardColor = color;
        } else if (elementId.includes('text') || elementId.includes('title') || elementId.includes('description')) {
          newTheme.textColor = color;
        } else if (elementId === 'background' || elementId.includes('background')) {
          newTheme.backgroundColor = color;
        }

        return newTheme;
      });
    }

    // 선택된 요소의 currentColor도 업데이트
    setSelectedElement(prev => prev ? { ...prev, currentColor: color } : null);
  };

  // 최종 적용 (적용 버튼 클릭) - 이미 미리보기로 상태 업데이트됨
  const handleColorApply = (elementId: string, color: string) => {
    if (!selectedElement) return;

    // 패널 닫기
    setSelectedElement(null);
    
    toast.success('색상이 적용되었습니다!');
  };

  // 패널 닫기
  const handlePanelClose = () => {
    setSelectedElement(null);
  };

  const handleReset = () => {
    setTheme({ ...defaultTheme });
    setElementColors({});
    setSelectedElement(null);
    
    toast.info('기본 테마로 초기화되었습니다.');
  };

  const handleSave = () => {
    // Zustand 스토어에 테마 및 개별 요소 색상 저장
    setCustomDesignTheme(theme, elementColors);
    
    toast.success('디자인이 저장되었습니다! 실제 페이지에 적용됩니다.');
  };

  const generateCSSCode = () => {
    const elementColorCss = Object.entries(elementColors)
      .map(([id, value]) => {
        const selector = elementClassMap[id];
        if (!selector) return '';

        if (selector.type === 'background') {
          return `${selector.selector} { background-color: ${value}; }`;
        }

        if (selector.type === 'border') {
          return `${selector.selector} { border-color: ${value}; }`;
        }

        return `${selector.selector} { color: ${value}; }`;
      })
      .filter(Boolean)
      .join('\n');

    return `:root {
  --primary-color: ${theme.primaryColor};
  --secondary-color: ${theme.secondaryColor};
  --background-color: ${theme.backgroundColor};
  --text-color: ${theme.textColor};
  --button-color: ${theme.buttonColor};
  --card-color: ${theme.cardColor};
  --header-color: ${theme.headerColor};
}

/* 헤더 스타일 */
header {
  background-color: var(--header-color);
}

/* 버튼 스타일 */
button {
  background-color: var(--button-color);
}

/* 카드 스타일 */
.card {
  background-color: var(--card-color);
}

/* 텍스트 스타일 */
body {
  color: var(--text-color);
  background-color: var(--background-color);
}

/* Custom element overrides */
${elementColorCss}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* 상단 툴바 */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 px-4 py-2 text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>돌아가기</span>
            </button>
            <div className="h-6 w-px bg-gray-600"></div>
            <h1 className="text-xl font-bold text-white">디자인 에디터</h1>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowCode(!showCode)}
              className="flex items-center space-x-2 px-4 py-2 text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Code className="w-5 h-5" />
              <span>{showCode ? 'Preview' : 'Code'}</span>
            </button>
            <button
              onClick={handleReset}
              className="flex items-center space-x-2 px-4 py-2 text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              <span>초기화</span>
            </button>
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors shadow-lg"
            >
              <Save className="w-5 h-5" />
              <span>저장</span>
            </button>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-[1400px] mx-auto px-8 py-10">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
          {/* 안내 메시지 */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <div className="flex items-center space-x-3">
              <Eye className="w-5 h-5 text-white" />
              <p className="text-white font-medium">
                요소를 클릭하여 색상을 변경하세요. 변경사항은 실시간으로 적용됩니다.
              </p>
            </div>
          </div>

          {/* 프리뷰 영역 */}
          <div className="p-8">
            {showCode ? (
              <div className="bg-gray-900 rounded-lg p-6 overflow-auto max-h-[600px]">
                <pre className="text-green-400 font-mono text-sm">
                  <code>{generateCSSCode()}</code>
                </pre>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden" style={{ minHeight: '620px' }}>
                <PreviewFrame
                  theme={theme}
                  elementColors={elementColors}
                  onElementClick={handleElementClick}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>

          {/* 테마 정보 */}
          <div className="px-8 pb-8">
            <div className="bg-gray-100 rounded-xl p-5 border border-gray-200">
              <h3 className="text-gray-900 font-bold mb-3">현재 테마 색상</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {Object.entries(theme).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-3">
                    <div
                      className="w-9 h-9 rounded-lg border-2 border-gray-300"
                      style={{ backgroundColor: value }}
                    />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{key}</p>
                      <p className="text-sm text-gray-800 font-mono">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 색상 편집 패널 */}
      <ColorEditorPanel
        element={selectedElement}
        onClose={handlePanelClose}
        onApply={handleColorApply}
        onPreview={handleColorPreview}
      />
    </div>
  );
}
