'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { LightweightPreview } from '@/components/design/LightweightPreview';
import { ColorEditorPanel } from '@/components/design/ColorEditorPanel';
import { DesignElement, DesignTheme, defaultTheme } from '@/types/design';
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

  const didInitRef = useRef(false);
  const skipFirstSyncRef = useRef(true);
  
  // 컴포넌트 마운트 시 저장된 커스텀 테마 불러오기
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    if (customDesignTheme.theme) {
      setTheme({ ...customDesignTheme.theme });
    } else {
      setTheme({ ...defaultTheme });
    }

    if (customDesignTheme.elementColors) {
      setElementColors({ ...customDesignTheme.elementColors });
    } else {
      setElementColors({});
    }
  }, [customDesignTheme.theme, customDesignTheme.elementColors]);

  // 스토어 동기화는 저장 버튼 클릭 시에만 (실시간 동기화 제거로 성능 향상)
  // 실시간 미리보기는 로컬 state만 사용

  const handleElementClick = useCallback((element: DesignElement) => {
    // 모든 요소를 개별(element) scope로 처리하여 세트 변경 방지
    const currentColor = elementColors[element.id] || element.currentColor;

    setSelectedElement({
      ...element,
      scope: 'element',
      currentColor,
    });
  }, [elementColors]);

  // 실시간 미리보기 - 개별 요소만 업데이트 (세트 변경 방지)
  const handleColorPreview = useCallback((elementId: string, color: string) => {
    if (!selectedElement) return;

    // 항상 개별 요소 색상만 업데이트
    setElementColors(prev => ({
      ...prev,
      [elementId]: color,
    }));

    // 선택된 요소의 currentColor도 업데이트
    setSelectedElement(prev => prev ? { ...prev, currentColor: color } : null);
  }, [selectedElement]);

  // 최종 적용 (적용 버튼 클릭) - 이미 미리보기로 상태 업데이트됨
  const handleColorApply = useCallback((elementId: string, color: string) => {
    if (!selectedElement) return;

    // 패널 닫기
    setSelectedElement(null);
    
    toast.success('색상이 적용되었습니다!');
  }, [selectedElement]);

  // 패널 닫기
  const handlePanelClose = useCallback(() => {
    setSelectedElement(null);
  }, []);

  const handleReset = useCallback(() => {
    setTheme({ ...defaultTheme });
    setElementColors({});
    setSelectedElement(null);
    
    toast.info('기본 테마로 초기화되었습니다.');
  }, []);

  const handleSave = useCallback(() => {
    // Zustand 스토어에 테마 및 개별 요소 색상 저장
    setCustomDesignTheme(theme, elementColors);
    
    toast.success('디자인이 저장되었습니다! 실제 페이지에 적용됩니다.');
  }, [theme, elementColors, setCustomDesignTheme]);

  const cssCode = useMemo(() => {
    const elementColorCss = Object.entries(elementColors)
      .map(([id, value]) => `.${id} { background-color: ${value}; }`)
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
.btn-primary {
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
  }, [theme, elementColors]);

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
          {/* 안내 메시지 및 페이지 전환 탭 */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Eye className="w-5 h-5 text-white" />
                <p className="text-white font-medium">
                  요소를 클릭하여 색상을 변경하세요. 변경사항은 실시간으로 적용됩니다.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage('chat')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    currentPage === 'chat'
                      ? 'bg-white text-blue-600'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  채팅
                </button>
                <button
                  onClick={() => setCurrentPage('dashboard')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    currentPage === 'dashboard'
                      ? 'bg-white text-blue-600'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  대시보드
                </button>
                <button
                  onClick={() => setCurrentPage('settings')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    currentPage === 'settings'
                      ? 'bg-white text-blue-600'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  설정
                </button>
              </div>
            </div>
          </div>

          {/* 프리뷰 영역 */}
          <div className="p-8">
            {showCode ? (
              <div className="bg-gray-900 rounded-lg p-6 overflow-auto max-h-[600px]">
                <pre className="text-green-400 font-mono text-sm">
                  <code>{cssCode}</code>
                </pre>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden" style={{ minHeight: '620px' }}>
                <LightweightPreview
                  currentPage={currentPage}
                  theme={theme}
                  elementColors={elementColors}
                  onElementClick={handleElementClick}
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
