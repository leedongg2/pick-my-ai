import { SettingsForm } from '@/components/settings/SettingsForm';

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4">
      <div className="pl-4">
        <h1 className="text-2xl font-bold text-gray-900">설정</h1>
        <p className="mt-1 text-sm text-gray-500">
          계정 및 애플리케이션 설정을 관리하세요.
        </p>
      </div>
      <div className="bg-white shadow rounded-lg p-6">
        <SettingsForm />
      </div>
    </div>
  );
}
