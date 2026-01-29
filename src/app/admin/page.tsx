import { redirect } from 'next/navigation';

export default function AdminPage() {
  // 기존 /admin 경로 차단 - 보안을 위해 404로 리다이렉트
  redirect('/404');
}

