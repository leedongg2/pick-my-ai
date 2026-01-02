'use client';

import React, { useState } from 'react';
import { useStore } from '@/store';
import { toast } from 'sonner';
import { 
  Gift, Send, Heart, Clock, Check, X,
  Mail, MessageSquare, Sparkles, Coins
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatWon } from '@/utils/pricing';

export const CreditGift: React.FC = () => {
  const {
    models,
    wallet,
    currentUser,
    sentGifts,
    receivedGifts,
    sendCreditGift,
    acceptCreditGift,
  } = useStore();

  const [showSendModal, setShowSendModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'send' | 'received' | 'sent'>('send');
  
  const [giftForm, setGiftForm] = useState({
    recipientEmail: '',
    selectedCredits: {} as { [modelId: string]: number },
    message: '',
  });

  // 크레딧 선물 보내기
  const handleSendGift = () => {
    if (!giftForm.recipientEmail.trim()) {
      toast.error('받는 사람 이메일을 입력해주세요.');
      return;
    }

    // 자기 자신에게 보내는 것 방지
    if (currentUser && giftForm.recipientEmail.toLowerCase() === currentUser.email.toLowerCase()) {
      toast.error('자기 자신에게는 선물을 보낼 수 없습니다.');
      return;
    }

    const hasCredits = Object.values(giftForm.selectedCredits).some(v => v > 0);
    if (!hasCredits) {
      toast.error('선물할 크레딧을 선택해주세요.');
      return;
    }

    // 보유 크레딧 확인
    for (const [modelId, amount] of Object.entries(giftForm.selectedCredits)) {
      const available = wallet?.credits[modelId] || 0;
      if (amount > available) {
        toast.error(`${models.find(m => m.id === modelId)?.displayName} 크레딧이 부족합니다.`);
        return;
      }
    }

    const success = sendCreditGift(
      giftForm.recipientEmail,
      giftForm.selectedCredits,
      giftForm.message
    );

    if (success) {
      toast.success('크레딧 선물이 전송되었습니다!');
      setShowSendModal(false);
      setGiftForm({
        recipientEmail: '',
        selectedCredits: {},
        message: '',
      });
    } else {
      toast.error('크레딧 선물 전송에 실패했습니다.');
    }
  };

  // 크레딧 선물 수락
  const handleAcceptGift = (giftId: string) => {
    const success = acceptCreditGift(giftId);
    if (success) {
      toast.success('크레딧 선물을 받았습니다!');
    }
  };

  // 미수락 선물 개수
  const pendingGiftsCount = receivedGifts.filter(g => g.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">크레딧 선물</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          소중한 사람에게 AI 크레딧을 선물하세요.
        </p>
      </div>

      {/* 알림 배너 */}
      {pendingGiftsCount > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <p className="text-yellow-800 dark:text-yellow-200">
              받은 선물 {pendingGiftsCount}개가 대기 중입니다!
            </p>
          </div>
        </div>
      )}

      {/* 탭 메뉴 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('send')}
            className={cn(
              'flex-1 px-6 py-3 font-medium transition-colors',
              activeTab === 'send'
                ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            선물 보내기
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={cn(
              'flex-1 px-6 py-3 font-medium transition-colors relative',
              activeTab === 'received'
                ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            받은 선물
            {pendingGiftsCount > 0 && (
              <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {pendingGiftsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={cn(
              'flex-1 px-6 py-3 font-medium transition-colors',
              activeTab === 'sent'
                ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            보낸 선물
          </button>
        </div>

        <div className="p-6">
          {/* 선물 보내기 탭 */}
          {activeTab === 'send' && (
            <div className="text-center py-12">
              <Gift className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">크레딧 선물하기</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                친구나 동료에게 AI 크레딧을 선물해보세요
              </p>
              <button
                onClick={() => setShowSendModal(true)}
                className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
                선물 보내기
              </button>

              {/* 현재 보유 크레딧 */}
              <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <h4 className="text-sm font-medium mb-3">내 보유 크레딧</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {models.filter(m => (wallet?.credits[m.id] || 0) > 0).map(model => (
                    <div key={model.id} className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {wallet?.credits[model.id] || 0}
                      </div>
                      <div className="text-xs text-gray-500">{model.displayName}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 받은 선물 탭 */}
          {activeTab === 'received' && (
            <div className="space-y-4">
              {receivedGifts.length === 0 ? (
                <div className="text-center py-12">
                  <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    아직 받은 선물이 없습니다
                  </p>
                </div>
              ) : (
                receivedGifts.map(gift => (
                  <div
                    key={gift.id}
                    className={cn(
                      'p-4 rounded-lg border',
                      gift.status === 'pending'
                        ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    )}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Mail className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium">From: {gift.from}</span>
                        </div>
                        {gift.message && (
                          <div className="flex items-start gap-2 mt-2">
                            <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5" />
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {gift.message}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {new Date(gift.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {Object.entries(gift.credits).map(([modelId, amount]) => {
                        const model = models.find(m => m.id === modelId);
                        return (
                          <div
                            key={modelId}
                            className="px-3 py-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                          >
                            <span className="font-semibold">{amount}</span>
                            <span className="text-sm text-gray-500 ml-1">
                              {model?.displayName}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {gift.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptGift(gift.id)}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          수락하기
                        </button>
                        <button className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {gift.status === 'accepted' && (
                      <div className="text-center text-sm text-green-600 dark:text-green-400">
                        ✓ 수락됨
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* 보낸 선물 탭 */}
          {activeTab === 'sent' && (
            <div className="space-y-4">
              {sentGifts.length === 0 ? (
                <div className="text-center py-12">
                  <Send className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    아직 보낸 선물이 없습니다
                  </p>
                </div>
              ) : (
                sentGifts.map(gift => (
                  <div
                    key={gift.id}
                    className="p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Mail className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium">To: {gift.to}</span>
                        </div>
                        {gift.message && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {gift.message}
                          </p>
                        )}
                      </div>
                      <span className={cn(
                        'px-2 py-1 text-xs rounded-full',
                        gift.status === 'pending' && 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
                        gift.status === 'accepted' && 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
                        gift.status === 'rejected' && 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      )}>
                        {gift.status === 'pending' && '대기중'}
                        {gift.status === 'accepted' && '수락됨'}
                        {gift.status === 'rejected' && '거절됨'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {Object.entries(gift.credits).map(([modelId, amount]) => {
                        const model = models.find(m => m.id === modelId);
                        return (
                          <div
                            key={modelId}
                            className="px-3 py-1 bg-gray-50 dark:bg-gray-900 rounded-lg"
                          >
                            <span className="font-semibold">{amount}</span>
                            <span className="text-sm text-gray-500 ml-1">
                              {model?.displayName}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* 선물 보내기 모달 */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Gift className="w-5 h-5" />
                크레딧 선물하기
              </h3>
            </div>

            <div className="p-6 space-y-4">
              {/* 받는 사람 */}
              <div>
                <label className="block text-sm font-medium mb-2">받는 사람 이메일</label>
                <input
                  type="email"
                  value={giftForm.recipientEmail}
                  onChange={(e) => setGiftForm({ ...giftForm, recipientEmail: e.target.value })}
                  placeholder="friend@example.com"
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-gray-900"
                />
              </div>

              {/* 크레딧 선택 */}
              <div>
                <label className="block text-sm font-medium mb-2">선물할 크레딧</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {models.filter(m => (wallet?.credits[m.id] || 0) > 0).map(model => {
                    const available = wallet?.credits[model.id] || 0;
                    const selected = giftForm.selectedCredits[model.id] || 0;

                    return (
                      <div key={model.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div>
                          <div className="font-medium">{model.displayName}</div>
                          <div className="text-xs text-gray-500">보유: {available}개</div>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max={available}
                          value={selected}
                          onChange={(e) => setGiftForm({
                            ...giftForm,
                            selectedCredits: {
                              ...giftForm.selectedCredits,
                              [model.id]: Number(e.target.value)
                            }
                          })}
                          className="w-20 px-2 py-1 border border-gray-200 dark:border-gray-700 rounded text-center"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 메시지 */}
              <div>
                <label className="block text-sm font-medium mb-2">메시지 (선택)</label>
                <textarea
                  value={giftForm.message}
                  onChange={(e) => setGiftForm({ ...giftForm, message: e.target.value })}
                  placeholder="선물과 함께 전할 메시지를 입력하세요..."
                  className="w-full h-24 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-gray-900"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowSendModal(false);
                  setGiftForm({
                    recipientEmail: '',
                    selectedCredits: {},
                    message: '',
                  });
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSendGift}
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                선물 보내기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
