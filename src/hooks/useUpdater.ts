import { useCallback, useEffect, useRef, useState } from 'react';
import { checkForUpdate, installUpdate, onUpdaterProgress, type UpdateInfo, type UpdateProgress } from '../lib/updater';

export type UpdaterStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error';

const AUTO_UPDATE_KEY = 'hypnosia:autoUpdate';

function readAutoUpdate(): boolean {
  try {
    return localStorage.getItem(AUTO_UPDATE_KEY) !== 'false';
  } catch {
    return true;
  }
}

function writeAutoUpdate(value: boolean): void {
  try {
    localStorage.setItem(AUTO_UPDATE_KEY, String(value));
  } catch {
    // ignore
  }
}

export function useUpdater() {
  const [status, setStatus] = useState<UpdaterStatus>('idle');
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);

  const cleanup = useCallback(() => {
    if (unlistenRef.current) {
      unlistenRef.current();
      unlistenRef.current = null;
    }
  }, []);

  const check = useCallback(async () => {
    setStatus('checking');
    setError(null);
    setInfo(null);
    setProgress(null);
    try {
      const update = await checkForUpdate();
      if (update) {
        setInfo(update);
        setStatus('available');
        return update;
      }
      setStatus('idle');
      return null;
    } catch (e: any) {
      setError(e?.message || 'Не удалось проверить обновления');
      setStatus('error');
      return null;
    }
  }, []);

  const install = useCallback(async () => {
    if (status !== 'available' && status !== 'idle') return;
    setStatus('downloading');
    setProgress(null);
    setError(null);
    cleanup();
    try {
      const unlisten = await onUpdaterProgress((p) => setProgress(p));
      unlistenRef.current = unlisten;
      await installUpdate();
      setStatus('ready');
    } catch (e: any) {
      setError(e?.message || 'Не удалось установить обновление');
      setStatus('error');
    } finally {
      cleanup();
    }
  }, [status, cleanup]);

  const [autoUpdate, setAutoUpdateState] = useState<boolean>(readAutoUpdate());
  const setAutoUpdate = useCallback((value: boolean) => {
    writeAutoUpdate(value);
    setAutoUpdateState(value);
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  useEffect(() => {
    if (!autoUpdate) return;
    check();
  }, [autoUpdate, check]);

  return {
    status,
    info,
    progress,
    error,
    autoUpdate,
    setAutoUpdate,
    check,
    install,
  };
}
