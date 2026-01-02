'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/store';
import { toast } from 'sonner';
import { 
  Bell, BellOff, Plus, Settings, Trash2, 
  TrendingUp, AlertTriangle, Info, Mail,
  Smartphone, Monitor, Check
} from 'lucide-react';
import { cn } from '@/utils/cn';

const alertTypes = [
  { value: 'low_credits', label: '크레딧 부족', icon: AlertTriangle, color: 'text-yellow-500' },
  { value: 'usage_spike', label: '사용량 급증', icon: TrendingUp, color: 'text-red-500' },
  { value: 'monthly_limit', label: '월 한도 도달', icon: Info, color: 'text-orange-500' },
  { value: 'custom', label: '커스텀 알림', icon: Settings, color: 'text-blue-500' },
];

const channels = [
  { value: 'email', label: '이메일', icon: Mail },
  { value: 'push', label: '푸시 알림', icon: Smartphone },
  { value: 'in-app', label: '앱 내 알림', icon: Monitor },
];

export const UsageAlerts: React.FC = () => {
  const {
    models,
    usageAlerts,
    notifications,
    createUsageAlert,
    checkUsageAlerts,
    markNotificationAsRead,
  } = useStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAlert, setEditingAlert] = useState<any>(null);
  
  const [alertForm, setAlertForm] = useState({
    type: 'low_credits' as any,
    threshold: 10,
    modelId: '',
    enabled: true,
    notificationChannels: ['in-app'] as any[],
  });

  // 주기적으로 알림 확인 (5분마다)
  useEffect(() => {
    const interval = setInterval(() => {
      checkUsageAlerts();
    }, 5 * 60 * 1000);

    // 초기 확인
    checkUsageAlerts();

    return () => clearInterval(interval);
  }, [checkUsageAlerts]);

  // 알림 생성
  const handleCreateAlert = () => {
    if (alertForm.type === 'low_credits' && !alertForm.modelId) {
      toast.error('모델을 선택해주세요.');
      return;
    }

    if (alertForm.notificationChannels.length === 0) {
      toast.error('최소 하나의 알림 채널을 선택해주세요.');
      return;
    }

    createUsageAlert({
      ...alertForm,
      userId: 'current',
      modelId: alertForm.type === 'low_credits' ? alertForm.modelId : undefined,
    });

    toast.success('사용량 알림이 생성되었습니다.');
    setShowCreateModal(false);
    resetForm();
  };

  const resetForm = () => {
    setAlertForm({
      type: 'low_credits',
      threshold: 10,
      modelId: '',
      enabled: true,
      notificationChannels: ['in-app'],
    });
    setEditingAlert(null);
  };

  // 알림 삭제
  const handleDeleteAlert = (alertId: string) => {
    // Delete logic would go here
    toast.success('알림이 삭제되었습니다.');
  };

  // 읽지 않은 알림 개수
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">사용량 알림</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          크레딧 사용량을 모니터링하고 적절한 시점에 알림을 받으세요.
        </p>
      </div>

      {/* 알림 센터 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="font-semibold flex items-center gap-2">
            알림 센터
            {unreadCount > 0 && (
              <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                {unreadCount}
              </span>
            )}
          </h3>
          <button
            onClick={() => notifications.forEach(n => markNotificationAsRead(n.id))}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            모두 읽음으로 표시
          </button>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-12 text-center">
              <BellOff className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">새로운 알림이 없습니다</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {notifications.map(notification => {
                const IconComponent = 
                  notification.type === 'warning' ? AlertTriangle :
                  notification.type === 'error' ? AlertTriangle :
                  notification.type === 'success' ? Check : Info;

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      'p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer',
                      !notification.read && 'bg-blue-50 dark:bg-blue-900/20'
                    )}
                    onClick={() => markNotificationAsRead(notification.id)}
                  >
                    <div className="flex gap-3">
                      <IconComponent className={cn(
                        'w-5 h-5 mt-0.5',
                        notification.type === 'warning' && 'text-yellow-500',
                        notification.type === 'error' && 'text-red-500',
                        notification.type === 'success' && 'text-green-500',
                        notification.type === 'info' && 'text-blue-500'
                      )} />
                      <div className="flex-1">
                        <p className={cn(
                          'text-sm',
                          !notification.read && 'font-medium'
                        )}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(notification.timestamp).toLocaleString()}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 알림 설정 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-semibold">알림 설정</h3>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            새 알림 추가
          </button>
        </div>

        {usageAlerts.length === 0 ? (
          <div className="text-center py-12">
            <Settings className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              아직 설정된 알림이 없습니다
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-orange-600 hover:text-orange-700 font-medium"
            >
              첫 알림 만들기
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {usageAlerts.map(alert => {
              const typeInfo = alertTypes.find(t => t.value === alert.type);
              const model = alert.modelId ? models.find(m => m.id === alert.modelId) : null;
              const Icon = typeInfo?.icon || Bell;

              return (
                <div
                  key={alert.id}
                  className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <Icon className={cn('w-5 h-5', typeInfo?.color)} />
                      <div>
                        <h4 className="font-medium">{typeInfo?.label}</h4>
                        {model && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {model.displayName}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={alert.enabled}
                          onChange={(e) => {
                            // Toggle logic would go here
                            toast.success(e.target.checked ? '알림 활성화됨' : '알림 비활성화됨');
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-600"></div>
                      </label>
                      <button
                        onClick={() => handleDeleteAlert(alert.id)}
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-gray-600 dark:text-gray-400">
                        임계값: <span className="font-medium">{alert.threshold}</span>
                      </span>
                      <div className="flex items-center gap-1">
                        {alert.notificationChannels.map(channel => {
                          const channelInfo = channels.find(c => c.value === channel);
                          const ChannelIcon = channelInfo?.icon || Bell;
                          return (
                            <div
                              key={channel}
                              className="p-1 bg-white dark:bg-gray-800 rounded"
                              title={channelInfo?.label}
                            >
                              <ChannelIcon className="w-3 h-3" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {alert.lastTriggered && (
                      <span className="text-xs text-gray-500">
                        마지막 알림: {new Date(alert.lastTriggered).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 알림 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold">새 알림 설정</h3>
            </div>

            <div className="p-6 space-y-4">
              {/* 알림 타입 */}
              <div>
                <label className="block text-sm font-medium mb-2">알림 타입</label>
                <select
                  value={alertForm.type}
                  onChange={(e) => setAlertForm({ ...alertForm, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-900"
                >
                  {alertTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* 모델 선택 (크레딧 부족 알림인 경우) */}
              {alertForm.type === 'low_credits' && (
                <div>
                  <label className="block text-sm font-medium mb-2">모델 선택</label>
                  <select
                    value={alertForm.modelId}
                    onChange={(e) => setAlertForm({ ...alertForm, modelId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-900"
                  >
                    <option value="">모델을 선택하세요</option>
                    {models.map(model => (
                      <option key={model.id} value={model.id}>{model.displayName}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 임계값 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  임계값: {alertForm.threshold}
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={alertForm.threshold}
                  onChange={(e) => setAlertForm({ ...alertForm, threshold: Number(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1</span>
                  <span>50</span>
                  <span>100</span>
                </div>
              </div>

              {/* 알림 채널 */}
              <div>
                <label className="block text-sm font-medium mb-2">알림 채널</label>
                <div className="space-y-2">
                  {channels.map(channel => {
                    const Icon = channel.icon;
                    const isSelected = alertForm.notificationChannels.includes(channel.value);
                    
                    return (
                      <label
                        key={channel.value}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all',
                          isSelected
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-orange-300'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAlertForm({
                                ...alertForm,
                                notificationChannels: [...alertForm.notificationChannels, channel.value]
                              });
                            } else {
                              setAlertForm({
                                ...alertForm,
                                notificationChannels: alertForm.notificationChannels.filter(c => c !== channel.value)
                              });
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{channel.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCreateAlert}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                알림 생성
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
