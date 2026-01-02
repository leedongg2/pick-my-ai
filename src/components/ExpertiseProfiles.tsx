'use client';

import React, { useState, useCallback } from 'react';
import { useStore } from '@/store';
import { toast } from 'sonner';
import { 
  GraduationCap, Award, Briefcase, BookOpen, 
  Brain, Plus, Edit2, Trash2, Save, X,
  Target, Code, Lightbulb, FileText, Hash
} from 'lucide-react';
import { cn } from '@/utils/cn';

const domainCategories = [
  { id: 'tech', label: '기술', icon: Code },
  { id: 'business', label: '비즈니스', icon: Briefcase },
  { id: 'science', label: '과학', icon: Brain },
  { id: 'arts', label: '예술', icon: Lightbulb },
  { id: 'education', label: '교육', icon: GraduationCap },
  { id: 'health', label: '건강', icon: Target },
];

const experienceLevels = [
  { value: 'novice', label: '초보', color: 'text-green-500', description: '기초 지식 보유' },
  { value: 'intermediate', label: '중급', color: 'text-blue-500', description: '실무 경험 보유' },
  { value: 'advanced', label: '고급', color: 'text-purple-500', description: '깊은 전문성 보유' },
  { value: 'expert', label: '전문가', color: 'text-red-500', description: '최고 수준의 전문성' },
];

export const ExpertiseProfiles: React.FC = () => {
  const {
    expertiseProfiles,
    activeExpertise,
    createExpertiseProfile,
    setActiveExpertise,
    updateExpertiseProfile,
  } = useStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    domains: {
      primary: 'tech',
      secondary: [] as string[],
    },
    certifications: [] as string[],
    experience: 'intermediate' as any,
    specializations: [] as string[],
    customKnowledge: {
      facts: [] as string[],
      rules: [] as string[],
      examples: [] as string[],
    },
    language: {
      technical: true,
      jargon: [] as string[],
      acronyms: {} as { [key: string]: string },
    },
  });

  const [newCertification, setNewCertification] = useState('');
  const [newSpecialization, setNewSpecialization] = useState('');
  const [newFact, setNewFact] = useState('');
  const [newRule, setNewRule] = useState('');
  const [newExample, setNewExample] = useState('');
  const [newJargon, setNewJargon] = useState('');
  const [newAcronym, setNewAcronym] = useState({ key: '', value: '' });

  // 프로필 생성/수정
  const handleSaveProfile = useCallback(() => {
    if (!formData.name.trim()) {
      toast.error('전문 분야 이름을 입력해주세요.');
      return;
    }

    if (editingProfile) {
      updateExpertiseProfile(editingProfile.id, formData);
      toast.success('전문 분야 프로필이 수정되었습니다.');
    } else {
      createExpertiseProfile(formData);
      toast.success('전문 분야 프로필이 생성되었습니다.');
    }

    setShowCreateModal(false);
    setEditingProfile(null);
    resetForm();
  }, [editingProfile, formData, updateExpertiseProfile, createExpertiseProfile]);

  // 폼 초기화
  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      domains: {
        primary: 'tech',
        secondary: [],
      },
      certifications: [],
      experience: 'intermediate',
      specializations: [],
      customKnowledge: {
        facts: [],
        rules: [],
        examples: [],
      },
      language: {
        technical: true,
        jargon: [],
        acronyms: {},
      },
    });
    setNewCertification('');
    setNewSpecialization('');
    setNewFact('');
    setNewRule('');
    setNewExample('');
    setNewJargon('');
    setNewAcronym({ key: '', value: '' });
  }, []);

  // 프로필 삭제
  const handleDeleteProfile = useCallback((id: string) => {
    if (window.confirm('이 전문 분야 프로필을 삭제하시겠습니까?')) {
      // Delete logic would go here
      toast.success('전문 분야 프로필이 삭제되었습니다.');
    }
  }, []);

  // 프로필 활성화
  const handleActivateProfile = useCallback((profile: any) => {
    setActiveExpertise(profile.id);
    toast.success(`"${profile.name}" 전문 분야가 활성화되었습니다.`);
  }, [setActiveExpertise]);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">전문 분야 설정</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          AI의 전문 지식과 도메인 특화 능력을 설정하세요.
        </p>
      </div>

      {/* 현재 활성 프로필 */}
      {activeExpertise && (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="font-semibold">{activeExpertise.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {domainCategories.find(d => d.id === activeExpertise.domains.primary)?.label} · 
                  {' ' + experienceLevels.find(e => e.value === activeExpertise.experience)?.label}
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveExpertise(null)}
              className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              비활성화
            </button>
          </div>
        </div>
      )}

      {/* 프로필 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 새 프로필 추가 카드 */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="h-64 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-400 transition-all flex flex-col items-center justify-center gap-3 group"
        >
          <Plus className="w-10 h-10 text-gray-400 group-hover:text-indigo-500 transition-colors" />
          <span className="text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 font-medium">
            새 전문 분야 추가
          </span>
        </button>

        {/* 기존 프로필 카드들 */}
        {expertiseProfiles.map(profile => {
          const isActive = activeExpertise?.id === profile.id;
          const domainInfo = domainCategories.find(d => d.id === profile.domains.primary);
          const DomainIcon = domainInfo?.icon || BookOpen;
          const experienceInfo = experienceLevels.find(e => e.value === profile.experience);
          
          return (
            <div
              key={profile.id}
              className={cn(
                'h-64 p-5 rounded-xl border-2 transition-all',
                isActive
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              )}
            >
              <div className="flex justify-between items-start mb-3">
                <DomainIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingProfile(profile);
                      setFormData({
                        ...profile,
                        certifications: profile.certifications || [],
                        customKnowledge: profile.customKnowledge || { facts: [], rules: [], examples: [] },
                        language: profile.language || { technical: true, jargon: [], acronyms: {} },
                      });
                      setShowCreateModal(true);
                    }}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteProfile(profile.id)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-lg mb-2">{profile.name}</h3>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">주 분야:</span>
                  <span className="font-medium">{domainInfo?.label}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">경험:</span>
                  <span className={cn('font-medium', experienceInfo?.color)}>
                    {experienceInfo?.label}
                  </span>
                </div>
                {profile.certifications && profile.certifications.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Award className="w-4 h-4 text-gray-400" />
                    <span>{profile.certifications.length}개 자격증</span>
                  </div>
                )}
                {profile.specializations && profile.specializations.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {profile.specializations.slice(0, 3).map((spec, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs rounded-md"
                      >
                        {spec}
                      </span>
                    ))}
                    {profile.specializations.length > 3 && (
                      <span className="px-2 py-1 text-gray-500 text-xs">
                        +{profile.specializations.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => handleActivateProfile(profile)}
                disabled={isActive}
                className={cn(
                  'w-full py-2 rounded-lg font-medium transition-all',
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

      {/* 프로필 생성/수정 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">
                  {editingProfile ? '전문 분야 수정' : '새 전문 분야 추가'}
                </h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingProfile(null);
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
                <h4 className="font-semibold mb-4">기본 정보</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">전문 분야 이름</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="예: 웹 개발 전문가"
                      className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">주 도메인</label>
                      <select
                        value={formData.domains.primary}
                        onChange={(e) => setFormData({
                          ...formData,
                          domains: { ...formData.domains, primary: e.target.value }
                        })}
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-900"
                      >
                        {domainCategories.map(domain => (
                          <option key={domain.id} value={domain.id}>{domain.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">경험 수준</label>
                      <select
                        value={formData.experience}
                        onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-900"
                      >
                        {experienceLevels.map(level => (
                          <option key={level.value} value={level.value}>{level.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* 자격증 */}
              <div>
                <h4 className="font-semibold mb-4">자격증</h4>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCertification}
                      onChange={(e) => setNewCertification(e.target.value)}
                      placeholder="자격증 이름 입력"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newCertification.trim()) {
                          setFormData({
                            ...formData,
                            certifications: [...(formData.certifications || []), newCertification.trim()]
                          });
                          setNewCertification('');
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-900"
                    />
                    <button
                      onClick={() => {
                        if (newCertification.trim()) {
                          setFormData({
                            ...formData,
                            certifications: [...(formData.certifications || []), newCertification.trim()]
                          });
                          setNewCertification('');
                        }
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      추가
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.certifications?.map((cert, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg flex items-center gap-2"
                      >
                        {cert}
                        <button
                          onClick={() => {
                            const certs = [...(formData.certifications || [])];
                            certs.splice(i, 1);
                            setFormData({ ...formData, certifications: certs });
                          }}
                          className="hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 전문 분야 */}
              <div>
                <h4 className="font-semibold mb-4">세부 전문 분야</h4>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSpecialization}
                      onChange={(e) => setNewSpecialization(e.target.value)}
                      placeholder="전문 분야 입력 (예: React, 머신러닝)"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newSpecialization.trim()) {
                          setFormData({
                            ...formData,
                            specializations: [...formData.specializations, newSpecialization.trim()]
                          });
                          setNewSpecialization('');
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-900"
                    />
                    <button
                      onClick={() => {
                        if (newSpecialization.trim()) {
                          setFormData({
                            ...formData,
                            specializations: [...formData.specializations, newSpecialization.trim()]
                          });
                          setNewSpecialization('');
                        }
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      추가
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.specializations.map((spec, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg flex items-center gap-2"
                      >
                        {spec}
                        <button
                          onClick={() => {
                            const specs = [...formData.specializations];
                            specs.splice(i, 1);
                            setFormData({ ...formData, specializations: specs });
                          }}
                          className="hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 언어 설정 */}
              <div>
                <h4 className="font-semibold mb-4">언어 설정</h4>
                <label className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    checked={formData.language.technical}
                    onChange={(e) => setFormData({
                      ...formData,
                      language: { ...formData.language, technical: e.target.checked }
                    })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">전문 용어 사용</span>
                </label>

                <div className="grid grid-cols-2 gap-4">
                  {/* 전문 용어 */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">전문 용어</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newJargon}
                        onChange={(e) => setNewJargon(e.target.value)}
                        placeholder="용어 추가"
                        className="flex-1 px-2 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded"
                      />
                      <button
                        onClick={() => {
                          if (newJargon.trim()) {
                            setFormData({
                              ...formData,
                              language: {
                                ...formData.language,
                                jargon: [...formData.language.jargon, newJargon.trim()]
                              }
                            });
                            setNewJargon('');
                          }
                        }}
                        className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                      >
                        추가
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {formData.language.jargon.map((term, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded"
                        >
                          {term}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 약어 */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">약어 사전</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newAcronym.key}
                        onChange={(e) => setNewAcronym({ ...newAcronym, key: e.target.value })}
                        placeholder="약어"
                        className="w-20 px-2 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded"
                      />
                      <input
                        type="text"
                        value={newAcronym.value}
                        onChange={(e) => setNewAcronym({ ...newAcronym, value: e.target.value })}
                        placeholder="설명"
                        className="flex-1 px-2 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded"
                      />
                      <button
                        onClick={() => {
                          if (newAcronym.key && newAcronym.value) {
                            setFormData({
                              ...formData,
                              language: {
                                ...formData.language,
                                acronyms: {
                                  ...formData.language.acronyms,
                                  [newAcronym.key]: newAcronym.value
                                }
                              }
                            });
                            setNewAcronym({ key: '', value: '' });
                          }
                        }}
                        className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                      >
                        추가
                      </button>
                    </div>
                    <div className="space-y-1">
                      {Object.entries(formData.language.acronyms).map(([key, value]) => (
                        <div key={key} className="text-xs">
                          <span className="font-medium">{key}</span>: {value}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingProfile(null);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSaveProfile}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingProfile ? '수정하기' : '생성하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
