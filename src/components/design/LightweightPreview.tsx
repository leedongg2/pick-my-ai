'use client';

import React, { memo } from 'react';
import { DesignElement, DesignTheme } from '@/types/design';
import { MessageSquare, Home, LayoutDashboard, Settings, Send, Plus, CreditCard, Zap, BarChart3, Clock } from 'lucide-react';
import { useStore } from '@/store';

interface LightweightPreviewProps {
  currentPage: 'chat' | 'dashboard' | 'settings';
  theme: DesignTheme;
  elementColors: Record<string, string>;
  onElementClick: (element: DesignElement) => void;
  onSendButtonCustomize?: () => void;
}

const PreviewHeader = memo(({ 
  theme, 
  elementColors, 
  onElementClick 
}: { 
  theme: DesignTheme; 
  elementColors: Record<string, string>; 
  onElementClick: (element: DesignElement) => void;
}) => {
  const headerBg = elementColors['header'] || theme.headerColor || '#ffffff';
  
  const handleHeaderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onElementClick({
      id: 'header',
      type: 'header',
      label: '헤더 배경',
      selector: 'header',
      currentColor: headerBg,
      scope: 'global',
    });
  };

  return (
    <header 
      className="border-b px-4 py-3 cursor-pointer hover:opacity-90 transition-opacity"
      style={{ backgroundColor: headerBg }}
      onClick={handleHeaderClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg"></div>
            <span className="font-bold text-gray-900">Pick-My-AI</span>
          </div>
          <nav className="flex items-center space-x-1">
            <button className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1.5">
              <Home className="w-4 h-4" /> 홈
            </button>
            <button className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" /> 채팅
            </button>
            <button className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1.5">
              <LayoutDashboard className="w-4 h-4" /> 대시보드
            </button>
            <button className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1.5">
              <Settings className="w-4 h-4" /> 설정
            </button>
          </nav>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">사용자</span>
        </div>
      </div>
    </header>
  );
});
PreviewHeader.displayName = 'PreviewHeader';

const ChatPreview = memo(({ 
  theme, 
  elementColors, 
  onElementClick,
  onSendButtonCustomize,
}: { 
  theme: DesignTheme; 
  elementColors: Record<string, string>; 
  onElementClick: (element: DesignElement) => void;
  onSendButtonCustomize?: () => void;
}) => {
  const { sendButtonSymbol } = useStore();
  const sidebarBg = elementColors['chat-list-card'] || theme.cardColor || '#f9fafb';
  const messageBg = elementColors['chat-message-card'] || theme.cardColor || '#ffffff';
  const inputCardBg = elementColors['chat-input-card'] || theme.cardColor || '#ffffff';
  const newChatButtonBg = elementColors['chat-new-button'] || theme.buttonColor || '#3b82f6';
  const sendButtonBg = elementColors['chat-send-button'] || theme.buttonColor || '#3b82f6';

  return (
    <div className="flex h-[500px]">
      {/* 사이드바 */}
      <div 
        className="w-64 border-r p-4 cursor-pointer hover:opacity-90 transition-opacity"
        style={{ backgroundColor: sidebarBg }}
        onClick={(e) => {
          e.stopPropagation();
          onElementClick({
            id: 'chat-list-card',
            type: 'card',
            label: '채팅 사이드바',
            selector: '.chat-list-card',
            currentColor: sidebarBg,
            scope: 'element',
          });
        }}
      >
        <button 
          className="w-full py-2 px-4 rounded-lg text-white text-sm font-medium mb-4 cursor-pointer"
          style={{ backgroundColor: newChatButtonBg }}
          onClick={(e) => {
            e.stopPropagation();
            onElementClick({
              id: 'chat-new-button',
              type: 'button',
              label: '새 채팅 버튼',
              selector: '.chat-new-button',
              currentColor: newChatButtonBg,
              scope: 'element',
            });
          }}
        >
          <Plus className="w-4 h-4 inline mr-2" /> 새 채팅
        </button>
        <div className="space-y-2">
          {['오늘의 대화', '어제의 대화', '지난 주 대화'].map((title, i) => (
            <div key={i} className="p-3 rounded-lg bg-white/50 hover:bg-white/80 cursor-pointer">
              <div className="text-sm font-medium text-gray-700">{title}</div>
              <div className="text-xs text-gray-500 mt-1">GPT-5.1 · 3개 메시지</div>
            </div>
          ))}
        </div>
      </div>

      {/* 메인 채팅 영역 */}
      <div className="flex-1 flex flex-col">
        <div
          className="flex-1 p-4 space-y-4 overflow-auto cursor-pointer hover:opacity-90"
          style={{ backgroundColor: messageBg }}
          onClick={(e) => {
            e.stopPropagation();
            onElementClick({
              id: 'chat-message-card',
              type: 'card',
              label: '채팅 메시지 카드',
              selector: '.chat-message-card',
              currentColor: messageBg,
              scope: 'element',
            });
          }}
        >
          <div className="flex justify-end">
            <div
              className="max-w-[70%] p-3 rounded-2xl bg-blue-100 text-gray-900"
              onClick={(e) => e.stopPropagation()}
            >
              안녕하세요! 오늘 날씨가 어때요?
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs">AI</div>
            <div
              className="max-w-[70%] p-3 rounded-2xl bg-gray-100 text-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              안녕하세요! 오늘 서울 날씨는 맑고 기온은 15°C입니다.
            </div>
          </div>
        </div>

        {/* 입력 영역 */}
        <div className="border-t p-4">
          <div 
            className="flex items-center space-x-2 p-3 rounded-xl border cursor-pointer hover:opacity-90"
            style={{ backgroundColor: inputCardBg }}
            onClick={(e) => {
              e.stopPropagation();
              onElementClick({
                id: 'chat-input-card',
                type: 'card',
                label: '채팅 입력창',
                selector: '.chat-input-card',
                currentColor: inputCardBg,
                scope: 'element',
              });
            }}
          >
            <input 
              type="text" 
              placeholder="메시지를 입력하세요..." 
              className="flex-1 bg-transparent outline-none text-sm"
              readOnly
            />
            <button 
              className="p-2 rounded-full text-white cursor-pointer relative group"
              style={{ backgroundColor: sendButtonBg }}
              onClick={(e) => {
                e.stopPropagation();
                if (onSendButtonCustomize) {
                  onSendButtonCustomize();
                } else {
                  onElementClick({
                    id: 'chat-send-button',
                    type: 'button',
                    label: '전송 버튼',
                    selector: '.chat-send-button',
                    currentColor: sendButtonBg,
                    scope: 'element',
                  });
                }
              }}
              title="클릭: 색상 변경 | 우클릭: 기호·소리 설정"
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onSendButtonCustomize) onSendButtonCustomize();
              }}
            >
              {sendButtonSymbol ? (
                <span className="text-sm leading-none">{sendButtonSymbol}</span>
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                기호·소리 설정
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
ChatPreview.displayName = 'ChatPreview';

const DashboardPreview = memo(({ 
  theme, 
  elementColors, 
  onElementClick 
}: { 
  theme: DesignTheme; 
  elementColors: Record<string, string>; 
  onElementClick: (element: DesignElement) => void;
}) => {
  const getContrastHex = (hexColor: string): string => {
    const hex = hexColor?.replace('#', '');
    if (!hex || hex.length !== 6) return '#ffffff';
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#111827' : '#ffffff';
  };

  const startChatButtonBg = elementColors['dashboard-start-chat-button'] || 'transparent';
  const buyCreditButtonBg = elementColors['dashboard-buy-credit-button'] || '#111827';

  const Card = ({ id, label, children, className = '' }: { id: string; label: string; children: React.ReactNode; className?: string }) => (
    (() => {
      const resolvedBg = elementColors[id] || theme.cardColor || '#ffffff';

      return (
    <div 
      className={`p-6 rounded-xl border cursor-pointer hover:opacity-90 transition-opacity ${className}`}
      style={{ backgroundColor: resolvedBg }}
      onClick={(e) => {
        e.stopPropagation();
        onElementClick({
          id,
          type: 'card',
          label,
          selector: `.${id}`,
          currentColor: resolvedBg,
          scope: 'element',
        });
      }}
    >
      {children}
    </div>
      );
    })()
  );

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-[500px]">
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <div className="flex items-center space-x-2">
          <button
            className="px-3 py-2 rounded-lg text-sm font-medium border"
            style={{
              backgroundColor: startChatButtonBg,
              color: startChatButtonBg === 'transparent' ? '#374151' : getContrastHex(startChatButtonBg),
              borderColor: '#d1d5db',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onElementClick({
                id: 'dashboard-start-chat-button',
                type: 'button',
                label: '대시보드 채팅 시작 버튼',
                selector: '.dashboard-start-chat-button',
                currentColor: startChatButtonBg,
                scope: 'element',
              });
            }}
          >
            채팅 시작
          </button>
          <button
            className="px-3 py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: buyCreditButtonBg,
              color: getContrastHex(buyCreditButtonBg),
            }}
            onClick={(e) => {
              e.stopPropagation();
              onElementClick({
                id: 'dashboard-buy-credit-button',
                type: 'button',
                label: '대시보드 크레딧 구매 버튼',
                selector: '.dashboard-buy-credit-button',
                currentColor: buyCreditButtonBg,
                scope: 'element',
              });
            }}
          >
            크레딧 구매
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <Card id="dashboard-credit-card" label="크레딧 카드">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-lg bg-blue-100">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">보유 크레딧</div>
              <div className="text-2xl font-bold text-gray-900">₩12,500</div>
            </div>
          </div>
        </Card>

        <Card id="dashboard-usage-card" label="사용량 카드">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-lg bg-green-100">
              <Zap className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">이번 달 사용량</div>
              <div className="text-2xl font-bold text-gray-900">127회</div>
            </div>
          </div>
        </Card>

        <Card id="dashboard-chat-card" label="대화 카드">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-lg bg-purple-100">
              <MessageSquare className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">총 대화</div>
              <div className="text-2xl font-bold text-gray-900">48개</div>
            </div>
          </div>
        </Card>
      </div>

      <Card id="dashboard-activity-card" label="활동 카드" className="col-span-full">
        <div className="flex items-center space-x-3 mb-4">
          <Clock className="w-5 h-5 text-gray-400" />
          <span className="font-medium text-gray-700">최근 활동</span>
        </div>
        <div className="space-y-3">
          {['GPT-5.1로 대화 시작', 'Claude Opus 4.5 사용', '크레딧 충전 완료'].map((activity, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
              <span className="text-sm text-gray-600">{activity}</span>
              <span className="text-xs text-gray-400">{i + 1}시간 전</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
});
DashboardPreview.displayName = 'DashboardPreview';

const SettingsPreview = memo(({ 
  theme, 
  elementColors, 
  onElementClick 
}: { 
  theme: DesignTheme; 
  elementColors: Record<string, string>; 
  onElementClick: (element: DesignElement) => void;
}) => {
  const cardBg = elementColors['settings-card'] || theme.cardColor || '#ffffff';

  const SettingCard = ({ id, label, title, description }: { id: string; label: string; title: string; description: string }) => (
    <div 
      className="p-6 rounded-xl border cursor-pointer hover:opacity-90 transition-opacity"
      style={{ backgroundColor: cardBg }}
      onClick={(e) => {
        e.stopPropagation();
        onElementClick({
          id,
          type: 'card',
          label,
          selector: `.${id}`,
          currentColor: cardBg,
          scope: 'element',
        });
      }}
    >
      <h3 className="font-medium text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </div>
  );

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-[500px] max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">설정</h1>
      
      <div className="space-y-4">
        <SettingCard 
          id="settings-theme-card" 
          label="테마 설정 카드" 
          title="테마 색상" 
          description="앱 전체 테마 색상을 선택하세요" 
        />
        <SettingCard 
          id="settings-dark-card" 
          label="다크모드 카드" 
          title="다크 모드" 
          description="라이트, 다크, 시스템 모드 선택" 
        />
        <SettingCard 
          id="settings-notify-card" 
          label="알림 설정 카드" 
          title="알림 설정" 
          description="성공 알림 표시 여부를 설정합니다" 
        />
      </div>
    </div>
  );
});
SettingsPreview.displayName = 'SettingsPreview';

export const LightweightPreview: React.FC<LightweightPreviewProps> = memo(({
  currentPage,
  theme,
  elementColors,
  onElementClick,
  onSendButtonCustomize,
}) => {
  const bgColor = elementColors['background'] || theme.backgroundColor || '#ffffff';

  return (
    <div 
      className="w-full overflow-hidden rounded-lg"
      style={{ backgroundColor: bgColor }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onElementClick({
            id: 'background',
            type: 'background',
            label: '배경색',
            selector: 'body',
            currentColor: bgColor,
            scope: 'global',
          });
        }
      }}
    >
      <PreviewHeader theme={theme} elementColors={elementColors} onElementClick={onElementClick} />
      
      
      {currentPage === 'chat' && (
        <ChatPreview theme={theme} elementColors={elementColors} onElementClick={onElementClick} onSendButtonCustomize={onSendButtonCustomize} />
      )}
      {currentPage === 'dashboard' && (
        <DashboardPreview theme={theme} elementColors={elementColors} onElementClick={onElementClick} />
      )}
      {currentPage === 'settings' && (
        <SettingsPreview theme={theme} elementColors={elementColors} onElementClick={onElementClick} />
      )}
    </div>
  );
});

LightweightPreview.displayName = 'LightweightPreview';
