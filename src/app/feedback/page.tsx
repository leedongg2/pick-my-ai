'use client';

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useStore } from '@/store';
import { toast } from 'sonner';

export default function FeedbackPage() {
  const [type, setType] = useState<'question' | 'suggestion' | 'bug' | 'roast'>('question');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const { submitFeedback } = useStore();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    try {
      const ok = await submitFeedback({ type, title, content, screenshots });
      if (!ok) {
        toast.error('로그인이 필요합니다.');
        return;
      }
      setSent(true);
      setTitle('');
      setContent('');
      setScreenshots([]);
      
      // 개발자 욕하기 선택 시 특별 메시지
      if (type === 'roast') {
        const roastMessages = [
          '개발자가 눈물을 흘리며 읽었습니다... 😭',
          '개발자: "죄송합니다... 더 열심히 하겠습니다..." 🙇',
          '개발자가 반성문을 쓰고 있습니다... 📝',
          '개발자: "제가 잘못했습니다... 용서해주세요..." 🥺',
          '개발자가 코드를 다시 보고 있습니다... 💻',
        ];
        const randomMessage = roastMessages[Math.floor(Math.random() * roastMessages.length)];
        toast.success(randomMessage);
      } else {
        toast.success('의견이 접수되었습니다. 감사합니다!');
      }
    } finally {
      setIsSending(false);
    }
  }, [type, title, content, screenshots, submitFeedback]);

  const addFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const items = Array.from(files).slice(0, 5 - screenshots.length);
    const toDataUrl = (file: File) => new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
    const newShots: string[] = [];
    for (const f of items) {
      if (!f.type.startsWith('image/')) continue;
      const url = await toDataUrl(f);
      newShots.push(url);
    }
    setScreenshots(prev => [...prev, ...newShots]);
  }, [screenshots.length]);

  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setType(e.target.value as any);
  }, []);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  }, []);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
  }, [addFiles]);

  const handleFileClick = useCallback(() => {
    fileRef.current?.click();
  }, []);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">의견 보내기</h1>
            <p className="text-gray-600 text-sm">제품 관련 문의, 개선 제안, 버그 제보를 남겨주세요.</p>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-6">
              {sent && (
                <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-sm font-medium text-green-800">
                    감사합니다! 의견이 접수되었습니다.
                  </p>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">종류</label>
                  <select
                    value={type}
                    onChange={handleTypeChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="question">고객 문의</option>
                    <option value="suggestion">의견/개선 제안</option>
                    <option value="bug">버그 제보</option>
                    <option value="roast">개발자 욕하기</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">제목</label>
                  <input
                    value={title}
                    onChange={handleTitleChange}
                    placeholder="제목을 입력하세요"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">내용</label>
                  <textarea
                    value={content}
                    onChange={handleContentChange}
                    placeholder="자세한 내용을 입력하세요"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[140px] resize-none"
                    maxLength={900}
                    required
                  />
                </div>

                {/* 스크린샷 업로드 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">스크린샷 (최대 5개)</label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="flex flex-wrap gap-3">
                    {screenshots.map((src, idx) => (
                      <div key={idx} className="w-20 h-20 border border-gray-300 rounded-lg overflow-hidden relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`screenshot-${idx}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setScreenshots(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded hover:bg-black/70 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {screenshots.length < 5 && (
                      <button
                        type="button"
                        onClick={handleFileClick}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        스크린샷 추가
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSending}
                    className="px-6 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {isSending ? '전송 중...' : '보내기'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}



