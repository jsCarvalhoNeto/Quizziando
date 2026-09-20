import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

test('cache offline abre o aplicativo e preserva a versão anterior se uma atualização falhar', async () => {
  const origin = 'https://quizziando.test';
  const listeners = new Map();
  const stores = new Map();
  const makeCache = name => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name);
    const key = request => new URL(typeof request === 'string' ? request : request.url, origin).pathname;
    return {
      match: async request => store.get(key(request))?.clone(),
      put: async (request, response) => { store.set(key(request), response.clone()); },
    };
  };
  const caches = {
    keys: async () => [...stores.keys()],
    open: async name => makeCache(name),
    delete: async name => stores.delete(name),
  };
  let online = true;
  let build = 'a'.repeat(20);
  let failAsset = false;
  const files = ['/index.html', '/sql-wasm.wasm', '/assets/app.js'];
  const fetch = async input => {
    if (!online) throw new Error('sem internet');
    const path = new URL(typeof input === 'string' ? input : input.url, origin).pathname;
    if (failAsset && path === '/assets/app.js') throw new Error('download interrompido');
    if (path === '/offline-manifest.json') return Response.json({ build, files });
    if (path === '/index.html') return new Response(`<html>${build}</html>`);
    if (path === '/sql-wasm.wasm') return new Response(new Uint8Array([0, 97, 115, 109]));
    if (path === '/assets/app.js') return new Response(`app-${build}`);
    throw new Error(`Arquivo inesperado: ${path}`);
  };
  const self = {
    location: { origin },
    clients: { claim: async () => {} },
    skipWaiting: async () => {},
    addEventListener: (type, handler) => listeners.set(type, handler),
  };
  runInNewContext(await readFile(new URL('../public/offline-sw.js', import.meta.url), 'utf8'),
    { self, caches, fetch, Response, URL, Date, Error, console });

  const message = async (type, isOnline) => {
    let result;
    let work;
    listeners.get('message')({ data: { type, online: isOnline },
      ports: [{ postMessage: value => { result = value; } }],
      waitUntil: promise => { work = promise; } });
    await work;
    return result;
  };

  assert.equal((await message('OFFLINE_STATUS', true)).ready, false);
  const prepared = await message('OFFLINE_PREPARE', true);
  assert.equal(prepared.ready, true);
  assert.equal(prepared.cached, 3);

  online = false;
  assert.equal((await message('OFFLINE_STATUS', false)).ready, true);
  let navigation;
  listeners.get('fetch')({ request: { url: `${origin}/`, method: 'GET', mode: 'navigate', cache: 'default' },
    respondWith: promise => { navigation = promise; } });
  assert.match(await (await navigation).text(), /<html>aaaaaaaa/);

  online = true;
  build = 'b'.repeat(20);
  failAsset = true;
  assert.equal((await message('OFFLINE_PREPARE', true)).ready, false);
  online = false;
  assert.equal((await message('OFFLINE_STATUS', false)).ready, true);
  assert.equal((await caches.keys()).filter(name => name.startsWith('quizziando-staging-')).length, 0);
});
