'use client';

import React from 'react';
import { DesignElement, DesignTheme } from '@/types/design';
import { MessageSquare, LayoutDashboard, Settings, Sparkles, ArrowRight } from 'lucide-react';

const previewFeatures = [
  {
    id: 'feature-1',
    title: '1회 단위 결제',
    description: '구독 없이 사용한 만큼만 결제하세요.',
  },
  {
    id: 'feature-2',
    title: '멀티 AI 모델',
    description: 'GPT, Claude, Perplexity 등 다양한 AI를 한 곳에서.',
  },
  {
    id: 'feature-3',
    title: '자동 할인 적용',
    description: '모델 선택에 따라 자동으로 할인 혜택 제공.',
  },
];

const pricingHighlights = [
  { id: 'gpt5', title: 'GPT-5', price: '7원/회' },
  { id: 'sonnet45', title: 'Claude Sonnet 4.5', price: '30원/회' },
  { id: 'sonar', title: 'Perplexity Sonar', price: '3원/회' },
];

interface PreviewFrameProps {
  theme: DesignTheme;
  elementColors: Record<string, string>;
  onElementClick: (element: DesignElement) => void;
  currentPage: 'chat' | 'dashboard' | 'settings';
  onPageChange: (page: 'chat' | 'dashboard' | 'settings') => void;
}

export const PreviewFrame: React.FC<PreviewFrameProps> = ({
  theme,
  elementColors,
  onElementClick,
  currentPage,
  onPageChange,
}) => {
  const getElementColor = (elementId: string, fallback: string) => {
    return elementColors[elementId] || fallback;
  };

  const getContrastColor = (hexColor: string) => {
    const hex = hexColor?.replace('#', '');
    if (hex.length !== 6) return '#ffffff';
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#111827' : '#ffffff';
  };

  const headerTextColor = getContrastColor(theme.headerColor || '#ffffff');
  const primaryButtonTextColor = getContrastColor(theme.buttonColor || '#3b82f6');

  const createClickHandler = (element: DesignElement) => (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 설정 페이지 요소는 편집 불가
    if (currentPage === 'settings' && element.id.startsWith('settings')) {
      return;
    }
    
    onElementClick({
      ...element,
      scope: element.scope ?? (element.type === 'button' ? 'element' : 'global'),
    });
  };

  const handleElementInteraction = (
    element: DesignElement,
    action?: () => void
  ) => (e: React.MouseEvent) => {
    // 설정 페이지 요소는 편집 불가
    if (currentPage === 'settings' && element.id.startsWith('settings')) {
      e.stopPropagation();
      return;
    }
    createClickHandler(element)(e);
    action?.();
  };

  return (
    <div className="w-full h-full bg-gray-50 rounded-lg overflow-hidden">
      {/* 헤더 */}
      <header
        className="border-b border-gray-200 shadow-sm"
        style={{ backgroundColor: '#ffffff' }}
        onClick={createClickHandler({
          id: 'header',
          type: 'header',
          label: '헤더 배경',
          selector: 'header',
          currentColor: '#ffffff',
          scope: elementColors['header'] ? 'element' : 'global',
        })}
      >
        <div className="max-w-5xl mx-auto px-6 py-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="preview-nav-logo h-12 w-12 flex items-center justify-center rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-all duration-200 hover:scale-105"
                style={{
                  backgroundColor: getElementColor('nav-logo', '#667eea'),
                  color: '#ffffff',
                }}
                onClick={createClickHandler({
                  id: 'nav-logo',
                  type: 'button',
                  label: '로고 배경',
                  selector: '.preview-nav-logo',
                  currentColor: getElementColor('nav-logo', theme.buttonColor),
                  scope: elementColors['nav-logo'] ? 'element' : 'global',
                })}
              >
                <Sparkles className="w-5 h-5" />
              </div>
              <span
                className="preview-nav-title text-2xl font-black text-gray-900 cursor-pointer hover:opacity-80 transition-opacity"
                style={{ color: getElementColor('nav-title', '#111827') }}
                onClick={createClickHandler({
                  id: 'nav-title',
                  type: 'text',
                  label: '네비게이션 제목',
                  selector: '.preview-nav-title',
                  currentColor: getElementColor('nav-title', headerTextColor),
                  scope: elementColors['nav-title'] ? 'element' : 'global',
                })}
              >
                Pick-My-AI
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="preview-nav-login px-3 py-2 rounded-lg font-medium transition-all hover:opacity-80 text-sm"
                style={{
                  color: getElementColor('nav-login', '#4b5563'),
                  backgroundColor: 'transparent',
                }}
                onClick={createClickHandler({
                  id: 'nav-login',
                  type: 'text',
                  label: '로그인 버튼',
                  selector: '.preview-nav-login',
                  currentColor: getElementColor('nav-login', headerTextColor),
                  scope: elementColors['nav-login'] ? 'element' : 'global',
                })}
              >
                로그인
              </button>
              <button
                className="preview-nav-signup px-3 py-2 rounded-lg font-semibold shadow-sm transition-all hover:shadow-md text-sm"
                style={{
                  backgroundColor: getElementColor('nav-signup', '#667eea'),
                  color: '#ffffff',
                }}
                onClick={createClickHandler({
                  id: 'nav-signup',
                  type: 'button',
                  label: '회원가입 버튼',
                  selector: '.preview-nav-signup',
                  currentColor: getElementColor('nav-signup', theme.buttonColor),
                  scope: elementColors['nav-signup'] ? 'element' : 'global',
                })}
              >
                회원가입
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleElementInteraction(
                {
                  id: 'nav-chat-tab',
                  type: 'button',
                  label: '채팅 탭',
                  selector: '.preview-nav-chat-tab',
                  currentColor: getElementColor('nav-chat-tab', theme.buttonColor),
                  scope: elementColors['nav-chat-tab'] ? 'element' : 'global',
                },
                () => onPageChange('chat')
              )}
              className={`preview-nav-chat-tab flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                currentPage === 'chat' ? 'shadow-md' : 'hover:bg-white/10'
              }`}
              style={{
                backgroundColor: currentPage === 'chat'
                  ? getElementColor('nav-chat-tab', theme.buttonColor)
                  : 'transparent',
                color: currentPage === 'chat'
                  ? getContrastColor(getElementColor('nav-chat-tab', theme.buttonColor))
                  : getElementColor('nav-chat-tab-text', headerTextColor),
                border: currentPage === 'chat' ? 'none' : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <MessageSquare className="w-4 h-4" />
              채팅
            </button>
            <button
              onClick={handleElementInteraction(
                {
                  id: 'nav-dashboard-tab',
                  type: 'button',
                  label: '대시보드 탭',
                  selector: '.preview-nav-dashboard-tab',
                  currentColor: getElementColor('nav-dashboard-tab', theme.buttonColor),
                  scope: elementColors['nav-dashboard-tab'] ? 'element' : 'global',
                },
                () => onPageChange('dashboard')
              )}
              className={`preview-nav-dashboard-tab flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                currentPage === 'dashboard' ? 'shadow-md' : 'hover:bg-white/10'
              }`}
              style={{
                backgroundColor: currentPage === 'dashboard'
                  ? getElementColor('nav-dashboard-tab', theme.buttonColor)
                  : 'transparent',
                color: currentPage === 'dashboard'
                  ? getContrastColor(getElementColor('nav-dashboard-tab', theme.buttonColor))
                  : getElementColor('nav-dashboard-tab-text', headerTextColor),
                border: currentPage === 'dashboard' ? 'none' : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <LayoutDashboard className="w-4 h-4" />
              대시보드
            </button>
            <button
              onClick={handleElementInteraction(
                {
                  id: 'nav-settings-tab',
                  type: 'button',
                  label: '설정 탭',
                  selector: '.preview-nav-settings-tab',
                  currentColor: getElementColor('nav-settings-tab', theme.buttonColor),
                  scope: elementColors['nav-settings-tab'] ? 'element' : 'global',
                },
                () => onPageChange('settings')
              )}
              className={`preview-nav-settings-tab flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                currentPage === 'settings' ? 'shadow-md' : 'hover:bg-white/10'
              }`}
              style={{
                backgroundColor: currentPage === 'settings'
                  ? getElementColor('nav-settings-tab', theme.buttonColor)
                  : 'transparent',
                color: currentPage === 'settings'
                  ? getContrastColor(getElementColor('nav-settings-tab', theme.buttonColor))
                  : getElementColor('nav-settings-tab-text', headerTextColor),
                border: currentPage === 'settings' ? 'none' : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <Settings className="w-4 h-4" />
              설정
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main
        className="p-10 min-h-[520px]"
        style={{ backgroundColor: theme.backgroundColor }}
      >
        {currentPage === 'chat' && (
          <div className="space-y-6">
            <h2
              className="text-3xl font-bold cursor-pointer hover:opacity-80 transition-opacity"
              style={{ color: theme.textColor }}
              onClick={createClickHandler({
                id: 'chat-title',
                type: 'text',
                label: '채팅 제목',
                selector: 'main h2',
                currentColor: theme.textColor,
              })}
            >
              AI 채팅
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
              {/* 채팅 목록 */}
              <div
                className="p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-all"
                style={{ backgroundColor: theme.cardColor }}
                onClick={createClickHandler({
                  id: 'chat-list-card',
                  type: 'card',
                  label: '채팅 목록 카드',
                  selector: '.chat-list-card',
                  currentColor: theme.cardColor,
                })}
              >
                <h3 className="text-lg font-bold mb-3" style={{ color: theme.textColor }}>
                  채팅 목록
                </h3>
                <div className="space-y-2">
                  <div className="p-3 rounded bg-gray-100" style={{ borderLeft: `3px solid ${theme.buttonColor}` }}>
                    <p className="text-sm font-semibold" style={{ color: theme.textColor }}>GPT-5와의 대화</p>
                    <p className="text-xs text-gray-500">5분 전</p>
                  </div>
                  <div className="p-3 rounded bg-gray-50">
                    <p className="text-sm" style={{ color: theme.textColor }}>Claude 채팅</p>
                    <p className="text-xs text-gray-500">1시간 전</p>
                  </div>
                </div>
              </div>
              
              {/* 채팅 영역 */}
              <div className="space-y-4">
                <div
                  className="p-6 rounded-lg shadow-md min-h-[400px] cursor-pointer hover:shadow-lg transition-all"
                  style={{ backgroundColor: theme.cardColor }}
                  onClick={createClickHandler({
                    id: 'chat-message-card',
                    type: 'card',
                    label: '채팅 메시지 카드',
                    selector: '.chat-message-card',
                    currentColor: theme.cardColor,
                  })}
                >
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full" style={{ backgroundColor: theme.buttonColor }}></div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold mb-1" style={{ color: theme.textColor }}>AI</p>
                        <div className="p-3 rounded-lg bg-gray-50">
                          <p className="text-sm" style={{ color: theme.textColor }}>안녕하세요! 무엇을 도와드릴까요?</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <div className="flex-1 max-w-[80%]">
                        <p className="text-sm font-semibold mb-1 text-right" style={{ color: theme.textColor }}>나</p>
                        <div className="p-3 rounded-lg ml-auto" style={{ backgroundColor: theme.buttonColor, color: getContrastColor(theme.buttonColor) }}>
                          <p className="text-sm">코드 리뷰를 도와주세요</p>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-gray-300"></div>
                    </div>
                  </div>
                </div>
                
                {/* 입력 영역 */}
                <div
                  className="p-4 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-all"
                  style={{ backgroundColor: theme.cardColor }}
                  onClick={createClickHandler({
                    id: 'chat-input-card',
                    type: 'card',
                    label: '채팅 입력 카드',
                    selector: '.chat-input-card',
                    currentColor: theme.cardColor,
                  })}
                >
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="메시지를 입력하세요..."
                      className="flex-1 px-4 py-2 rounded-lg border"
                      style={{ borderColor: theme.textColor + '33' }}
                    />
                    <button
                      className="px-4 py-2 rounded-lg font-semibold shadow-sm transition-all hover:shadow-md"
                      style={{ backgroundColor: theme.buttonColor, color: getContrastColor(theme.buttonColor) }}
                    >
                      전송
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 이전 코드 삭제 */}
        {false && (
          <div className="space-y-12">
            <section className="max-w-5xl mx-auto grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div className="space-y-8">
                <div
                  className="preview-hero-badge inline-flex items-center gap-2 neo-card px-6 py-3 cursor-pointer"
                  style={{
                    backgroundColor: '#f9fafb',
                    boxShadow: '8px 8px 16px #d1d1d1, -8px -8px 16px #ffffff',
                  }}
                  onClick={createClickHandler({
                    id: 'hero-badge',
                    type: 'button',
                    label: '히어로 배지',
                    selector: '.preview-hero-badge',
                    currentColor: getElementColor('hero-badge', theme.buttonColor),
                    scope: 'element',
                  })}
                >
                  <Sparkles className="h-5 w-5 text-primary-600" />
                  <span className="font-bold text-primary-600">혁신적인 AI 플랫폼</span>
                </div>
                <h1
                  className="preview-hero-title text-6xl font-black leading-tight tracking-tighter text-gray-900 cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ color: getElementColor('hero-title', '#111827') }}
                  onClick={createClickHandler({
                    id: 'hero-title',
                    type: 'text',
                    label: '히어로 제목',
                    selector: '.preview-hero-title',
                    currentColor: theme.textColor,
                  })}
                >
                  <span className="block">원하는 AI를</span>
                  <span className="block mt-3 text-primary-600">1회 단위로</span>
                  <span className="block">결제하세요</span>
                </h1>
                <p
                  className="preview-hero-description text-2xl leading-relaxed font-medium text-gray-600 cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ color: getElementColor('hero-description', '#4b5563') }}
                  onClick={createClickHandler({
                    id: 'hero-description',
                    type: 'text',
                    label: '히어로 설명',
                    selector: '.preview-hero-description',
                    currentColor: theme.textColor,
                  })}
                >
                  구독 없이 사용한 만큼만 결제되는
                  <span className="font-bold text-gray-900"> 스마트한 시스템</span>
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className="preview-hero-primary-button inline-flex items-center gap-2 px-8 py-4 text-lg font-bold rounded-2xl bg-primary-600 hover:bg-primary-700 text-white shadow-md transition-all duration-200 hover-lift"
                    style={{
                      backgroundColor: getElementColor('hero-primary-button', '#667eea'),
                      color: '#ffffff',
                    }}
                    onClick={createClickHandler({
                      id: 'hero-primary-button',
                      type: 'button',
                      label: '히어로 주요 버튼',
                      selector: '.preview-hero-primary-button',
                      currentColor: getElementColor('hero-primary-button', theme.buttonColor),
                      scope: 'element',
                    })}
                  >
                    무료로 시작하기
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    className="preview-hero-secondary-button px-5 py-3 rounded-xl font-semibold border transition-all hover:shadow-md text-gray-700"
                    style={{
                      backgroundColor: 'transparent',
                      color: getElementColor('hero-secondary-button-text', '#374151'),
                      borderColor: '#e5e7eb',
                    }}
                    onClick={createClickHandler({
                      id: 'hero-secondary-button',
                      type: 'button',
                      label: '히어로 보조 버튼',
                      selector: '.preview-hero-secondary-button',
                      currentColor: getElementColor('hero-secondary-button', theme.cardColor),
                      scope: 'element',
                    })}
                  >
                    대시보드 보기
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {previewFeatures.map((feature) => (
                    <div
                      key={feature.id}
                      className="neo-card p-5 hover-float card-tilt cursor-pointer transition-all"
                      style={{ backgroundColor: '#f9fafb', boxShadow: '8px 8px 16px #d1d1d1, -8px -8px 16px #ffffff' }}
                      onClick={createClickHandler({
                        id: `${feature.id}-card`,
                        type: 'card',
                        label: `${feature.title} 카드`,
                        selector: `.preview-${feature.id}`,
                        currentColor: theme.cardColor,
                      })}
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl neo-inset text-primary-600 mb-3">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <h3
                        className="text-sm font-bold mb-1 cursor-pointer hover:opacity-90 text-gray-900"
                        style={{ color: getElementColor(`${feature.id}-title`, '#111827') }}
                        onClick={createClickHandler({
                          id: `${feature.id}-title`,
                          type: 'text',
                          label: `${feature.title} 제목`,
                          selector: `.preview-${feature.id}-title`,
                          currentColor: theme.textColor,
                        })}
                      >
                        {feature.title}
                      </h3>
                      <p
                        className="text-xs leading-relaxed cursor-pointer hover:opacity-90 text-gray-600"
                        style={{ color: getElementColor(`${feature.id}-description`, '#4b5563') }}
                        onClick={createClickHandler({
                          id: `${feature.id}-description`,
                          type: 'text',
                          label: `${feature.title} 설명`,
                          selector: `.preview-${feature.id}-description`,
                          currentColor: theme.textColor,
                        })}
                      >
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="neo-card p-6 border-gradient hover-float card-3d space-y-5"
                style={{ backgroundColor: '#f9fafb', boxShadow: '8px 8px 16px #d1d1d1, -8px -8px 16px #ffffff' }}
                onClick={createClickHandler({
                  id: 'pricing-card',
                  type: 'card',
                  label: '가격 카드 배경',
                  selector: '.preview-pricing-card',
                  currentColor: theme.cardColor,
                })}
              >
                <div className="border-b border-gray-200 pb-4 mb-6">
                  <div
                    className="inline-flex items-center gap-2 neo-inset px-4 py-2 rounded-full cursor-pointer"
                    style={{ backgroundColor: '#f3f4f6', boxShadow: 'inset 5px 5px 10px #d1d1d1, inset -5px -5px 10px #ffffff' }}
                    onClick={createClickHandler({
                      id: 'pricing-badge',
                      type: 'button',
                      label: '가격 배지',
                      selector: '.preview-pricing-badge',
                      currentColor: theme.buttonColor,
                      scope: 'element',
                    })}
                  >
                    <Sparkles className="h-4 w-4 text-primary-600" />
                    <span className="text-sm font-bold text-primary-600">실시간 가격</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {pricingHighlights.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border px-4 py-3"
                      style={{ borderColor: theme.textColor + '1A', backgroundColor: theme.backgroundColor }}
                      onClick={createClickHandler({
                        id: `${item.id}-row`,
                        type: 'card',
                        label: `${item.title} 가격 행`,
                        selector: `.preview-${item.id}-row`,
                        currentColor: theme.backgroundColor,
                      })}
                    >
                      <div>
                        <p
                          className="text-sm font-semibold cursor-pointer hover:opacity-90"
                          style={{ color: theme.textColor }}
                          onClick={createClickHandler({
                            id: `${item.id}-title`,
                            type: 'text',
                            label: `${item.title} 제목`,
                            selector: `.preview-${item.id}-title`,
                            currentColor: theme.textColor,
                          })}
                        >
                          {item.title}
                        </p>
                        <p
                          className="text-xs text-gray-500"
                          style={{ color: theme.textColor }}
                        >
                          최신 모델
                        </p>
                      </div>
                      <span
                        className="text-sm font-semibold"
                        style={{ color: theme.buttonColor }}
                        onClick={createClickHandler({
                          id: `${item.id}-price`,
                          type: 'text',
                          label: `${item.title} 가격`,
                          selector: `.preview-${item.id}-price`,
                          currentColor: theme.buttonColor,
                        })}
                      >
                        {item.price}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* 하이라이트 섹션 */}
            <section className="max-w-5xl mx-auto grid gap-4 md:grid-cols-2">
              <div
                className="rounded-2xl border p-6 shadow-md cursor-pointer transition-all hover:shadow-lg"
                style={{ backgroundColor: theme.cardColor, borderColor: theme.textColor + '1A' }}
                onClick={createClickHandler({
                  id: 'highlight-card-1',
                  type: 'card',
                  label: '하이라이트 카드 1',
                  selector: '.preview-highlight-card-1',
                  currentColor: theme.cardColor,
                })}
              >
                <h3
                  className="text-lg font-semibold mb-2 cursor-pointer hover:opacity-90"
                  style={{ color: theme.textColor }}
                  onClick={createClickHandler({
                    id: 'highlight-card-1-title',
                    type: 'text',
                    label: '하이라이트 카드 1 제목',
                    selector: '.preview-highlight-card-1-title',
                    currentColor: theme.textColor,
                  })}
                >
                  Pick-My-AI 모델 카탈로그
                </h3>
                <p
                  className="text-sm leading-relaxed cursor-pointer hover:opacity-90"
                  style={{ color: theme.textColor }}
                  onClick={createClickHandler({
                    id: 'highlight-card-1-description',
                    type: 'text',
                    label: '하이라이트 카드 1 설명',
                    selector: '.preview-highlight-card-1-description',
                    currentColor: theme.textColor,
                  })}
                >
                  최신 AI 모델을 한 곳에서 비교하고 선택할 수 있습니다.
                </p>
              </div>

              <div
                className="rounded-2xl border p-6 shadow-md cursor-pointer transition-all hover:shadow-lg"
                style={{ backgroundColor: theme.cardColor, borderColor: theme.textColor + '1A' }}
                onClick={createClickHandler({
                  id: 'highlight-card-2',
                  type: 'card',
                  label: '하이라이트 카드 2',
                  selector: '.preview-highlight-card-2',
                  currentColor: theme.cardColor,
                })}
              >
                <h3
                  className="text-lg font-semibold mb-2 cursor-pointer hover:opacity-90"
                  style={{ color: theme.textColor }}
                  onClick={createClickHandler({
                    id: 'highlight-card-2-title',
                    type: 'text',
                    label: '하이라이트 카드 2 제목',
                    selector: '.preview-highlight-card-2-title',
                    currentColor: theme.textColor,
                  })}
                >
                  실시간 가격 계산
                </h3>
                <p
                  className="text-sm leading-relaxed cursor-pointer hover:opacity-90"
                  style={{ color: theme.textColor }}
                  onClick={createClickHandler({
                    id: 'highlight-card-2-description',
                    type: 'text',
                    label: '하이라이트 카드 2 설명',
                    selector: '.preview-highlight-card-2-description',
                    currentColor: theme.textColor,
                  })}
                >
                  모델 선택에 따라 할인율과 총 금액이 자동으로 계산됩니다.
                </p>
              </div>
            </section>

            {/* CTA 섹션 */}
            <section
              className="preview-cta-section max-w-5xl mx-auto rounded-3xl px-10 py-12 shadow-xl border overflow-hidden relative"
              style={{
                backgroundColor: getElementColor('cta-section', theme.buttonColor),
                borderColor: getElementColor('cta-section-border', theme.textColor + '1A'),
                color: getContrastColor(getElementColor('cta-section', theme.buttonColor)),
              }}
              onClick={createClickHandler({
                id: 'cta-section',
                type: 'button',
                label: 'CTA 섹션 배경',
                selector: '.preview-cta-section',
                currentColor: theme.buttonColor,
              })}
            >
              <div className="space-y-4">
                <h3
                  className="preview-cta-title text-2xl font-bold cursor-pointer hover:opacity-90"
                  onClick={createClickHandler({
                    id: 'cta-title',
                    type: 'text',
                    label: 'CTA 제목',
                    selector: '.preview-cta-title',
                    currentColor: primaryButtonTextColor,
                  })}
                >
                  지금 바로 시작하세요
                </h3>
                <p
                  className="preview-cta-description text-sm leading-relaxed cursor-pointer hover:opacity-90"
                  onClick={createClickHandler({
                    id: 'cta-description',
                    type: 'text',
                    label: 'CTA 설명',
                    selector: '.preview-cta-description',
                    currentColor: primaryButtonTextColor,
                  })}
                >
                  복잡한 구독 없이 필요한 AI만 골라 사용할 수 있습니다.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className="preview-cta-primary-button px-5 py-3 rounded-xl font-semibold shadow-md transition-all hover:shadow-lg"
                    style={{
                      backgroundColor: getElementColor('cta-primary-button', primaryButtonTextColor),
                      color: getElementColor('cta-primary-button-text', theme.buttonColor),
                    }}
                    onClick={createClickHandler({
                      id: 'cta-primary-button',
                      type: 'button',
                      label: 'CTA 주요 버튼',
                      selector: '.preview-cta-primary-button',
                      currentColor: primaryButtonTextColor,
                    })}
                  >
                    무료로 시작하기
                  </button>
                  <button
                    className="preview-cta-secondary-button px-5 py-3 rounded-xl font-semibold border transition-all hover:shadow-md"
                    style={{
                      backgroundColor: getElementColor('cta-secondary-button', theme.buttonColor),
                      color: getElementColor('cta-secondary-button-text', primaryButtonTextColor),
                      borderColor: getElementColor('cta-secondary-button-border', primaryButtonTextColor + '33'),
                    }}
                    onClick={createClickHandler({
                      id: 'cta-secondary-button',
                      type: 'button',
                      label: 'CTA 보조 버튼',
                      selector: '.preview-cta-secondary-button',
                      currentColor: primaryButtonTextColor,
                    })}
                  >
                    상담 예약하기
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {currentPage === 'dashboard' && (
          <div className="space-y-6">
            <h2
              className="text-3xl font-bold cursor-pointer hover:opacity-80 transition-opacity"
              style={{ color: theme.textColor }}
              onClick={createClickHandler({
                id: 'dashboard-title',
                type: 'text',
                label: '대시보드 제목',
                selector: 'main h2',
                currentColor: theme.textColor,
              })}
            >
              대시보드
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 크레딧 구매 카드 */}
              <div
                className="p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-all"
                style={{ backgroundColor: theme.cardColor }}
                onClick={createClickHandler({
                  id: 'dashboard-credit-card',
                  type: 'card',
                  label: '크레딧 구매 카드',
                  selector: '.dashboard-credit-card',
                  currentColor: theme.cardColor,
                })}
              >
                <h3
                  className="text-lg font-bold mb-3 cursor-pointer hover:opacity-80"
                  style={{ color: theme.textColor }}
                >
                  크레딧 구매
                </h3>
                <p className="text-sm mb-4" style={{ color: theme.textColor }}>
                  AI 모델 사용을 위한 크레딧을 구매하세요
                </p>
                <button
                  className="px-4 py-2 rounded-lg font-semibold shadow-sm transition-all hover:shadow-md"
                  style={{ backgroundColor: theme.buttonColor, color: primaryButtonTextColor }}
                  onClick={createClickHandler({
                    id: 'dashboard-buy-credit-button',
                    type: 'button',
                    label: '크레딧 구매 버튼',
                    selector: '.dashboard-buy-credit-button',
                    currentColor: theme.buttonColor,
                  })}
                >
                  구매하기
                </button>
              </div>

              {/* 채팅 시작 카드 */}
              <div
                className="p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-all"
                style={{ backgroundColor: theme.cardColor }}
                onClick={createClickHandler({
                  id: 'dashboard-chat-card',
                  type: 'card',
                  label: '채팅 카드',
                  selector: '.dashboard-chat-card',
                  currentColor: theme.cardColor,
                })}
              >
                <h3
                  className="text-lg font-bold mb-3 cursor-pointer hover:opacity-80"
                  style={{ color: theme.textColor }}
                >
                  AI 채팅
                </h3>
                <p className="text-sm mb-4" style={{ color: theme.textColor }}>
                  다양한 AI 모델과 대화를 시작하세요
                </p>
                <button
                  className="px-4 py-2 rounded-lg font-semibold shadow-sm transition-all hover:shadow-md"
                  style={{ backgroundColor: theme.buttonColor, color: primaryButtonTextColor }}
                  onClick={createClickHandler({
                    id: 'dashboard-start-chat-button',
                    type: 'button',
                    label: '채팅 시작 버튼',
                    selector: '.dashboard-start-chat-button',
                    currentColor: theme.buttonColor,
                  })}
                >
                  채팅 시작
                </button>
              </div>

              {/* 사용량 카드 */}
              <div
                className="p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-all"
                style={{ backgroundColor: theme.cardColor }}
                onClick={createClickHandler({
                  id: 'dashboard-usage-card',
                  type: 'card',
                  label: '사용량 카드',
                  selector: '.dashboard-usage-card',
                  currentColor: theme.cardColor,
                })}
              >
                <h3
                  className="text-lg font-bold mb-3 cursor-pointer hover:opacity-80"
                  style={{ color: theme.textColor }}
                >
                  사용량
                </h3>
                <p className="text-sm" style={{ color: theme.textColor }}>
                  이번 달 사용량: <span className="font-bold">42회</span>
                </p>
                <p className="text-xs mt-2" style={{ color: theme.textColor, opacity: 0.7 }}>
                  가장 많이 사용한 모델: GPT-4
                </p>
              </div>

              {/* 최근 활동 카드 */}
              <div
                className="p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-all"
                style={{ backgroundColor: theme.cardColor }}
                onClick={createClickHandler({
                  id: 'dashboard-activity-card',
                  type: 'card',
                  label: '최근 활동 카드',
                  selector: '.dashboard-activity-card',
                  currentColor: theme.cardColor,
                })}
              >
                <h3
                  className="text-lg font-bold mb-3 cursor-pointer hover:opacity-80"
                  style={{ color: theme.textColor }}
                >
                  최근 활동
                </h3>
                <p className="text-sm" style={{ color: theme.textColor }}>
                  마지막 채팅: 2시간 전
                </p>
                <p className="text-xs mt-2" style={{ color: theme.textColor, opacity: 0.7 }}>
                  마지막 구매: 3일 전
                </p>
              </div>
            </div>
          </div>
        )}

        {currentPage === 'settings' && (
          <div className="space-y-6">
            <h2
              className="text-3xl font-bold cursor-pointer hover:opacity-80 transition-opacity"
              style={{ color: theme.textColor }}
              onClick={createClickHandler({
                id: 'settings-title',
                type: 'text',
                label: '설정 제목',
                selector: 'main h2',
                currentColor: theme.textColor,
              })}
            >
              설정
            </h2>
            
            <div
              className="p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-all"
              style={{ backgroundColor: theme.cardColor }}
              onClick={createClickHandler({
                id: 'settings-card',
                type: 'card',
                label: '설정 카드 배경',
                selector: '.settings-card',
                currentColor: theme.cardColor,
              })}
            >
              <h3
                className="text-lg font-bold mb-4 cursor-pointer hover:opacity-80"
                style={{ color: theme.textColor }}
                onClick={createClickHandler({
                  id: 'settings-card-title',
                  type: 'text',
                  label: '설정 카드 제목',
                  selector: '.settings-card h3',
                  currentColor: theme.textColor,
                })}
              >
                일반 설정
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span style={{ color: theme.textColor }}>알림 받기</span>
                  <button
                    className="px-4 py-2 rounded-lg font-medium shadow-sm"
                    style={{ backgroundColor: theme.buttonColor, color: '#ffffff' }}
                    onClick={createClickHandler({
                      id: 'settings-button-1',
                      type: 'button',
                      label: '설정 버튼 1',
                      selector: '.settings-button-1',
                      currentColor: theme.buttonColor,
                    })}
                  >
                    켜기
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: theme.textColor }}>자동 갱신</span>
                  <button
                    className="px-4 py-2 rounded-lg font-medium shadow-sm"
                    style={{ backgroundColor: theme.buttonColor, color: '#ffffff' }}
                    onClick={createClickHandler({
                      id: 'settings-button-2',
                      type: 'button',
                      label: '설정 버튼 2',
                      selector: '.settings-button-2',
                      currentColor: theme.buttonColor,
                    })}
                  >
                    켜기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
