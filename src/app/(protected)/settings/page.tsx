import { SettingsForm } from '@/components/settings/SettingsForm';

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4">
      <div className="pl-4 pt-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">설정</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          계정 및 애플리케이션 설정을 관리하세요.
        </p>
      </div>
      <SettingsForm />
    </div>
  );
}
