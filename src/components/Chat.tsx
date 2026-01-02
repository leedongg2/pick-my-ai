'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useStore } from '@/store';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Sparkles, Send, Plus, Settings, LayoutDashboard, LogOut, Trash2, Upload, X, Download, Pencil, Check, User, Bot, Paperclip, ChevronRight, AlertCircle, MessageSquare, GitCompare, UserCircle, Pin } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import { useRouter } from 'next/navigation';
import type { ChatTemplate } from '@/types';

// Constants
const MAX_ATTACHMENTS = 5;

// Types
type Attachment = {
  id: string;
  name: string;
  type: 'image' | 'text';
  dataUrl?: string;
  content?: string;
};

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
  const [generatingTitleFor, setGeneratingTitleFor] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  
  const {
    chatSessions,
    currentSessionId,
    createChatSession,
    updateChatSessionTitle,
    deleteChatSession,
    addMessage,
    getCredits,
    deductCredit,
    setCurrentSession,
    models,
    activePersona,
    settings: {
      showDeleteConfirmation,
    },
  } = useStore();

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
  
  const availableModels = useMemo(
    () => models.filter(m => {
      const credits = getCredits(m.id);
      return credits > 0 && m.enabled;
    }),
    [models, getCredits]
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
  
  // Set default model when available models change (client-side only)
  useEffect(() => {
    if (availableModels.length > 0 && !selectedModelId) {
      setSelectedModelId(availableModels[0].id);
    }
  }, [availableModels, selectedModelId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages]);
  
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

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
      const response = await fetch(imageUrl);
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
    } catch (error) {
      console.error('이미지 다운로드 실패:', error);
      toast.error('이미지 다운로드에 실패했습니다.');
    }
  }, []);

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedModelId) return;
    
    const model = models.find(m => m.id === selectedModelId);
    if (!model) return;
    
    const credits = getCredits(selectedModelId);
    if (credits <= 0) {
      toast.error(`${model.displayName} 크레딧이 부족합니다.`);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const msg = message;
      setMessage('');
      
      // 크레딧 차감 시도 (store에서 가져온 함수 사용)
      deductCredit(selectedModelId);
      
      // API 호출을 위한 메시지 준비 (현재 메시지 포함)
      const currentMessages = currentSession?.messages || [];
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
      
      console.log('[Chat] Sending messages to API:', {
        totalMessages: apiMessages.length,
        lastMessage: apiMessages[apiMessages.length - 1]
      });
      
      // 사용자 메시지를 세션에 추가
      if (currentSessionId) {
        console.log('[Chat] Adding user message to session:', currentSessionId);
        addMessage(currentSessionId, {
          id: crypto.randomUUID(),
          role: 'user' as const,
          content: msg,
          timestamp: new Date().toISOString(),
        });
      } else {
        console.error('[Chat] No session ID - cannot add user message');
      }
      
      // CSRF 토큰 가져오기
      const getCsrfToken = () => {
        try {
          const cookies = document.cookie.split(';');
          const csrfCookie = cookies.find(cookie => cookie.trim().startsWith('csrf-token='));
          if (!csrfCookie) {
            console.log('CSRF cookie not found, available cookies:', document.cookie);
            return null;
          }
          const token = csrfCookie.split('=')[1];
          console.log('CSRF token extracted:', token);
          return token;
        } catch (error) {
          console.error('Error extracting CSRF token:', error);
          return null;
        }
      };

      // API 호출
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 3분 타임아웃
      
      let response;
      try {
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': getCsrfToken() || '',
          },
          body: JSON.stringify({
            messages: apiMessages,
            modelId: selectedModelId,
            temperature: temperature,
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
          throw new Error('응답 시간 초과 (3분). 요청이 너무 오래 걸립니다.');
        }
        throw new Error(`네트워크 연결 실패: ${fetchError.message}. 인터넷 연결을 확인해주세요.`);
      }
      clearTimeout(timeoutId);
      
      console.log('API Response status:', response.status);
      console.log('Content-Type:', response.headers.get('content-type'));
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          console.error('Failed to parse error response:', e);
          throw new Error(`API 호출 실패 (상태 코드: ${response.status})`);
        }
        console.error('API Error response:', errorData);
        throw new Error(errorData.error || `API 호출 실패 (상태 코드: ${response.status})`);
      }
      
      // 스트리밍 응답 처리 (OpenAI 모델)
      const isStreaming = response.headers.get('content-type')?.includes('text/event-stream');
      
      if (isStreaming && currentSessionId) {
        console.log('Processing streaming response...');
        
        // 빈 메시지 먼저 추가
        const messageId = crypto.randomUUID();
        addMessage(currentSessionId, {
          id: messageId,
          role: 'assistant' as const,
          content: '',
          modelId: selectedModelId,
          timestamp: new Date().toISOString(),
          creditUsed: 1
        });
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        
        if (reader) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') continue;
                  
                  try {
                    const parsed = JSON.parse(data);
                    if (parsed.content) {
                      fullContent += parsed.content;
                      
                      // 세션의 마지막 메시지 업데이트
                      const session = chatSessions.find(s => s.id === currentSessionId);
                      if (session) {
                        const lastMsg = session.messages[session.messages.length - 1];
                        if (lastMsg && lastMsg.id === messageId) {
                          lastMsg.content = fullContent;
                        }
                      }
                    }
                  } catch (e) {
                    // 파싱 에러 무시
                  }
                }
              }
            }
          } catch (error) {
            console.error('Streaming error:', error);
            throw new Error('스트리밍 중 오류가 발생했습니다.');
          }
        }
        
        if (!fullContent) {
          throw new Error('AI로부터 응답을 받지 못했습니다.');
        }
      } else {
        // 일반 JSON 응답 처리 (다른 모델)
        let data;
        try {
          data = await response.json();
        } catch (e) {
          console.error('Failed to parse response:', e);
          throw new Error('서버 응답을 파싱할 수 없습니다.');
        }
        
        console.log('API Response data:', data);
        
        // 응답이 없는 경우 에러 처리
        if (!data || !data.content) {
          console.error('Empty response from API:', data);
          throw new Error('AI로부터 응답을 받지 못했습니다. 서버 로그를 확인하세요.');
        }
        
        // AI 응답 추가
        if (currentSessionId) {
          console.log('Adding AI message to session:', currentSessionId);
          addMessage(currentSessionId, {
            id: crypto.randomUUID(),
            role: 'assistant' as const,
            content: data.content,
            modelId: selectedModelId,
            timestamp: new Date().toISOString(),
            creditUsed: 1
          });
        }
      }
      
      
      setAttachments([]);
      // toast.success(`${model.displayName} 크레딧 1회 사용 (잔여: ${credits - 1}회)`);
      
    } catch (error: any) {
      console.error('Chat error:', error);
      
      const errorMessage = error.message || '알 수 없는 오류가 발생했습니다.';
      
      // 에러 메시지를 채팅에 추가
      if (currentSessionId) {
        addMessage(currentSessionId, {
          id: crypto.randomUUID(),
          role: 'assistant' as const,
          content: `⚠️ 오류가 발생했습니다: ${errorMessage}\n\n문제가 지속되면:\n1. 인터넷 연결을 확인하세요\n2. API 키가 올바른지 확인하세요\n3. 나중에 다시 시도하세요`,
          modelId: selectedModelId,
          timestamp: new Date().toISOString(),
          creditUsed: 1
        });
      }
      
      toast.error(`응답 생성 실패: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [message, selectedModelId, models, getCredits, currentSession, currentSessionId, deductCredit, addMessage, attachments]);
  
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
      handleSendMessage(e as React.FormEvent);
    }
  }, [handleSendMessage]);
  
  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  }, []);

  // **텍스트**를 bold 처리하고 ## 제목 처리하는 함수 (메모이제이션)
  const formatMessage = useCallback((text: string) => {
    // 줄 단위로 분리
    const lines = text.split('\n');
    
    return (
      <>
        {lines.map((line, lineIndex) => {
          // ## 제목 처리
          if (line.trim().startsWith('##')) {
            const titleText = line.trim().slice(2).trim();
            return (
              <h2 key={lineIndex} className="text-xl font-bold mt-4 mb-2">
                {titleText}
              </h2>
            );
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
          
          return (
            <div key={lineIndex}>
              {formattedParts}
              {lineIndex < lines.length - 1 && <br />}
            </div>
          );
        })}
      </>
    );
  }, []);
  
  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-white dark:bg-gray-900 overflow-hidden">
      {/* 사이드바 */}
      <div className="w-64 flex-shrink-0 bg-[#f9f9f9] dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* 새 채팅 버튼 */}
        <div className="p-2">
          <button
            onClick={handleNewChat}
            disabled={isOnCooldown}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700",
              isOnCooldown && "opacity-50 cursor-not-allowed"
            )}
          >
            <span className="text-sm font-normal">{isOnCooldown ? '잠시만 기다려 주세요' : '새 채팅'}</span>
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

        {/* 하단 메뉴 */}
        <div className="border-t border-gray-200 p-2 space-y-1">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 transition-colors text-sm text-gray-800 font-normal"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>대시보드</span>
          </button>
          <button
            onClick={() => router.push('/settings')}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 transition-colors text-sm text-gray-800 font-normal"
          >
            <Settings className="w-4 h-4" />
            <span>설정</span>
          </button>
        </div>
      </div>
      
      {/* 메인 채팅 영역 */}
      <div className="flex-1 flex flex-col">
        {/* 메시지 영역 */}
        <div className={cn(
          "flex-1",
          currentSession?.messages.length === 0 ? "overflow-hidden" : "overflow-y-auto"
        )}>
          {currentSession?.messages.length === 0 ? (
            <div className="text-center px-4 flex items-center justify-center h-full">
              <h1 className="text-4xl font-bold text-gray-800">환영합니다!</h1>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-6">
              {currentSession?.messages.map((msg) => {
                const model = msg.modelId ? models.find(m => m.id === msg.modelId) : null;
                
                return (
                  <div key={msg.id} className="group mb-4">
                    {msg.role === 'user' ? (
                      // 사용자 메시지 - 파란색 말풍선
                      <div className="flex items-start">
                        <div className="flex-1">
                          <div className="inline-block bg-blue-100 text-gray-900 rounded-2xl px-4 py-3 max-w-[80%]">
                            <div className="text-[15px] leading-6">
                              {(() => {
                                const content = msg.content as unknown as string;
                                const isImage = typeof content === 'string' && (
                                  content.startsWith('http://') ||
                                  content.startsWith('https://') ||
                                  content.startsWith('data:image')
                                );
                                if (isImage) {
                                  return (
                                    <div className="relative group">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={content}
                                        alt="AI 생성 이미지"
                                        className="max-w-full rounded border"
                                      />
                                      <button
                                        onClick={() => handleDownloadImage(content, `ai-image-${Date.now()}.png`)}
                                        className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="이미지 다운로드"
                                      >
                                        <Download className="w-4 h-4 text-gray-700" />
                                      </button>
                                    </div>
                                  );
                                }
                                return <div className="whitespace-pre-wrap">{formatMessage(content)}</div>;
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // AI 메시지 - 말풍선 없이
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white">
                          <Bot className="w-5 h-5" />
                        </div>
                        <div className="flex-1 pt-1">
                          <div className="font-semibold text-gray-900 text-sm mb-1">
                            {model?.displayName || 'ChatGPT'}
                          </div>
                          <div className="text-gray-800 text-[15px] leading-7">
                            {(() => {
                              const content = msg.content as unknown as string;
                              const isImage = typeof content === 'string' && (
                                content.startsWith('http://') ||
                                content.startsWith('https://') ||
                                content.startsWith('data:image')
                              );
                              if (isImage) {
                                return (
                                  <div className="relative group">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={content}
                                      alt="AI 생성 이미지"
                                      className="max-w-full rounded border"
                                    />
                                    <button
                                      onClick={() => handleDownloadImage(content, `ai-image-${Date.now()}.png`)}
                                      className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                      title="이미지 다운로드"
                                    >
                                      <Download className="w-4 h-4 text-gray-700" />
                                    </button>
                                  </div>
                                );
                              }
                              return <div className="whitespace-pre-wrap">{formatMessage(content)}</div>;
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {isLoading && (
                <div className="group mb-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="font-semibold text-gray-900 text-sm mb-1">
                        {models.find(m => m.id === selectedModelId)?.displayName || 'ChatGPT'}
                      </div>
                      {(() => {
                        const isReasoningModel = selectedModelId?.startsWith('o3') || selectedModelId?.startsWith('o4');
                        return isReasoningModel ? (
                          <div className="flex items-center space-x-2">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                            </div>
                            <span className="text-sm text-blue-600 font-medium">추론 중...</span>
                          </div>
                        ) : (
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* 입력 영역 */}
        <div className="border-t border-gray-200 p-4">
          <div className="max-w-3xl mx-auto">
            {/* 모델 선택 */}
            <div className="mb-3">
              <select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
              >
                <option value="">모델 선택</option>
                {availableModels.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.displayName} (잔여: {getCredits(model.id)}회)
                  </option>
                ))}
              </select>
            </div>

            {/* 빠른 템플릿 (첫 메시지 전까지만 표시) */}
            {currentSession && currentSession.messages.length === 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  onClick={() => setMessage('이 글 요약해줘')}
                  className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
                >
                  이 글 요약해줘
                </button>
                <button
                  onClick={() => setMessage('장단점 비교해줘')}
                  className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
                >
                  장단점 비교해줘
                </button>
                <button
                  onClick={() => setMessage('보고서 구조 짜줘')}
                  className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
                >
                  보고서 구조 짜줘
                </button>
                <button
                  onClick={() => setMessage('이 코드 설명해줘')}
                  className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
                >
                  이 코드 설명해줘
                </button>
              </div>
            )}

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
            <div className="relative bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
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
                              {(selectedModelId === 'gpt5' || selectedModelId === 'gpt51') && (
                                <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded mt-1">
                                  ⚠️ GPT-5 시리즈 모델은 응답 스타일 조절을 지원하지 않습니다
                                </div>
                              )}
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="2"
                              step="0.1"
                              value={temperature}
                              onChange={(e) => setTemperature(parseFloat(e.target.value))}
                              disabled={selectedModelId === 'gpt5' || selectedModelId === 'gpt51'}
                              className={cn(
                                "w-full h-1 bg-gray-200 rounded-lg appearance-none",
                                (selectedModelId === 'gpt5' || selectedModelId === 'gpt51')
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
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="무엇이든 물어보세요"
                  className="flex-1 px-2 py-2 focus:outline-none resize-none text-gray-900 placeholder-gray-400"
                  rows={1}
                  style={{ minHeight: '24px', maxHeight: '200px' }}
                  maxLength={models.find(m => m.id === selectedModelId)?.maxCharacters || 2500}
                  disabled={isLoading}
                />

                {/* 전송 버튼 */}
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isLoading || !selectedModelId}
                  className={cn(
                    "p-2 rounded-full transition-all",
                    !message.trim() || isLoading || !selectedModelId
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-black text-white hover:bg-gray-800"
                  )}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-t-white border-r-white border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* 글자 수 표시 */}
            {selectedModelId && (
              <div className="mt-2 text-xs text-gray-500 text-right">
                {message.length} / {models.find(m => m.id === selectedModelId)?.maxCharacters || 2500}자
              </div>
            )}

            {availableModels.length === 0 && (
              <div className="mt-3 p-3 bg-yellow-50 rounded-lg flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-yellow-800">
                    사용 가능한 크레딧이 없습니다. 크레딧을 구매해주세요.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
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
            <h3 className="text-lg font-semibold mb-4 dark:text-white">대화 삭제</h3>
            <p className="mb-6 dark:text-gray-300">정말로 이 대화를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(null);
                }}
              >
                취소
              </Button>
              <Button
                variant="danger"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteChatSession(showDeleteConfirm);
                  setShowDeleteConfirm(null);
                }}
              >
                삭제
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
              <h2 className="text-2xl font-bold text-gray-900">대화 템플릿</h2>
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
              <h2 className="text-2xl font-bold text-gray-900">모델 비교</h2>
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
              <h2 className="text-2xl font-bold text-gray-900">페르소나 설정</h2>
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
