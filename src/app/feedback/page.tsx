'use client';

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useStore } from '@/store';
import { toast } from 'sonner';
import { useTranslation } from '@/utils/translations';

export default function FeedbackPage() {
  const [type, setType] = useState<'question' | 'suggestion' | 'bug' | 'roast'>('question');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const { submitFeedback } = useStore();
  const { t } = useTranslation();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    try {
      const ok = await submitFeedback({ type, title, content, screenshots });
      if (!ok) {
        toast.error(t.feedback.loginRequired);
        return;
      }
      setSent(true);
      setTitle('');
      setContent('');
      setScreenshots([]);
      
      // 개발자 욕하기 선택 시 특별 메시지
      if (type === 'roast') {
        const randomMessage = t.feedback.roastMessages[Math.floor(Math.random() * t.feedback.roastMessages.length)];
        toast.success(randomMessage);
      } else {
        toast.success(t.feedback.feedbackReceived);
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
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{t.feedback.title}</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">{t.feedback.subtitle}</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              {sent && (
                <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-sm font-medium text-green-800">
                    {t.feedback.successMessage}
                  </p>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.feedback.type}</label>
                  <select
                    value={type}
                    onChange={handleTypeChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="question">{t.feedback.typeQuestion}</option>
                    <option value="suggestion">{t.feedback.typeSuggestion}</option>
                    <option value="bug">{t.feedback.typeBug}</option>
                    <option value="roast">{t.feedback.typeRoast}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.feedback.titleLabel}</label>
                  <input
                    value={title}
                    onChange={handleTitleChange}
                    placeholder={t.feedback.titlePlaceholder}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.feedback.content}</label>
                  <textarea
                    value={content}
                    onChange={handleContentChange}
                    placeholder={t.feedback.contentPlaceholder}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[140px] resize-none"
                    maxLength={900}
                    required
                  />
                </div>

                {/* 스크린샷 업로드 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.feedback.screenshots}</label>
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
                        {t.feedback.addScreenshot}
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
                    {isSending ? t.feedback.sending : t.feedback.submit}
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



