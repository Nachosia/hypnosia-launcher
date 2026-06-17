import { invoke } from '@tauri-apps/api/core';
import type { Account } from '../types/account';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://nachosia.site';

// Get stable hardware ID from Tauri (OS info based hash)
export async function getHardwareId(): Promise<string> {
  try {
    return await invoke<string>('get_hwid');
  } catch {
    // Fallback for browser/dev — 64 hex chars to match License Server format
    let hwid = localStorage.getItem('hypnosia_hwid');
    if (!hwid) {
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      hwid = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      localStorage.setItem('hypnosia_hwid', hwid);
    }
    return hwid;
  }
}

// Open native folder picker
export async function pickDirectory(): Promise<string | null> {
  try {
    return await invoke<string | null>('pick_directory');
  } catch {
    return null;
  }
}

// Launch Minecraft via Tauri
export async function launchMinecraft(
  gameDir: string,
  javaPath: string,
  ramGb: number,
  username: string,
  modJarUrl?: string
): Promise<string> {
  return await invoke<string>('launch_minecraft', {
    gameDir,
    javaPath,
    ramGb,
    username,
    modJarUrl,
  });
}

function mapServerAccount(data: {
  user: { discordId?: string; name: string; avatar?: string | null; role: string };
  minecraft: { linked: boolean; accountId: number | null; displayName: string | null };
  discordLinked?: boolean;
  accountId?: number;
  createdAt?: string;
}): Account {
  const accountId = data.accountId ?? data.minecraft.accountId ?? 0;
  return {
    id: data.user.discordId || String(accountId || 'hwid'),
    username: data.user.name,
    displayName: data.minecraft.displayName || data.user.name,
    avatar: data.user.avatar || undefined,
    role: data.user.role,
    discordLinked: data.discordLinked ?? !!data.user.discordId,
    minecraftLinked: data.minecraft.linked,
    minecraftUsername: data.minecraft.displayName || undefined,
    accountId: accountId || undefined,
    registeredAt: data.createdAt,
  };
}

export async function fetchAccountByHwid(hwid: string): Promise<Account | null> {
  try {
    const response = await fetch(
      `${API_BASE}/api/launcher/me?hwid=${encodeURIComponent(hwid)}`
    );

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.authenticated) {
      return null;
    }

    return mapServerAccount(data);
  } catch (error) {
    console.error('Failed to fetch account by HWID:', error);
    return null;
  }
}

export async function loginWithHwid(hwid: string): Promise<Account> {
  const response = await fetch(`${API_BASE}/api/launcher/login-hwid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hwid }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || `Server error: ${response.status}`);
  }

  const data = await response.json();
  return mapServerAccount(data);
}

export async function loginWithDiscord(): Promise<Account> {
  const hwid = await getHardwareId();
  const authUrl = `${API_BASE}/api/launcher/oauth/start?hwid=${encodeURIComponent(hwid)}`;

  try {
    await invoke('open_discord_auth', { url: authUrl });
  } catch {
    window.open(authUrl, '_blank');
  }

  // Poll server until the user completes OAuth in the browser
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 120; // 6 minutes
    const interval = setInterval(async () => {
      attempts++;
      try {
        const account = await fetchAccountByHwid(hwid);
        if (account) {
          clearInterval(interval);
          resolve(account);
          return;
        }
      } catch {
        // ignore polling errors
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        reject(new Error('Timeout waiting for Discord authorization'));
      }
    }, 3000);
  });
}

export async function linkMinecraftAccount(
  hwid: string,
  code: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const response = await fetch(`${API_BASE}/api/launcher/link-minecraft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hwid, code }),
    });

    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };

    return {
      success: response.ok,
      error: data.error,
      message: data.message,
    };
  } catch (error) {
    console.error('Failed to link Minecraft:', error);
    return { success: false, error: 'NETWORK_ERROR' };
  }
}

export async function linkDiscordAccount(hwid: string): Promise<boolean> {
  const authUrl = `${API_BASE}/api/launcher/oauth/start?hwid=${encodeURIComponent(hwid)}`;
  try {
    await invoke('open_discord_auth', { url: authUrl });
  } catch {
    window.open(authUrl, '_blank');
  }
  return true;
}

export interface LaunchInfo {
  allowed: boolean;
  accountId: number;
  displayName: string;
  roles: string[];
  primaryRole: string;
}

export async function fetchLaunchInfo(hwid: string): Promise<LaunchInfo | null> {
  try {
    const response = await fetch(
      `${API_BASE}/api/launcher/launch-info?hwid=${encodeURIComponent(hwid)}`
    );
    if (!response.ok) {
      console.error('Launch info request failed:', response.status);
      return null;
    }
    return (await response.json()) as LaunchInfo;
  } catch (error) {
    console.error('Failed to fetch launch info:', error);
    return null;
  }
}
