const CACHE_PREFIX = 'quizziando-offline-';
const STAGING_PREFIX = 'quizziando-staging-';
const MANIFEST_PATH = '/offline-manifest.json';
const READY_PATH = '/offline-ready.json';

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

async function readyCache() {
  const names = (await caches.keys()).filter(name => name.startsWith(CACHE_PREFIX));
  for (const name of names.reverse()) {
    const cache = await caches.open(name);
    if (await cache.match(READY_PATH)) return { name, cache };
  }
  return null;
}

function validateManifest(manifest) {
  if (!manifest || typeof manifest.build !== 'string' || !/^[a-f0-9]{20}$/.test(manifest.build) ||
    !Array.isArray(manifest.files) || manifest.files.length === 0 || manifest.files.length > 500 ||
    !manifest.files.includes('/index.html') || !manifest.files.includes('/sql-wasm.wasm') ||
    manifest.files.some(path => typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || path.includes('..'))) {
    throw new Error('O manifesto de arquivos offline é inválido.');
  }
  return manifest;
}

async function fetchManifest() {
  const response = await fetch(MANIFEST_PATH, { cache: 'no-store' });
  if (!response.ok) throw new Error('Não foi possível baixar o manifesto offline.');
  return validateManifest(await response.json());
}

async function checkStatus(online) {
  const existing = await readyCache();
  let manifest;
  if (online) {
    try { manifest = await fetchManifest(); } catch { /* keep the last verified build */ }
  }
  if (!manifest && existing) {
    const response = await existing.cache.match(MANIFEST_PATH);
    if (response) manifest = validateManifest(await response.json());
  }
  if (!manifest) return { ready: false, cached: 0, total: 0, reason: 'Arquivos do aplicativo ainda não foram preparados.' };
  const cache = await caches.open(`${CACHE_PREFIX}${manifest.build}`);
  let cached = 0;
  for (const path of manifest.files) if (await cache.match(path)) cached++;
  return {
    ready: cached === manifest.files.length && Boolean(await cache.match(READY_PATH)),
    cached, total: manifest.files.length,
    reason: cached === manifest.files.length ? '' : 'Uma nova versão do aplicativo precisa ser preparada.',
  };
}

async function prepare(online) {
  if (!online) return checkStatus(false);
  const manifest = await fetchManifest();
  const cacheName = `${CACHE_PREFIX}${manifest.build}`;
  const current = await caches.open(cacheName);
  if (await current.match(READY_PATH) && (await checkStatus(true)).ready) return checkStatus(true);

  const stagingName = `${STAGING_PREFIX}${manifest.build}-${Date.now()}`;
  const staging = await caches.open(stagingName);
  try {
    for (const path of manifest.files) {
      const response = await fetch(path, { cache: 'reload' });
      if (!response.ok) throw new Error(`Falha ao baixar ${path}.`);
      await staging.put(path, response);
    }
    await staging.put(MANIFEST_PATH, new Response(JSON.stringify(manifest), { headers: { 'Content-Type': 'application/json' } }));
    const finalCache = await caches.open(cacheName);
    for (const path of [...manifest.files, MANIFEST_PATH]) {
      const response = await staging.match(path);
      if (!response) throw new Error(`Arquivo ausente no cache: ${path}.`);
      await finalCache.put(path, response);
    }
    await finalCache.put(READY_PATH, new Response(manifest.build));
    for (const name of await caches.keys()) {
      if (name.startsWith(CACHE_PREFIX) && name !== cacheName) await caches.delete(name);
    }
    return checkStatus(false);
  } finally {
    await caches.delete(stagingName);
  }
}

self.addEventListener('message', event => {
  const { type, online } = event.data || {};
  if (type !== 'OFFLINE_STATUS' && type !== 'OFFLINE_PREPARE') return;
  event.waitUntil((async () => {
    try {
      const result = type === 'OFFLINE_PREPARE' ? await prepare(online) : await checkStatus(online);
      event.ports[0]?.postMessage(result);
    } catch (error) {
      event.ports[0]?.postMessage({ ready: false, cached: 0, total: 0,
        reason: error instanceof Error ? error.message : 'Falha ao preparar o aplicativo.' });
    }
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin ||
    request.cache === 'reload' || request.cache === 'no-store' ||
    url.pathname === MANIFEST_PATH || url.pathname === '/offline-sw.js') return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) return response;
      } catch { /* use the prepared app shell */ }
      const prepared = await readyCache();
      return await prepared?.cache.match('/index.html') || Response.error();
    })());
    return;
  }

  event.respondWith((async () => {
    const prepared = await readyCache();
    const cached = await prepared?.cache.match(request, { ignoreSearch: true });
    return cached || fetch(request);
  })());
});
