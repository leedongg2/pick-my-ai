'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  Settings, 
  Save, 
  ToggleLeft, 
  ToggleRight,
  DollarSign,
  AlertCircle,
  Vote,
  Plus,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { getDisplayPrice, formatWon } from '@/utils/pricing';
import { cn } from '@/utils/cn';
import { useMemo, useState as useReactState } from 'react';

export const Admin: React.FC = () => {
  const {
    models,
    policy,
    isAdmin,
    exchangeRateMemo,
    paymentFeeMemo,
    setAdminMode,
    updateModel,
    setPolicy,
    setExchangeRateMemo,
    setPaymentFeeMemo,
    feedbacks,
    setFeedbackStatus,
    masterEmail,
    polls,
    createPoll,
    closePoll,
  } = useStore();
  
  const [localModels, setLocalModels] = useState(models);
  const [localPolicy, setLocalPolicy] = useState(policy);
  const [localExchangeRate, setLocalExchangeRate] = useState(exchangeRateMemo);
  const [localPaymentFee, setLocalPaymentFee] = useState(paymentFeeMemo);
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useReactState<'settings' | 'inbox' | 'polls'>('settings');
  const [newPollTitle, setNewPollTitle] = useState('');
  const [newPollDescription, setNewPollDescription] = useState('');
  const [showPollForm, setShowPollForm] = useState(false);
  const router = useRouter();

  // Check admin authentication on component mount
  useEffect(() => {
    const isAdminAuthenticated = localStorage.getItem('adminAuthenticated') === 'true';
    if (!isAdminAuthenticated) {
      router.push('/admin/login');
    } else {
      // Set admin mode in the store
      setAdminMode(true);
    }
    
    // Clean up function to ensure admin mode is turned off when component unmounts
    return () => {
      setAdminMode(false);
    };
  }, [router, setAdminMode]);
  
  useEffect(() => {
    setLocalModels(models);
  }, [models]);
  
  useEffect(() => {
    setLocalPolicy(policy);
  }, [policy]);
  
  const handleAdminLogin = () => {
    // 간단한 비밀번호 체크 (실제로는 서버에서 인증)
    if (adminPassword === 'admin123') {
      setAdminMode(true);
      setShowPassword(false);
      setAdminPassword('');
      toast.success('관리자 모드로 전환되었습니다.');
    } else {
      toast.error('비밀번호가 올바르지 않습니다.');
    }
  };
  
  const handleModelToggle = (modelId: string) => {
    setLocalModels(prev =>
      prev.map(model =>
        model.id === modelId
          ? { ...model, enabled: !model.enabled }
          : model
      )
    );
  };
  
  const handleModelPriceChange = (modelId: string, newPrice: string) => {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) return;
    
    setLocalModels(prev =>
      prev.map(model =>
        model.id === modelId
          ? { ...model, piWon: price }
          : model
      )
    );
  };
  
  const handleMinTotalChange = (value: string) => {
    const minTotal = parseInt(value);
    if (isNaN(minTotal) || minTotal < 0) return;
    
    setLocalPolicy(prev => ({
      ...prev,
      minTotalWon: minTotal,
    }));
  };
  
  const handleSaveChanges = () => {
    // 모델 업데이트
    localModels.forEach(model => {
      const original = models.find(m => m.id === model.id);
      if (original && (
        original.enabled !== model.enabled ||
        original.piWon !== model.piWon
      )) {
        updateModel(model.id, {
          enabled: model.enabled,
          piWon: model.piWon,
        });
      }
    });
    
    // 정책 업데이트
    setPolicy(localPolicy);
    
    // 메모 업데이트
    setExchangeRateMemo(localExchangeRate);
    setPaymentFeeMemo(localPaymentFee);
    
    toast.success('설정이 저장되었습니다.');
  };
  
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card variant="bordered" className="max-w-md w-full">
          <CardHeader>
            <h2 className="text-xl font-semibold">관리자 로그인</h2>
          </CardHeader>
          <CardContent className="p-6">
            {!showPassword ? (
              <div className="text-center">
                <Settings className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 mb-4">
                  관리자 권한이 필요합니다.
                </p>
                <Button variant="primary" onClick={() => setShowPassword(true)}>
                  관리자로 로그인
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    비밀번호
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="비밀번호를 입력하세요"
                  />
                  {/* hint removed */}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowPassword(false)}
                    className="flex-1"
                  >
                    취소
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleAdminLogin}
                    className="flex-1"
                  >
                    로그인
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">관리자 설정</h1>
            <p className="text-gray-600">모델 가격과 정책을 관리합니다</p>
          </div>
          <Button variant="primary" onClick={handleSaveChanges}>
            <Save className="w-4 h-4 mr-2" />
            변경사항 저장
          </Button>
        </div>

        {/* 탭 */}
        <div className="mb-8 bg-white rounded-xl shadow p-1 flex space-x-1">
          <button
            className={cn('px-4 py-2 rounded-lg text-sm font-semibold', activeTab === 'settings' ? 'bg-primary-600 text-white' : 'hover:bg-gray-100')}
            onClick={() => setActiveTab('settings')}
          >
            설정
          </button>
          <button
            className={cn('px-4 py-2 rounded-lg text-sm font-semibold', activeTab === 'inbox' ? 'bg-primary-600 text-white' : 'hover:bg-gray-100')}
            onClick={() => setActiveTab('inbox')}
          >
            고객 문의함
          </button>
          <button
            className={cn('px-4 py-2 rounded-lg text-sm font-semibold', activeTab === 'polls' ? 'bg-primary-600 text-white' : 'hover:bg-gray-100')}
            onClick={() => setActiveTab('polls')}
          >
            투표 관리
          </button>
        </div>
        
        {activeTab === 'settings' && (
        <>
        {/* 모델 관리 */}
        <Card variant="bordered" className="mb-8">
          <CardHeader>
            <h2 className="text-xl font-semibold">AI 모델 관리</h2>
          </CardHeader>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">상태</th>
                    <th className="text-left py-3 px-4">모델명</th>
                    <th className="text-left py-3 px-4">시리즈</th>
                    <th className="text-left py-3 px-4">원가 (원)</th>
                    <th className="text-left py-3 px-4">판매가 (원)</th>
                    <th className="text-left py-3 px-4">설명</th>
                  </tr>
                </thead>
                <tbody>
                  {localModels.map(model => (
                    <tr key={model.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleModelToggle(model.id)}
                          className="flex items-center"
                        >
                          {model.enabled ? (
                            <ToggleRight className="w-8 h-8 text-green-600" />
                          ) : (
                            <ToggleLeft className="w-8 h-8 text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn(
                          'font-medium',
                          !model.enabled && 'text-gray-400'
                        )}>
                          {model.displayName}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="default" size="sm">
                          {model.series}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          value={model.piWon}
                          onChange={(e) => handleModelPriceChange(model.id, e.target.value)}
                          className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                          step="0.1"
                          min="0"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="primary" size="sm">
                          {formatWon(getDisplayPrice(model.piWon, localPolicy.margin))}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">
                          {model.description || '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        
        {/* 정책 설정 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card variant="bordered">
            <CardHeader>
              <h2 className="text-xl font-semibold">가격 정책</h2>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  마진율
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={localPolicy.margin}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    disabled
                  />
                  <span className="text-sm text-gray-600">
                    (고정값 - 변경 불가)
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  최소 결제 금액 (원)
                </label>
                <input
                  type="number"
                  value={localPolicy.minTotalWon}
                  onChange={(e) => handleMinTotalChange(e.target.value)}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  step="50"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  반올림 단위
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value="100원"
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    disabled
                  />
                  <span className="text-sm text-gray-600">
                    (고정값)
                  </span>
                </div>
              </div>
              
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">할인 정책</p>
                    <p>2개: 5%, 3개: 10%, 4개: 15%, 5개: 20%, 6개: 25%, 7개 이상: 30%</p>
                    <p className="mt-1">선택한 모델 개수에 따라 자동으로 할인율이 적용됩니다.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card variant="bordered">
            <CardHeader>
              <h2 className="text-xl font-semibold">메모</h2>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  환율 메모
                </label>
                <textarea
                  value={localExchangeRate}
                  onChange={(e) => setLocalExchangeRate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  placeholder="예: 1 USD = 1,300원"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  결제 수수료 메모
                </label>
                <textarea
                  value={localPaymentFee}
                  onChange={(e) => setLocalPaymentFee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  placeholder="예: PG 수수료 3.3%"
                />
              </div>
              
              <div className="p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-start space-x-2">
                  <DollarSign className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">가격 계산 공식</p>
                    <p>판매가 = 원가 × 1.2 (마진) → 100원 단위 반올림</p>
                    <p>최종가 = 판매가 × (1 - 할인율) → 최소 150원</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        </>
        )}

        {activeTab === 'inbox' && (
          <Card variant="bordered">
            <CardHeader>
              <h2 className="text-xl font-semibold">고객 문의/의견함</h2>
              <p className="text-sm text-gray-500">마스터 계정: {masterEmail}</p>
            </CardHeader>
            <CardContent className="p-6">
              {feedbacks.length === 0 ? (
                <div className="text-center text-gray-500">접수된 항목이 없습니다.</div>
              ) : (
                <div className="space-y-3">
                  {feedbacks.map(item => (
                    <div key={item.id} className="border rounded-lg p-4 bg-white">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm text-gray-500 mb-1">
                            [{item.type}] • {new Date(item.createdAt).toLocaleString()} • {item.createdBy.email}
                          </div>
                          <div className="font-semibold mb-1">{item.title}</div>
                          <div className="text-sm whitespace-pre-wrap mb-3">{item.content}</div>
                          {item.screenshots && item.screenshots.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {item.screenshots.map((src, i) => (
                                <a key={i} href={src} target="_blank" rel="noreferrer" className="block w-24 h-24 border rounded overflow-hidden">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={src} alt={`s-${i}`} className="w-full h-full object-cover" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn('text-xs px-2 py-1 rounded', item.status === 'open' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-700')}>
                            {item.status === 'open' ? '미처리' : '처리완료'}
                          </span>
                          {item.status === 'open' ? (
                            <Button variant="primary" size="sm" onClick={() => setFeedbackStatus(item.id, 'resolved')}>
                              처리완료
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => setFeedbackStatus(item.id, 'open')}>
                              되돌리기
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'polls' && (
          <div className="space-y-6">
            <Card variant="bordered">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Vote className="w-5 h-5" />
                    투표 생성
                  </h2>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowPollForm(!showPollForm)}
                  >
                    {showPollForm ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                    {showPollForm ? '취소' : '새 투표 만들기'}
                  </Button>
                </div>
              </CardHeader>
              {showPollForm && (
                <CardContent className="p-6 border-t">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        투표 제목
                      </label>
                      <input
                        type="text"
                        value={newPollTitle}
                        onChange={(e) => setNewPollTitle(e.target.value)}
                        placeholder="예: 다크모드 지원 기능 추가"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        투표 설명
                      </label>
                      <textarea
                        value={newPollDescription}
                        onChange={(e) => setNewPollDescription(e.target.value)}
                        placeholder="투표에 대한 자세한 설명을 입력하세요..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[100px]"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowPollForm(false);
                          setNewPollTitle('');
                          setNewPollDescription('');
                        }}
                      >
                        취소
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => {
                          if (!newPollTitle.trim() || !newPollDescription.trim()) {
                            toast.error('제목과 설명을 모두 입력해주세요.');
                            return;
                          }
                          createPoll(newPollTitle, newPollDescription);
                          toast.success('투표가 생성되었습니다!');
                          setNewPollTitle('');
                          setNewPollDescription('');
                          setShowPollForm(false);
                        }}
                      >
                        투표 생성
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            <Card variant="bordered">
              <CardHeader>
                <h2 className="text-xl font-semibold">투표 목록</h2>
                <p className="text-sm text-gray-500">총 {polls.length}개의 투표</p>
              </CardHeader>
              <CardContent className="p-6">
                {polls.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    생성된 투표가 없습니다.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {polls.map((poll) => {
                      const totalVotes = poll.agreeCount + poll.disagreeCount;
                      const agreePercent = totalVotes > 0 ? (poll.agreeCount / totalVotes) * 100 : 0;
                      const disagreePercent = totalVotes > 0 ? (poll.disagreeCount / totalVotes) * 100 : 0;
                      const daysLeft = Math.ceil((new Date(poll.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      
                      return (
                        <div key={poll.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900">{poll.title}</h3>
                                <Badge
                                  variant={poll.status === 'active' ? 'primary' : poll.status === 'closed' ? 'default' : 'default'}
                                  size="sm"
                                >
                                  {poll.status === 'active' ? '진행중' : poll.status === 'closed' ? '종료' : '만료'}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{poll.description}</p>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>생성일: {new Date(poll.createdAt).toLocaleDateString()}</span>
                                <span>만료일: {new Date(poll.expiresAt).toLocaleDateString()}</span>
                                {poll.status === 'active' && (
                                  <span className="text-primary-600 font-medium">
                                    {daysLeft > 0 ? `${daysLeft}일 남음` : '오늘 만료'}
                                  </span>
                                )}
                              </div>
                            </div>
                            {poll.status === 'active' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  closePoll(poll.id);
                                  toast.success('투표가 종료되었습니다.');
                                }}
                                className="ml-4"
                              >
                                투표 종료
                              </Button>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-green-700">찬성</span>
                                <span className="text-sm font-bold text-green-700">
                                  {poll.agreeCount}표 ({agreePercent.toFixed(0)}%)
                                </span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500"
                                  style={{ width: `${agreePercent}%` }}
                                />
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-red-700">반대</span>
                                <span className="text-sm font-bold text-red-700">
                                  {poll.disagreeCount}표 ({disagreePercent.toFixed(0)}%)
                                </span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-red-500"
                                  style={{ width: `${disagreePercent}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
