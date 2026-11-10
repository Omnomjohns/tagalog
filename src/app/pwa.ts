import { useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

/** True when launched from the Home Screen icon (not in a Safari tab). */
export const isStandalone = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** Service worker state: offline readiness and the "update available" prompt. */
export function usePwa(): { offlineReady: boolean; needRefresh: boolean; update: () => void } {
  const [offlineReady, setOfflineReady] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const updater = useRef<(reload?: boolean) => Promise<void>>(undefined);
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    updater.current = registerSW({ onNeedRefresh: () => setNeedRefresh(true), onOfflineReady: () => setOfflineReady(true) });
    void navigator.serviceWorker.ready.then((reg) => { if (reg.active) setOfflineReady(true); });
  }, []);
  return { offlineReady, needRefresh, update: () => void updater.current?.(true) };
}

/** Asks for persistent storage (only meaningful once installed) and reports the status. */
export async function requestPersistence(): Promise<boolean | undefined> {
  if (!navigator.storage?.persisted) return undefined;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist ? navigator.storage.persist() : false;
}
