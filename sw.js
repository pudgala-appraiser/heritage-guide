// 감정 현장 다국어 안내 — 오프라인 실행용 서비스 워커
// 온라인: 항상 서버의 최신본을 먼저 받는다 (배포 갱신이 곧바로 반영됨).
// 오프라인·응답 지연(3초): 기기에 보관해 둔 마지막 판을 쓴다.
// 앱 파일 구성이 바뀌면 아래 CACHE 이름의 숫자를 하나 올린다.
const CACHE = 'heritage-guide-1';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: true });
    const fresh = fetch(req).then(res => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    });
    if (!cached) return fresh;                       // 보관본이 없으면 네트워크뿐
    const timeout = new Promise(resolve => setTimeout(() => resolve(null), 3000));
    try {
      const res = await Promise.race([fresh, timeout]);
      if (res && res.ok) return res;
    } catch (e) { /* 오프라인 */ }
    fresh.catch(() => {});                            // 늦게 실패해도 조용히
    return cached;
  })());
});
