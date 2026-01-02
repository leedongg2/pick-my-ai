import { AIModel, ModelSelection, PricingPolicy, PriceCalculation, PriceTier, UserPlan, PMCCalculation } from '@/types';

// 모델 가중치 (α) 매핑
const modelWeights: Record<PriceTier, number> = {
  'low': 1.0,   // 저가 모델
  'mid': 0.7,   // 중간 가격대 모델
  'high': 0.3   // 고가 모델
};

// 모델별 할인 상한 (c_i)
const discountCaps: Record<PriceTier, number> = {
  'low': 0.30,   // 저가 모델 최대 30%
  'mid': 0.25,   // 중간 가격대 모델 최대 25%
  'high': 0.15   // 고가 모델 최대 15%
};

// 플랜별 코인 지급 계수 (β)
const planCoinMultipliers: Record<string, number> = {
  'plus': 0.6,
  'pro': 0.7,
  'max': 0.8
};

// 기본 정책 설정
export const defaultPolicy: PricingPolicy = {
  margin: 1.187, // 16.7% 마진 + 2% 수수료 = 18.7%
  minTotalWon: 100,
  rounding: 'nearest10',
  // 기존 할인 정책은 더 이상 사용하지 않음
  countDiscount: {},
  seriesBonus: [],
  seriesCap: 0.30, // 최대 할인율 30% 유지
};

// 소숫점 첫째자리에서 반올림
export function roundToNearest10(amount: number): number {
  return Math.round(amount);
}

// 표시용 가격 계산 (기본 가격 * 마진 → 10원 단위 반올림)
export function getDisplayPrice(piWon: number, margin: number = 1.2): number {
  return roundToNearest10(piWon * margin);
}

// 모델의 가중치(α) 가져오기
function getModelWeight(tier: PriceTier): number {
  return modelWeights[tier] || 1.0;
}

// Step 2: 헤드라인 할인율 계산 (유저에게 보여주는 할인)
function calculateHeadlineDiscount(modelCount: number): number {
  if (modelCount <= 1) return 0;
  return Math.min(0.05 * (modelCount - 1), 0.30);
}

// Step 3: 가중 할인율 계산 (실제로 적용될 할인)
function calculateEffectiveDiscount(
  models: AIModel[],
  selections: ModelSelection[],
  headlineDiscount: number,
  subtotal: number
): number {
  if (headlineDiscount === 0 || subtotal === 0) return 0;
  
  let weightedDiscountSum = 0;
  
  selections.forEach((sel) => {
    const model = models.find((m) => m.id === sel.modelId);
    if (!model) return;
    
    const priceData = getFixedDisplayPriceOrFallback(model.id, model.piWon);
    const tier = priceData.tier;
    const alpha = modelWeights[tier] || 1.0;
    const cap = discountCaps[tier] || 0.30;
    
    // d_i = min(D_head * α_i, c_i)
    const modelDiscount = Math.min(headlineDiscount * alpha, cap);
    
    // w_i = (p_i * q_i) / S
    const modelSubtotal = priceData.price * sel.quantity;
    const weight = modelSubtotal / subtotal;
    
    // 가중 할인 누적
    weightedDiscountSum += weight * modelDiscount;
  });
  
  return weightedDiscountSum;
}

// Step 6: 코인 지급 계산
function calculateCoinReward(
  headlineDiscount: number,
  effectiveDiscount: number,
  subtotal: number,
  userPlan: string = 'plus'
): number {
  const delta = Math.max(0, headlineDiscount - effectiveDiscount);
  const beta = planCoinMultipliers[userPlan.toLowerCase()] || 0.6;
  return Math.round(delta * subtotal * beta);
}

// 가격 계산 메인 함수
export function calculatePrice(
  models: AIModel[],
  selections: ModelSelection[],
  policy: PricingPolicy = defaultPolicy,
  isFirstPurchase: boolean = false
): PriceCalculation {
  // 유효한 선택만 필터링
  const validSelections = selections.filter((sel) => sel.quantity > 0);

  if (validSelections.length === 0) {
    return {
      subtotal: 0,
      subtotalWithMargin: 0,
      discountType: 'individual',
      headlineDiscountRate: 0,
      effectiveDiscountRate: 0,
      discountRate: 0,
      discountAmount: 0,
      totalBeforeRounding: 0,
      totalAfterRounding: 0,
      finalTotal: policy.minTotalWon,
      selectedModelsCount: 0,
      isSeriesBundle: false,
      coinReward: 0,
    };
  }

  // 기준가격 계산 (S = Σ p_i * q_i)
  let subtotal = 0;
  validSelections.forEach((sel) => {
    const model = models.find((m) => m.id === sel.modelId);
    if (model) {
      const priceData = getFixedDisplayPriceOrFallback(model.id, model.piWon);
      // 모델에 티어 정보가 없으면 여기서 설정
      if (!model.tier) {
        model.tier = priceData.tier;
      }
      subtotal += priceData.price * sel.quantity;
    }
  });

  // 마진 적용 (표시용)
  const subtotalWithMargin = subtotal * policy.margin;

  // 할인 없음 - 총 결제 금액 = 상품 금액
  let discountAmount = 0;
  let discountRate = 0;

  // 할인 적용 후 금액 (할인 없으므로 동일)
  const totalBeforeRounding = subtotalWithMargin - discountAmount;

  // 반올림
  const totalAfterRounding = roundToNearest10(totalBeforeRounding);

  // 최소 금액 규칙 적용
  const finalTotal = Math.max(policy.minTotalWon, totalAfterRounding);

  return {
    subtotal,
    subtotalWithMargin,
    discountType: 'individual',
    headlineDiscountRate: 0,
    effectiveDiscountRate: 0,
    discountRate: 0,
    discountAmount: 0,
    totalBeforeRounding,
    totalAfterRounding,
    finalTotal,
    selectedModelsCount: validSelections.length,
    isSeriesBundle: false,
    coinReward: 0,
  };
}

// 포맷 유틸리티
export function formatWon(amount: number): string {
  // 소수점 아래 숫자가 있는 경우에만 반올림
  const rounded = amount % 1 === 0 ? amount : Math.round(amount * 100) / 100;
  return rounded.toLocaleString('ko-KR') + '원';
}

export function formatPercent(rate: number): string {
  return (rate * 100).toFixed(0) + '%';
}

// 모델 데이터 (가격 및 티어 정보)
interface ModelData {
  price: number;
  tier: PriceTier;
}

// 모델별 고정 가격 및 티어 정보 (요청 사양 기준, 단위: 원)
const modelData: Record<string, ModelData> = {
  // GPT 계열
  'gpt5': { price: 7, tier: 'low' },
  'gpt51': { price: 8, tier: 'low' },
  'gpt4o': { price: 10, tier: 'mid' },
  'gpt41': { price: 7, tier: 'low' },
  'o3': { price: 7, tier: 'low' },
  'o3mini': { price: 4, tier: 'low' },
  'o4mini': { price: 1, tier: 'low' },
  // Claude 계열
  'haiku35': { price: 7, tier: 'low' },
  'sonnet45': { price: 30, tier: 'mid' },
  'opus4': { price: 130, tier: 'high' },
  'opus41': { price: 145, tier: 'high' },
  'opus45': { price: 155, tier: 'high' },
  // Gemini 계열
  'gemini3': { price: 8, tier: 'low' },
  'gemini3pro': { price: 35, tier: 'mid' },
  // Perplexity 계열
  'sonar': { price: 3, tier: 'low' },
  'sonarPro': { price: 30, tier: 'mid' },
  'deepResearch': { price: 16, tier: 'mid' },
  // Coding
  'codex': { price: 7, tier: 'low' },
  'gpt5codex': { price: 7, tier: 'low' },
  'gpt51codex': { price: 8, tier: 'low' },
  // Image
  'gptimage1': { price: 4, tier: 'low' },
  // Alias 호환 (표기 변형 대비)
  'claude_opus_41': { price: 145, tier: 'high' },
};

// 이전 버전과의 호환성을 위한 가격 매핑
const fixedDisplayPriceWon: Record<string, number> = Object.entries(modelData).reduce((acc, [key, data]) => {
  acc[key] = data.price;
  return acc;
}, {} as Record<string, number>);

// 모델 ID를 받아 고정 표시가(원)와 티어 정보를 반환
export function getFixedDisplayPriceOrFallback(modelId: string, piWon: number): { price: number; tier: PriceTier } {
  const data = modelData[modelId];
  if (data) {
    return { price: data.price, tier: data.tier };
  }
  return { 
    price: getDisplayPrice(piWon),
    tier: 'low' // 기본값은 low로 설정
  };
}

// ==================== PMC (Pick-My-Coin) 시스템 ====================

// 플랜별 추가 적립률
const planBonusRates: Record<UserPlan, number> = {
  'free': 0.00,  // +0%
  'plus': 0.02,  // +2%
  'pro': 0.05,   // +5%
  'max': 0.07,   // +7%
};

// 고가 모델 적립률 상한 (티어별) - 모든 티어 30% 캡 적용
const tierMaxRates: Record<PriceTier, number> = {
  'low': 0.30,   // 저가 모델: 최대 30%
  'mid': 0.30,   // 중간가 모델: 최대 30%
  'high': 0.30,  // 고가 모델: 최대 30%
};

// PMC 사용 한도 (결제 금액의 30%)
const PMC_USE_LIMIT_RATE = 0.30;

// PMC 1회 최대 사용 금액 (10,000원)
const PMC_MAX_USE_AMOUNT = 10000;

// PMC 유효기간 (90일)
export const PMC_EXPIRY_DAYS = 90;

/**
 * PMC 기본 적립률 계산 (모델 개수 기반)
 * 1개: 0%, 2개: 5%, 3개: 10%, 4개: 15%, 5개: 20%, 6개: 25%, 7개 이상: 30% (캡)
 */
export function calculateBaseEarnRate(modelCount: number): number {
  if (modelCount <= 1) return 0;
  if (modelCount === 2) return 0.05;
  if (modelCount === 3) return 0.10;
  if (modelCount === 4) return 0.15;
  if (modelCount === 5) return 0.20;
  if (modelCount === 6) return 0.25;
  return 0.30; // 7개 이상은 30% 캡
}

/**
 * 플랜별 추가 적립률 반환
 */
export function getPlanBonusRate(plan: UserPlan): number {
  return planBonusRates[plan] || 0;
}

/**
 * 고가 모델 보호장치 - 티어별 적립률 상한 적용
 * 장바구니 전체의 가중 평균 적립률 계산
 */
export function calculateWeightedEarnRate(
  models: AIModel[],
  selections: ModelSelection[],
  baseRate: number,
  totalAmount: number
): number {
  if (totalAmount === 0) return 0;
  
  let weightedRateSum = 0;
  
  selections.forEach((sel) => {
    if (sel.quantity <= 0) return;
    
    const model = models.find((m) => m.id === sel.modelId);
    if (!model) return;
    
    const priceData = getFixedDisplayPriceOrFallback(model.id, model.piWon);
    const tier = priceData.tier;
    const modelAmount = priceData.price * sel.quantity;
    
    // 해당 모델의 적립률 상한 적용
    const cappedRate = Math.min(baseRate, tierMaxRates[tier]);
    
    // 가중치 (해당 모델 금액 / 전체 금액)
    const weight = modelAmount / totalAmount;
    
    weightedRateSum += weight * cappedRate;
  });
  
  return weightedRateSum;
}

/**
 * PMC 적립 계산 메인 함수
 */
export function calculatePMCEarn(
  models: AIModel[],
  selections: ModelSelection[],
  paymentAmount: number,
  userPlan: UserPlan = 'free'
): PMCCalculation {
  // 유효한 선택만 필터링
  const validSelections = selections.filter((sel) => sel.quantity > 0);
  const modelCount = validSelections.length;
  
  // 기본 적립률 (모델 개수 기반)
  const baseRate = calculateBaseEarnRate(modelCount);
  
  // 플랜 보너스
  const planBonusRate = getPlanBonusRate(userPlan);
  
  // 고가 모델 보호장치 적용된 가중 적립률
  const weightedBaseRate = calculateWeightedEarnRate(
    models,
    validSelections,
    baseRate,
    paymentAmount
  );
  
  // 최종 적립률 = min(가중 기본 적립률 + 플랜 보너스, 30% 캡)
  const totalRate = Math.min(weightedBaseRate + planBonusRate, 0.30);
  
  // 적립될 PMC (소수점 버림)
  const earnAmount = Math.floor(paymentAmount * totalRate);
  
  // 사용 가능한 최대 PMC (결제금액의 30% 또는 20,000원 중 작은 값)
  const maxUsable = Math.min(
    Math.floor(paymentAmount * PMC_USE_LIMIT_RATE),
    PMC_MAX_USE_AMOUNT
  );
  
  return {
    baseRate: weightedBaseRate,
    planBonusRate,
    totalRate,
    earnAmount,
    maxUsable,
  };
}

/**
 * PMC 만료일 계산
 */
export function getPMCExpiryDate(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + PMC_EXPIRY_DAYS);
  return expiry;
}

