import { Sparkles, ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center space-x-4">
          <a
            href="/login"
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">돌아가기</span>
          </a>
          <div className="h-5 w-px bg-gray-300" />
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">Pick-My-AI</span>
          </div>
        </div>
      </header>

      {/* 본문 */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">개인정보처리방침</h1>
        <p className="text-sm text-gray-500 mb-10">
          PickMyAI는 이용자의 개인정보를 소중히 여기며, 관련 법령을 준수합니다.
        </p>

        <div className="space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. 수집하는 개인정보 항목</h2>
            <p className="mb-2">회사는 다음과 같은 개인정보를 수집합니다.</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>이메일 주소</li>
              <li>로그인 및 인증 정보</li>
              <li>서비스 이용 기록</li>
              <li>접속 로그, IP 주소</li>
              <li>결제 정보 (결제 기능 제공 시)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. 개인정보 수집 목적</h2>
            <p className="mb-2">회사는 수집한 개인정보를 다음 목적을 위해 사용합니다.</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>회원 식별 및 로그인 기능 제공</li>
              <li>서비스 제공 및 기능 개선</li>
              <li>이용 기록 분석 및 서비스 품질 향상</li>
              <li>결제 및 고객 지원 처리</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. 개인정보 보관 및 이용 기간</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>개인정보는 회원 탈퇴 시 즉시 삭제됩니다.</li>
              <li>단, 관련 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 보관됩니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. 개인정보의 제3자 제공</h2>
            <p className="mb-2">회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만 서비스 운영을 위해 다음과 같은 외부 서비스를 이용할 수 있습니다.</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>인증 및 데이터 저장: Supabase</li>
              <li>결제 서비스 제공자: 포트원</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. 개인정보 처리 위탁</h2>
            <p>회사는 원활한 서비스 제공을 위해 일부 개인정보 처리를 외부에 위탁할 수 있으며, 이 경우 관련 법령을 준수합니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. 이용자의 권리</h2>
            <p className="mb-2">이용자는 언제든지 본인의 개인정보에 대해 다음 권리를 행사할 수 있습니다.</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>개인정보 열람 요청</li>
              <li>개인정보 수정 요청</li>
              <li>개인정보 삭제 요청</li>
              <li>처리 정지 요청</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. 개인정보 보호를 위한 조치</h2>
            <p>회사는 개인정보의 안전성을 확보하기 위해 기술적·관리적 보호조치를 시행하고 있습니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. 개인정보처리방침의 변경</h2>
            <p>본 방침은 법령 또는 서비스 변경에 따라 수정될 수 있으며, 변경 시 서비스 내 공지를 통해 안내합니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. 문의</h2>
            <p>개인정보 관련 문의는 서비스 내 문의 수단을 통해 접수할 수 있습니다.</p>
          </section>

          <section className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">부칙</h2>
            <p>본 개인정보처리방침은 서비스 게시일로부터 적용됩니다.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
