// PMC 공식 4 (Bonus) 테스트 스크립트

// 모델 가격 데이터
const modelPrices = {
  'sonar': 1,
  'o4mini': 1,
  'o3mini': 4,
  'haiku35': 4,
  'o3': 7,
  'gpt41': 8,
  'gemini3': 8,
  'deepResearch': 8,
  'gpt5': 9,
  'gpt51': 9,
  'gpt4o': 10,
  'codex': 12,
  'gpt5codex': 12,
  'gpt52': 14,
  'sonarPro': 15,
  'sonnet45': 18,
  'gemini3pro': 35,
  'gptimage1': 40,
  'opus45': 60,
  'opus41': 75,
};

// 플랜별 보너스
const planBonus = {
  'free': 0,
  'plus': 0.02,
  'pro': 0.05,
  'max': 0.07,
};

// 기본 적립률 계산
function calculateBaseRate(totalQuantity) {
  if (totalQuantity < 20) return 0;
  return Math.min(0.05 * (totalQuantity - 19), 0.30);
}

// PMC 계산 (공식 4 - Bonus)
function calculatePMC(cart, userPlan) {
  // Step 1: 총 수량 및 금액 계산
  let totalAmount = 0;
  let totalQuantity = 0;
  
  cart.forEach(item => {
    const price = modelPrices[item.model];
    const amount = price * item.quantity;
    totalAmount += amount;
    totalQuantity += item.quantity;
  });
  
  // Step 2: 기본 적립률
  const baseRate = calculateBaseRate(totalQuantity);
  
  // Step 3: 플랜 보너스 (20 이상만)
  const bonus = totalQuantity >= 20 ? planBonus[userPlan] : 0;
  
  // Step 4: 총 적립률
  const totalRate = Math.min(baseRate + bonus, 0.30);
  
  // Step 5: 기본 PMC
  const basePMC = totalAmount * totalRate;
  
  // Step 6: 추가 보너스 (100원당 1 PMC)
  const bonusPMC = Math.floor(totalAmount / 100);
  
  // Step 7: 최종 PMC
  const totalPMC = Math.floor(basePMC + bonusPMC);
  
  return {
    totalAmount,
    totalQuantity,
    baseRate,
    planBonus: bonus,
    totalRate,
    basePMC: Math.floor(basePMC),
    bonusPMC,
    totalPMC,
  };
}

console.log('='.repeat(80));
console.log('PMC 공식 4 (Bonus) 테스트');
console.log('='.repeat(80));

// 테스트 케이스 1: 경계선 (수량 19 - 적립 없음)
console.log('\n📌 테스트 1: Sonar × 19 (Free)');
const test1 = calculatePMC([{ model: 'sonar', quantity: 19 }], 'free');
console.log(`총액: ${test1.totalAmount}원, 수량: ${test1.totalQuantity}`);
console.log(`기본 적립률: ${(test1.baseRate * 100).toFixed(0)}%, 플랜: ${(test1.planBonus * 100).toFixed(0)}%, 총: ${(test1.totalRate * 100).toFixed(0)}%`);
console.log(`기본 PMC: ${test1.basePMC}, 보너스: ${test1.bonusPMC}`);
console.log(`✅ 최종 PMC: ${test1.totalPMC} PMC`);

// 테스트 케이스 2: 경계선 (수량 20 - 적립 시작)
console.log('\n📌 테스트 2: Sonar × 20 (Free, 5%)');
const test2 = calculatePMC([{ model: 'sonar', quantity: 20 }], 'free');
console.log(`총액: ${test2.totalAmount}원, 수량: ${test2.totalQuantity}`);
console.log(`기본 적립률: ${(test2.baseRate * 100).toFixed(0)}%, 플랜: ${(test2.planBonus * 100).toFixed(0)}%, 총: ${(test2.totalRate * 100).toFixed(0)}%`);
console.log(`기본 PMC: ${test2.basePMC}, 보너스: ${test2.bonusPMC}`);
console.log(`✅ 최종 PMC: ${test2.totalPMC} PMC`);

// 테스트 케이스 3: Plus 플랜 (수량 20, 7%)
console.log('\n📌 테스트 3: Sonar × 20 (Plus, 7%)');
const test3 = calculatePMC([{ model: 'sonar', quantity: 20 }], 'plus');
console.log(`총액: ${test3.totalAmount}원, 수량: ${test3.totalQuantity}`);
console.log(`기본 적립률: ${(test3.baseRate * 100).toFixed(0)}%, 플랜: ${(test3.planBonus * 100).toFixed(0)}%, 총: ${(test3.totalRate * 100).toFixed(0)}%`);
console.log(`기본 PMC: ${test3.basePMC}, 보너스: ${test3.bonusPMC}`);
console.log(`✅ 최종 PMC: ${test3.totalPMC} PMC`);

// 테스트 케이스 4: 고가 모델 (Opus 4.5 × 20, Free)
console.log('\n📌 테스트 4: Opus 4.5 × 20 (1,200원, Free, 5%)');
const test4 = calculatePMC([{ model: 'opus45', quantity: 20 }], 'free');
console.log(`총액: ${test4.totalAmount}원, 수량: ${test4.totalQuantity}`);
console.log(`기본 적립률: ${(test4.baseRate * 100).toFixed(0)}%, 플랜: ${(test4.planBonus * 100).toFixed(0)}%, 총: ${(test4.totalRate * 100).toFixed(0)}%`);
console.log(`기본 PMC: ${test4.basePMC}, 보너스: ${test4.bonusPMC} ⭐ (100원당 1 PMC)`);
console.log(`✅ 최종 PMC: ${test4.totalPMC} PMC (보너스 덕분에 12 PMC 추가!)`);

// 테스트 케이스 5: 고가 모델 + Plus 플랜
console.log('\n📌 테스트 5: Opus 4.5 × 20 (1,200원, Plus, 7%)');
const test5 = calculatePMC([{ model: 'opus45', quantity: 20 }], 'plus');
console.log(`총액: ${test5.totalAmount}원, 수량: ${test5.totalQuantity}`);
console.log(`기본 적립률: ${(test5.baseRate * 100).toFixed(0)}%, 플랜: ${(test5.planBonus * 100).toFixed(0)}%, 총: ${(test5.totalRate * 100).toFixed(0)}%`);
console.log(`기본 PMC: ${test5.basePMC}, 보너스: ${test5.bonusPMC}`);
console.log(`✅ 최종 PMC: ${test5.totalPMC} PMC`);

// 테스트 케이스 6: 최대 적립률 (수량 25+)
console.log('\n📌 테스트 6: GPT-4o × 25 (250원, Plus, 30%)');
const test6 = calculatePMC([{ model: 'gpt4o', quantity: 25 }], 'plus');
console.log(`총액: ${test6.totalAmount}원, 수량: ${test6.totalQuantity}`);
console.log(`기본 적립률: ${(test6.baseRate * 100).toFixed(0)}%, 플랜: ${(test6.planBonus * 100).toFixed(0)}%, 총: ${(test6.totalRate * 100).toFixed(0)}%`);
console.log(`기본 PMC: ${test6.basePMC}, 보너스: ${test6.bonusPMC}`);
console.log(`✅ 최종 PMC: ${test6.totalPMC} PMC`);

// 테스트 케이스 7: 대량 저가 모델 (악용 케이스)
console.log('\n📌 테스트 7: Sonar × 100 (100원, Free, 30%)');
const test7 = calculatePMC([{ model: 'sonar', quantity: 100 }], 'free');
console.log(`총액: ${test7.totalAmount}원, 수량: ${test7.totalQuantity}`);
console.log(`기본 적립률: ${(test7.baseRate * 100).toFixed(0)}%, 플랜: ${(test7.planBonus * 100).toFixed(0)}%, 총: ${(test7.totalRate * 100).toFixed(0)}%`);
console.log(`기본 PMC: ${test7.basePMC}, 보너스: ${test7.bonusPMC}`);
console.log(`✅ 최종 PMC: ${test7.totalPMC} PMC`);

// 테스트 케이스 8: VIP 시나리오
console.log('\n📌 테스트 8: Opus 4.5 × 50 (3,000원, Max, 30%)');
const test8 = calculatePMC([{ model: 'opus45', quantity: 50 }], 'max');
console.log(`총액: ${test8.totalAmount}원, 수량: ${test8.totalQuantity}`);
console.log(`기본 적립률: ${(test8.baseRate * 100).toFixed(0)}%, 플랜: ${(test8.planBonus * 100).toFixed(0)}%, 총: ${(test8.totalRate * 100).toFixed(0)}%`);
console.log(`기본 PMC: ${test8.basePMC}, 보너스: ${test8.bonusPMC} ⭐⭐ (30 PMC 추가!)`);
console.log(`✅ 최종 PMC: ${test8.totalPMC} PMC`);

// 테스트 케이스 9: 혼합 (저가 + 고가)
console.log('\n📌 테스트 9: Sonar × 20 + Opus 4.5 × 1 (80원, Plus, 10%)');
const test9 = calculatePMC([
  { model: 'sonar', quantity: 20 },
  { model: 'opus45', quantity: 1 }
], 'plus');
console.log(`총액: ${test9.totalAmount}원, 수량: ${test9.totalQuantity}`);
console.log(`기본 적립률: ${(test9.baseRate * 100).toFixed(0)}%, 플랜: ${(test9.planBonus * 100).toFixed(0)}%, 총: ${(test9.totalRate * 100).toFixed(0)}%`);
console.log(`기본 PMC: ${test9.basePMC}, 보너스: ${test9.bonusPMC}`);
console.log(`✅ 최종 PMC: ${test9.totalPMC} PMC`);

// 테스트 케이스 10: 1,000원 결제 예시
console.log('\n📌 테스트 10: GPT-5.1 × 25 + Sonnet 4.5 × 20 (585원, Pro, 30%)');
const test10 = calculatePMC([
  { model: 'gpt51', quantity: 25 },
  { model: 'sonnet45', quantity: 20 }
], 'pro');
console.log(`총액: ${test10.totalAmount}원, 수량: ${test10.totalQuantity}`);
console.log(`기본 적립률: ${(test10.baseRate * 100).toFixed(0)}%, 플랜: ${(test10.planBonus * 100).toFixed(0)}%, 총: ${(test10.totalRate * 100).toFixed(0)}%`);
console.log(`기본 PMC: ${test10.basePMC}, 보너스: ${test10.bonusPMC}`);
console.log(`✅ 최종 PMC: ${test10.totalPMC} PMC`);

console.log('\n' + '='.repeat(80));
console.log('📊 공식 4 (Bonus) 특징 요약');
console.log('='.repeat(80));
console.log('✅ 기본 적립: 결제금액 × 적립률');
console.log('✅ 추가 보너스: 100원당 1 PMC');
console.log('✅ 고액 결제 시 유리: 1,000원 = 10 PMC 추가, 3,000원 = 30 PMC 추가');
console.log('✅ 사용자 심리: "더 많이 쓸수록 더 많이 받는다" 느낌');
console.log('✅ 플랫폼 이득: 고액 결제 유도, 단순한 공식으로 이해 쉬움');
console.log('='.repeat(80));
