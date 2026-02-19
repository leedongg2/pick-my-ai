-- batch_requests 테이블 생성
CREATE TABLE IF NOT EXISTS batch_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  messages JSONB NOT NULL,
  language TEXT DEFAULT 'ko',
  speech_level TEXT DEFAULT 'formal',
  status TEXT NOT NULL DEFAULT 'pending', -- pending | processing | completed | failed
  openai_batch_id TEXT,
  anthropic_batch_id TEXT,
  result TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_batch_requests_user_id ON batch_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_batch_requests_status ON batch_requests(status);
CREATE INDEX IF NOT EXISTS idx_batch_requests_session_message ON batch_requests(session_id, message_id);
CREATE INDEX IF NOT EXISTS idx_batch_requests_openai_batch_id ON batch_requests(openai_batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_requests_anthropic_batch_id ON batch_requests(anthropic_batch_id);
