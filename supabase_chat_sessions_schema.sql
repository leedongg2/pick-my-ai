-- 채팅 세션 테이블 생성
-- 다른 기기/브라우저에서도 대화 내용을 동기화하기 위한 테이블

CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  title TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_starred BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, session_id)
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON public.chat_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_session_id ON public.chat_sessions(session_id);

-- RLS (Row Level Security) 정책 활성화
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 채팅 세션만 조회 가능
CREATE POLICY "Users can view own chat sessions"
  ON public.chat_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자는 자신의 채팅 세션만 생성 가능
CREATE POLICY "Users can create own chat sessions"
  ON public.chat_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 채팅 세션만 수정 가능
CREATE POLICY "Users can update own chat sessions"
  ON public.chat_sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 채팅 세션만 삭제 가능
CREATE POLICY "Users can delete own chat sessions"
  ON public.chat_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_chat_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_update_chat_sessions_updated_at ON public.chat_sessions;
CREATE TRIGGER trigger_update_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_sessions_updated_at();

-- 코멘트 추가
COMMENT ON TABLE public.chat_sessions IS '사용자별 채팅 세션 저장 (다중 기기 동기화)';
COMMENT ON COLUMN public.chat_sessions.id IS '채팅 세션 고유 ID';
COMMENT ON COLUMN public.chat_sessions.user_id IS '사용자 ID (users 테이블 참조)';
COMMENT ON COLUMN public.chat_sessions.session_id IS '클라이언트 세션 ID';
COMMENT ON COLUMN public.chat_sessions.title IS '채팅 세션 제목';
COMMENT ON COLUMN public.chat_sessions.messages IS '메시지 배열 (JSON 형식)';
COMMENT ON COLUMN public.chat_sessions.created_at IS '생성 시간';
COMMENT ON COLUMN public.chat_sessions.updated_at IS '마지막 수정 시간';
COMMENT ON COLUMN public.chat_sessions.is_starred IS '즐겨찾기 여부';
