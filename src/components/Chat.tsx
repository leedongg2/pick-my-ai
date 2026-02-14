'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useStore } from '@/store';
import { shallow } from 'zustand/shallow';
import { Button } from '@/components/ui/Button';
import { Plus, Settings, LayoutDashboard, Trash2, X, Download, Pencil, Check, Bot, Paperclip, ChevronRight, AlertCircle, MessageSquare, GitCompare, UserCircle, Copy, Square } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/utils/translations';
import { endChatPerfRun, initChatPerfOnce, isChatPerfEnabled, recordChatPerfReactCommit, startChatPerfRun } from '@/utils/chatPerf';
import { extractSummary, buildConversationContext, ConversationSummary } from '@/utils/summaryExtractor';

// Constants
const MAX_ATTACHMENTS = 5;
const STREAMING_DRAFT_V2 = process.env.NEXT_PUBLIC_STREAMING_DRAFT_V2 === 'true';
const STREAMING_DRAFT_UI_THROTTLE_MS = 50;

// 메모이제이션된 서브 컴포넌트들
const MessageItem = React.memo(({ message, formatMessage }: any) => (
  <div className="whitespace-pre-wrap break-words">
    {formatMessage(message.content)}
  </div>
));
MessageItem.displayName = 'MessageItem';

const MEM_BLOCK_START = '@@MEM@@';
const MEM_BLOCK_END = '@@END@@';

const removeAllOccurrences = (text: string, needle: string) => {
  if (!text || !needle) return text;
  return text.split(needle).join('');
};

const stripTrailingPartialMarkers = (text: string) => {
  const markers = [MEM_BLOCK_START, MEM_BLOCK_END];
  const maxHold = Math.max(...markers.map((m) => m.length - 1));
  const maxCheck = Math.min(maxHold, text.length);

  let cut = 0;
  for (let i = 1; i <= maxCheck; i++) {
    const suffix = text.slice(-i);
    if (markers.some((m) => m.startsWith(suffix))) {
      cut = i;
    }
  }

  return cut ? text.slice(0, -cut) : text;
};

const extractMemoryForDisplay = (text: string) => {
  let facts: string[] = [];
  const cleanedParts: string[] = [];
  let cursor = 0;

  while (true) {
    const start = text.indexOf(MEM_BLOCK_START, cursor);
    if (start === -1) {
      cleanedParts.push(text.slice(cursor));
      break;
    }

    cleanedParts.push(text.slice(cursor, start));
    const afterStart = start + MEM_BLOCK_START.length;
    const end = text.indexOf(MEM_BLOCK_END, afterStart);
    if (end === -1) {
      cursor = text.length;
      break;
    }

    const block = text.slice(afterStart, end);
    const lines = block
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    facts = facts.concat(lines);
    cursor = end + MEM_BLOCK_END.length;
  }

  let displayText = cleanedParts.join('');
  displayText = stripTrailingPartialMarkers(displayText);
  displayText = removeAllOccurrences(displayText, MEM_BLOCK_START);
  displayText = removeAllOccurrences(displayText, MEM_BLOCK_END);

  return { displayText, facts };
};

// Types
type Attachment = {
  id: string;
  name: string;
  type: 'image' | 'text';
  dataUrl?: string;
  content?: string;
};

 // ~요약~ 숨기기: ~~로 감싼 요약 부분을 제거
 const stripSummaryBlock = (text: string): string => {
   if (!text) return text;
   // ~~...~~ 블록 제거 (여러 줄 가능)
   return text.replace(/~~[\s\S]*?~~/g, '').trim();
 };

 // 복사 함수
 const handleCopyText = (text: string) => {
   const cleaned = stripSummaryBlock(text);
   navigator.clipboard.writeText(cleaned).then(() => {
     toast.success('복사되었습니다!');
   }).catch(() => {
     toast.error('복사에 실패했습니다.');
   });
 };

 type ChatMessageRowProps = {
   msg: any;
   msgIndex: number;
   overrideContent?: string;
   modelById: Map<string, any>;
   formatMessage: (text: string) => React.ReactNode;
   onDownloadImage: (imageUrl: string, filename?: string) => void;
   isStreaming?: boolean;
 };

 const ChatMessageRow = React.memo((props: ChatMessageRowProps) => {
   const { msg, msgIndex, overrideContent, modelById, formatMessage, onDownloadImage, isStreaming } = props;
   const model = msg.modelId ? (modelById.get(msg.modelId) ?? null) : null;

   const rawContent = (overrideContent ?? (msg.content as unknown as string)) as unknown as string;
   // ~요약~ 숨기기 적용
   const content = rawContent ? stripSummaryBlock(rawContent) : rawContent;
   const isImage = typeof content === 'string' && (
     content.startsWith('http://') ||
     content.startsWith('https://') ||
     content.startsWith('data:image')
   );

   return (
     <div className={cn('group mb-4', msgIndex === 0 ? 'mt-2' : '')}>
       {msg.role === 'user' ? (
         <div className="flex justify-end">
           <div className="relative inline-block bg-blue-100 text-gray-900 rounded-2xl px-4 py-3 max-w-[80%]">
             <div className="text-[15px] leading-6">
               {isImage ? (
                 <div className="relative group">
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img
                     src={content}
                     alt="AI 생성 이미지"
                     className="max-w-full rounded border"
                   />
                   <button
                     onClick={() => onDownloadImage(content, `ai-image-${Date.now()}.png`)}
                     className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                     title="이미지 다운로드"
                   >
                     <Download className="w-4 h-4 text-gray-700" />
                   </button>
                 </div>
               ) : (
                 <div className="whitespace-pre-wrap">{formatMessage(content)}</div>
               )}
             </div>
             {/* 사용자 메시지 복사 버튼 */}
             {content && !isImage && (
               <button
                 onClick={() => handleCopyText(rawContent)}
                 className="absolute -bottom-6 right-0 p-1 rounded hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                 title="복사"
               >
                 <Copy className="w-3.5 h-3.5 text-gray-400" />
               </button>
             )}
           </div>
         </div>
       ) : (
         <div className="flex items-start space-x-3">
           <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white">
             <Bot className="w-5 h-5" />
           </div>
           <div className="flex-1 pt-1">
             <div className="font-semibold text-gray-900 text-sm mb-1">
               {model?.displayName || 'ChatGPT'}
             </div>
             <div className="text-gray-800 text-[15px] leading-7">
               {(!content && isStreaming) ? (
                 <div className="flex space-x-1 py-2">
                   <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                   <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
                   <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                 </div>
               ) : !content ? (
                 <div className="text-gray-400 italic text-sm">응답을 불러올 수 없습니다.</div>
               ) : isImage ? (
                 <div className="relative group">
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img
                     src={content}
                     alt="AI 생성 이미지"
                     className="max-w-full rounded border"
                   />
                   <button
                     onClick={() => onDownloadImage(content, `ai-image-${Date.now()}.png`)}
                     className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                     title="이미지 다운로드"
                   >
                     <Download className="w-4 h-4 text-gray-700" />
                   </button>
                 </div>
               ) : (
                 <div className="whitespace-pre-wrap">{formatMessage(content)}</div>
               )}
             </div>
             {/* AI 메시지 복사 버튼 */}
             {content && !isImage && !isStreaming && (
               <button
                 onClick={() => handleCopyText(rawContent)}
                 className="mt-1 p-1 rounded hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                 title="복사"
               >
                 <Copy className="w-3.5 h-3.5 text-gray-400" />
               </button>
             )}
           </div>
         </div>
       )}
     </div>
   );
 });

 ChatMessageRow.displayName = 'ChatMessageRow';

export const Chat: React.FC = () => {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPersona, setShowPersona] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const streamingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [draftMessageId, setDraftMessageId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState('');
  const draftContentRef = useRef('');
  const lastDraftFlushRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [conversationSummaries, setConversationSummaries] = useState<ConversationSummary[]>([]);
  const userScrolledUpRef = useRef(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  const {
    chatSessions,
    currentSessionId,
    createChatSession,
    updateChatSessionTitle,
    deleteChatSession,
    addMessage,
    updateMessageContent,
    finalizeMessageContent,
    storedFacts,
    addStoredFacts,
    deductCredit,
    setCurrentSession,
    models,
    walletCredits,
    activeTemplate,
    clearActiveTemplate,
    activePersona,
    language,
    streaming,
    showDeleteConfirmation,
    currentUser,
  } = useStore(
    (state) => ({
      chatSessions: state.chatSessions,
      currentSessionId: state.currentSessionId,
      createChatSession: state.createChatSession,
      updateChatSessionTitle: state.updateChatSessionTitle,
      deleteChatSession: state.deleteChatSession,
      addMessage: state.addMessage,
      updateMessageContent: state.updateMessageContent,
      finalizeMessageContent: state.finalizeMessageContent,
      storedFacts: state.storedFacts,
      addStoredFacts: state.addStoredFacts,
      deductCredit: state.deductCredit,
      setCurrentSession: state.setCurrentSession,
      models: state.models,
      walletCredits: state.wallet?.credits ?? null,
      activeTemplate: state.activeTemplate,
      clearActiveTemplate: state.clearActiveTemplate,
      activePersona: state.activePersona,
      language: state.language,
      streaming: state.streaming,
      showDeleteConfirmation: state.settings.showDeleteConfirmation,
      currentUser: state.currentUser,
    }),
    shallow
  );

  const { t } = useTranslation();

  const chatPerfEnabled = useMemo(() => isChatPerfEnabled(), []);

  useEffect(() => {
    initChatPerfOnce();
  }, []);

  // 스트리밍 중 페이지 이탈 방지
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (streamingRef.current || isLoading) {
        e.preventDefault();
        e.returnValue = 'AI가 답변을 생성하고 있습니다. 페이지를 떠나면 답변이 중단됩니다.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isLoading]);

  // Next.js 라우터 이동 시 경고
  useEffect(() => {
    const handleRouteChange = () => {
      if (streamingRef.current || isLoading) {
        const confirmLeave = window.confirm('AI가 답변을 생성하고 있습니다. 페이지를 떠나면 답변이 중단됩니다. 계속하시겠습니까?');
        if (!confirmLeave) {
          router.push(window.location.pathname);
          throw 'Route change aborted';
        }
      }
    };

    // Next.js 라우터 이벤트는 직접 감지할 수 없으므로 링크 클릭 감지
    const handleLinkClick = (e: MouseEvent) => {
      if (streamingRef.current || isLoading) {
        const target = e.target as HTMLElement;
        const link = target.closest('a');
        if (link && link.href && !link.href.startsWith('javascript:')) {
          const confirmLeave = window.confirm('AI가 답변을 생성하고 있습니다. 페이지를 떠나면 답변이 중단됩니다. 계속하시겠습니까?');
          if (!confirmLeave) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      }
    };

    document.addEventListener('click', handleLinkClick, true);
    return () => {
      document.removeEventListener('click', handleLinkClick, true);
    };
  }, [isLoading, router]);

  const handleReactProfilerRender = useCallback<React.ProfilerOnRenderCallback>(
    (id, _phase, actualDuration) => {
      recordChatPerfReactCommit(id, actualDuration);
    },
    []
  );

  const wrapWithProfiler = useCallback(
    (id: string, node: React.ReactNode) => {
      if (!chatPerfEnabled) return node;
      return (
        <React.Profiler id={id} onRender={handleReactProfilerRender}>
          {node}
        </React.Profiler>
      );
    },
    [chatPerfEnabled, handleReactProfilerRender]
  );

  const temperaturePresets = [
    { label: '정확 (0.3)', value: 0.3, description: '정확하고 사실적인 답변' },
    { label: '표준 (0.7)', value: 0.7, description: '균형잡힌 답변' },
    { label: '창의 (1.2)', value: 1.2, description: '창의적이고 다양한 답변' },
    { label: '매우 창의 (1.5)', value: 1.5, description: '매우 창의적이고 다양한 답변' },
  ];
  
  // 메모이제이션으로 불필요한 재계산 방지
  const currentSession = useMemo(() => 
    chatSessions.find(s => s.id === currentSessionId), 
    [chatSessions, currentSessionId]
  );

  const modelById = useMemo(() => {
    const map = new Map<string, any>();
    for (const m of models) {
      map.set(m.id, m);
    }
    return map;
  }, [models]);

  const selectedModel = useMemo(() => {
    if (!selectedModelId) return null;
    return modelById.get(selectedModelId) ?? null;
  }, [modelById, selectedModelId]);

  const selectedModelMaxCharacters = useMemo(() => {
    return selectedModel?.maxCharacters || 2500;
  }, [selectedModel]);

  const availableModels = useMemo(
    () => models.filter(m => {
      const credits = walletCredits?.[m.id] || 0;
      return credits > 0 && m.enabled;
    }),
    [models, walletCredits]
  );
  
  // Close plus menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setShowPlusMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  useEffect(() => {
    // 세션이 없으면 새로 생성 (초기 진입 시에만)
    if (!currentSessionId && chatSessions.length === 0) {
      const sessionId = createChatSession('새 대화');
    }
  }, [currentSessionId, chatSessions.length, createChatSession]);

  useEffect(() => {
    if (!currentSessionId && chatSessions.length > 0) {
      setCurrentSession(chatSessions[0].id);
    }
  }, [currentSessionId, chatSessions, setCurrentSession]);

  // 세션 전환 시 로딩 상태 초기화
  useEffect(() => {
    setIsLoading(false);
    streamingRef.current = false;
  }, [currentSessionId]);
  
  // Set default model when available models change (client-side only)
  useEffect(() => {
    if (availableModels.length > 0 && !selectedModelId) {
      setSelectedModelId(availableModels[0].id);
    }
  }, [availableModels, selectedModelId]);

  // 템플릿에서 "사용하기" 선택 시: 입력창 자동 채움 + 모달 닫기
  useEffect(() => {
    if (!activeTemplate) return;

    setMessage(activeTemplate.prompt || '');
    setShowTemplates(false);
    clearActiveTemplate();
  }, [activeTemplate, clearActiveTemplate]);

  const scrollToBottom = useCallback((force: boolean = false) => {
    // 사용자가 위로 스크롤했으면 자동 스크롤 중단
    if (!force && userScrolledUpRef.current) {
      return;
    }
    const behavior = force || (streaming?.smoothScrolling && !streamingRef.current) ? 'smooth' : 'auto';
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
  }, [streaming?.smoothScrolling]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages.length, scrollToBottom]);

  // textarea 자동 높이 조절
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const maxHeight = 200; // maxHeight와 동일

    if (scrollHeight > maxHeight) {
      textarea.style.height = `${maxHeight}px`;
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.height = `${scrollHeight}px`;
      textarea.style.overflowY = 'hidden';
    }
  }, [message]);

  const onPickFiles = useCallback(() => {
    if (attachments.length >= MAX_ATTACHMENTS) {
      toast.error(`최대 ${MAX_ATTACHMENTS}개까지 업로드할 수 있어요.`);
      return;
    }
  }, [attachments.length]);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const beforeCount = attachments.length;
    const availableSlots = MAX_ATTACHMENTS - beforeCount;
    
    if (availableSlots <= 0) {
      toast.error(`최대 ${MAX_ATTACHMENTS}개까지 업로드할 수 있어요.`);
      return;
    }
    
    const filesArray = Array.from(files).slice(0, availableSlots);
    
    if (filesArray.length < files.length) {
      toast.error(`최대 ${MAX_ATTACHMENTS}개까지 업로드할 수 있어요. 초과분은 제외됩니다.`);
    }

    const newItems: Attachment[] = [];
    
    for (const file of filesArray) {
      try {
        if (file.type.startsWith('image/')) {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          
          newItems.push({ 
            id: crypto.randomUUID(), 
            name: file.name, 
            type: 'image' as const, 
            dataUrl 
          });
          
        } else if (file.type.startsWith('text/') || file.type === 'application/json') {
          const text = await file.text();
          newItems.push({ 
            id: crypto.randomUUID(), 
            name: file.name, 
            type: 'text' as const, 
            content: text.slice(0, 20000) 
          });
          
        } else {
          console.error(`지원하지 않는 파일 형식: ${file.type}`);
          toast.error(`지원하지 않는 파일 형식입니다: ${file.name}`);
        }
      } catch (error) {
        console.error('파일 처리 중 오류 발생:', error);
        toast.error(`파일 처리 중 오류가 발생했습니다: ${file.name}`);
      }
    }
    
    if (newItems.length > 0) {
      setAttachments(prev => [...prev, ...newItems]);
    }
  }, [attachments.length]);

  const handleDownloadImage = useCallback(async (imageUrl: string, filename: string = 'ai-generated-image.png') => {
    try {
      // data URL인 경우 직접 다운로드
      if (imageUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('이미지를 다운로드했습니다!');
        return;
      }

      // 외부 URL인 경우 fetch 시도
      try {
        const response = await fetch(imageUrl, { mode: 'cors' });
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success('이미지를 다운로드했습니다!');
      } catch (fetchError) {
        // CORS 오류 시 새 탭에서 열기
        window.open(imageUrl, '_blank');
        toast.info('새 탭에서 이미지를 열었습니다. 우클릭하여 저장하세요.');
      }
    } catch (error) {
      console.error('이미지 다운로드 실패:', error);
      toast.error('이미지 다운로드에 실패했습니다.');
    }
  }, []);

  const handleCancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    streamingRef.current = false;
    setIsLoading(false);
    toast.info('응답 생성이 취소되었습니다.');
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || !selectedModelId || !selectedModel) {
      return;
    }

    // 이미지 생성 중에는 메시지 전송 차단
    if (isLoading && (selectedModelId === 'gptimage1' || selectedModelId === 'dalle3')) {
      toast.error('이미지 생성 중입니다. 잠시만 기다려주세요.');
      return;
    }

    const credits = walletCredits?.[selectedModelId] || 0;
    if (credits <= 0) {
      toast.error(`${selectedModel.displayName} 크레딧이 부족합니다.`);
      return;
    }

    const chatPerfRunId = startChatPerfRun('handleSendMessage', STREAMING_DRAFT_V2);
    
    setIsLoading(true);
    
    // 현재 선택된 모델 ID를 고정 (출력 중 모델 선택이 바뀌어도 메시지의 모델은 유지)
    const currentModelId = selectedModelId;
    
    let sessionIdForThisRequest = currentSessionId;
    if (!sessionIdForThisRequest) {
      const created = createChatSession('새 대화');
      sessionIdForThisRequest = created || useStore.getState().currentSessionId;
    }

    const assistantMessageId = sessionIdForThisRequest ? crypto.randomUUID() : null;

    try {
      const msg = message;
      setMessage('');
      
      // API 호출을 위한 메시지 준비 (크레딧 차감 전에 먼저 준비)
      const liveState = useStore.getState();
      const sessionForThisRequest = sessionIdForThisRequest
        ? liveState.chatSessions.find((s: any) => s.id === sessionIdForThisRequest)
        : null;
      const currentMessages = sessionForThisRequest?.messages || currentSession?.messages || [];
      const newUserMessage = {
        role: 'user' as const,
        content: msg
      };
      
      // 전체 대화 내역 (이전 메시지 + 새 메시지)
      const apiMessages = [
        ...currentMessages.map(m => ({
          role: m.role,
          content: m.content
        })),
        newUserMessage
      ];

      if (process.env.NODE_ENV !== 'production') {
        console.log('[Chat] Sending messages to API:', {
          totalMessages: apiMessages.length,
          lastMessage: apiMessages[apiMessages.length - 1]
        });
      }
      
      // 사용자 메시지를 세션에 즉시 추가 (UI 먼저 업데이트)
      if (sessionIdForThisRequest) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[Chat] Adding user message to session:', sessionIdForThisRequest);
        }
        addMessage(sessionIdForThisRequest, {
          id: crypto.randomUUID(),
          role: 'user' as const,
          content: msg,
          timestamp: new Date().toISOString(),
        });
      } else {
        if (process.env.NODE_ENV !== 'production') {
          console.error('[Chat] No session ID - cannot add user message');
        }
      }

      if (sessionIdForThisRequest && assistantMessageId) {
        addMessage(sessionIdForThisRequest, {
          id: assistantMessageId,
          role: 'assistant' as const,
          content: '',
          modelId: selectedModelId,
          timestamp: new Date().toISOString(),
          creditUsed: 1
        });
      }
      
      // UI 업데이트 후 스크롤 (한 번만)
      scrollToBottom(true);
      
      // 크레딧 차감은 백그라운드로 (UI 블로킹 없이)
      deductCredit(selectedModelId).catch(err => {
        console.error('[Chat] Credit deduction failed:', err);
      });

      // API 호출
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 3분 타임아웃
      
      let response;
      try {
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: apiMessages,
            modelId: selectedModelId,
            temperature: temperature,
            maxTokens: 4096,
            language,
            speechLevel: useStore.getState().speechLevel,
            storedFacts,
            conversationSummary: conversationSummaries.length > 0 ? buildConversationContext(conversationSummaries) : undefined,
            persona: activePersona ? {
              name: activePersona.name,
              personality: activePersona.personality,
              expertise: activePersona.expertise,
              speechPatterns: activePersona.speechPatterns
            } : undefined,
            userAttachments: attachments.map(a => ({
              type: a.type,
              name: a.name,
              dataUrl: a.dataUrl,
              content: a.content
            }))
          }),
          signal: controller.signal
        });
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('ERR_TIMEOUT');
        }
        throw new Error('ERR_NET_00');
      }
      clearTimeout(timeoutId);

      if (process.env.NODE_ENV !== 'production') {
        console.log('API Response status:', response.status);
        console.log('Content-Type:', response.headers.get('content-type'));
      }
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          if (process.env.NODE_ENV !== 'production') {
            console.error('Failed to parse error response:', e);
          }
        }
        const errorCode = errorData?.error || 'ERR_UNKNOWN';
        if (process.env.NODE_ENV !== 'production') {
          console.error('API Error:', errorCode, 'Status:', response.status);
        }
        throw new Error(errorCode);
      }
      
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('text/event-stream')) {
        // GPT 스트리밍 SSE 응답 처리
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';
        let sseBuffer = '';
        let lastUIUpdate = 0;
        const UI_THROTTLE_MS = 50; // 50ms 간격으로 UI 업데이트 (20fps)
        let pendingUpdate = false;
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            sseBuffer += decoder.decode(value, { stream: true });
            const lines = sseBuffer.split('\n');
            sseBuffer = lines.pop() || '';
            
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ')) continue;
              const jsonStr = trimmed.slice(6);
              if (jsonStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(jsonStr);
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
                const delta = parsed.choices?.[0]?.delta?.content || '';
                if (delta) {
                  accumulated += delta;
                  pendingUpdate = true;
                }
              } catch (parseErr: any) {
                if (parseErr.message && !parseErr.message.includes('JSON')) {
                  throw parseErr;
                }
              }
            }
            
            // 스로틀링: UI_THROTTLE_MS 간격으로만 UI 업데이트
            const now = Date.now();
            if (pendingUpdate && (now - lastUIUpdate >= UI_THROTTLE_MS)) {
              if (sessionIdForThisRequest && assistantMessageId) {
                updateMessageContent(sessionIdForThisRequest, assistantMessageId, accumulated);
              }
              scrollToBottom(false);
              lastUIUpdate = now;
              pendingUpdate = false;
            }
          }
          
          // 마지막 남은 업데이트 반영
          if (pendingUpdate && sessionIdForThisRequest && assistantMessageId) {
            updateMessageContent(sessionIdForThisRequest, assistantMessageId, accumulated);
            scrollToBottom(false);
          }
        } finally {
          reader.releaseLock();
        }
        
        if (!accumulated.trim()) {
          throw new Error('ERR_EMPTY_01');
        }
        
        // 스트리밍 완료 후 메모리/요약 추출
        const extracted = extractMemoryForDisplay(accumulated);
        if (extracted.facts.length) {
          addStoredFacts(extracted.facts);
        }
        if (sessionIdForThisRequest && assistantMessageId) {
          updateMessageContent(sessionIdForThisRequest, assistantMessageId, extracted.displayText);
        }
        try {
          const { summary } = extractSummary(accumulated);
          if (summary) {
            setConversationSummaries(prev => [...prev, summary]);
          }
        } catch {}
        
      } else {
        // JSON 응답 처리 (Claude, Perplexity, Codex, 이미지 등)
        let data;
        try {
          data = await response.json();
        } catch (e) {
          if (process.env.NODE_ENV !== 'production') {
            console.error('Failed to parse response:', e);
          }
          throw new Error('ERR_RESP_00');
        }
        
        if (!data || !data.content) {
          if (process.env.NODE_ENV !== 'production') {
            console.error('Empty response from API:', data);
          }
          throw new Error('ERR_EMPTY_00');
        }
        
        const extracted = extractMemoryForDisplay(data.content);
        if (extracted.facts.length) {
          addStoredFacts(extracted.facts);
        }
        if (sessionIdForThisRequest && assistantMessageId) {
          updateMessageContent(sessionIdForThisRequest, assistantMessageId, extracted.displayText);
          setTimeout(() => scrollToBottom(true), 100);
        }
        try {
          const { summary } = extractSummary(data.content);
          if (summary) {
            setConversationSummaries(prev => [...prev, summary]);
          }
        } catch (summaryError) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('Summary extraction failed:', summaryError);
          }
        }
      }
      
      setAttachments([]);
      // toast.success(`${model.displayName} 크레딧 1회 사용 (잔여: ${credits - 1}회)`);
      
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Chat error:', error);
      }
      
      const errorCode = error.message || 'ERR_UNKNOWN';
      
      // 에러코드 → 사용자 친화적 메시지 매핑
      const getErrorDisplay = (code: string): { title: string; icon: string; message: string; tips: string[] } => {
        // 타임아웃
        if (code === 'ERR_TIMEOUT' || code.includes('504') || code.includes('Timeout')) {
          return {
            icon: '⏱️', title: '응답 시간 초과',
            message: 'AI가 응답하는 데 시간이 너무 오래 걸렸어요.',
            tips: ['더 짧은 질문으로 다시 시도해보세요', '잠시 후 다시 시도해주세요']
          };
        }
        // 요청 한도 초과
        if (code.startsWith('ERR_RATE')) {
          return {
            icon: '🕐', title: '잠시만 기다려주세요',
            message: '요청이 너무 많아 잠시 쉬어가고 있어요.',
            tips: ['1~2분 후에 다시 시도해주세요', '다른 AI 모델을 사용해보세요']
          };
        }
        // 서비스 인증 문제 (사용자가 해결 불가)
        if (code.startsWith('ERR_KEY') || code === 'ERR_AUTH') {
          return {
            icon: '🔧', title: '서비스 점검 중',
            message: '현재 이 AI 모델의 서비스를 일시적으로 이용할 수 없어요.',
            tips: ['다른 AI 모델을 선택해보세요', '잠시 후 다시 시도해주세요']
          };
        }
        // 네트워크 에러
        if (code.startsWith('ERR_NET')) {
          return {
            icon: '🌐', title: '연결 오류',
            message: 'AI 서버와 연결하는 데 문제가 발생했어요.',
            tips: ['인터넷 연결을 확인해주세요', '잠시 후 다시 시도해주세요']
          };
        }
        // 빈 응답
        if (code.startsWith('ERR_EMPTY') || code.startsWith('ERR_RESP')) {
          return {
            icon: '💬', title: 'AI가 응답하지 못했어요',
            message: 'AI가 적절한 답변을 생성하지 못했어요.',
            tips: ['질문을 다시 한번 보내보세요', '다른 방식으로 질문해보세요']
          };
        }
        // 안전 정책
        if (code.startsWith('ERR_SAFE')) {
          return {
            icon: '🛡️', title: '요청을 처리할 수 없어요',
            message: '입력하신 내용이 AI 이용 정책에 맞지 않아 처리할 수 없었어요.',
            tips: ['표현을 바꿔서 다시 시도해보세요', '민감한 내용은 피해주세요']
          };
        }
        // 기타 알 수 없는 에러
        return {
          icon: '⚠️', title: '일시적인 오류가 발생했어요',
          message: '요청을 처리하는 중 문제가 발생했어요.',
          tips: ['잠시 후 다시 시도해주세요', '문제가 계속되면 다른 모델을 이용해보세요']
        };
      };

      const display = getErrorDisplay(errorCode);
      
      // 에러 메시지를 채팅에 추가
      const sid = sessionIdForThisRequest || useStore.getState().currentSessionId;
      if (sid) {
        const errContent = `${display.icon} **${display.title}**\n\n${display.message}\n\n**이렇게 해보세요:**\n${display.tips.map(t => '• ' + t).join('\n')}\n\n문제가 계속되면 **관리자에게 문의**해주세요.\n\n\`${errorCode}\``;
        
        if (assistantMessageId) {
          updateMessageContent(sid, assistantMessageId, errContent);
        } else {
          addMessage(sid, {
            id: crypto.randomUUID(),
            role: 'assistant' as const,
            content: errContent,
            modelId: currentModelId,
            timestamp: new Date().toISOString(),
            creditUsed: 1
          });
        }
      }
      
      toast.error(display.message);
    } finally {
      setIsLoading(false);
      streamingRef.current = false;
      abortControllerRef.current = null;
      if (chatPerfRunId) {
        requestAnimationFrame(() => {
          endChatPerfRun(chatPerfRunId);
        });
      }
    }
  }, [message, selectedModelId, selectedModel, walletCredits, currentSession, currentSessionId, deductCredit, addMessage, attachments, temperature, language, activePersona, storedFacts, addStoredFacts, updateMessageContent, scrollToBottom]);
  
  const handleNewChat = useCallback(() => {
    if (isOnCooldown) return;
    
    // 항상 쿨다운 시작
    setIsOnCooldown(true);
    
    // 1.3초 후에 쿨다운 종료
    setTimeout(() => setIsOnCooldown(false), 1300);
    
    // 새 대화 생성 시도
    const sessionId = createChatSession('새 대화 ' + (chatSessions.length + 1));
    
    if (sessionId) {
      setCurrentSession(sessionId);
      setAttachments([]);
      setMessage('');
    }
  }, [isOnCooldown, chatSessions.length, createChatSession, setCurrentSession]);
  
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // AI 답변 중이거나 로딩 중이면 전송 차단
      if (streamingRef.current || isLoading) {
        return;
      }
      handleSendMessage();
    }
  }, [handleSendMessage, isLoading]);
  
  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  }, []);

  // 코드 복사 핸들러
  const handleCopyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('코드가 복사되었습니다');
  }, []);

  // **텍스트**를 bold 처리하고 ## 제목, /// 코드 블록 처리하는 함수 (메모이제이션)
  const formatMessage = useCallback((text: string) => {
    // 메모리 블록 제거
    let processedText = extractMemoryForDisplay(text).displayText;
    
    // ~~로 둘러싸인 요약 부분 제거 (사용자에게 보이지 않게)
    const summaryStartIndex = processedText.indexOf('~~');
    if (summaryStartIndex !== -1) {
      const afterStart = processedText.slice(summaryStartIndex + 2);
      const summaryEndIndex = afterStart.indexOf('~~');
      if (summaryEndIndex !== -1) {
        processedText = processedText.slice(0, summaryStartIndex).trim();
      }
    }
    
    const safeText = processedText;
    const elements: JSX.Element[] = [];
    let currentIndex = 0;
    
    // /// 코드 블록 찾기
    const codeBlockRegex = /\/\/\/([\s\S]*?)\/\/\//g;
    let match;
    
    while ((match = codeBlockRegex.exec(safeText)) !== null) {
      // 코드 블록 이전 텍스트 처리
      if (match.index > currentIndex) {
        const beforeText = safeText.slice(currentIndex, match.index);
        elements.push(
          <div key={`text-${currentIndex}`}>
            {formatNormalText(beforeText)}
          </div>
        );
      }
      
      // 코드 블록 처리
      const code = match[1].trim();
      elements.push(
        <div key={`code-${match.index}`} className="relative my-3 group">
          <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto border border-gray-300 dark:border-gray-600">
            <code className="text-sm font-mono text-gray-800 dark:text-gray-200">
              {code}
            </code>
          </pre>
          <button
            onClick={() => handleCopyCode(code)}
            className="absolute top-2 right-2 p-2 bg-white dark:bg-gray-700 rounded-md shadow-sm border border-gray-300 dark:border-gray-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50 dark:hover:bg-gray-600"
            title="코드 복사"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 dark:text-gray-300">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
            </svg>
          </button>
        </div>
      );
      
      currentIndex = match.index + match[0].length;
    }
    
    // 마지막 텍스트 처리
    if (currentIndex < safeText.length) {
      const remainingText = safeText.slice(currentIndex);
      elements.push(
        <div key={`text-${currentIndex}`}>
          {formatNormalText(remainingText)}
        </div>
      );
    }
    
    return <>{elements}</>;
  }, [handleCopyCode]);
  
  // 일반 텍스트 포맷팅 (볼드, 제목, 표)
  const formatNormalText = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      
      // 마크다운 표 감지 (|로 시작하는 줄)
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const tableLines: string[] = [];
        let j = i;
        
        // 연속된 표 줄 수집
        while (j < lines.length && lines[j].trim().startsWith('|') && lines[j].trim().endsWith('|')) {
          tableLines.push(lines[j]);
          j++;
        }
        
        // 표가 최소 2줄 이상이어야 함 (헤더 + 구분선 또는 헤더 + 데이터)
        if (tableLines.length >= 2) {
          const headers = tableLines[0].split('|').map(h => h.trim()).filter(Boolean);
          const rows: string[][] = [];
          
          // 구분선(---)이 있는지 확인하고 건너뛰기
          let dataStartIndex = 1;
          if (tableLines[1].includes('---') || tableLines[1].includes('--')) {
            dataStartIndex = 2;
          }
          
          // 데이터 행 파싱
          for (let k = dataStartIndex; k < tableLines.length; k++) {
            const cells = tableLines[k].split('|').map(c => c.trim()).filter(Boolean);
            if (cells.length > 0) {
              rows.push(cells);
            }
          }
          
          // 셀 내용 포맷팅 함수 (볼드 처리)
          const formatCellContent = (text: string) => {
            const parts = text.split(/(\*\*.*?\*\*)/g);
            return parts.map((part, index) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                const boldText = part.slice(2, -2);
                return <strong key={index} className="font-bold">{boldText}</strong>;
              }
              return <span key={index}>{part}</span>;
            });
          };
          
          // 표 렌더링
          elements.push(
            <div key={`table-${i}`} className="my-4 overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    {headers.map((header, idx) => (
                      <th key={idx} className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left font-semibold text-gray-900 dark:text-gray-100">
                        {formatCellContent(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx} className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-800 dark:text-gray-200">
                          {formatCellContent(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          
          i = j;
          continue;
        }
      }
      
      // ## 제목 처리
      if (line.trim().startsWith('##')) {
        const titleText = line.trim().slice(2).trim();
        elements.push(
          <h2 key={i} className="text-xl font-bold mt-4 mb-2">
            {titleText}
          </h2>
        );
        i++;
        continue;
      }
      
      // **텍스트** bold 처리
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedParts = parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const boldText = part.slice(2, -2);
          return <strong key={index} className="font-bold">{boldText}</strong>;
        }
        return <span key={index}>{part}</span>;
      });
      
      elements.push(
        <div key={i}>
          {formattedParts}
          {i < lines.length - 1 && <br />}
        </div>
      );
      
      i++;
    }
    
    return <>{elements}</>;
  };
  
  return wrapWithProfiler(
    'ChatRoot',
    <div className="flex h-[calc(100vh-3.5rem)] bg-white dark:bg-gray-900 overflow-hidden">
      {/* 사이드바 */}
      {wrapWithProfiler(
        'ChatSidebar',
        <div className="w-64 flex-shrink-0 bg-[#f9f9f9] dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col chat-list-card">
        {/* 새 채팅 버튼 */}
        <div className="p-2">
          <button
            onClick={handleNewChat}
            disabled={isOnCooldown}
            className={cn(
              "chat-new-button w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700",
              isOnCooldown && "opacity-50 cursor-not-allowed"
            )}
          >
            <span className="text-sm font-normal">{isOnCooldown ? t.chat.pleaseWait : t.chat.newChat}</span>
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        {/* 대화 목록 */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          <div className="space-y-1">
            {[...chatSessions]
              .sort((a, b) => {
                // 고정된 대화를 먼저 표시
                // 업데이트 시간 기준으로 정렬
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
              })
              .map(session => (
              <div
                key={session.id}
                className={cn(
                  'group relative rounded-lg transition-colors',
                  session.id === currentSessionId ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                <div className="flex items-center justify-between px-3 py-2.5 gap-1">
                  {isRenaming === session.id ? (
                    <>
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateChatSessionTitle(session.id, newTitle);
                            setIsRenaming(null);
                          } else if (e.key === 'Escape') {
                            setIsRenaming(null);
                          }
                        }}
                        className="flex-1 text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-900"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          updateChatSessionTitle(session.id, newTitle);
                          setIsRenaming(null);
                        }}
                        className="p-1 hover:bg-gray-300 rounded transition-all text-green-600"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setIsRenaming(null)}
                        className="p-1 hover:bg-gray-300 rounded transition-all text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setCurrentSession(session.id)}
                        className="flex-1 text-left text-sm text-gray-800 truncate font-normal"
                      >
                        {session.title}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsRenaming(session.id);
                          setNewTitle(session.title);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all text-gray-600"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (showDeleteConfirmation) {
                            setShowDeleteConfirm(session.id);
                          } else {
                            deleteChatSession(session.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all text-gray-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 하단 메뉴 - 로그인한 경우만 표시 */}
        {currentUser && (
          <div className="border-t border-gray-200 p-2 space-y-1">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 transition-colors text-sm text-gray-800 font-normal"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>{t.chat.dashboard}</span>
            </button>
            <button
              onClick={() => router.push('/settings')}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 transition-colors text-sm text-gray-800 font-normal"
            >
              <Settings className="w-4 h-4" />
              <span>{t.chat.settings}</span>
            </button>
          </div>
        )}
      </div>
      )}
      
      {/* 메인 채팅 영역 */}
      <div className="flex-1 flex flex-col">
        {/* 메시지 영역 */}
        {wrapWithProfiler(
          'ChatMessages',
          <div 
            ref={messagesContainerRef}
            className={cn(
              "flex-1 chat-message-card",
              currentSession?.messages.length === 0 ? "overflow-hidden" : "overflow-y-auto"
            )}
            onScroll={(e) => {
              const container = e.currentTarget;
              const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
              userScrolledUpRef.current = !isAtBottom;
            }}
          >
          {currentSession?.messages.length === 0 ? (
            <div className="text-center px-4 flex items-center justify-center h-full">
              <h1 className="text-4xl font-bold text-gray-800">{t.chat.welcome}</h1>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-6 pt-6">
              {(() => {
                const messages = currentSession?.messages || [];
                const shouldUseDraftSplit = STREAMING_DRAFT_V2 && !!draftMessageId;
                const draftIndex = shouldUseDraftSplit
                  ? messages.findIndex((m) => m.id === draftMessageId)
                  : -1;
                const hasDraftInMessages = shouldUseDraftSplit && draftIndex >= 0;

                const renderMessage = (msg: any, msgIndex: number, overrideContent?: string) => (
                  <ChatMessageRow
                    key={msg.id}
                    msg={msg}
                    msgIndex={msgIndex}
                    overrideContent={overrideContent}
                    modelById={modelById}
                    formatMessage={formatMessage}
                    onDownloadImage={handleDownloadImage}
                    isStreaming={isLoading && msg.role === 'assistant' && !msg.content && msgIndex === messages.length - 1}
                  />
                );

                if (!hasDraftInMessages) {
                  return <>{messages.map((msg, msgIndex) => renderMessage(msg, msgIndex))}</>;
                }

                const beforeDraft = messages.slice(0, draftIndex);
                const draftMsg = messages[draftIndex];
                const afterDraft = messages.slice(draftIndex + 1);

                const beforeDraftNodes = beforeDraft.map((msg, idx) => renderMessage(msg, idx));
                const afterDraftNodes = afterDraft.map((msg, idx) => renderMessage(msg, draftIndex + 1 + idx));

                return (
                  <>
                    {beforeDraftNodes}
                    {renderMessage(draftMsg, draftIndex, draftContent)}
                    {afterDraftNodes}
                  </>
                );
              })()}
              
              {/* 취소 버튼 - 로딩 중에만 표시 */}
              {isLoading && (
                <div className="flex justify-center py-2">
                  <button
                    onClick={handleCancelStream}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full text-sm text-gray-600 dark:text-gray-300 transition-colors"
                  >
                    <Square className="w-3.5 h-3.5" />
                    응답 중지
                  </button>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        )}
        
        {/* 입력 영역 */}
        {wrapWithProfiler(
          'ChatInput',
          <div className="p-4">
          <div className="max-w-3xl mx-auto">
            {/* 모델 선택 */}
            <div className="mb-3">
              <select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
              >
                <option value="">{t.chat.selectModel}</option>
                {availableModels.map(model => {
                  const credits = walletCredits?.[model.id] || 0;
                  return (
                    <option key={model.id} value={model.id}>
                      {model.displayName} (잔여 {credits}회)
                    </option>
                  );
                })}
              </select>
            </div>


            {/* 첨부 미리보기 */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {attachments.map(att => (
                  <div key={att.id} className="flex items-center gap-2 bg-gray-50 border rounded-lg px-2 py-1">
                    {att.type === 'image' ? (
                      <div className="w-8 h-8 rounded overflow-hidden border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={att.dataUrl} alt={att.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <Paperclip className="w-4 h-4 text-gray-500" />
                    )}
                    <span className="text-xs text-gray-700 max-w-[120px] truncate">{att.name}</span>
                    <button onClick={() => removeAttachment(att.id)} className="p-0.5 hover:bg-gray-200 rounded">
                      <X className="w-3 h-3 text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,text/plain,application/json"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />

            {/* 메인 입력창 */}
            <div className="relative bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-3xl shadow-sm hover:shadow-md transition-shadow chat-input-card">
              <div className="flex items-end p-3 gap-2">
                {/* Plus 버튼 */}
                <div className="relative" ref={plusMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowPlusMenu(!showPlusMenu)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Plus className="w-5 h-5 text-gray-600" />
                  </button>

                  {/* Plus 메뉴 */}
                  {showPlusMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowPlusMenu(false)}></div>
                      <div className="absolute bottom-full left-0 mb-2 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                        <div className="p-2">
                          {/* 템플릿 */}
                          <button
                            onClick={() => {
                              setShowTemplates(true);
                              setShowPlusMenu(false);
                            }}
                            className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                          >
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <MessageSquare className="w-5 h-5 text-blue-700" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900">대화 템플릿</div>
                              <div className="text-xs text-gray-500">저장된 프롬프트 사용</div>
                            </div>
                          </button>

                          {/* 모델 비교 */}
                          <button
                            onClick={() => {
                              setShowComparison(true);
                              setShowPlusMenu(false);
                            }}
                            className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                          >
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                              <GitCompare className="w-5 h-5 text-purple-700" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900">모델 비교</div>
                              <div className="text-xs text-gray-500">여러 모델 동시 비교</div>
                            </div>
                          </button>

                          {/* 페르소나 */}
                          <button
                            onClick={() => {
                              setShowPersona(true);
                              setShowPlusMenu(false);
                            }}
                            className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                          >
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <UserCircle className="w-5 h-5 text-green-700" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900">페르소나 설정</div>
                              <div className="text-xs text-gray-500">AI 성격 및 말투 조절</div>
                            </div>
                          </button>

                          {/* 파일 추가 */}
                          <button
                            onClick={() => {
                              fileInputRef.current?.click();
                              setShowPlusMenu(false);
                            }}
                            className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                          >
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                              <Paperclip className="w-5 h-5 text-gray-700" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900">사진 및 파일 추가</div>
                              <div className="text-xs text-gray-500">이미지, 텍스트 파일 업로드</div>
                            </div>
                          </button>

                          {/* Temperature 조절 */}
                          <div className="px-4 py-3 border-t border-gray-100 mt-2">
                            <div className="mb-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-semibold text-gray-900">응답 스타일</span>
                                <span className="text-sm text-gray-600">{temperature.toFixed(1)}</span>
                              </div>
                              {(selectedModelId === 'gpt5' || selectedModelId === 'gpt51' || selectedModelId === 'gpt52') && (
                                <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded mt-1">
                                  ⚠️ GPT-5 시리즈 모델은 응답 스타일 조절을 지원하지 않습니다
                                </div>
                              )}
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="1.9"
                              step="0.1"
                              value={temperature}
                              onChange={(e) => setTemperature(parseFloat(e.target.value))}
                              disabled={selectedModelId === 'gpt5' || selectedModelId === 'gpt51' || selectedModelId === 'gpt52'}
                              className={cn(
                                "w-full h-1 bg-gray-200 rounded-lg appearance-none",
                                (selectedModelId === 'gpt5' || selectedModelId === 'gpt51' || selectedModelId === 'gpt52')
                                  ? "cursor-not-allowed opacity-50" 
                                  : "cursor-pointer"
                              )}
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                              <span>정확</span>
                              <span>창의</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* 텍스트 입력 */}
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={streamingRef.current ? "AI가 답변 중입니다..." : t.chat.askAnything}
                  className={cn(
                    "flex-1 px-2 py-2 bg-transparent focus:outline-none resize-none",
                    streamingRef.current || isLoading
                      ? "text-gray-400 placeholder-gray-300 cursor-not-allowed"
                      : "text-gray-900 placeholder-gray-400 dark:text-white dark:placeholder-gray-500"
                  )}
                  rows={1}
                  style={{ minHeight: '24px', maxHeight: '200px', overflowY: 'hidden' }}
                  maxLength={selectedModelMaxCharacters}
                  disabled={isLoading || streamingRef.current}
                />

                {/* 전송 버튼 */}
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isLoading || streamingRef.current || !selectedModelId}
                  className={cn(
                    "chat-send-button p-2 rounded-full transition-all",
                    !message.trim() || isLoading || streamingRef.current || !selectedModelId
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-primary text-primary-foreground hover:opacity-90"
                  )}
                  title={streamingRef.current ? "AI가 답변 중입니다" : ""}
                >
                  {isLoading || streamingRef.current ? (
                    <div className="w-5 h-5 border-2 border-t-gray-400 border-r-gray-400 border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* 글자 수 표시 */}
            {selectedModelId && (
              <div className="mt-2 text-xs text-gray-500 text-right">
                {message.length} / {selectedModelMaxCharacters}{t.chat.characterCount}
              </div>
            )}

            {availableModels.length === 0 && (
              <div className="mt-3 p-3 bg-yellow-50 rounded-lg flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-yellow-800">
                    {t.chat.noCredits}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
      
      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteConfirm(null);
            }
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">{t.chat.deleteTitle}</h3>
            <p className="mb-6 dark:text-gray-300">{t.chat.deleteConfirm}</p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(null);
                }}
              >
                {t.cancel}
              </Button>
              <Button
                variant="danger"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteChatSession(showDeleteConfirm);
                  setShowDeleteConfirm(null);
                }}
              >
                {t.delete}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 템플릿 모달 */}
      {showTemplates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowTemplates(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{t.chat.templates}</h2>
              <button onClick={() => setShowTemplates(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              <ChatTemplatesContent />
            </div>
          </div>
        </div>
      )}

      {/* 모델 비교 모달 */}
      {showComparison && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowComparison(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{t.chat.modelComparison}</h2>
              <button onClick={() => setShowComparison(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <ModelComparisonContent />
            </div>
          </div>
        </div>
      )}

      {/* 페르소나 모달 */}
      {showPersona && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowPersona(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{t.chat.persona}</h2>
              <button onClick={() => setShowPersona(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <PersonaSettingsContent />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 템플릿 컴포넌트 임포트를 위한 래퍼
const ChatTemplatesContent = dynamic(() => import('@/components/ChatTemplates').then(mod => ({ default: mod.ChatTemplates })), { ssr: false });
const ModelComparisonContent = dynamic(() => import('@/components/ModelComparison').then(mod => ({ default: mod.ModelComparison })), { ssr: false });
const PersonaSettingsContent = dynamic(() => import('@/components/PersonaSettings').then(mod => ({ default: mod.PersonaSettings })), { ssr: false });
