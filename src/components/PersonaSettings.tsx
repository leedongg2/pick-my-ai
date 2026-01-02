'use client';

import React, { useState } from 'react';
import { useStore } from '@/store';
import { toast } from 'sonner';
import { 
  User, Smile, MessageSquare, Brain, Settings, 
  Plus, Edit2, Trash2, Save, X, Volume2, Hash,
  Sparkles, Briefcase, Heart, Zap, BookOpen, Palette
} from 'lucide-react';
import { cn } from '@/utils/cn';

const toneOptions = [
  { value: 'formal', label: '공식적', icon: Briefcase, description: '정중하고 격식있는 톤' },
  { value: 'casual', label: '캐주얼', icon: Smile, description: '편안하고 친근한 톤' },
  { value: 'friendly', label: '친근함', icon: Heart, description: '따뜻하고 다정한 톤' },
  { value: 'professional', label: '전문적', icon: Briefcase, description: '신뢰감있고 전문적인 톤' },
  { value: 'humorous', label: '유머러스', icon: Smile, description: '재치있고 유쾌한 톤' },
];

const languageOptions = [
  { value: 'polite', label: '존댓말', description: '정중한 존댓말 사용' },
  { value: 'casual', label: '반말', description: '편한 반말 사용' },
  { value: 'technical', label: '전문용어', description: '기술적 전문용어 포함' },
];

const responseLengthOptions = [
  { value: 'concise', label: '간결', description: '핵심만 짧게' },
  { value: 'balanced', label: '균형', description: '적절한 길이' },
  { value: 'detailed', label: '상세', description: '자세하고 풍부한 설명' },
];

export const PersonaSettings: React.FC = () => {
  const { 
    personas,
    activePersona,
    createPersona,
    setActivePersona,
    updatePersona,
  } = useStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPersona, setEditingPersona] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    personality: {
      tone: 'friendly' as any,
      language: 'polite' as any,
      emotionLevel: 5,
      emojiUsage: true,
      responseLength: 'balanced' as any,
    },
    expertise: {
      domains: [] as string[],
      level: 'intermediate' as any,
      specificKnowledge: [] as string[],
    },
    speechPatterns: {
      greetings: [] as string[],
      closings: [] as string[],
      catchPhrases: [] as string[],
      vocabularyLevel: 'moderate' as any,
    },
    memory: {
      rememberUser: true,
      contextLength: 10,
      personalFacts: {} as any,
    },
    growthSettings: {
      learningEnabled: true,
      adaptToUser: true,
      feedbackIntegration: true,
    },
  });

  // 페르소나 생성/수정
  const handleSavePersona = () => {
    if (!formData.name.trim()) {
      toast.error('페르소나 이름을 입력해주세요.');
      return;
    }

    if (editingPersona) {
      updatePersona(editingPersona.id, formData);
      toast.success('페르소나가 수정되었습니다.');
    } else {
      createPersona(formData);
      toast.success('페르소나가 생성되었습니다.');
    }

    setShowCreateModal(false);
    setEditingPersona(null);
    resetForm();
  };

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      name: '',
      personality: {
        tone: 'friendly',
        language: 'polite',
        emotionLevel: 5,
        emojiUsage: true,
        responseLength: 'balanced',
      },
      expertise: {
        domains: [],
        level: 'intermediate',
        specificKnowledge: [],
      },
      speechPatterns: {
        greetings: [],
        closings: [],
        catchPhrases: [],
        vocabularyLevel: 'moderate',
      },
      memory: {
        rememberUser: true,
        contextLength: 10,
        personalFacts: {},
      },
      growthSettings: {
        learningEnabled: true,
        adaptToUser: true,
        feedbackIntegration: true,
      },
    });
  };

  // 페르소나 삭제
  const handleDeletePersona = (id: string) => {
    if (window.confirm('이 페르소나를 삭제하시겠습니까?')) {
      // Delete logic would go here
      toast.success('페르소나가 삭제되었습니다.');
    }
  };

  // 페르소나 활성화
  const handleActivatePersona = (persona: any) => {
    setActivePersona(persona.id);
    toast.success(`"${persona.name}" 페르소나가 활성화되었습니다.`);
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">AI 페르소나 설정</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          AI의 성격, 말투, 전문성을 커스터마이징하여 나만의 AI 비서를 만들어보세요.
        </p>
      </div>

      {/* 현재 활성 페르소나 */}
      {activePersona && (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center text-white dark:text-gray-900 font-bold">
                {activePersona.name[0].toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold">{activePersona.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">현재 활성 페르소나</p>
              </div>
            </div>
            <button
              onClick={() => setActivePersona(null)}
              className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              비활성화
            </button>
          </div>
        </div>
      )}

      {/* 페르소나 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 새 페르소나 추가 카드 */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="h-64 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-400 transition-all flex flex-col items-center justify-center gap-3 group"
        >
          <Plus className="w-10 h-10 text-gray-400 group-hover:text-indigo-500 transition-colors" />
          <span className="text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 font-medium">
            새 페르소나 만들기
          </span>
        </button>

        {/* 기존 페르소나 카드들 */}
        {personas.map(persona => {
          const isActive = activePersona?.id === persona.id;
          const ToneIcon = toneOptions.find(t => t.value === persona.personality.tone)?.icon || Smile;
          
          return (
            <div
              key={persona.id}
              className={cn(
                'h-64 p-5 rounded-xl border-2 transition-all',
                isActive
                  ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              )}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-900 dark:text-white font-bold">
                  {persona.name[0].toUpperCase()}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingPersona(persona);
                      setFormData({
                        ...persona,
                        expertise: {
                          ...persona.expertise,
                          specificKnowledge: persona.expertise.specificKnowledge || [],
                        },
                        speechPatterns: {
                          ...persona.speechPatterns,
                          greetings: persona.speechPatterns.greetings || [],
                          closings: persona.speechPatterns.closings || [],
                          catchPhrases: persona.speechPatterns.catchPhrases || [],
                        },
                        memory: {
                          ...persona.memory,
                          personalFacts: persona.memory.personalFacts || {},
                        },
                      });
                      setShowCreateModal(true);
                    }}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePersona(persona.id)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-lg mb-2">{persona.name}</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <ToneIcon className="w-4 h-4" />
                  <span>{toneOptions.find(t => t.value === persona.personality.tone)?.label}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <MessageSquare className="w-4 h-4" />
                  <span>{languageOptions.find(l => l.value === persona.personality.language)?.label}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Brain className="w-4 h-4" />
                  <span>{persona.expertise.level}</span>
                </div>
                {persona.personality.emojiUsage && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Smile className="w-4 h-4" />
                    <span>이모지 사용</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleActivatePersona(persona)}
                disabled={isActive}
                className={cn(
                  'w-full mt-4 py-2 rounded-lg font-medium transition-all',
                  isActive
                    ? 'bg-indigo-600 text-white cursor-default'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                )}
              >
                {isActive ? '활성화됨' : '활성화'}
              </button>
            </div>
          );
        })}
      </div>

      {/* 페르소나 생성/수정 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">
                  {editingPersona ? '페르소나 수정' : '새 페르소나 만들기'}
                </h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingPersona(null);
                    resetForm();
                  }}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* 기본 정보 */}
              <div>
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  기본 정보
                </h4>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="페르소나 이름 (예: 친절한 비서)"
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-900"
                />
              </div>

              {/* 성격 설정 */}
              <div>
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Smile className="w-4 h-4" />
                  성격 설정
                </h4>
                
                {/* 톤 선택 */}
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">대화 톤</label>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                    {toneOptions.map(option => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          onClick={() => setFormData({
                            ...formData,
                            personality: { ...formData.personality, tone: option.value }
                          })}
                          className={cn(
                            'p-3 rounded-lg border-2 transition-all text-left',
                            formData.personality.tone === option.value
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="w-4 h-4" />
                            <span className="font-medium text-sm">{option.label}</span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {option.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 언어 스타일 */}
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">언어 스타일</label>
                  <div className="grid grid-cols-3 gap-2">
                    {languageOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => setFormData({
                          ...formData,
                          personality: { ...formData.personality, language: option.value }
                        })}
                        className={cn(
                          'p-3 rounded-lg border-2 transition-all',
                          formData.personality.language === option.value
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                        )}
                      >
                        <div className="font-medium text-sm mb-1">{option.label}</div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {option.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 응답 길이 */}
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">응답 길이</label>
                  <div className="grid grid-cols-3 gap-2">
                    {responseLengthOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => setFormData({
                          ...formData,
                          personality: { ...formData.personality, responseLength: option.value }
                        })}
                        className={cn(
                          'p-3 rounded-lg border-2 transition-all',
                          formData.personality.responseLength === option.value
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                        )}
                      >
                        <div className="font-medium text-sm mb-1">{option.label}</div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {option.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 감정 표현 레벨 */}
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">
                    감정 표현 레벨: {formData.personality.emotionLevel}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={formData.personality.emotionLevel}
                    onChange={(e) => setFormData({
                      ...formData,
                      personality: { ...formData.personality, emotionLevel: Number(e.target.value) }
                    })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>무감정</span>
                    <span>보통</span>
                    <span>매우 감정적</span>
                  </div>
                </div>

                {/* 이모지 사용 */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.personality.emojiUsage}
                    onChange={(e) => setFormData({
                      ...formData,
                      personality: { ...formData.personality, emojiUsage: e.target.checked }
                    })}
                    className="w-4 h-4"
                  />
                  <label className="text-sm">이모지 사용하기</label>
                </div>
              </div>

              {/* 성장 설정 */}
              <div>
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  성장형 AI 설정
                </h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.growthSettings.learningEnabled}
                      onChange={(e) => setFormData({
                        ...formData,
                        growthSettings: { ...formData.growthSettings, learningEnabled: e.target.checked }
                      })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">대화에서 학습하기</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.growthSettings.adaptToUser}
                      onChange={(e) => setFormData({
                        ...formData,
                        growthSettings: { ...formData.growthSettings, adaptToUser: e.target.checked }
                      })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">사용자에게 적응하기</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.growthSettings.feedbackIntegration}
                      onChange={(e) => setFormData({
                        ...formData,
                        growthSettings: { ...formData.growthSettings, feedbackIntegration: e.target.checked }
                      })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">피드백 통합하기</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingPersona(null);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSavePersona}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingPersona ? '수정하기' : '생성하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
