'use client';

import { useMemo, useState } from 'react';
// 로그인 없이 접근 가능
import { ChevronDown, ChevronUp, MessageSquare, CreditCard, Settings, Palette, Bot, Sparkles, Shield } from 'lucide-react';
import { useStore } from '@/store';

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
  const language = useStore((s) => s.language);

  const guideTexts = useMemo(() => {
    const base = {
      ko: {
        title: '사용 가이드',
        subtitle: 'Pick-My-AI를 처음 사용하시나요? 아래 가이드를 참고하세요.',
        sections: {
          start: {
            title: '시작하기',
            body: (
              <>
                <p><strong>Pick-My-AI</strong>는 다양한 AI 모델을 한 곳에서 사용할 수 있는 플랫폼입니다.</p>
                <p>원하는 AI 모델을 선택하고, 필요한 만큼만 크레딧을 구매하여 사용하세요.</p>
                <ol className="list-decimal list-inside space-y-2 mt-2">
                  <li><strong>회원가입/로그인</strong> — 상단 메뉴에서 계정을 만들거나 로그인하세요.</li>
                  <li><strong>크레딧 구매</strong> — 'AI 모델 구매' 메뉴에서 원하는 모델과 횟수를 선택하세요.</li>
                  <li><strong>채팅 시작</strong> — '채팅' 메뉴에서 AI와 대화를 시작하세요!</li>
                </ol>
              </>
            ),
          },
          chat: {
            title: '채팅 사용법',
            body: (
              <>
                <p>채팅 화면에서 다양한 AI 모델과 대화할 수 있습니다.</p>
                <ul className="list-disc list-inside space-y-2 mt-2">
                  <li><strong>모델 선택</strong> — 입력창 위의 드롭다운에서 사용할 AI 모델을 선택하세요.</li>
                  <li><strong>새 대화</strong> — 좌측 사이드바의 '새 대화' 버튼으로 새 대화를 시작하세요.</li>
                  <li><strong>파일 첨부</strong> — + 버튼 → '사진 및 파일 추가'로 이미지나 텍스트 파일을 첨부할 수 있습니다.</li>
                  <li><strong>응답 스타일</strong> — + 버튼 → 응답 스타일 슬라이더로 정확도와 창의성을 조절하세요.</li>
                  <li><strong>응답 중지</strong> — AI가 답변 중일 때 '응답 중지' 버튼으로 생성을 취소할 수 있습니다.</li>
                  <li><strong>복사</strong> — 메시지 위에 마우스를 올리면 복사 버튼이 나타납니다.</li>
                  <li><strong>대화 템플릿</strong> — + 버튼 → '대화 템플릿'에서 미리 만든 프롬프트를 사용하세요.</li>
                  <li><strong>모델 비교</strong> — + 버튼 → '모델 비교'로 여러 모델의 답변을 동시에 비교하세요.</li>
                </ul>
              </>
            ),
          },
          credits: {
            title: '크레딧 & 결제',
            body: (
              <>
                <p>각 AI 모델은 1회 사용 시 1크레딧이 차감됩니다.</p>
                <ul className="list-disc list-inside space-y-2 mt-2">
                  <li><strong>크레딧 구매</strong> — 'AI 모델 구매' 페이지에서 모델별로 원하는 횟수를 입력하고 결제하세요.</li>
                  <li><strong>PMC (Pick-My-Coin)</strong> — PMC를 보유하고 있다면 결제 시 할인에 사용할 수 있습니다.</li>
                  <li><strong>대시보드</strong> — 대시보드에서 모델별 남은 크레딧과 사용 현황을 확인하세요.</li>
                  <li><strong>크레딧 선물</strong> — 대시보드에서 다른 사용자에게 크레딧을 선물할 수 있습니다.</li>
                </ul>
              </>
            ),
          },
          models: {
            title: 'AI 모델 안내',
            body: (
              <>
                <p>Pick-My-AI에서 지원하는 주요 AI 모델입니다:</p>
                <div className="mt-2 space-y-2">
                  <p><strong>OpenAI GPT 시리즈</strong> — GPT-4o, GPT-4.1, GPT-5 시리즈 등 최신 GPT 모델</p>
                  <p><strong>OpenAI o 시리즈</strong> — o3, o3-mini, o4-mini 등 추론 특화 모델</p>
                  <p><strong>Anthropic Claude</strong> — Claude 3.5 Sonnet, Claude 4 Sonnet 등</p>
                  <p><strong>Google Gemini</strong> — Gemini 2.5 Pro, Gemini 3.0 Flash 등 멀티모달 AI</p>
                  <p><strong>Perplexity</strong> — 실시간 웹 검색 기반 답변 제공</p>
                  <p><strong>이미지 생성</strong> — DALL-E 3, GPT Image 1</p>
                  <p><strong>영상 생성</strong> — Sora 2 시리즈 (초당 과금)</p>
                </div>
              </>
            ),
          },
          pricing: {
            title: 'PMI 2026 가격표',
            body: (
              <>
                <p className="mb-3">모든 가격은 1회 사용 기준입니다. 토큰 상한 내에서 무제한 사용 가능합니다.</p>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-green-700 mb-2">🟢 Claude Haiku</h4>
                    <p className="text-sm">• Haiku 3.5: <strong>5원/회</strong> (토큰: 1000 in / 1000 out)</p>
                    <p className="text-sm">• Haiku 4.5: <strong>15원/회</strong> (토큰: 1000 in / 1000 out)</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-yellow-700 mb-2">🟡 Claude Sonnet</h4>
                    <p className="text-sm">• Sonnet 4.5: <strong>45원/회</strong> (토큰: 1000 in / 1000 out)</p>
                    <p className="text-sm">• Sonnet 4.6: <strong>45원/회</strong> (토큰: 1000 in / 1000 out)</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">🔵 Claude Opus (중급)</h4>
                    <p className="text-sm">• Opus 4.5: <strong>79원/회</strong> (토큰: 1000 in / 1000 out)</p>
                    <p className="text-sm">• Opus 4.6: <strong>79원/회</strong> (토큰: 1000 in / 1000 out)</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-red-700 mb-2">🔴 Claude Opus (프리미엄)</h4>
                    <p className="text-sm">• Opus 4: <strong>199원/회</strong> (토큰: 1000 in / 1000 out)</p>
                    <p className="text-sm">• Opus 4.1: <strong>199원/회</strong> (토큰: 1000 in / 1000 out)</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">GPT / Gemini / Perplexity</h4>
                    <p className="text-sm">• GPT-5: 10원/회 (500/500) • GPT-4o: 10원/회 (500/500)</p>
                    <p className="text-sm">• Gemini 3.0: 8원/회 (500/500) • Perplexity Sonar: 1원/회 (300/300)</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-purple-700 mb-2">🎨 이미지 & 영상</h4>
                    <p className="text-sm">• GPT Image 1: 40원/회</p>
                    <p className="text-sm">• Sora 2-720p: 190원/초 • Sora 2 Pro-720p: 450원/초 • Sora 2 Pro-1024p: 750원/초</p>
                  </div>
                </div>
                <p className="mt-4 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded">💡 영상 모델은 할인/프로모션 미적용</p>
              </>
            ),
          },
          settings: {
            title: '설정',
            body: (
              <>
                <p>설정 페이지에서 다양한 옵션을 조정할 수 있습니다:</p>
                <ul className="list-disc list-inside space-y-2 mt-2">
                  <li><strong>AI 말투</strong> — 존댓말/반말 선택</li>
                  <li><strong>다크 모드</strong> — 라이트/다크/시스템 모드</li>
                  <li><strong>테마 색상</strong> — 7가지 색상 중 선택</li>
                  <li><strong>디자인 에디터</strong> — 버튼·카드·헤더 색상 커스텀</li>
                  <li><strong>알림 설정</strong> — 성공 알림 표시 여부</li>
                </ul>
              </>
            ),
          },
          design: {
            title: '디자인 커스터마이징',
            body: (
              <>
                <p>Pick-My-AI는 자유로운 디자인 커스터마이징을 지원합니다.</p>
                <ul className="list-disc list-inside space-y-2 mt-2">
                  <li><strong>테마 색상</strong> — 전체 사이트 주 색상 변경</li>
                  <li><strong>디자인 에디터</strong> — 요소별 색상/스타일 조정</li>
                  <li><strong>다크 모드</strong> — 모든 페이지 다크 모드 지원</li>
                </ul>
              </>
            ),
          },
          safety: {
            title: '에러 & 문제 해결',
            body: (
              <>
                <p>문제가 발생했을 때 참고하세요:</p>
                <ul className="list-disc list-inside space-y-2 mt-2">
                  <li><strong>⏱️ 응답 시간 초과</strong> — 질문을 짧게 줄이거나 잠시 후 다시 시도하세요.</li>
                  <li><strong>🕐 요청 한도 초과</strong> — 1~2분 후 다시 시도하거나 다른 AI 모델을 사용해보세요.</li>
                  <li><strong>🔧 서비스 점검 중</strong> — 일시적으로 이용 불가합니다. 잠시 후 시도하거나 다른 모델을 사용하세요.</li>
                  <li><strong>🌐 연결 오류</strong> — 인터넷 연결을 확인하고 다시 시도하세요.</li>
                  <li><strong>💬 AI 응답 없음</strong> — 질문을 다시 보내거나 다른 방식으로 질문하세요.</li>
                  <li><strong>🛡️ 정책 위반</strong> — 표현을 바꿔서 다시 시도하세요.</li>
                </ul>
                <p className="mt-3 text-xs text-gray-500">에러코드(예: <code>ERR_NET_01</code>)를 함께 전달하면 더 빨리 확인할 수 있어요.</p>
              </>
            ),
          },
        },
      },
      en: {
        title: 'User Guide',
        subtitle: 'New to Pick-My-AI? Start with this guide.',
        sections: {
          start: {
            title: 'Getting started',
            body: (
              <>
                <p><strong>Pick-My-AI</strong> lets you use multiple AI models in one place.</p>
                <p>Select the model you want and buy only the credits you need.</p>
                <ol className="list-decimal list-inside space-y-2 mt-2">
                  <li><strong>Sign up / Login</strong> — create an account or log in from the top menu.</li>
                  <li><strong>Buy credits</strong> — choose models and quantities in “Buy AI Models”.</li>
                  <li><strong>Start chatting</strong> — open “Chat” and talk to your AI.</li>
                </ol>
              </>
            ),
          },
          chat: {
            title: 'Chat basics',
            body: (
              <>
                <p>Chat with various AI models on the chat screen.</p>
                <ul className="list-disc list-inside space-y-2 mt-2">
                  <li><strong>Select model</strong> — use the dropdown above the input.</li>
                  <li><strong>New chat</strong> — “New chat” on the left sidebar.</li>
                  <li><strong>Attach files</strong> — + → “Add photos & files”.</li>
                  <li><strong>Style slider</strong> — adjust accuracy vs creativity.</li>
                  <li><strong>Stop response</strong> — cancel generation anytime.</li>
                  <li><strong>Copy</strong> — hover a message to copy.</li>
                  <li><strong>Chat templates</strong> — reuse saved prompts.</li>
                  <li><strong>Compare models</strong> — run multiple models side by side.</li>
                </ul>
              </>
            ),
          },
          credits: {
            title: 'Credits & billing',
            body: (
              <>
                <p>Each model call costs 1 credit.</p>
                <ul className="list-disc list-inside space-y-2 mt-2">
                  <li><strong>Buy credits</strong> — pick model and quantity on “Buy AI Models”.</li>
                  <li><strong>PMC</strong> — use PMC to get discounts at checkout.</li>
                  <li><strong>Dashboard</strong> — track remaining credits per model.</li>
                  <li><strong>Gift credits</strong> — send credits to other users from dashboard.</li>
                </ul>
              </>
            ),
          },
          models: {
            title: 'AI models',
            body: (
              <>
                <p>Main models available on Pick-My-AI:</p>
                <div className="mt-2 space-y-2">
                  <p><strong>OpenAI GPT series</strong> — GPT-4o, GPT-4.1, GPT-5 series</p>
                  <p><strong>OpenAI o series</strong> — o3, o3-mini, o4-mini (reasoning)</p>
                  <p><strong>Anthropic Claude</strong> — Claude 3.5 Sonnet, Claude 4 Sonnet</p>
                  <p><strong>Google Gemini</strong> — Gemini 2.5 Pro, Gemini 3.0 Flash (multimodal)</p>
                  <p><strong>Perplexity</strong> — real-time web search answers</p>
                  <p><strong>Image generation</strong> — DALL-E 3, GPT Image 1</p>
                  <p><strong>Video generation</strong> — Sora 2 series (per-second billing)</p>
                </div>
              </>
            ),
          },
          pricing: {
            title: 'PMI 2026 Pricing',
            body: (
              <>
                <p className="mb-3">All prices are per use. Unlimited usage within token limits.</p>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-green-700 mb-2">🟢 Claude Haiku</h4>
                    <p className="text-sm">• Haiku 3.5: <strong>₩5/use</strong> (tokens: 1000 in / 1000 out)</p>
                    <p className="text-sm">• Haiku 4.5: <strong>₩15/use</strong> (tokens: 1000 in / 1000 out)</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-yellow-700 mb-2">🟡 Claude Sonnet</h4>
                    <p className="text-sm">• Sonnet 4.5: <strong>₩45/use</strong> (tokens: 1000 in / 1000 out)</p>
                    <p className="text-sm">• Sonnet 4.6: <strong>₩45/use</strong> (tokens: 1000 in / 1000 out)</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">🔵 Claude Opus (Mid)</h4>
                    <p className="text-sm">• Opus 4.5: <strong>₩79/use</strong> (tokens: 1000 in / 1000 out)</p>
                    <p className="text-sm">• Opus 4.6: <strong>₩79/use</strong> (tokens: 1000 in / 1000 out)</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-red-700 mb-2">🔴 Claude Opus (Premium)</h4>
                    <p className="text-sm">• Opus 4: <strong>₩199/use</strong> (tokens: 1000 in / 1000 out)</p>
                    <p className="text-sm">• Opus 4.1: <strong>₩199/use</strong> (tokens: 1000 in / 1000 out)</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">GPT / Gemini / Perplexity</h4>
                    <p className="text-sm">• GPT-5: ₩10/use (500/500) • GPT-4o: ₩10/use (500/500)</p>
                    <p className="text-sm">• Gemini 3.0: ₩8/use (500/500) • Perplexity Sonar: ₩1/use (300/300)</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-purple-700 mb-2">🎨 Image & Video</h4>
                    <p className="text-sm">• GPT Image 1: ₩40/use</p>
                    <p className="text-sm">• Sora 2-720p: ₩190/sec • Sora 2 Pro-720p: ₩450/sec • Sora 2 Pro-1024p: ₩750/sec</p>
                  </div>
                </div>
                <p className="mt-4 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded">💡 No discounts on video models</p>
              </>
            ),
          },
          settings: {
            title: 'Settings',
            body: (
              <>
                <p>Fine-tune your experience in Settings:</p>
                <ul className="list-disc list-inside space-y-2 mt-2">
                  <li><strong>AI tone</strong> — formal / casual</li>
                  <li><strong>Dark mode</strong> — light / dark / system</li>
                  <li><strong>Theme color</strong> — pick from 7 colors</li>
                  <li><strong>Design editor</strong> — customize buttons, cards, headers</li>
                  <li><strong>Notifications</strong> — toggle success toasts</li>
                </ul>
              </>
            ),
          },
          design: {
            title: 'Design customization',
            body: (
              <>
                <p>Pick-My-AI supports flexible design tweaks.</p>
                <ul className="list-disc list-inside space-y-2 mt-2">
                  <li><strong>Theme color</strong> — set the primary color sitewide.</li>
                  <li><strong>Design editor</strong> — adjust element colors/styles.</li>
                  <li><strong>Dark mode</strong> — available on every page.</li>
                </ul>
              </>
            ),
          },
          safety: {
            title: 'Errors & troubleshooting',
            body: (
              <>
                <p>If something goes wrong, try these:</p>
                <ul className="list-disc list-inside space-y-2 mt-2">
                  <li><strong>⏱️ Timeout</strong> — ask shorter questions or retry later.</li>
                  <li><strong>🕐 Rate limit</strong> — wait 1–2 minutes or switch model.</li>
                  <li><strong>🔧 Service maintenance</strong> — try again later or use another model.</li>
                  <li><strong>🌐 Network error</strong> — check your connection and retry.</li>
                  <li><strong>💬 No response</strong> — resend or rephrase your question.</li>
                  <li><strong>🛡️ Policy block</strong> — adjust wording and retry.</li>
                </ul>
                <p className="mt-3 text-xs text-gray-500">Share the error code (e.g., <code>ERR_NET_01</code>) for faster support.</p>
              </>
            ),
          },
        },
      },
    } as const;

    const ja = base.en; // 일본어 미번역 시 영어로 폴백
    return { ...base, ja } as const;
  }, []);

  const tr = (guideTexts as any)[language] || (guideTexts as any).ko;

  const sections: GuideSection[] = [
    {
      id: 'pricing',
      icon: <CreditCard className="w-5 h-5 text-green-600" />,
      title: tr.sections.pricing.title,
      content: tr.sections.pricing.body,
    },
    {
      id: 'start',
      icon: <Sparkles className="w-5 h-5 text-blue-600" />,
      title: tr.sections.start.title,
      content: tr.sections.start.body,
    },
    {
      id: 'chat',
      icon: <MessageSquare className="w-5 h-5 text-green-600" />,
      title: tr.sections.chat.title,
      content: tr.sections.chat.body,
    },
    {
      id: 'credits',
      icon: <CreditCard className="w-5 h-5 text-purple-600" />,
      title: tr.sections.credits.title,
      content: tr.sections.credits.body,
    },
    {
      id: 'models',
      icon: <Bot className="w-5 h-5 text-orange-600" />,
      title: tr.sections.models.title,
      content: tr.sections.models.body,
    },
    {
      id: 'settings',
      icon: <Settings className="w-5 h-5 text-gray-600" />,
      title: tr.sections.settings.title,
      content: tr.sections.settings.body,
    },
    {
      id: 'design',
      icon: <Palette className="w-5 h-5 text-pink-600" />,
      title: tr.sections.design.title,
      content: tr.sections.design.body,
    },
    {
      id: 'safety',
      icon: <Shield className="w-5 h-5 text-red-600" />,
      title: tr.sections.safety.title,
      content: tr.sections.safety.body,
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{tr.title}</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">{tr.subtitle}</p>
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
  );
}
