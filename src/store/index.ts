import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { 
  AIModel, 
  ModelSelection, 
  PricingPolicy, 
  User, 
  UserWallet, 
  Transaction, 
  ChatMessage, 
  FeedbackItem,
  FeedbackStatus,
  ThemeSettings, 
  ThemeColor,
  ComparisonSession, 
  ChatTemplate, 
  PersonaSettings, 
  CreditGift, 
  UsageAlert,
  AutoRechargeSettings, 
  AutoDeleteSettings, 
  StreamingSettings, 
  AIGrowthData, 
  ExpertiseProfile,
  PMCBalance,
  PMCTransaction,
  UserPlan,
  Poll,
  PollStatus,
} from '@/types';
import { DesignTheme } from '@/types/design';

type FeedbackPayload = Omit<FeedbackItem, 'id' | 'status' | 'createdAt' | 'createdBy'> & {
  screenshots?: string[];
};

import { initialModels } from '@/data/models';
import { defaultPolicy } from '@/utils/pricing';
import { recordChatPerfLsSetItem } from '@/utils/chatPerf';

type AppLanguage = 'ko' | 'en' | 'ja';

const MAX_STORED_FACTS = 50;

interface AppState {
  // 설정 관련
  settings: {
    showDeleteConfirmation: boolean;
    showSuccessNotifications: boolean;
  };

  language: AppLanguage;
  
  // 커스텀 디자인 테마
  customDesignTheme: {
    theme: DesignTheme | null;
    elementColors: Record<string, string>;
  };
  
  // Actions
  toggleSuccessNotifications: () => void;
  setLanguage: (language: AppLanguage) => void;
  setCurrentUser: (user: User | null) => void;
  setTheme: (theme: ThemeColor) => void;
  setCustomDesignTheme: (theme: DesignTheme, elementColors: Record<string, string>) => void;
  getCustomDesignTheme: () => { theme: DesignTheme | null; elementColors: Record<string, string> };
  clearCustomDesignTheme: () => void;
  setSettings: (settings: Partial<AppState['settings']>) => void;
  updateModel: (modelId: string, updates: Partial<AIModel>) => void;
  
  // 인증 관련
  currentUser: User | null;
  isAuthenticated: boolean;
  
  // TEMP: 임시 자동 로그인 설정
  tempAutoLogin: () => void;
  
  // 모델 관련
  models: AIModel[];
  selections: ModelSelection[];
  policy: PricingPolicy;
  
  // 사용자 지갑
  wallet: UserWallet | null;
  
  // 첫 구매 여부
  hasFirstPurchase: boolean;
  
  // 다크모드 설정
  themeSettings: ThemeSettings;
  
  // 모델 비교 세션
  comparisonSessions: ComparisonSession[];
  activeComparison: ComparisonSession | null;
  
  // 대화 템플릿
  chatTemplates: ChatTemplate[];
  favoriteTemplates: string[];
  activeTemplate: ChatTemplate | null;
  
  // 페르소나 설정
  personas: PersonaSettings[];
  activePersona: PersonaSettings | null;
  
  // 크레딧 선물
  sentGifts: CreditGift[];
  receivedGifts: CreditGift[];
  allGifts: CreditGift[]; // 모든 선물 (글로벌)
  
  // 사용량 알림
  usageAlerts: UsageAlert[];
  notifications: Array<{
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    message: string;
    read: boolean;
    timestamp: Date;
  }>;
  
  // 자동 충전 설정
  autoRecharge: AutoRechargeSettings;
  
  // 자동 삭제 설정
  autoDelete: AutoDeleteSettings;
  
  // 스트리밍 설정
  streaming: StreamingSettings;
  
  // 성장형 AI 데이터
  aiGrowthData: AIGrowthData | null;
  
  // 전문 분야 프로필
  expertiseProfiles: ExpertiseProfile[];
  activeExpertise: ExpertiseProfile | null;
  
  // PMC (Pick-My-Coin)
  pmcBalance: PMCBalance;
  userPlan: UserPlan;
  
  // 투표 (Poll)
  polls: Poll[];
  activePolls: Poll[];
  
  // 채팅 세션
  chatSessions: Array<{
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: Date;
    updatedAt: Date;
  }>;
  currentSessionId: string | null;
  lastChatSessionCreatedAt?: number;

  storedFacts: string[];
  
  // 관리자 설정
  isAdmin: boolean;
  exchangeRateMemo: string;
  paymentFeeMemo: string;

  // 피드백 & 마스터 계정
  feedbacks: FeedbackItem[];
  masterEmail: string;

  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  logout: () => void;
  setModels: (models: AIModel[]) => void;
  updateSelection: (modelId: string, quantity: number) => void;
  clearSelections: () => void;
  setPolicy: (policy: PricingPolicy) => void;
  initWallet: (userId: string) => void;
  addCredits: (credits: { [modelId: string]: number }) => Promise<void>;
  deductCredit: (modelId: string) => Promise<boolean>;
  getCredits: (modelId: string) => number;
  createChatSession: (title: string) => string | null;
  updateChatSessionTitle: (sessionId: string, newTitle: string) => void;
  deleteChatSession: (sessionId: string) => void;
  setCurrentSession: (sessionId: string | null) => void;
  addMessage: (sessionId: string, message: any) => void;
  updateMessageContent: (sessionId: string, messageId: string, content: string) => void;
  finalizeMessageContent: (sessionId: string, messageId: string, content: string) => void;
  addStoredFacts: (facts: string[]) => void;
  clearStoredFacts: () => void;
  setAdminMode: (isAdmin: boolean) => void;
  setExchangeRateMemo: (memo: string) => void;
  setPaymentFeeMemo: (memo: string) => void;
  submitFeedback: (payload: FeedbackPayload) => Promise<boolean>;
  addFeedback: (item: FeedbackItem) => void;
  setFeedbackStatus: (id: string, status: FeedbackStatus) => void;
  toggleDeleteConfirmation: () => void;
  
  // 다크모드 관련
  setThemeSettings: (settings: Partial<ThemeSettings>) => void;
  
  // 모델 비교 관련
  startComparison: (models: string[], prompt: string) => string;
  updateComparisonResponse: (sessionId: string, modelId: string, response: any) => void;
  
  // 대화 템플릿 관련
  addChatTemplate: (template: Omit<ChatTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usage'>) => void;
  toggleFavoriteTemplate: (templateId: string) => void;
  incrementTemplateUsage: (templateId: string) => void;
  setActiveTemplate: (template: ChatTemplate | null) => void;
  clearActiveTemplate: () => void;
  
  // 페르소나 관련
  createPersona: (persona: Omit<PersonaSettings, 'id' | 'createdAt' | 'updatedAt'>) => void;
  setActivePersona: (personaId: string | null) => void;
  updatePersona: (personaId: string, updates: Partial<PersonaSettings>) => void;
  
  // 크레딧 선물 관련
  sendCreditGift: (to: string, credits: { [modelId: string]: number }, message?: string) => boolean;
  acceptCreditGift: (giftId: string) => boolean;
  
  // 사용량 알림 관련
  createUsageAlert: (alert: Omit<UsageAlert, 'id' | 'createdAt'>) => void;
  checkUsageAlerts: () => void;
  markNotificationAsRead: (notificationId: string) => void;
  
  // 자동 충전 관련
  setAutoRecharge: (settings: Partial<AutoRechargeSettings>) => void;
  triggerAutoRecharge: () => Promise<boolean>;
  
  // 자동 삭제 관련
  setAutoDelete: (settings: Partial<AutoDeleteSettings>) => void;
  performAutoDelete: () => void;
  
  // 스트리밍 관련
  setStreamingSettings: (settings: Partial<StreamingSettings>) => void;
  
  // 성장형 AI 관련
  initAIGrowthData: (userId: string) => void;
  updateAIGrowthData: (updates: Partial<AIGrowthData>) => void;
  recordModelFeedback: (modelId: string, feedback: 'positive' | 'negative' | 'neutral') => void;
  
  // 전문 분야 관련
  createExpertiseProfile: (profile: Omit<ExpertiseProfile, 'id'>) => void;
  setActiveExpertise: (profileId: string | null) => void;
  updateExpertiseProfile: (profileId: string, updates: Partial<ExpertiseProfile>) => void;
  
  // PMC 관련
  earnPMC: (amount: number, description: string, orderId?: string) => void;
  usePMC: (amount: number, description: string, orderId?: string) => boolean;
  getAvailablePMC: () => number;
  cleanExpiredPMC: () => void;
  setUserPlan: (plan: UserPlan) => void;
  
  // 투표 관련
  createPoll: (title: string, description: string) => void;
  votePoll: (pollId: string, vote: 'agree' | 'disagree') => boolean;
  cancelVote: (pollId: string) => boolean;
  closePoll: (pollId: string) => void;
  getActivePoll: () => Poll | null;
  checkExpiredPolls: () => void;
}

// 가상 사용자 데이터베이스 (실제로는 서버에서 관리)
const DEMO_USERS = [
  { 
    email: 'demo@pickmyai.com', 
    password: 'demo12345', // 8자 이상으로 변경
    name: '데모 사용자',
    id: 'local_ZGVtb0BwaWNrbXlh' // 고정된 ID
  },
  { 
    email: 'test@pickmyai.com', 
    password: 'test12345', // 8자 이상으로 변경
    name: '테스트 사용자',
    id: 'local_dGVzdEBwaWNrbXlh' // 고정된 ID
  },
  { 
    email: 'wy3345@naver.com', 
    password: 'jason120510^^',
    name: 'Jason',
    id: 'local_d3kzMzQ1QG5hdmVy' // 고정된 ID
  },
];

let userDatabase: Array<{ email: string; password: string; name: string; id?: string }> = [...DEMO_USERS];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // 초기 상태
      settings: {
        showDeleteConfirmation: true, // 삭제 확인 대화상자 표시 여부
        showSuccessNotifications: true, // 성공 알림 표시 여부
      },
      language: 'ko',
      customDesignTheme: {
        theme: null,
        elementColors: {},
      },
      currentUser: null,
      isAuthenticated: false,
      models: initialModels,
      selections: [],
      policy: defaultPolicy,
      wallet: null,
      hasFirstPurchase: false,
      
      // 테마 설정 초기값
      themeSettings: {
        mode: 'system',
        color: 'blue',
      },
      
      // 모델 비교 초기값
      comparisonSessions: [],
      activeComparison: null,
      
      // 대화 템플릿 초기값
      chatTemplates: [],
      favoriteTemplates: [],
      activeTemplate: null,
      
      // 페르소나 초기값
      personas: [],
      activePersona: null,
      
      // 크레딧 선물 초기값
      sentGifts: [],
      receivedGifts: [],
      allGifts: [],
      
      // 사용량 알림 초기값
      usageAlerts: [],
      notifications: [],
      
      // 자동 충전 초기값
      autoRecharge: {
        enabled: false,
        threshold: 10,
        amount: 10000,
        maxMonthlyAmount: 100000,
        monthlyUsage: 0,
      },
      
      // 자동 삭제 초기값
      autoDelete: {
        enabled: false,
        deleteAfterDays: 30,
        excludeStarred: true,
        excludeTemplates: true,
      },
      
      // 스트리밍 설정 초기값
      streaming: {
        enabled: true,
        bufferSize: 1024,
        chunkDelay: 50,
        showTypingIndicator: true,
        smoothScrolling: true,
        errorRecovery: true,
      },
      
      // 성장형 AI 초기값
      aiGrowthData: null,
      
      // 전문 분야 초기값
      expertiseProfiles: [],
      activeExpertise: null,
      
      // PMC 초기값
      pmcBalance: {
        amount: 0,
        history: [],
      },
      userPlan: 'free' as UserPlan,
      
      // 투표 초기값
      polls: [],
      activePolls: [],
      
      chatSessions: [],
      currentSessionId: null,
      storedFacts: [],
      isAdmin: false,
      exchangeRateMemo: '',
      paymentFeeMemo: '',
      feedbacks: [],
      masterEmail: 'master@pickmyai.com',
      
      // 인증 액션
      login: async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
        try {
          // Supabase 로그인 시도
          if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
            const { AuthService } = await import('@/lib/auth');
            const result = await AuthService.login(email, password);
            
            if (result.success && result.user) {
              const currentUser: User = {
                id: result.user.id,
                email: result.user.email,
                name: result.user.name,
                credits: 100,
                subscription: 'free',
                theme: 'blue',
                createdAt: result.user.createdAt,
              };
              
              set({ currentUser, isAuthenticated: true, storedFacts: [] });
              
              // Supabase에서 크레딧 로드
              try {
                const { supabase } = await import('@/lib/supabase');
                const { data: { session } } = await supabase.auth.getSession();
                
                if (session?.access_token) {
                  const walletResponse = await fetch('/api/wallet', {
                    headers: {
                      'Authorization': `Bearer ${session.access_token}`
                    }
                  });
                  
                  if (walletResponse.ok) {
                    const { wallet } = await walletResponse.json();
                    set({
                      wallet: {
                        userId: currentUser.id,
                        credits: wallet.credits || {},
                        transactions: []
                      }
                    });
                  } else {
                    get().initWallet(currentUser.id);
                  }
                }
              } catch (error) {
                if (process.env.NODE_ENV !== 'production') {
                  console.error('크레딧 로드 실패:', error);
                }
                get().initWallet(currentUser.id);
              }
              
              return { success: true, message: '로그인 성공' };
            }
            
            return { success: false, message: result.error || '이메일 또는 비밀번호가 올바르지 않습니다.' };
          }
          
          // Fallback: 로컬 로그인
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const user = userDatabase.find(
            u => u.email === email && u.password === password
          );
          
          if (user) {
            const userId = user.id || btoa(email).replace(/=/g, '');
            
            const currentUser: User = {
              id: userId,
              email: user.email,
              name: user.name,
              credits: 100,
              subscription: 'free',
              theme: 'blue',
              createdAt: new Date(),
            };
            
            set({ currentUser, isAuthenticated: true, storedFacts: [] });
            
            // 로컬 스토리지에서 데이터 로드
            const storage = localStorage.getItem('pick-my-ai-storage');
            if (storage) {
              try {
                const parsed = JSON.parse(storage);
                const persistedState = parsed.state;
                
                set({
                  selections: persistedState[`user_${userId}_selections`] || [],
                  wallet: persistedState[`user_${userId}_wallet`] || null,
                  hasFirstPurchase: persistedState[`user_${userId}_hasFirstPurchase`] || false,
                  chatSessions: persistedState[`user_${userId}_chatSessions`] || [],
                  currentSessionId: persistedState[`user_${userId}_currentSessionId`] || null,
                  storedFacts: persistedState[`user_${userId}_storedFacts`] || [],
                });
              } catch (error) {
                console.error('Failed to load user data:', error);
              }
            }
            
            const state = get();
            if (!state.wallet) {
              get().initWallet(currentUser.id);
            }
            
            const receivedGifts = state.allGifts.filter(gift => 
              gift.to.toLowerCase() === user.email.toLowerCase()
            );
            const sentGifts = state.allGifts.filter(gift => 
              gift.from.toLowerCase() === user.email.toLowerCase()
            );
            
            set({ 
              receivedGifts,
              sentGifts 
            });
            
            return { success: true, message: '로그인 성공' };
          }
          
          return { success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' };
        } catch (error) {
          if (process.env.NODE_ENV !== 'production') {
            console.error('로그인 오류:', error);
          }
          return { success: false, message: '로그인 중 오류가 발생했습니다.' };
        }
      },
      
      register: async (email, password, name) => {
        // Supabase 사용 시도
        try {
          const { AuthService } = await import('@/lib/auth');
          const result = await AuthService.register(email, password, name);
          
          if (result.success) {
            return { success: true };
          } else {
            // 에러 메시지를 포함한 객체 반환
            return { success: false, error: result.error };
          }
        } catch (error) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('Supabase not configured, using local registration');
          }
        }
        
        // Fallback: 로컬 등록
        // 이메일 형식 검증
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return { success: false, error: '올바른 이메일 형식이 아닙니다.', message: '올바른 이메일 형식이 아닙니다.' };
        }
        
        // 비밀번호 길이 검증
        if (password.length < 8) {
          return { success: false, error: '비밀번호는 최소 8자 이상이어야 합니다.', message: '비밀번호는 최소 8자 이상이어야 합니다.' };
        }
        
        // 이름 검증
        if (name.length < 2) {
          return { success: false, error: '이름은 최소 2자 이상이어야 합니다.', message: '이름은 최소 2자 이상이어야 합니다.' };
        }
        
        const existingUser = userDatabase.find(u => u.email === email);
        
        if (existingUser) {
          return { success: false, error: '이미 사용 중인 이메일입니다.', message: '이미 사용 중인 이메일입니다.' };
        }
        
        // 고유 ID 생성
        const userId = `local_${btoa(email).substring(0, 16)}`;
        userDatabase.push({ email, password, name, id: userId });
        
        // 가입 축하 PMC 300원 지급
        const newUser: User = {
          id: userId,
          email,
          name,
          credits: 100,
          subscription: 'free',
          theme: 'blue',
          createdAt: new Date(),
        };
        
        set({ currentUser: newUser, isAuthenticated: true, storedFacts: [] });
        
        // 지갑 초기화
        get().initWallet(userId);
        
        // PMC 300원 지급
        setTimeout(() => {
          const earnPMC = get().earnPMC;
          if (earnPMC) {
            earnPMC(300, '가입 축하 무료 지급', `welcome_${userId}`);
          }
        }, 100);
        
        return { success: true };
      },
      
      logout: async () => {
        // Supabase 로그아웃
        try {
          const { AuthService } = await import('@/lib/auth');
          await AuthService.logout();
        } catch (error) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('Local logout');
          }
        }
        
        // 사용자 인증 정보만 초기화 (데이터는 로컬 스토리지에 저장되어 있음)
        set({ 
          currentUser: null, 
          isAuthenticated: false,
          selections: [],
          wallet: null,
          hasFirstPurchase: false,
          chatSessions: [],
          currentSessionId: null,
          storedFacts: [],
          pmcBalance: { amount: 0, history: [] },
          userPlan: 'free',
        });
      },
      
      // 모델 관련 액션
      setModels: (models) => set({ models }),
      
      updateSelection: (modelId, quantity) => set((state) => {
        const existing = state.selections.find(s => s.modelId === modelId);
        if (existing) {
          return {
            selections: state.selections.map(s =>
              s.modelId === modelId ? { ...s, quantity } : s
            ).filter(s => s.quantity > 0)
          };
        } else if (quantity > 0) {
          return {
            selections: [...state.selections, { modelId, quantity }]
          };
        }
        return state;
      }),
      
      clearSelections: () => set({ selections: [] }),
      
      setPolicy: (policy) => set({ policy }),
      
      // 지갑 관련 액션
      initWallet: (userId) => set({
        wallet: {
          userId,
          credits: {},
          transactions: []
        }
      }),
      
      addCredits: async (credits: { [modelId: string]: number }) => {
        const state = get();
        
        if (!state.wallet) {
          console.error('❌ addCredits: 지갑이 없습니다!');
          return;
        }
        
        // 첫 구매 완료 표시
        if (!state.hasFirstPurchase) {
          set({ hasFirstPurchase: true });
          if (process.env.NODE_ENV !== 'production') {
            console.log('🎉 첫 구매 완료!');
          }
        }
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('💰 addCredits 시작:', { 
            currentCredits: state.wallet.credits,
            toAdd: credits 
          });
        }
        
        const newCredits = { ...state.wallet.credits };
        Object.entries(credits).forEach(([modelId, amount]) => {
          newCredits[modelId] = (newCredits[modelId] || 0) + amount;
          if (process.env.NODE_ENV !== 'production') {
            console.log(`  ✅ ${modelId}: ${newCredits[modelId]} (추가: +${amount})`);
          }
        });
        
        const transaction: Transaction = {
          id: Date.now().toString(),
          userId: state.wallet.userId,
          type: 'purchase',
          credits,
          timestamp: new Date(),
          description: '크레딧 구매'
        };
        
        const updatedWallet = {
          ...state.wallet,
          credits: newCredits,
          transactions: [...state.wallet.transactions, transaction]
        };
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('💳 업데이트된 지갑:', updatedWallet);
        }
        
        set({
          wallet: updatedWallet
        });
        
        // Supabase에 동기화
        if (process.env.NEXT_PUBLIC_SUPABASE_URL && state.currentUser) {
          try {
            const { supabase } = await import('@/lib/supabase');
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.access_token) {
              await fetch('/api/wallet', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                  credits,
                  type: 'purchase',
                  description: '크레딧 구매'
                })
              });
            }
          } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
              console.error('Supabase 크레딧 동기화 실패:', error);
            }
          }
        }
        
        // 강제로 로컬 스토리지에 즉시 저장
        setTimeout(() => {
          if (process.env.NODE_ENV !== 'production') {
            const currentState = get();
            console.log('📦 저장 후 확인:', currentState.wallet);
          }
        }, 100);
      },
      
      deductCredit: async (modelId) => {
        const state = get();
        if (!state.wallet) return false;
        
        const available = state.wallet.credits[modelId] || 0;
        if (available <= 0) return false;
        
        set((state) => {
          if (!state.wallet) return state;
          
          const newCredits = { ...state.wallet.credits };
          newCredits[modelId] = (newCredits[modelId] || 0) - 1;
          
          const transaction: Transaction = {
            id: Date.now().toString(),
            userId: state.wallet.userId,
            type: 'usage',
            modelId,
            timestamp: new Date(),
            description: '크레딧 사용'
          };
          
          return {
            wallet: {
              ...state.wallet,
              credits: newCredits,
              transactions: [...state.wallet.transactions, transaction]
            }
          };
        });
        
        // Supabase에 동기화
        if (process.env.NEXT_PUBLIC_SUPABASE_URL && state.currentUser) {
          try {
            const { supabase } = await import('@/lib/supabase');
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.access_token) {
              await fetch('/api/wallet', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                  credits: { [modelId]: -1 },
                  type: 'usage',
                  description: '크레딧 사용'
                })
              });
            }
          } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
              console.error('Supabase 크레딧 사용 동기화 실패:', error);
            }
          }
        }
        
        return true;
      },
      
      getCredits: (modelId) => {
        const state = get();
        if (!state.wallet) return 0;
        return state.wallet.credits[modelId] || 0;
      },
      
      deleteModelCredit: (modelId: string) => {
        const state = get();
        if (!state.wallet) return;
        
        const newCredits = { ...state.wallet.credits };
        delete newCredits[modelId];
        
        const newTransactions = state.wallet.transactions.filter(
          t => t.modelId !== modelId
        );
        
        set({
          wallet: {
            ...state.wallet,
            credits: newCredits,
            transactions: newTransactions
          }
        });
      },
      
      // 채팅 관련 액션
      createChatSession: (title) => {
        const now = Date.now();
        const lastCreatedAt = get().lastChatSessionCreatedAt;
        
        // 1.3초 쿨다운 확인
        if (lastCreatedAt && now - lastCreatedAt < 1300) {
          return null;
        }
        
        // 언어별 기본 제목 설정
        const language = get().language;
        let defaultTitle = title;
        if (title.startsWith('새 대화')) {
          if (language === 'en') {
            defaultTitle = title.replace('새 대화', 'New Chat');
          } else if (language === 'ja') {
            defaultTitle = title.replace('새 대화', '新しいチャット');
          }
        }
        
        const sessionId = now.toString();
        set((state) => ({
          chatSessions: [...state.chatSessions, {
            id: sessionId,
            title: defaultTitle,
            messages: [],
            createdAt: new Date(now),
            updatedAt: new Date(now)
          }],
          currentSessionId: sessionId,
          lastChatSessionCreatedAt: now
        }));
        return sessionId;
      },
      
      updateChatSessionTitle: (sessionId, newTitle) => {
    set((state) => ({
      chatSessions: state.chatSessions.map((session) =>
        session.id === sessionId ? { ...session, title: newTitle, updatedAt: new Date() } : session
      ),
    }));
  },
  
  deleteChatSession: (sessionId) => {
    set((state) => {
      const newSessions = state.chatSessions.filter(session => session.id !== sessionId);
      
      // If we're deleting the current session, switch to another one or create a new one
      let newCurrentSessionId = state.currentSessionId;
      if (sessionId === state.currentSessionId) {
        newCurrentSessionId = newSessions[0]?.id || null;
        
        // If no sessions left, create a new one
        if (!newCurrentSessionId) {
          const language = state.language;
          let title = '새 대화';
          if (language === 'en') {
            title = 'New Chat';
          } else if (language === 'ja') {
            title = '新しいチャット';
          }
          
          const newSession = {
            id: `session-${Date.now()}`,
            title,
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          newSessions.push(newSession);
          newCurrentSessionId = newSession.id;
        }
      }
      
      return {
        chatSessions: newSessions,
        currentSessionId: newCurrentSessionId,
      };
    });
  },

  // 현재 세션을 설정하는 액션 추가
  setCurrentSession: (sessionId) => {
    set({ currentSessionId: sessionId });
  },
  
      addMessage: (sessionId, message) => set((state) => ({
        chatSessions: state.chatSessions.map(session =>
          session.id === sessionId
            ? {
                ...session,
                messages: [...session.messages, { ...message, id: message?.id ?? Date.now().toString() }],
                updatedAt: new Date()
              }
            : session
        )
      })),

      updateMessageContent: (sessionId, messageId, content) =>
        set((state) => ({
          chatSessions: state.chatSessions.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  messages: session.messages.map((msg: any) =>
                    msg.id === messageId ? { ...msg, content } : msg
                  ),
                  updatedAt: new Date(),
                }
              : session
          ),
        })),

      finalizeMessageContent: (sessionId, messageId, content) =>
        set((state) => ({
          chatSessions: state.chatSessions.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  messages: session.messages.map((msg: any) =>
                    msg.id === messageId ? { ...msg, content } : msg
                  ),
                  updatedAt: new Date(),
                }
              : session
          ),
        })),

      addStoredFacts: (facts) => {
        const normalizeStoredFact = (fact: unknown) => {
          if (typeof fact !== 'string') return '';
          const trimmed = fact.trim();
          if (!trimmed) return '';
          const unbulleted = trimmed
            .replace(/^[-*•]\s+/, '')
            .replace(/^\d+[\.)]\s+/, '');
          const compact = unbulleted.replace(/\s+/g, ' ');
          return compact.slice(0, 200);
        };

        set((state) => {
          if (!Array.isArray(facts) || facts.length === 0) return state;

          const normalized = facts.map(normalizeStoredFact).filter(Boolean);
          if (normalized.length === 0) return state;

          const existing = Array.isArray(state.storedFacts) ? state.storedFacts : [];
          const merged: string[] = [...existing];
          const existingKeys = new Set(
            existing
              .map((f) => normalizeStoredFact(f).toLowerCase())
              .filter(Boolean)
          );

          for (const fact of normalized) {
            const key = fact.toLowerCase();
            if (existingKeys.has(key)) continue;
            existingKeys.add(key);
            merged.push(fact);
          }

          return { storedFacts: merged.slice(-MAX_STORED_FACTS) };
        });
      },

      clearStoredFacts: () => {
        set({ storedFacts: [] });
      },
      
      // 관리자 관련 액션
      setAdminMode: (isAdmin) => set({ isAdmin }),
      setCurrentUser: (user: User | null) => {
        set({ currentUser: user });
      },
      
      setTheme: (theme: ThemeColor) => {
        set(state => {
          if (!state.currentUser) return state;
          
          const updatedUser = {
            ...state.currentUser,
            theme
          };
          
          // Update the theme attribute on the root element
          document.documentElement.setAttribute('data-theme', theme);
          
          return { currentUser: updatedUser };
        });
      },
      updateModel: (modelId: string, updates: Partial<AIModel>) => set((state) => ({
        models: state.models.map(model =>
          model.id === modelId ? { ...model, ...updates } : model
        )
      })),
      setExchangeRateMemo: (memo) => set({ exchangeRateMemo: memo }),
      setPaymentFeeMemo: (memo) => set({ paymentFeeMemo: memo }),

      // 피드백 관련 액션
      submitFeedback: async (payload: FeedbackPayload) => {
        const state = get();
        const user = state.currentUser;
        if (!user) return false;
        
        const item: FeedbackItem = {
          id: Date.now().toString(),
          type: payload.type,
          title: payload.title,
          content: payload.content,
          screenshots: payload.screenshots || [],
          status: 'open',
          createdBy: { userId: user.id, email: user.email, name: user.name },
          createdAt: new Date(),
        };
        
        set((state) => ({ feedbacks: [item, ...state.feedbacks] }));
        return true;
      },

      // Settings actions
      // Feedback actions
      addFeedback: (item: FeedbackItem) => {
        set((state) => ({
          feedbacks: [item, ...state.feedbacks]
        }));
      },
      
      setFeedbackStatus: (id: string, status: FeedbackStatus) => {
        set((state) => ({
          feedbacks: state.feedbacks.map(feedback => 
            feedback.id === id ? { ...feedback, status } : feedback
          )
        }));
      },
      
      // 다크모드 관련 액션
      setThemeSettings: (settings: Partial<ThemeSettings>) => {
        set((state) => ({
          themeSettings: { ...state.themeSettings, ...settings }
        }));
        
        // Apply theme to document
        const { mode } = get().themeSettings;
        if (mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },
      
      // 모델 비교 관련 액션
      startComparison: (models: string[], prompt: string) => {
        const session: ComparisonSession = {
          id: Date.now().toString(),
          models,
          prompt,
          responses: {},
          createdAt: new Date(),
        };
        set((state) => ({
          comparisonSessions: [...state.comparisonSessions, session],
          activeComparison: session,
        }));
        return session.id;
      },
      
      updateComparisonResponse: (sessionId: string, modelId: string, response: any) => {
        set((state) => ({
          comparisonSessions: state.comparisonSessions.map(s => 
            s.id === sessionId 
              ? { ...s, responses: { ...s.responses, [modelId]: response } }
              : s
          ),
          activeComparison: state.activeComparison?.id === sessionId 
            ? { ...state.activeComparison, responses: { ...state.activeComparison.responses, [modelId]: response } }
            : state.activeComparison,
        }));
      },
      
      // 대화 템플릿 관련 액션
      addChatTemplate: (template: Omit<ChatTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usage'>) => {
        const newTemplate: ChatTemplate = {
          ...template,
          id: Date.now().toString(),
          usage: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({
          chatTemplates: [...state.chatTemplates, newTemplate],
        }));
      },
      
      toggleFavoriteTemplate: (templateId: string) => {
        set((state) => {
          const isFavorite = state.favoriteTemplates.includes(templateId);
          return {
            favoriteTemplates: isFavorite 
              ? state.favoriteTemplates.filter(id => id !== templateId)
              : [...state.favoriteTemplates, templateId],
          };
        });
      },
      
      incrementTemplateUsage: (templateId: string) => {
        set((state) => ({
          chatTemplates: state.chatTemplates.map(t => 
            t.id === templateId ? { ...t, usage: t.usage + 1 } : t
          ),
        }));
      },

      setActiveTemplate: (template: ChatTemplate | null) => {
        set({ activeTemplate: template });
      },

      clearActiveTemplate: () => {
        set({ activeTemplate: null });
      },
      
      // 페르소나 관련 액션
      createPersona: (persona: Omit<PersonaSettings, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newPersona: PersonaSettings = {
          ...persona,
          id: Date.now().toString(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({
          personas: [...state.personas, newPersona],
        }));
      },
      
      setActivePersona: (personaId: string | null) => {
        set((state) => ({
          activePersona: personaId ? state.personas.find(p => p.id === personaId) || null : null,
        }));
      },
      
      updatePersona: (personaId: string, updates: Partial<PersonaSettings>) => {
        set((state) => ({
          personas: state.personas.map(p => 
            p.id === personaId ? { ...p, ...updates, updatedAt: new Date() } : p
          ),
          activePersona: state.activePersona?.id === personaId 
            ? { ...state.activePersona, ...updates, updatedAt: new Date() }
            : state.activePersona,
        }));
      },
      
      // 크레딧 선물 관련 액션
      sendCreditGift: (to: string, credits: { [modelId: string]: number }, message?: string) => {
        const state = get();
        if (!state.currentUser || !state.wallet) return false;
        
        // 보유 크레딧 확인
        for (const [modelId, amount] of Object.entries(credits)) {
          const available = state.wallet.credits[modelId] || 0;
          if (amount > available) {
            console.error(`크레딧 부족: ${modelId}, 필요: ${amount}, 보유: ${available}`);
            return false;
          }
        }
        
        const gift: CreditGift = {
          id: Date.now().toString(),
          from: state.currentUser.email,
          to,
          credits,
          message,
          status: 'pending',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          createdAt: new Date(),
        };
        
        // 크레딧 차감
        const newCredits = { ...state.wallet.credits };
        Object.entries(credits).forEach(([modelId, amount]) => {
          newCredits[modelId] = (newCredits[modelId] || 0) - amount;
        });
        
        // 트랜잭션 기록
        const transaction: Transaction = {
          id: Date.now().toString(),
          userId: state.wallet.userId,
          type: 'usage',
          timestamp: new Date(),
          description: `크레딧 선물 (받는 사람: ${to})`,
          credits,
        };
        
        set((state) => ({
          sentGifts: [...state.sentGifts, gift],
          allGifts: [...state.allGifts, gift], // 글로벌 선물 목록에 추가
          wallet: state.wallet ? {
            ...state.wallet,
            credits: newCredits,
            transactions: [...state.wallet.transactions, transaction],
          } : state.wallet,
        }));
        return true;
      },
      
      acceptCreditGift: (giftId: string) => {
        const state = get();
        const gift = state.receivedGifts.find(g => g.id === giftId);
        
        if (gift && gift.status === 'pending') {
          // Add credits to wallet
          const newCredits = { ...state.wallet?.credits };
          Object.entries(gift.credits).forEach(([modelId, amount]) => {
            newCredits[modelId] = (newCredits[modelId] || 0) + amount;
          });
          
          set((state) => ({
            receivedGifts: state.receivedGifts.map(g => 
              g.id === giftId ? { ...g, status: 'accepted', claimedAt: new Date() } : g
            ),
            wallet: state.wallet ? { ...state.wallet, credits: newCredits } : state.wallet,
          }));
          return true;
        }
        return false;
      },
      
      // 사용량 알림 관련 액션
      createUsageAlert: (alert: Omit<UsageAlert, 'id' | 'createdAt'>) => {
        const newAlert: UsageAlert = {
          ...alert,
          id: Date.now().toString(),
          createdAt: new Date(),
        };
        set((state) => ({
          usageAlerts: [...state.usageAlerts, newAlert],
        }));
      },
      
      checkUsageAlerts: () => {
        const state = get();
        if (!state.wallet) return;
        
        state.usageAlerts.forEach(alert => {
          if (!alert.enabled) return;
          
          let shouldTrigger = false;
          if (alert.type === 'low_credits' && alert.modelId && state.wallet) {
            const credits = state.wallet.credits[alert.modelId] || 0;
            if (credits <= alert.threshold) {
              shouldTrigger = true;
            }
          }
          
          if (shouldTrigger) {
            const notification = {
              id: Date.now().toString(),
              type: 'warning' as const,
              message: `크레딧이 부족합니다. 남은 크레딧: ${alert.threshold}`,
              read: false,
              timestamp: new Date(),
            };
            set((state) => ({
              notifications: [...state.notifications, notification],
            }));
          }
        });
      },
      
      markNotificationAsRead: (notificationId: string) => {
        set((state) => ({
          notifications: state.notifications.map(n => 
            n.id === notificationId ? { ...n, read: true } : n
          ),
        }));
      },
      
      // 자동 충전 관련 액션
      setAutoRecharge: (settings: Partial<AutoRechargeSettings>) => {
        set((state) => ({
          autoRecharge: { ...state.autoRecharge, ...settings },
        }));
      },
      
      triggerAutoRecharge: async () => {
        const state = get();
        if (!state.autoRecharge.enabled) return false;
        
        // Check if threshold is met
        const totalCredits = Object.values(state.wallet?.credits || {}).reduce((sum, c) => sum + c, 0);
        if (totalCredits > state.autoRecharge.threshold) return false;
        
        // Check monthly limit
        if (state.autoRecharge.monthlyUsage >= state.autoRecharge.maxMonthlyAmount) {
          console.log('월 자동 충전 한도에 도달했습니다.');
          return false;
        }
        
        // Simulate recharge (in real app, would call payment API)
        console.log(`자동 충전: ${state.autoRecharge.amount}원`);
        
        set((state) => ({
          autoRecharge: {
            ...state.autoRecharge,
            lastRecharge: new Date(),
            monthlyUsage: state.autoRecharge.monthlyUsage + state.autoRecharge.amount,
          },
        }));
        
        return true;
      },
      
      // 자동 삭제 관련 액션
      setAutoDelete: (settings: Partial<AutoDeleteSettings>) => {
        set((state) => ({
          autoDelete: { ...state.autoDelete, ...settings },
        }));
      },
      
      performAutoDelete: () => {
        const state = get();
        if (!state.autoDelete.enabled) return;
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - state.autoDelete.deleteAfterDays);
        
        set((state) => ({
          chatSessions: state.chatSessions.filter(session => {
            // Keep if newer than cutoff
            if (session.updatedAt > cutoffDate) return true;
            
            // Keep if starred (if implemented)
            // if (state.autoDelete.excludeStarred && session.starred) return true;
            
            return false;
          }),
          autoDelete: {
            ...state.autoDelete,
            lastCleanup: new Date(),
          },
        }));
      },
      
      // 스트리밍 관련 액션
      setStreamingSettings: (settings: Partial<StreamingSettings>) => {
        set((state) => ({
          streaming: { ...state.streaming, ...settings },
        }));
      },
      
      // 성장형 AI 관련 액션
      initAIGrowthData: (userId: string) => {
        const growthData: AIGrowthData = {
          userId,
          modelPreferences: {},
          learningHistory: [],
          personalizedSettings: {
            preferredResponseLength: 100,
            technicalLevel: 5,
            creativityLevel: 5,
            formalityLevel: 5,
          },
          interests: [],
          frequentTopics: [],
        };
        set({ aiGrowthData: growthData });
      },
      
      updateAIGrowthData: (updates: Partial<AIGrowthData>) => {
        set((state) => ({
          aiGrowthData: state.aiGrowthData ? { ...state.aiGrowthData, ...updates } : null,
        }));
      },
      
      recordModelFeedback: (modelId: string, feedback: 'positive' | 'negative' | 'neutral') => {
        set((state) => {
          if (!state.aiGrowthData) return state;
          
          const preferences = state.aiGrowthData.modelPreferences[modelId] || {
            satisfactionScore: 0,
            usageCount: 0,
            averageResponseTime: 0,
            preferredForTasks: [],
          };
          
          const scoreChange = feedback === 'positive' ? 1 : feedback === 'negative' ? -1 : 0;
          
          return {
            aiGrowthData: {
              ...state.aiGrowthData,
              modelPreferences: {
                ...state.aiGrowthData.modelPreferences,
                [modelId]: {
                  ...preferences,
                  satisfactionScore: preferences.satisfactionScore + scoreChange,
                  usageCount: preferences.usageCount + 1,
                },
              },
            },
          };
        });
      },
      
      // 전문 분야 관련 액션
      createExpertiseProfile: (profile: Omit<ExpertiseProfile, 'id'>) => {
        const newProfile: ExpertiseProfile = {
          ...profile,
          id: Date.now().toString(),
        };
        set((state) => ({
          expertiseProfiles: [...state.expertiseProfiles, newProfile],
        }));
      },
      
      setActiveExpertise: (profileId: string | null) => {
        set((state) => ({
          activeExpertise: profileId ? state.expertiseProfiles.find(p => p.id === profileId) || null : null,
        }));
      },
      
      updateExpertiseProfile: (profileId: string, updates: Partial<ExpertiseProfile>) => {
        set((state) => ({
          expertiseProfiles: state.expertiseProfiles.map(p => 
            p.id === profileId ? { ...p, ...updates } : p
          ),
          activeExpertise: state.activeExpertise?.id === profileId 
            ? { ...state.activeExpertise, ...updates }
            : state.activeExpertise,
        }));
      },
      
      // PMC 관련 액션
      earnPMC: (amount: number, description: string, orderId?: string) => {
        if (amount <= 0) return;
        
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 90); // 90일 유효기간
        
        const transaction: PMCTransaction = {
          id: Date.now().toString(),
          type: 'earn',
          amount,
          description,
          orderId,
          expiresAt,
          createdAt: new Date(),
        };
        
        set((state) => ({
          pmcBalance: {
            amount: state.pmcBalance.amount + amount,
            history: [transaction, ...state.pmcBalance.history],
          },
        }));
      },
      
      usePMC: (amount: number, description: string, orderId?: string) => {
        const state = get();
        const available = state.getAvailablePMC();
        
        if (amount <= 0 || amount > available) return false;
        
        const transaction: PMCTransaction = {
          id: Date.now().toString(),
          type: 'use',
          amount: -amount,
          description,
          orderId,
          expiresAt: new Date(), // 사용 시에는 만료일 의미 없음
          createdAt: new Date(),
        };
        
        set((state) => ({
          pmcBalance: {
            amount: state.pmcBalance.amount - amount,
            history: [transaction, ...state.pmcBalance.history],
          },
        }));
        
        return true;
      },
      
      getAvailablePMC: () => {
        const state = get();
        // 만료되지 않은 PMC만 계산
        const now = new Date();
        let available = 0;
        
        state.pmcBalance.history.forEach((tx) => {
          if (tx.type === 'earn' && new Date(tx.expiresAt) > now) {
            available += tx.amount;
          } else if (tx.type === 'use') {
            available += tx.amount; // 음수
          }
        });
        
        return Math.max(0, available);
      },
      
      cleanExpiredPMC: () => {
        const now = new Date();
        
        set((state) => {
          let expiredAmount = 0;
          const newHistory: PMCTransaction[] = [];
          
          state.pmcBalance.history.forEach((tx) => {
            if (tx.type === 'earn' && new Date(tx.expiresAt) <= now) {
              // 만료된 적립금
              expiredAmount += tx.amount;
              newHistory.push({
                ...tx,
                type: 'expire',
                amount: -tx.amount,
              });
            } else {
              newHistory.push(tx);
            }
          });
          
          return {
            pmcBalance: {
              amount: state.pmcBalance.amount - expiredAmount,
              history: newHistory,
            },
          };
        });
      },
      
      setUserPlan: (plan: UserPlan) => {
        set({ userPlan: plan });
      },
      
      // 투표 관련 액션
      createPoll: (title: string, description: string) => {
        const state = get();
        if (!state.currentUser || !state.isAdmin) return;
        
        const now = new Date();
        const expiresAt = new Date(now);
        expiresAt.setMonth(expiresAt.getMonth() + 1); // 1달 후
        
        const newPoll: Poll = {
          id: Date.now().toString(),
          title,
          description,
          status: 'active',
          createdBy: state.currentUser.email,
          createdAt: now,
          expiresAt,
          votes: [],
          agreeCount: 0,
          disagreeCount: 0,
        };
        
        set((state) => ({
          polls: [newPoll, ...state.polls],
          activePolls: [newPoll, ...state.activePolls],
        }));
      },
      
      votePoll: (pollId: string, vote: 'agree' | 'disagree') => {
        const state = get();
        if (!state.currentUser) return false;
        
        const poll = state.polls.find(p => p.id === pollId);
        if (!poll || poll.status !== 'active') return false;
        
        // 이미 투표했는지 확인
        const hasVoted = poll.votes.some(v => v.userId === state.currentUser!.id);
        if (hasVoted) return false;
        
        const newVote = {
          userId: state.currentUser.id,
          vote,
          votedAt: new Date(),
        };
        
        set((state) => ({
          polls: state.polls.map(p => {
            if (p.id === pollId) {
              return {
                ...p,
                votes: [...p.votes, newVote],
                agreeCount: vote === 'agree' ? p.agreeCount + 1 : p.agreeCount,
                disagreeCount: vote === 'disagree' ? p.disagreeCount + 1 : p.disagreeCount,
              };
            }
            return p;
          }),
          activePolls: state.activePolls.map(p => {
            if (p.id === pollId) {
              return {
                ...p,
                votes: [...p.votes, newVote],
                agreeCount: vote === 'agree' ? p.agreeCount + 1 : p.agreeCount,
                disagreeCount: vote === 'disagree' ? p.disagreeCount + 1 : p.disagreeCount,
              };
            }
            return p;
          }),
        }));
        
        return true;
      },
      
      cancelVote: (pollId: string) => {
        const state = get();
        if (!state.currentUser) return false;
        
        const poll = state.polls.find(p => p.id === pollId);
        if (!poll || poll.status !== 'active') return false;
        
        // 투표한 적이 있는지 확인
        const userVote = poll.votes.find(v => v.userId === state.currentUser!.id);
        if (!userVote) return false;
        
        set((state) => ({
          polls: state.polls.map(p => {
            if (p.id === pollId) {
              const newVotes = p.votes.filter(v => v.userId !== state.currentUser!.id);
              return {
                ...p,
                votes: newVotes,
                agreeCount: userVote.vote === 'agree' ? p.agreeCount - 1 : p.agreeCount,
                disagreeCount: userVote.vote === 'disagree' ? p.disagreeCount - 1 : p.disagreeCount,
              };
            }
            return p;
          }),
          activePolls: state.activePolls.map(p => {
            if (p.id === pollId) {
              const newVotes = p.votes.filter(v => v.userId !== state.currentUser!.id);
              return {
                ...p,
                votes: newVotes,
                agreeCount: userVote.vote === 'agree' ? p.agreeCount - 1 : p.agreeCount,
                disagreeCount: userVote.vote === 'disagree' ? p.disagreeCount - 1 : p.disagreeCount,
              };
            }
            return p;
          }),
        }));
        
        return true;
      },
      
      closePoll: (pollId: string) => {
        const state = get();
        if (!state.isAdmin) return;
        
        set((state) => ({
          polls: state.polls.map(p => 
            p.id === pollId ? { ...p, status: 'closed' as PollStatus } : p
          ),
          activePolls: state.activePolls.filter(p => p.id !== pollId),
        }));
      },
      
      getActivePoll: () => {
        const state = get();
        return state.activePolls[0] || null;
      },
      
      checkExpiredPolls: () => {
        const now = new Date();
        
        set((state) => {
          const updatedPolls = state.polls.map(p => {
            if (p.status === 'active' && new Date(p.expiresAt) <= now) {
              return { ...p, status: 'expired' as PollStatus };
            }
            return p;
          });
          
          const updatedActivePolls = updatedPolls.filter(
            p => p.status === 'active'
          );
          
          return {
            polls: updatedPolls,
            activePolls: updatedActivePolls,
          };
        });
      },
      
      // Settings actions
      toggleDeleteConfirmation: () => {
        set((state) => ({
          settings: {
            ...state.settings,
            showDeleteConfirmation: !state.settings.showDeleteConfirmation,
          }
        }));
      },
      
      toggleSuccessNotifications: () => {
        set((state) => ({
          settings: {
            ...state.settings,
            showSuccessNotifications: !state.settings.showSuccessNotifications,
          }
        }));
      },
      
      setSettings: (newSettings) => {
        set((state) => ({
          settings: {
            ...state.settings,
            ...newSettings,
          }
        }));
      },

      setLanguage: (language) => {
        set({ language });
      },
      
      setCustomDesignTheme: (theme, elementColors) => {
        set({ customDesignTheme: { theme, elementColors } });
      },
      
      getCustomDesignTheme: () => {
        return get().customDesignTheme;
      },
      
      clearCustomDesignTheme: () => {
        set({ customDesignTheme: { theme: null, elementColors: {} } });
      },
      
      // TEMP_ENABLED_START - 임시 자동 로그인 (복구 시 이 섹션 주석 처리)
      tempAutoLogin: () => {
        const tempUser: User = {
          id: 'temp-user-001',
          email: 'temp@pickmyai.com',
          name: '임시 사용자',
          credits: 999999,
          subscription: 'max',
          theme: 'blue',
          createdAt: new Date(),
        };
        
        set({ 
          currentUser: tempUser, 
          isAuthenticated: true,
          isAdmin: true,
          userPlan: 'max',
          storedFacts: [],
        });
        
        // 지갑 초기화
        const state = get();
        if (!state.wallet) {
          get().initWallet(tempUser.id);
        }
        
        // 가입 축하 PMC 300원 지급 (최초 1회만)
        const hasWelcomePMC = state.pmcBalance.history.some(
          tx => tx.orderId === `welcome_${tempUser.id}`
        );
        
        if (!hasWelcomePMC) {
          setTimeout(() => {
            const earnPMC = get().earnPMC;
            if (earnPMC) {
              earnPMC(300, '가입 축하 무료 지급', `welcome_${tempUser.id}`);
            }
          }, 100);
        }
      },
      // TEMP_ENABLED_END
    }),
    {
      name: 'pick-my-ai-storage',
      storage: createJSONStorage(() => {
        const storage = localStorage;

        return {
          getItem: storage.getItem.bind(storage),
          setItem: (key: string, value: string) => {
            const start = performance.now();
            try {
              storage.setItem(key, value);
            } finally {
              recordChatPerfLsSetItem(key, value, performance.now() - start);
            }
          },
          removeItem: storage.removeItem.bind(storage),
        };
      }),
      partialize: (state) => {
        // 사용자별로 데이터 분리하여 저장
        if (!state.currentUser) {
          return {
            currentUser: null,
            isAuthenticated: false,
            language: state.language,
          };
        }
        
        return {
          currentUser: state.currentUser,
          isAuthenticated: state.isAuthenticated,
          // 사용자 ID를 키로 사용하여 데이터 저장
          [`user_${state.currentUser.id}_selections`]: state.selections,
          [`user_${state.currentUser.id}_wallet`]: state.wallet,
          [`user_${state.currentUser.id}_hasFirstPurchase`]: state.hasFirstPurchase,
          [`user_${state.currentUser.id}_chatSessions`]: state.chatSessions,
          [`user_${state.currentUser.id}_currentSessionId`]: state.currentSessionId,
          [`user_${state.currentUser.id}_storedFacts`]: state.storedFacts,
          [`user_${state.currentUser.id}_themeSettings`]: state.themeSettings,
          [`user_${state.currentUser.id}_comparisonSessions`]: state.comparisonSessions,
          [`user_${state.currentUser.id}_chatTemplates`]: state.chatTemplates,
          [`user_${state.currentUser.id}_favoriteTemplates`]: state.favoriteTemplates,
          [`user_${state.currentUser.id}_personas`]: state.personas,
          [`user_${state.currentUser.id}_activePersona`]: state.activePersona,
          [`user_${state.currentUser.id}_sentGifts`]: state.sentGifts,
          [`user_${state.currentUser.id}_receivedGifts`]: state.receivedGifts,
          [`user_${state.currentUser.id}_usageAlerts`]: state.usageAlerts,
          [`user_${state.currentUser.id}_notifications`]: state.notifications,
          [`user_${state.currentUser.id}_autoRecharge`]: state.autoRecharge,
          [`user_${state.currentUser.id}_autoDelete`]: state.autoDelete,
          [`user_${state.currentUser.id}_streaming`]: state.streaming,
          [`user_${state.currentUser.id}_aiGrowthData`]: state.aiGrowthData,
          [`user_${state.currentUser.id}_expertiseProfiles`]: state.expertiseProfiles,
          [`user_${state.currentUser.id}_activeExpertise`]: state.activeExpertise,
          [`user_${state.currentUser.id}_pmcBalance`]: state.pmcBalance,
          [`user_${state.currentUser.id}_userPlan`]: state.userPlan,
          allGifts: state.allGifts, // 글로벌 선물 목록 저장
          polls: state.polls, // 투표는 전역 저장
          activePolls: state.activePolls,
          feedbacks: state.feedbacks,
          isAdmin: state.isAdmin,
          exchangeRateMemo: state.exchangeRateMemo,
          paymentFeeMemo: state.paymentFeeMemo,
          customDesignTheme: state.customDesignTheme,
          settings: state.settings,
          language: state.language,
        };
      },
      // 데이터 복원 시 사용자별 데이터 로드
      onRehydrateStorage: () => (state) => {
        if (state?.currentUser) {
          const userId = state.currentUser.id;
          const storage = localStorage.getItem('pick-my-ai-storage');
          
          if (storage) {
            try {
              const parsed = JSON.parse(storage);
              const persistedState = parsed.state;
              state.language = persistedState.language || 'ko';
              
              // 사용자별 데이터 복원
              state.selections = persistedState[`user_${userId}_selections`] || [];
              state.wallet = persistedState[`user_${userId}_wallet`] || null;
              state.hasFirstPurchase = persistedState[`user_${userId}_hasFirstPurchase`] || false;
              state.chatSessions = persistedState[`user_${userId}_chatSessions`] || [];
              state.currentSessionId = persistedState[`user_${userId}_currentSessionId`] || null;
              state.storedFacts = persistedState[`user_${userId}_storedFacts`] || [];
              state.themeSettings = persistedState[`user_${userId}_themeSettings`] || { mode: 'system', color: 'blue' };
              state.comparisonSessions = persistedState[`user_${userId}_comparisonSessions`] || [];
              state.chatTemplates = persistedState[`user_${userId}_chatTemplates`] || [];
              state.favoriteTemplates = persistedState[`user_${userId}_favoriteTemplates`] || [];
              state.personas = persistedState[`user_${userId}_personas`] || [];
              state.activePersona = persistedState[`user_${userId}_activePersona`] || null;
              state.allGifts = persistedState.allGifts || []; // 글로벌 선물 목록 복원
              state.sentGifts = persistedState[`user_${userId}_sentGifts`] || [];
              state.receivedGifts = persistedState[`user_${userId}_receivedGifts`] || [];
              state.usageAlerts = persistedState[`user_${userId}_usageAlerts`] || [];
              state.notifications = persistedState[`user_${userId}_notifications`] || [];
              state.autoRecharge = persistedState[`user_${userId}_autoRecharge`] || {
                enabled: false,
                threshold: 10,
                amount: 10000,
                maxMonthlyAmount: 100000,
                monthlyUsage: 0,
              };
              state.autoDelete = persistedState[`user_${userId}_autoDelete`] || {
                enabled: false,
                deleteAfterDays: 30,
                excludeStarred: true,
                excludeTemplates: true,
              };
              state.streaming = persistedState[`user_${userId}_streaming`] || {
                enabled: true,
                bufferSize: 1024,
                chunkDelay: 50,
                showTypingIndicator: true,
                smoothScrolling: true,
                errorRecovery: true,
              };
              state.aiGrowthData = persistedState[`user_${userId}_aiGrowthData`] || null;
              state.expertiseProfiles = persistedState[`user_${userId}_expertiseProfiles`] || [];
              state.activeExpertise = persistedState[`user_${userId}_activeExpertise`] || null;
              state.pmcBalance = persistedState[`user_${userId}_pmcBalance`] || { amount: 0, history: [] };
              state.userPlan = persistedState[`user_${userId}_userPlan`] || 'free';
            } catch (error) {
              console.error('Failed to restore user data:', error);
            }
          }
        }
      },
    }
  )
);
