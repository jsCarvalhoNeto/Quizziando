export interface OfflineAssetsStatus {
  ready: boolean;
  cached: number;
  total: number;
  reason: string;
}

const unsupported: OfflineAssetsStatus = {
  ready: false, cached: 0, total: 0,
  reason: 'Este navegador não oferece armazenamento offline para o aplicativo.',
};

function askWorker(worker: ServiceWorker, type: 'OFFLINE_STATUS' | 'OFFLINE_PREPARE'): Promise<OfflineAssetsStatus> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => {
      channel.port1.close();
      reject(new Error('A verificação offline demorou demais. Tente novamente.'));
    }, 120_000);
    channel.port1.onmessage = event => {
      window.clearTimeout(timeout);
      channel.port1.close();
      resolve(event.data as OfflineAssetsStatus);
    };
    worker.postMessage({ type, online: navigator.onLine }, [channel.port2]);
  });
}

export async function getOfflineAssetsStatus(): Promise<OfflineAssetsStatus> {
  if (!('serviceWorker' in navigator) || !('caches' in window)) return unsupported;
  const registration = await navigator.serviceWorker.getRegistration('/');
  if (!registration?.active) return {
    ready: false, cached: 0, total: 0,
    reason: 'Os arquivos do aplicativo ainda não foram preparados.',
  };
  return askWorker(registration.active, 'OFFLINE_STATUS');
}

export async function prepareOfflineAssets(): Promise<OfflineAssetsStatus> {
  if (!('serviceWorker' in navigator) || !('caches' in window)) return unsupported;
  const registration = await navigator.serviceWorker.register('/offline-sw.js', { scope: '/' });
  const ready = registration.active ? registration : await navigator.serviceWorker.ready;
  if (!ready.active) throw new Error('O cache offline não iniciou. Atualize a página e tente novamente.');
  return askWorker(ready.active, 'OFFLINE_PREPARE');
}
