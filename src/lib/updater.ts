import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

export interface UpdateInfo {
  version: string;
  body?: string;
}

export interface UpdateProgress {
  chunkLength?: number;
  contentLength?: number;
  finished?: boolean;
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  return await invoke<UpdateInfo | null>('check_update');
}

export async function installUpdate(): Promise<void> {
  return await invoke<void>('install_update');
}

export function onUpdaterProgress(callback: (progress: UpdateProgress) => void): Promise<UnlistenFn> {
  return listen<UpdateProgress>('updater-progress', (event) => {
    callback(event.payload);
  });
}
