import { invoke } from '@tauri-apps/api/core';
import type { Account, ProfileActivity, ProfileServerStats } from '../types/account';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://nachosia.site';

// Get stable hardware ID from Tauri (OS info based hash)
export async function getHardwareId(): Promise<string> {
  const STORAGE_KEY = 'hypnosia_hwid';
  try {
    const hwid = await invoke<string>('get_hwid');
    // Persist successful HWID so later calls use the same value even if invoke fails
    localStorage.setItem(STORAGE_KEY, hwid);
    console.log('[HWID] using native:', hwid.slice(0, 16));
    return hwid;
  } catch (err) {
    // Fallback for browser/dev — reuse persisted value if available
    let hwid = localStorage.getItem(STORAGE_KEY);
    if (!hwid) {
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      hwid = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      localStorage.setItem(STORAGE_KEY, hwid);
      console.warn('[HWID] generated fallback:', hwid.slice(0, 16));
    } else {
      console.warn('[HWID] using persisted fallback:', hwid.slice(0, 16), err);
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
  minecraft: {
    linked: boolean;
    accountId: number | null;
    displayName: string | null;
  };
  discordLinked?: boolean;
  accountId?: number;
  createdAt?: string;
  skinUrl?: string | null;
  skinModel?: 'classic' | 'slim' | string | null;
  totalMinutes?: number;
  weeklyMinutes?: number;
  hoursPlayed?: number;
  mcJoined?: string;
  siteJoined?: string;
  isOnline?: boolean | string;
  showHours?: boolean | string;
  showMcJoined?: boolean | string;
  allRoles?: string[];
  customRoleName?: string;
  playtimeBanned?: boolean;
  playtimeFrozen?: boolean;
  configsUploaded?: number;
}): Account {
  const accountId = data.accountId ?? data.minecraft.accountId ?? 0;
  const resolvedSkinUrl = data.skinUrl
    ? data.skinUrl.startsWith('http')
      ? data.skinUrl
      : `${API_BASE}${data.skinUrl}`
    : undefined;
  const resolvedSkinModel = data.skinModel ?? undefined;

  const parseMinutes = (v?: number | string): number | undefined => {
    if (v === undefined || v === null) return undefined;
    const n = typeof v === 'string' ? Number(v) : v;
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  const parseBoolString = (v?: boolean | string): boolean => {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') return v === 'true';
    return false;
  };

  return {
    id: data.user.discordId || String(accountId || 'hwid'),
    username: data.user.name,
    displayName: data.minecraft.displayName || data.user.name,
    avatar: data.user.avatar || undefined,
    role: data.user.role,
    discordLinked: data.discordLinked ?? !!data.user.discordId,
    minecraftLinked: data.minecraft.linked,
    minecraftUsername: data.minecraft.displayName || undefined,
    skinUrl: resolvedSkinUrl || undefined,
    skinModel: resolvedSkinModel === 'slim' ? 'slim' : 'classic',
    accountId: accountId || undefined,
    registeredAt: data.createdAt,
    totalMinutes: parseMinutes(data.totalMinutes),
    weeklyMinutes: parseMinutes(data.weeklyMinutes),
    hoursPlayed: data.hoursPlayed,
    mcJoined: data.mcJoined,
    siteJoined: data.siteJoined,
    isOnline: parseBoolString(data.isOnline),
    showHours: parseBoolString(data.showHours),
    showMcJoined: parseBoolString(data.showMcJoined),
    allRoles: data.allRoles,
    customRoleName: data.customRoleName,
    playtimeBanned: data.playtimeBanned,
    playtimeFrozen: data.playtimeFrozen,
    configsUploaded: data.configsUploaded,
  };
}

export async function fetchProfileActivity(hwid: string): Promise<ProfileActivity[] | null> {
  try {
    const url = `${API_BASE}/api/launcher/profile/activity?hwid=${encodeURIComponent(hwid)}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return (await response.json()) as ProfileActivity[];
  } catch (error) {
    console.error('[API] Failed to fetch profile activity:', error);
    return null;
  }
}

export async function fetchProfileServerStats(hwid: string): Promise<ProfileServerStats | null> {
  try {
    const url = `${API_BASE}/api/launcher/profile/server-stats?hwid=${encodeURIComponent(hwid)}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return (await response.json()) as ProfileServerStats;
  } catch (error) {
    console.error('[API] Failed to fetch profile server stats:', error);
    return null;
  }
}

export async function fetchAccountByHwid(hwid: string): Promise<Account | null> {
  try {
    const url = `${API_BASE}/api/launcher/me?hwid=${encodeURIComponent(hwid)}`;
    console.log('[API] fetching:', url);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    console.log('[API] /me response:', data.authenticated, data.user?.name);
    if (!data.authenticated) {
      return null;
    }

    const account = mapServerAccount(data);

    // Load activity and server stats in parallel
    const [activity, serverStats] = await Promise.all([
      fetchProfileActivity(hwid),
      fetchProfileServerStats(hwid),
    ]);

    if (activity) account.activity = activity;
    if (serverStats) {
      account.topServers = serverStats.topServers;
      if (serverStats.playtimeBanned !== undefined) {
        account.playtimeBanned = serverStats.playtimeBanned;
      }
    }

    return account;
  } catch (error) {
    console.error('[API] Failed to fetch account by HWID:', error);
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
    const maxAttempts = 240; // 6 minutes
    const interval = setInterval(async () => {
      attempts++;
      try {
        console.log('[DiscordAuth] polling attempt', attempts);
        const account = await fetchAccountByHwid(hwid);
        if (account) {
          console.log('[DiscordAuth] account found:', account.username);
          clearInterval(interval);
          resolve(account);
          return;
        }
      } catch (err) {
        console.warn('[DiscordAuth] polling error:', err);
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        reject(new Error('Timeout waiting for Discord authorization'));
      }
    }, 1500);
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
