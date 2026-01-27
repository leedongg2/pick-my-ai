// AI 응답에서 ~~로 둘러싸인 요약 추출

const SUMMARY_START = '~~';
const SUMMARY_END = '~~';

export interface ConversationSummary {
  userQuestion: string;
  myResponse: string;
  previousModels: string;
  fullSummary: string;
}

export function extractSummary(text: string): { displayText: string; summary: ConversationSummary | null } {
  if (!text) {
    return { displayText: text, summary: null };
  }

  const startIndex = text.indexOf(SUMMARY_START);
  if (startIndex === -1) {
    return { displayText: text, summary: null };
  }

  const afterStart = text.slice(startIndex + SUMMARY_START.length);
  const endIndex = afterStart.indexOf(SUMMARY_END);
  
  if (endIndex === -1) {
    return { displayText: text, summary: null };
  }

  const summaryContent = afterStart.slice(0, endIndex).trim();
  const displayText = text.slice(0, startIndex).trim();

  // 요약 파싱 (새 형식: Q:, A:, Prev:)
  const lines = summaryContent.split('\n').map(l => l.trim()).filter(Boolean);
  const summary: ConversationSummary = {
    userQuestion: '',
    myResponse: '',
    previousModels: '',
    fullSummary: summaryContent
  };

  for (const line of lines) {
    if (line.startsWith('Q:')) {
      summary.userQuestion = line.replace('Q:', '').trim();
    } else if (line.startsWith('A:')) {
      summary.myResponse = line.replace('A:', '').trim();
    } else if (line.startsWith('Prev:')) {
      summary.previousModels = line.replace('Prev:', '').trim();
    }
    // 구 형식도 지원 (하위 호환성)
    else if (line.startsWith('User Question Summary:')) {
      summary.userQuestion = line.replace('User Question Summary:', '').trim();
    } else if (line.startsWith('My Response Summary:')) {
      summary.myResponse = line.replace('My Response Summary:', '').trim();
    } else if (line.startsWith('Previous Models Summary:')) {
      summary.previousModels = line.replace('Previous Models Summary:', '').trim();
    }
  }

  return { displayText, summary };
}

export function buildConversationContext(summaries: ConversationSummary[]): string {
  if (!summaries || summaries.length === 0) {
    return '';
  }

  const parts: string[] = [];
  
  for (let i = 0; i < summaries.length; i++) {
    const s = summaries[i];
    parts.push(`Turn ${i + 1}:`);
    parts.push(`User: ${s.userQuestion}`);
    parts.push(`Assistant: ${s.myResponse}`);
    if (s.previousModels && s.previousModels !== 'None') {
      parts.push(`Previous: ${s.previousModels}`);
    }
  }

  return parts.join('\n');
}
