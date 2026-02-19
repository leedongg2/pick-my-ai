// Pick-My-AI Service Worker
// 전략: 정적 자산 Cache-First, API는 Network-First with 캐시 폴백
const CACHE_VERSION = 'pma-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;

// 캐시할 정적 자산
const STATIC_ASSETS = [
  '/',
  '/login',
  '/guide',
  '/icon.svg',
];

// 캐시할 API 엔드포인트 (GET 전용, 짧은 TTL)
const CACHEABLE_APIS = [
  '/api/auth/session',
];

const API_CACHE_TTL = 60 * 1000; // 1분

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('pma-') && key !== STATIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 다른 오리진 요청은 패스스루
  if (url.origin !== self.location.origin) return;

  // POST/PUT/DELETE 등 변경 요청은 패스스루
  if (request.method !== 'GET') return;

  // _next/static: Cache-First (불변 자산, 1년 캐시)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // API 세션 엔드포인트: Network-First with 단기 캐시
  if (CACHEABLE_APIS.some((api) => url.pathname.startsWith(api))) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            const clone = response.clone();
            // TTL 메타데이터 헤더 추가
            const headers = new Headers(clone.headers);
            headers.set('x-sw-cached-at', Date.now().toString());
            const body = await clone.arrayBuffer();
            const cachedResponse = new Response(body, {
              status: clone.status,
              statusText: clone.statusText,
              headers,
            });
            cache.put(request, cachedResponse);
          }
          return response;
        } catch {
          // 네트워크 실패 시 캐시 폴백
          const cached = await cache.match(request);
          if (cached) {
            const cachedAt = parseInt(cached.headers.get('x-sw-cached-at') || '0');
            if (Date.now() - cachedAt < API_CACHE_TTL) return cached;
          }
          throw new Error('Network error and no valid cache');
        }
      })
    );
    return;
  }

  // 페이지 요청: Network-First (항상 최신 HTML)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }
});

// 로그아웃 시 세션 캐시 삭제
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CLEAR_SESSION_CACHE') {
    caches.open(API_CACHE).then((cache) => {
      cache.delete('/api/auth/session');
    });
  }
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
