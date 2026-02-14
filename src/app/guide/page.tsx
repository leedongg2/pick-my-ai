'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ChevronDown, ChevronUp, MessageSquare, CreditCard, Settings, Palette, Bot, Sparkles, Shield } from 'lucide-react';

type GuideSection = {
  id: string;
  icon: React.ReactNode;
  title: string;
  content: React.ReactNode;
};

function AccordionItem({ section, isOpen, onToggle }: { section: GuideSection; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            {section.icon}
          </div>
          <span className="font-semibold text-gray-900 dark:text-gray-100">{section.title}</span>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>
      {isOpen && (
        <div className="px-6 py-5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed space-y-3">
            {section.content}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GuidePage() {
  const [openId, setOpenId] = useState<string | null>('start');

  const sections: GuideSection[] = [
    {
      id: 'start',
      icon: <Sparkles className="w-5 h-5 text-blue-600" />,
      title: '시작하기',
      content: (
        <>
          <p><strong>Pick-My-AI</strong>는 다양한 AI 모델을 한 곳에서 사용할 수 있는 플랫폼입니다.</p>
          <p>원하는 AI 모델을 선택하고, 필요한 만큼만 크레딧을 구매하여 사용하세요.</p>
          <ol className="list-decimal list-inside space-y-2 mt-2">
            <li><strong>회원가입/로그인</strong> — 상단 메뉴에서 계정을 만들거나 로그인하세요.</li>
            <li><strong>크레딧 구매</strong> — &apos;AI 모델 구매&apos; 메뉴에서 원하는 모델과 횟수를 선택하세요.</li>
            <li><strong>채팅 시작</strong> — &apos;채팅&apos; 메뉴에서 AI와 대화를 시작하세요!</li>
          </ol>
        </>
      ),
    },
    {
      id: 'chat',
      icon: <MessageSquare className="w-5 h-5 text-green-600" />,
      title: '채팅 사용법',
      content: (
        <>
          <p>채팅 화면에서 다양한 AI 모델과 대화할 수 있습니다.</p>
          <ul className="list-disc list-inside space-y-2 mt-2">
            <li><strong>모델 선택</strong> — 입력창 위의 드롭다운에서 사용할 AI 모델을 선택하세요.</li>
            <li><strong>새 대화</strong> — 좌측 사이드바의 &apos;새 대화&apos; 버튼으로 새 대화를 시작하세요.</li>
            <li><strong>파일 첨부</strong> — + 버튼 → &apos;사진 및 파일 추가&apos;로 이미지나 텍스트 파일을 첨부할 수 있습니다.</li>
            <li><strong>응답 스타일</strong> — + 버튼 → 응답 스타일 슬라이더로 정확도와 창의성을 조절하세요.</li>
            <li><strong>응답 중지</strong> — AI가 답변 중일 때 &apos;응답 중지&apos; 버튼으로 생성을 취소할 수 있습니다.</li>
            <li><strong>복사</strong> — 메시지 위에 마우스를 올리면 복사 버튼이 나타납니다.</li>
            <li><strong>대화 템플릿</strong> — + 버튼 → &apos;대화 템플릿&apos;에서 미리 만든 프롬프트를 사용하세요.</li>
            <li><strong>모델 비교</strong> — + 버튼 → &apos;모델 비교&apos;로 여러 모델의 답변을 동시에 비교하세요.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'credits',
      icon: <CreditCard className="w-5 h-5 text-purple-600" />,
      title: '크레딧 & 결제',
      content: (
        <>
          <p>각 AI 모델은 1회 사용 시 1크레딧이 차감됩니다.</p>
          <ul className="list-disc list-inside space-y-2 mt-2">
            <li><strong>크레딧 구매</strong> — &apos;AI 모델 구매&apos; 페이지에서 모델별로 원하는 횟수를 입력하고 결제하세요.</li>
            <li><strong>PMC (Pick-My-Coin)</strong> — PMC를 보유하고 있다면 결제 시 할인에 사용할 수 있습니다.</li>
            <li><strong>대시보드</strong> — 대시보드에서 모델별 남은 크레딧과 사용 현황을 확인하세요.</li>
            <li><strong>크레딧 선물</strong> — 대시보드에서 다른 사용자에게 크레딧을 선물할 수 있습니다.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'models',
      icon: <Bot className="w-5 h-5 text-orange-600" />,
      title: 'AI 모델 안내',
      content: (
        <>
          <p>Pick-My-AI에서 지원하는 주요 AI 모델입니다:</p>
          <div className="mt-2 space-y-2">
            <p><strong>OpenAI GPT 시리즈</strong> — GPT-4o, GPT-4.1, GPT-5 시리즈 등 최신 GPT 모델</p>
            <p><strong>OpenAI o 시리즈</strong> — o3, o3-mini, o4-mini 등 추론 특화 모델 (복잡한 문제 해결에 강함)</p>
            <p><strong>Anthropic Claude</strong> — Claude 3.5 Sonnet, Claude 4 Sonnet 등 안전하고 유용한 AI</p>
            <p><strong>Google Gemini</strong> — Gemini 2.5 Pro, Gemini 3.0 Flash 등 멀티모달 AI</p>
            <p><strong>Perplexity</strong> — 실시간 웹 검색 기반 답변을 제공하는 AI</p>
            <p><strong>이미지 생성</strong> — DALL-E 3, GPT Image 1으로 이미지를 생성하세요</p>
          </div>
        </>
      ),
    },
    {
      id: 'settings',
      icon: <Settings className="w-5 h-5 text-gray-600" />,
      title: '설정',
      content: (
        <>
          <p>설정 페이지에서 다양한 옵션을 조정할 수 있습니다:</p>
          <ul className="list-disc list-inside space-y-2 mt-2">
            <li><strong>AI 말투</strong> — 존댓말 또는 반말 중 선택하여 AI의 답변 스타일을 바꿀 수 있습니다.</li>
            <li><strong>다크 모드</strong> — 라이트, 다크, 시스템 모드 중 선택하세요.</li>
            <li><strong>테마 색상</strong> — 7가지 색상 중 원하는 테마를 선택하세요.</li>
            <li><strong>디자인 에디터</strong> — 더 세밀하게 사이트 디자인을 커스터마이징할 수 있습니다.</li>
            <li><strong>알림 설정</strong> — 성공 알림 표시 여부를 설정하세요.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'design',
      icon: <Palette className="w-5 h-5 text-pink-600" />,
      title: '디자인 커스터마이징',
      content: (
        <>
          <p>Pick-My-AI는 자유로운 디자인 커스터마이징을 지원합니다.</p>
          <ul className="list-disc list-inside space-y-2 mt-2">
            <li><strong>테마 색상</strong> — 설정 → 테마 색상에서 전체 사이트의 주 색상을 변경하세요.</li>
            <li><strong>디자인 에디터</strong> — 설정 → 디자인하기에서 버튼, 카드, 헤더 등 개별 요소의 색상을 자유롭게 변경할 수 있습니다.</li>
            <li><strong>다크 모드</strong> — 모든 페이지가 다크 모드를 지원합니다.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'safety',
      icon: <Shield className="w-5 h-5 text-red-600" />,
      title: '에러 & 문제 해결',
      content: (
        <>
          <p>문제가 발생했을 때 참고하세요:</p>
          <ul className="list-disc list-inside space-y-2 mt-2">
            <li><strong>⏱️ 응답 시간 초과</strong> — 질문을 짧게 줄이거나 잠시 후 다시 시도하세요.</li>
            <li><strong>🕐 요청 한도 초과</strong> — 1~2분 후 다시 시도하거나 다른 AI 모델을 사용해보세요.</li>
            <li><strong>🔧 서비스 점검 중</strong> — 일시적으로 이용 불가합니다. 다른 모델을 이용하거나 잠시 후 시도하세요.</li>
            <li><strong>🌐 연결 오류</strong> — 인터넷 연결을 확인하고 다시 시도하세요.</li>
            <li><strong>💬 AI 응답 없음</strong> — 질문을 다시 보내거나 다른 방식으로 질문해보세요.</li>
            <li><strong>🛡️ 정책 위반</strong> — 표현을 바꿔서 다시 시도하세요.</li>
          </ul>
          <p className="mt-3 text-xs text-gray-500">에러 메시지 하단의 에러코드(예: <code>ERR_NET_01</code>)는 개발자 진단용입니다. 문제가 계속되면 의견 보내기에서 에러코드와 함께 문의해주세요.</p>
        </>
      ),
    },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2">사용 가이드</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Pick-My-AI를 처음 사용하시나요? 아래 가이드를 참고하세요.</p>
          </div>

          <div className="space-y-3">
            {sections.map((section) => (
              <AccordionItem
                key={section.id}
                section={section}
                isOpen={openId === section.id}
                onToggle={() => setOpenId(openId === section.id ? null : section.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
