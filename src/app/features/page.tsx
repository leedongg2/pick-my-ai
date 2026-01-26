'use client';

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  GitCompare, 
  MessageSquare, 
  Moon, 
  User, 
  Gift, 
  ArrowLeft
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// 동적 임포트로 컴포넌트 로드
const ModelComparison = dynamic(() => import('@/components/ModelComparison').then(mod => ({ default: mod.ModelComparison })), { ssr: false });
const ChatTemplates = dynamic(() => import('@/components/ChatTemplates').then(mod => ({ default: mod.ChatTemplates })), { ssr: false });
const DarkModeToggle = dynamic(() => import('@/components/DarkModeToggle').then(mod => ({ default: mod.DarkModeToggle })), { ssr: false });
const PersonaSettings = dynamic(() => import('@/components/PersonaSettings').then(mod => ({ default: mod.PersonaSettings })), { ssr: false });
const CreditGift = dynamic(() => import('@/components/CreditGift').then(mod => ({ default: mod.CreditGift })), { ssr: false });

type FeatureKey = 
  | 'comparison' 
  | 'templates' 
  | 'darkmode' 
  | 'persona' 
  | 'gift';

interface Feature {
  key: FeatureKey;
  title: string;
  description: string;
  icon: React.ReactNode;
  component: React.ComponentType;
}

const features: Feature[] = [
  {
    key: 'comparison',
    title: '모델 비교',
    description: '여러 AI 모델의 응답을 동시에 비교하고 최적의 모델을 선택하세요',
    icon: <GitCompare className="h-6 w-6" />,
    component: ModelComparison,
  },
  {
    key: 'templates',
    title: '대화 템플릿',
    description: '자주 사용하는 프롬프트를 템플릿으로 저장하고 관리하세요',
    icon: <MessageSquare className="h-6 w-6" />,
    component: ChatTemplates,
  },
  {
    key: 'darkmode',
    title: '다크모드',
    description: '라이트, 다크, 시스템 모드 중 선택하여 편안한 환경을 만드세요',
    icon: <Moon className="h-6 w-6" />,
    component: DarkModeToggle,
  },
  {
    key: 'persona',
    title: '페르소나 설정',
    description: 'AI의 성격, 말투, 전문성을 커스터마이징하세요',
    icon: <User className="h-6 w-6" />,
    component: PersonaSettings,
  },
  {
    key: 'gift',
    title: '크레딧 선물',
    description: '다른 사용자에게 크레딧을 선물하고 받으세요',
    icon: <Gift className="h-6 w-6" />,
    component: CreditGift,
  },
];

export default function FeaturesPage() {
  const router = useRouter();
  const [selectedFeature, setSelectedFeature] = useState<FeatureKey | null>(null);

  const selectedFeatureData = useMemo(
    () => features.find(f => f.key === selectedFeature),
    [selectedFeature]
  );
  
  const handleBackToDashboard = useCallback(() => {
    router.push('/dashboard');
  }, [router]);
  
  const handleFeatureSelect = useCallback((key: FeatureKey) => {
    setSelectedFeature(key);
  }, []);
  
  const handleBackToFeatures = useCallback(() => {
    setSelectedFeature(null);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToDashboard}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            대시보드로 돌아가기
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            새로운 기능들
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Pick-My-AI의 강력한 기능들을 탐색하고 활용하세요
          </p>
        </div>

        {/* 기능 선택 화면 */}
        {!selectedFeature && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card
                key={feature.key}
                variant="bordered"
                className="cursor-pointer transition-all hover:shadow-lg hover:border-blue-500 dark:hover:border-blue-400"
                onClick={() => handleFeatureSelect(feature.key)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                      {feature.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {feature.title}
                      </h3>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 선택된 기능 화면 */}
        {selectedFeature && selectedFeatureData && (
          <div className="space-y-6">
            <Card variant="bordered">
              <CardHeader className="border-b dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                      {selectedFeatureData.icon}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {selectedFeatureData.title}
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedFeatureData.description}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToFeatures}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    뒤로 가기
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <selectedFeatureData.component />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
