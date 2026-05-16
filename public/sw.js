// 终极拦截：如果是本地开发环境 (localhost)，强制自杀，绝对不接管任何请求
const isLocalhost = Boolean(
  self.location.hostname === 'localhost' ||
  self.location.hostname === '[::1]' ||
  self.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

// 终极拦截：如果是 Capacitor 远程套壳域名，强制自杀
const isCapacitorRemote = self.location.hostname === 'fx-rapallo.vercel.app';

if (isLocalhost || isCapacitorRemote) {
  self.addEventListener('install', (event) => {
    self.skipWaiting();
  });
  self.addEventListener('activate', (event) => {
    // 物理清空所有缓存池
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
    self.registration.unregister();
    self.clients.claim();
  });
  self.addEventListener('fetch', () => {
    // 本地开发绝对不拦截 fetch
    return;
  });
} else {
  // 升级版本号 v5，强制所有设备废弃旧的僵尸缓存并应用新规则
  const CACHE_NAME = 'gx-core-cache-v5';

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
              console.log('[GX SW] 斩杀旧版缓存:', cacheName);
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

    // 2. 绝对真空区：Next.js RSC, API, Data 必须物理穿透，绝对禁止碰触 caches
    const isRSC = url.searchParams.has('_rsc') || event.request.headers.get('RSC') === '1';
    const isNextData = url.pathname.startsWith('/_next/data/');
    const isApi = url.pathname.startsWith('/api/');

    if (isRSC || isNextData || isApi) {
      // 物理级穿透：强行注入 no-store，撕裂套壳 WebView 的底层原生缓存黑洞
      event.respondWith(
        fetch(event.request, { cache: 'no-store' }).catch(() => {
          // 兼容性兜底：如果老旧内核不支持 Request 覆写，退回普通 fetch
          return fetch(event.request);
        })
      );
      return; // 彻底阻断，不往下执行
    }

    // Next.js 自带的图片优化，直接放行
    if (url.pathname.startsWith('/_next/image')) {
      return;
    }

    // 3. 导航请求 (HTML) 倒置策略：Network First (网络优先)
    // 彻底解决退出账号白屏、以及死锁旧 HTML 的元凶
    const isNavigate = event.request.mode === 'navigate';
    if (isNavigate) {
      event.respondWith(
        (async () => {
          try {
            // 永远去网络拿最新的 HTML，保证入口指针和 Cookie 状态最新
            const networkResponse = await fetch(event.request);
            if (networkResponse && networkResponse.status === 200) {
              const cache = await caches.open(CACHE_NAME);
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            }
            throw new Error('Network HTML non-200');
          } catch (err) {
            console.warn('[GX SW] 导航断网，降级使用离线 HTML:', url.pathname);
            const cache = await caches.open(CACHE_NAME);
            const cachedResponse = await cache.match(event.request);
            if (cachedResponse) return cachedResponse;
            // 终极兜底
            return cache.match('/');
          }
        })()
      );
      return;
    }

    // 4. 静态资产 (JS, CSS, 字体, 图片等)：Stale-While-Revalidate 保障秒开
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(event.request);

        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // 静态资源后台刷新失败，无视即可
        });

        // 核心奥义：只要缓存里有静态文件，瞬间扔给用户，后台静默更新
        return cachedResponse || fetchPromise;
      })()
    );
  });
}
