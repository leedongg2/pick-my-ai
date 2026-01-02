'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useStore } from '@/store';
import { toast } from 'sonner';
import { 
  FileText, Plus, Star, StarOff, Search, Filter, 
  TrendingUp, Edit2, Trash2, Copy,
  Tag, Calendar, Hash, ChevronRight
} from 'lucide-react';
import { cn } from '@/utils/cn';

const categories = [
  { id: 'all', name: '전체', icon: FileText },
  { id: 'business', name: '비즈니스', icon: TrendingUp },
  { id: 'creative', name: '창작', icon: Edit2 },
  { id: 'technical', name: '기술', icon: Hash },
  { id: 'education', name: '교육', icon: FileText },
  { id: 'personal', name: '개인', icon: Tag },
];

export const ChatTemplates: React.FC = () => {
  const { 
    chatTemplates,
    favoriteTemplates,
    currentUser,
    addChatTemplate,
    toggleFavoriteTemplate,
    incrementTemplateUsage,
  } = useStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'favorite'>('recent');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  // 새 템플릿 생성 폼
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: 'personal',
    prompt: '',
    variables: [] as any[],
  });

  // 필터링된 템플릿
  const filteredTemplates = useMemo(() => {
    let templates = [...chatTemplates];

    // 카테고리 필터
    if (selectedCategory !== 'all') {
      templates = templates.filter(t => t.category === selectedCategory);
    }

    // 검색 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      templates = templates.filter(t => 
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.prompt.toLowerCase().includes(query)
      );
    }

    // 정렬
    switch (sortBy) {
      case 'recent':
        templates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'popular':
        templates.sort((a, b) => b.usage - a.usage);
        break;
      case 'favorite':
        templates = templates.filter(t => favoriteTemplates.includes(t.id));
        break;
    }

    return templates;
  }, [chatTemplates, selectedCategory, searchQuery, sortBy, favoriteTemplates]);

  // 템플릿 생성
  const handleCreateTemplate = useCallback(() => {
    if (!newTemplate.name.trim()) {
      toast.error('템플릿 이름을 입력해주세요.');
      return;
    }

    if (!newTemplate.prompt.trim()) {
      toast.error('프롬프트를 입력해주세요.');
      return;
    }

    addChatTemplate({
      ...newTemplate,
      createdBy: currentUser?.id || 'anonymous',
    });

    toast.success('템플릿이 생성되었습니다.');
    setShowCreateModal(false);
    setNewTemplate({
      name: '',
      description: '',
      category: 'personal',
      prompt: '',
      variables: [],
    });
  }, [newTemplate, currentUser, addChatTemplate]);

  // 템플릿 사용
  const handleUseTemplate = useCallback((template: any) => {
    incrementTemplateUsage(template.id);
    setActiveTemplate(template.id);
    setSelectedTemplate(template);
    
    toast.success(`"${template.name}" 템플릿을 적용했습니다. 채팅창에서 사용하세요.`);
  }, [incrementTemplateUsage, setActiveTemplate]);

  // 변수 추가
  const handleAddVariable = useCallback(() => {
    setNewTemplate({
      ...newTemplate,
      variables: [...newTemplate.variables, {
        name: '',
        type: 'text',
        placeholder: '',
        required: false,
      }],
    });
  }, [newTemplate]);

  // 변수 업데이트
  const updateVariable = useCallback((index: number, field: string, value: any) => {
    const updatedVars = [...newTemplate.variables];
    updatedVars[index] = { ...updatedVars[index], [field]: value };
    setNewTemplate({ ...newTemplate, variables: updatedVars });
  }, [newTemplate]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as any);
  }, []);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">대화 템플릿</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          자주 사용하는 프롬프트를 템플릿으로 저장하고 빠르게 재사용하세요.
        </p>
      </div>

      {/* 도구 모음 */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* 검색 */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="템플릿 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900"
            />
          </div>

          {/* 정렬 */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={sortBy}
              onChange={handleSortChange}
              className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900"
            >
              <option value="recent">최신순</option>
              <option value="popular">인기순</option>
              <option value="favorite">즐겨찾기</option>
            </select>
          </div>

          {/* 새 템플릿 */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            새 템플릿
          </button>
        </div>

        {/* 카테고리 탭 */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
          {categories.map(category => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all',
                  selectedCategory === category.id
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                <Icon className="w-4 h-4" />
                {category.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* 템플릿 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map(template => {
          const isFavorite = favoriteTemplates.includes(template.id);
          
          return (
            <div
              key={template.id}
              className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {template.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => toggleFavoriteTemplate(template.id)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {isFavorite ? (
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  ) : (
                    <StarOff className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </div>

              {/* 템플릿 미리보기 */}
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg mb-3">
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                  {template.prompt}
                </p>
              </div>

              {/* 변수 표시 */}
              {template.variables && template.variables.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {template.variables.map((v: any, i: number) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-md"
                    >
                      {'{' + v.name + '}'}
                    </span>
                  ))}
                </div>
              )}

              {/* 메타 정보 */}
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {categories.find(c => c.id === template.category)?.name}
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {template.usage}회
                </span>
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleUseTemplate(template)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <ChevronRight className="w-4 h-4" />
                  사용하기
                </button>
                <button
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  onClick={() => {
                    navigator.clipboard.writeText(template.prompt);
                    toast.success('템플릿이 복사되었습니다.');
                  }}
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 템플릿 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold">새 템플릿 만들기</h3>
            </div>

            <div className="p-6 space-y-4">
              {/* 기본 정보 */}
              <div>
                <label className="block text-sm font-medium mb-2">템플릿 이름 *</label>
                <input
                  type="text"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="예: 블로그 포스트 작성"
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">설명</label>
                <input
                  type="text"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  placeholder="이 템플릿의 용도를 간단히 설명해주세요"
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">카테고리</label>
                <select
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900"
                >
                  {categories.filter(c => c.id !== 'all').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* 프롬프트 */}
              <div>
                <label className="block text-sm font-medium mb-2">프롬프트 *</label>
                <textarea
                  value={newTemplate.prompt}
                  onChange={(e) => setNewTemplate({ ...newTemplate, prompt: e.target.value })}
                  placeholder="변수는 {변수명} 형식으로 입력하세요. 예: {주제}에 대한 블로그 포스트를 작성해주세요."
                  className="w-full h-32 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900"
                />
              </div>

              {/* 변수 설정 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">변수 설정</label>
                  <button
                    onClick={handleAddVariable}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + 변수 추가
                  </button>
                </div>
                {newTemplate.variables.map((v, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={v.name}
                      onChange={(e) => updateVariable(i, 'name', e.target.value)}
                      placeholder="변수명"
                      className="flex-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900"
                    />
                    <select
                      value={v.type}
                      onChange={(e) => updateVariable(i, 'type', e.target.value)}
                      className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900"
                    >
                      <option value="text">텍스트</option>
                      <option value="number">숫자</option>
                      <option value="select">선택</option>
                      <option value="date">날짜</option>
                    </select>
                    <button
                      onClick={() => {
                        const vars = [...newTemplate.variables];
                        vars.splice(i, 1);
                        setNewTemplate({ ...newTemplate, variables: vars });
                      }}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCreateTemplate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                생성하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
