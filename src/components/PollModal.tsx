'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/store';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { X, ThumbsUp, ThumbsDown, Calendar, Users } from 'lucide-react';
import { toast } from 'sonner';

interface PollModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PollModal: React.FC<PollModalProps> = ({ isOpen, onClose }) => {
  const { activePolls, currentUser, votePoll, cancelVote, checkExpiredPolls } = useStore();
  const [selectedPoll, setSelectedPoll] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkExpiredPolls();
    }
  }, [isOpen, checkExpiredPolls]);

  if (!isOpen) return null;

  const handleVote = (pollId: string, vote: 'agree' | 'disagree') => {
    const success = votePoll(pollId, vote);
    if (success) {
      toast.success(vote === 'agree' ? '찬성 투표가 완료되었습니다!' : '반대 투표가 완료되었습니다!');
    } else {
      toast.error('이미 투표하셨거나 투표할 수 없습니다.');
    }
  };
  
  const handleCancelVote = (pollId: string) => {
    const success = cancelVote(pollId);
    if (success) {
      toast.success('투표가 취소되었습니다. 다시 투표할 수 있습니다.');
    } else {
      toast.error('투표 취소에 실패했습니다.');
    }
  };

  const hasUserVoted = (pollId: string) => {
    if (!currentUser) return false;
    const poll = activePolls.find(p => p.id === pollId);
    return poll?.votes.some(v => v.userId === currentUser.id) || false;
  };

  const getUserVote = (pollId: string) => {
    if (!currentUser) return null;
    const poll = activePolls.find(p => p.id === pollId);
    const userVote = poll?.votes.find(v => v.userId === currentUser.id);
    return userVote?.vote || null;
  };

  const getDaysLeft = (expiresAt: Date) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">커뮤니티 투표</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {activePolls.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">진행 중인 투표가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activePolls.map((poll) => {
                const hasVoted = hasUserVoted(poll.id);
                const userVote = getUserVote(poll.id);
                const totalVotes = poll.agreeCount + poll.disagreeCount;
                const agreePercent = totalVotes > 0 ? (poll.agreeCount / totalVotes) * 100 : 0;
                const disagreePercent = totalVotes > 0 ? (poll.disagreeCount / totalVotes) * 100 : 0;
                const daysLeft = getDaysLeft(poll.expiresAt);

                return (
                  <Card key={poll.id} variant="bordered" className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 mb-2">
                            {poll.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-3">{poll.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{daysLeft}일 남음</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              <span>총 {totalVotes}표</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      {hasVoted ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              투표 완료 {userVote === 'agree' ? '(찬성)' : '(반대)'}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelVote(poll.id)}
                              className="text-xs"
                            >
                              투표 취소
                            </Button>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-green-700 flex items-center gap-1">
                                  <ThumbsUp className="w-4 h-4" />
                                  찬성
                                </span>
                                <span className="text-sm font-bold text-green-700">
                                  {poll.agreeCount}표 ({agreePercent.toFixed(0)}%)
                                </span>
                              </div>
                              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
                                  style={{ width: `${agreePercent}%` }}
                                />
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-red-700 flex items-center gap-1">
                                  <ThumbsDown className="w-4 h-4" />
                                  반대
                                </span>
                                <span className="text-sm font-bold text-red-700">
                                  {poll.disagreeCount}표 ({disagreePercent.toFixed(0)}%)
                                </span>
                              </div>
                              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-red-400 to-red-600 transition-all duration-500"
                                  style={{ width: `${disagreePercent}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-600 mb-4">
                            이 제안에 대한 의견을 투표해주세요. (1인 1표)
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <Button
                              variant="outline"
                              onClick={() => handleVote(poll.id, 'agree')}
                              className="flex items-center justify-center gap-2 py-3 border-green-300 hover:bg-green-50 hover:border-green-500 text-green-700 font-semibold"
                            >
                              <ThumbsUp className="w-5 h-5" />
                              찬성
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleVote(poll.id, 'disagree')}
                              className="flex items-center justify-center gap-2 py-3 border-red-300 hover:bg-red-50 hover:border-red-500 text-red-700 font-semibold"
                            >
                              <ThumbsDown className="w-5 h-5" />
                              반대
                            </Button>
                          </div>
                          
                          {totalVotes > 0 && (
                            <div className="mt-4 pt-4 border-t">
                              <div className="text-xs text-gray-500 mb-3">현재 투표 결과</div>
                              <div className="space-y-3">
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-green-700 flex items-center gap-1">
                                      <ThumbsUp className="w-4 h-4" />
                                      찬성
                                    </span>
                                    <span className="text-sm font-bold text-green-700">
                                      {poll.agreeCount}표 ({agreePercent.toFixed(0)}%)
                                    </span>
                                  </div>
                                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
                                      style={{ width: `${agreePercent}%` }}
                                    />
                                  </div>
                                </div>

                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-red-700 flex items-center gap-1">
                                      <ThumbsDown className="w-4 h-4" />
                                      반대
                                    </span>
                                    <span className="text-sm font-bold text-red-700">
                                      {poll.disagreeCount}표 ({disagreePercent.toFixed(0)}%)
                                    </span>
                                  </div>
                                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-red-400 to-red-600 transition-all duration-500"
                                      style={{ width: `${disagreePercent}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
