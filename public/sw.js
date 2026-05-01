// 终极拦截：如果是本地开发环境 (localhost)，强制自杀，绝对不接管任何请求
const isLocalhost = Boolean(
  self.location.hostname === 'localhost' ||
  self.location.hostname === '[::1]' ||
  self.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

if (isLocalhost) {
  self.addEventListener('install', (event) => {
    self.skipWaiting();
  });
  self.addEventListener('activate', (event) => {
    // 物理清空所有缓存池
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            return caches.delete(cacheName);
          })
        );
      })
    );
    self.registration.unregister();
    self.clients.claim();
  });
  self.addEventListener('fetch', (event) => {
    // 本地开发绝对不拦截 fetch
    return;
  });
} else {
  const CACHE_NAME = 'gx-core-cache-v4'; // 升级版本号以强制触发安装

  // 核心的静态资源，安装时预先缓存
  const PRE_CACHED_ASSETS = [
    '/',
    '/login',
    '/manifest.webmanifest',
    '/globals.css',
    '/icon-192.png',
    '/icon-512.png'
  ];

  self.addEventListener('install', (event) => {
    // 零感知进化核心：发现新版本后立刻安装并跳过等待，强制成为激活的 worker
    self.skipWaiting();
    
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        // 容错预缓存：某一个文件 404 不会中断整个安装过程
        return Promise.allSettled(
          PRE_CACHED_ASSETS.map(url => cache.add(url).catch(err => console.warn('[GX SW] Precache failed for:', url, err)))
        );
      })
    );
  });

  // 监听来自前端 PWAUpdater 的同步信号
  self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CLEAR_CACHE') {
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          if (cacheName.includes('gx-core-cache')) {
            caches.delete(cacheName);
          }
        });
      });
    }
  });

  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[GX SW] 清除过期缓存:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    );
    self.clients.claim(); // 立即接管所有客户端页面，实现 0 毫秒拦截
  });

  self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 1. 过滤：只接管 GET 请求，且仅接管本域名的资源（绝对不能缓存 Supabase 或 Google API）
    if (event.request.method !== 'GET') return;
    if (!url.href.startsWith(self.location.origin)) return;

    // 2. 排除项：不缓存 Next.js 的图片优化和自身 API
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/image')) {
      return;
    }

    // 3. Next.js RSC 请求识别
    const isRSC = url.searchParams.has('_rsc') || event.request.headers.get('RSC') === '1';

    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(event.request);

        // Stale-While-Revalidate 核心逻辑：
        // 永远在后台发起真实网络请求去获取最新版，并静默更新到缓存中
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // 只缓存 HTTP 200 且未加密的基础响应
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch((err) => {
          console.warn('[GX SW] 物理网络断开 (Offline)', url.pathname);
          
          // 终极断网兜底：如果连缓存都没有，且用户是在请求 HTML 页面，强行抛出根目录的 HTML
          if (!cachedResponse && event.request.mode === 'navigate') {
            return cache.match('/');
          }
          
          // 如果是 JS Chunk 或 RSC 失败且无缓存，顺其自然报错，前端的 layout.tsx 嗅探器会接管
          throw err;
        });

        // 【秒开奥义】：只要缓存里有东西，瞬间扔给用户！
        // 后台的 fetchPromise 会静默执行并更新缓存，等下次用户打开时就是新版了。
        return cachedResponse || fetchPromise;
      })()
    );
  });
}
