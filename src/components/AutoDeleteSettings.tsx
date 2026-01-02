'use client';

import React, { useState } from 'react';
import { useStore } from '@/store';
import { toast } from 'sonner';
import { 
  Trash2, Clock, Shield, Archive, Calendar,
  AlertTriangle, Check, Star, FileText, Info
} from 'lucide-react';
import { cn } from '@/utils/cn';

const deleteAfterOptions = [7, 14, 30, 60, 90, 180];

export const AutoDeleteSettings: React.FC = () => {
  const {
    autoDelete,
    chatSessions,
    setAutoDelete,
    performAutoDelete,
  } = useStore();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [testMode, setTestMode] = useState(false);

  // 자동 삭제 활성화/비활성화
  const handleToggleAutoDelete = () => {
    setAutoDelete({ enabled: !autoDelete.enabled });
    toast.success(
      autoDelete.enabled ? '자동 삭제가 비활성화되었습니다.' : '자동 삭제가 활성화되었습니다.'
    );
  };

  // 삭제 기간 설정
  const handleSetDeleteAfterDays = (days: number) => {
    setAutoDelete({ deleteAfterDays: days });
    toast.success(`${days}일 이후 대화가 자동 삭제됩니다.`);
  };

  // 즐겨찾기 제외 설정
  const handleToggleExcludeStarred = () => {
    setAutoDelete({ excludeStarred: !autoDelete.excludeStarred });
    toast.success(
      autoDelete.excludeStarred 
        ? '즐겨찾기 대화도 삭제 대상에 포함됩니다.'
        : '즐겨찾기 대화는 삭제에서 제외됩니다.'
    );
  };

  // 템플릿 제외 설정
  const handleToggleExcludeTemplates = () => {
    setAutoDelete({ excludeTemplates: !autoDelete.excludeTemplates });
    toast.success(
      autoDelete.excludeTemplates
        ? '템플릿 대화도 삭제 대상에 포함됩니다.'
        : '템플릿 대화는 삭제에서 제외됩니다.'
    );
  };

  // 수동 정리 실행
  const handleManualCleanup = () => {
    setShowConfirmModal(true);
  };

  // 정리 실행 확인
  const confirmCleanup = () => {
    performAutoDelete();
    toast.success('오래된 대화가 정리되었습니다.');
    setShowConfirmModal(false);
  };

  // 테스트 모드
  const handleTestMode = () => {
    setTestMode(true);
    
    // 삭제될 대화 미리보기
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - autoDelete.deleteAfterDays);
    
    const toDelete = chatSessions.filter(session => {
      if (new Date(session.updatedAt) > cutoffDate) return false;
      // if (autoDelete.excludeStarred && session.starred) return false;
      return true;
    });

    toast.info(`${toDelete.length}개의 대화가 삭제 대상입니다.`);
    setTestMode(false);
  };

  // 통계 계산
  const totalSessions = chatSessions.length;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - autoDelete.deleteAfterDays);
  const oldSessions = chatSessions.filter(s => new Date(s.updatedAt) <= cutoffDate).length;
  
  // 스토리지 크기 계산 (대략적)
  const estimatedStorageKB = Math.round(
    chatSessions.reduce((sum, session) => {
      return sum + JSON.stringify(session).length / 1024;
    }, 0)
  );

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">자동 삭제 설정</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          오래된 대화를 자동으로 정리하여 저장 공간을 관리하세요.
        </p>
      </div>

      {/* 현재 상태 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-lg mb-1">자동 삭제</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              설정한 기간이 지난 대화를 자동으로 삭제합니다.
            </p>
          </div>
          <button
            onClick={handleToggleAutoDelete}
            className={cn(
              'relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-4',
              autoDelete.enabled
                ? 'bg-red-600 focus:ring-red-300 dark:focus:ring-red-800'
                : 'bg-gray-200 dark:bg-gray-700 focus:ring-gray-300 dark:focus:ring-gray-600'
            )}
          >
            <span
              className={cn(
                'inline-block h-6 w-6 transform rounded-full bg-white transition-transform',
                autoDelete.enabled ? 'translate-x-7' : 'translate-x-1'
              )}
            />
          </button>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">전체 대화</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {totalSessions}
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">오래된 대화</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {oldSessions}
            </div>
            {oldSessions > 0 && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                삭제 대상
              </p>
            )}
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Archive className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">저장 공간</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {estimatedStorageKB} KB
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">마지막 정리</span>
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {autoDelete.lastCleanup
                ? new Date(autoDelete.lastCleanup).toLocaleDateString()
                : '없음'
              }
            </div>
          </div>
        </div>
      </div>

      {/* 삭제 설정 */}
      {autoDelete.enabled && (
        <>
          {/* 삭제 기간 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold mb-4">삭제 기간</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              마지막 수정일로부터 며칠 후에 대화를 삭제할지 설정하세요.
            </p>
            
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
              {deleteAfterOptions.map(days => (
                <button
                  key={days}
                  onClick={() => handleSetDeleteAfterDays(days)}
                  className={cn(
                    'p-3 rounded-lg border-2 transition-all font-medium',
                    autoDelete.deleteAfterDays === days
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                      : 'border-gray-200 dark:border-gray-700 hover:border-red-300'
                  )}
                >
                  {days}일
                </button>
              ))}
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                현재 설정: <span className="font-medium">{autoDelete.deleteAfterDays}일</span> 이상 된 대화 삭제
              </p>
            </div>
          </div>

          {/* 제외 설정 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold mb-4">제외 설정</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              특정 유형의 대화를 자동 삭제에서 제외할 수 있습니다.
            </p>
            
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <input
                  type="checkbox"
                  checked={autoDelete.excludeStarred}
                  onChange={handleToggleExcludeStarred}
                  className="mt-0.5 w-4 h-4"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium">즐겨찾기 대화 제외</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    별표 표시한 중요한 대화는 자동 삭제되지 않습니다.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <input
                  type="checkbox"
                  checked={autoDelete.excludeTemplates}
                  onChange={handleToggleExcludeTemplates}
                  className="mt-0.5 w-4 h-4"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">템플릿 대화 제외</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    템플릿으로 저장한 대화는 자동 삭제되지 않습니다.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* 수동 정리 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-1">수동 정리</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  지금 바로 오래된 대화를 정리할 수 있습니다.
                </p>
                {oldSessions > 0 && (
                  <p className="text-sm text-orange-600 dark:text-orange-400 mt-2">
                    {oldSessions}개의 대화가 삭제됩니다.
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleTestMode}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors flex items-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  미리보기
                </button>
                <button
                  onClick={handleManualCleanup}
                  disabled={oldSessions === 0}
                  className={cn(
                    'px-4 py-2 rounded-lg transition-colors flex items-center gap-2',
                    oldSessions > 0
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                  )}
                >
                  <Trash2 className="w-4 h-4" />
                  지금 정리
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 안내 메시지 */}
      <div className="space-y-4">
        {/* 주의사항 */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-medium mb-1">자동 삭제 주의사항</p>
              <ul className="space-y-1 text-xs">
                <li>• 삭제된 대화는 복구할 수 없습니다.</li>
                <li>• 자동 삭제는 매일 자정에 실행됩니다.</li>
                <li>• 중요한 대화는 즐겨찾기로 표시하여 보호하세요.</li>
                <li>• 필요한 대화는 템플릿으로 저장하는 것을 권장합니다.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 사용 팁 */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">효율적인 사용 팁</p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>단기 테스트:</strong> 7-14일 설정으로 빠른 정리</li>
                <li>• <strong>일반 사용:</strong> 30-60일 설정으로 균형 유지</li>
                <li>• <strong>장기 보관:</strong> 90-180일 설정으로 여유있게 관리</li>
                <li>• <strong>미리보기 활용:</strong> 정리 전 삭제 대상을 확인하세요</li>
                <li>• <strong>정기 점검:</strong> 월 1회 수동 정리로 저장 공간 최적화</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 데이터 보호 */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <div className="flex gap-3">
            <Shield className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-800 dark:text-green-200">
              <p className="font-medium mb-1">데이터 보호 방법</p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>즐겨찾기:</strong> 중요한 대화에 별표를 추가하면 영구 보존됩니다</li>
                <li>• <strong>템플릿 저장:</strong> 자주 사용하는 프롬프트를 템플릿으로 저장하세요</li>
                <li>• <strong>수동 백업:</strong> 중요한 대화는 외부에 별도 저장을 권장합니다</li>
                <li>• <strong>제외 설정 활용:</strong> 특정 유형의 대화를 자동 삭제에서 제외하세요</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 확인 모달 */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                대화 정리 확인
              </h3>
            </div>

            <div className="p-6">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {oldSessions}개
                </span>
                의 오래된 대화가 영구적으로 삭제됩니다.
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?
              </p>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={confirmCleanup}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                삭제 진행
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
