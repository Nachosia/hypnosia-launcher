import { invoke } from '@tauri-apps/api/core';
import type {
  Account,
  ProfileActivity,
  ProfileServerStats,
  TopServer,
} from '../types/account';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://nachosia.site';

let cachedHwid: string | null = null;

// Get stable hardware ID from Tauri (OS info based hash)
export async function getHardwareId(): Promise<string> {
  const STORAGE_KEY = 'hypnosia_hwid';
  if (cachedHwid) {
    return cachedHwid;
  }
  try {
    const hwid = await invoke<string>('get_hwid');
    // Persist successful HWID so later calls use the same value even if invoke fails
    localStorage.setItem(STORAGE_KEY, hwid);
    cachedHwid = hwid;
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
    cachedHwid = hwid;
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
  // Use the license account id from the Minecraft/mod account section.
  // The top-level accountId is sometimes a different internal id.
  const accountId = data.minecraft.accountId ?? data.accountId ?? 0;
  const resolvedSkinUrl = resolveSkinUrl(data.skinUrl);
  const resolvedSkinModel = data.skinModel ?? undefined;

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

const parseBoolString = (v?: boolean | string): boolean => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v === 'true';
  return false;
};

const parseMinutes = (v?: number | string): number | undefined => {
  if (v === undefined || v === null) return undefined;
  const n = typeof v === 'string' ? Number(v) : v;
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
};

const resolveSkinUrl = (skinUrl?: string | null): string | undefined => {
  if (!skinUrl) return undefined;
  return skinUrl.startsWith('http') ? skinUrl : `${API_BASE}${skinUrl}`;
};

export async function fetchSiteProfile(accountId: number): Promise<Partial<Account> | null> {
  try {
    const data = (await invoke<Record<string, unknown>>('fetch_site_profile', { accountId })) ?? {};
    console.log('[API] site profile:', data.accountId, data.displayName);
    return {
      discordId: typeof data.discordId === 'string' ? data.discordId : undefined,
      displayName: typeof data.displayName === 'string' ? data.displayName : undefined,
      role: typeof data.effectiveRole === 'string' ? data.effectiveRole : undefined,
      allRoles: Array.isArray(data.allRoles) ? (data.allRoles as string[]) : undefined,
      customRoleName: typeof data.customRoleName === 'string' ? data.customRoleName : undefined,
      skinUrl: resolveSkinUrl(data.skinUrl as string | null | undefined),
      skinModel: data.skinModel === 'slim' ? 'slim' : 'classic',
      totalMinutes: parseMinutes(data.totalMinutes as number | string | undefined),
      weeklyMinutes: parseMinutes(data.weeklyMinutes as number | string | undefined),
      hoursPlayed: typeof data.hoursPlayed === 'number' ? data.hoursPlayed : undefined,
      mcJoined: (data.mcJoined as string | null | undefined) ?? undefined,
      siteJoined: (data.siteJoined as string | null | undefined) ?? undefined,
      isOnline: parseBoolString(data.isOnline as string | boolean | undefined),
      showHours: parseBoolString(data.showHours as string | boolean | undefined),
      showMcJoined: parseBoolString(data.showMcJoined as string | boolean | undefined),
      showOnline: parseBoolString(data.showOnline as string | boolean | undefined),
      showRank: parseBoolString(data.showRank as string | boolean | undefined),
      nickGradientFrom: (data.nickGradientFrom as string | undefined) ?? undefined,
      nickGradientTo: (data.nickGradientTo as string | undefined) ?? undefined,
      roleGradientFrom: (data.roleGradientFrom as string | undefined) ?? undefined,
      roleGradientTo: (data.roleGradientTo as string | undefined) ?? undefined,
    };
  } catch (error) {
    console.error('[API] Failed to fetch site profile:', error);
    return null;
  }
}

export async function fetchSiteActivity(discordId: string): Promise<ProfileActivity[] | null> {
  try {
    const data = (await invoke<unknown[]>('fetch_site_activity', { discordId })) ?? [];
    console.log('[API] site activity:', discordId, data);
    return data
      .filter((d): d is Record<string, unknown> => typeof d === 'object' && d !== null)
      .map((d) => ({
        date: String(d.date ?? ''),
        dayName: String(d.dayName ?? ''),
        hours: typeof d.hours === 'number' ? d.hours : Number(d.hours) || 0,
      }));
  } catch (error) {
    console.error('[API] Failed to fetch site activity:', error);
    return null;
  }
}

export async function fetchSiteServerStats(accountId: number): Promise<ProfileServerStats | null> {
  try {
    const data = (await invoke<Record<string, unknown>>('fetch_site_server_stats', { accountId })) ?? {};
    const rawTopServers = Array.isArray(data.topServers) ? data.topServers : [];
    const topServers: TopServer[] = rawTopServers
      .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
      .map((s) => ({
        serverIp: String(s.serverIp ?? ''),
        displayName: typeof s.displayName === 'string' ? s.displayName : undefined,
        totalMinutes: typeof s.totalMinutes === 'number' ? s.totalMinutes : Number(s.totalMinutes) || 0,
      }));
    return {
      playtimeBanned: data.playtimeBanned === true,
      topServers,
    };
  } catch (error) {
    console.error('[API] Failed to fetch site server stats:', error);
    return null;
  }
}

async function fetchWithTimeout(
  input: RequestInfo,
  init?: RequestInit,
  timeoutMs = 15000
): Promise<Response> {
  // Use Promise.race instead of AbortController to avoid compatibility issues
  // with some WebView2 versions that throw AbortError immediately.
  return Promise.race([
    fetch(input, init),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    ),
  ]);
}

async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = 3,
  delayMs = 1000
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);
      if (response.ok) return response;
      // For server errors (5xx), retry; for client errors (4xx), fail fast.
      if (response.status >= 400 && response.status < 500) {
        return response;
      }
      lastError = new Error(`Server error: ${response.status}`);
    } catch (error) {
      lastError = error;
      console.warn(`[API] attempt ${attempt + 1}/${retries} failed for ${url}:`, error);
    }
    if (attempt < retries - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }
  throw lastError;
}

export async function fetchAccountByHwid(hwid: string): Promise<Account | null> {
  try {
    const url = `${API_BASE}/api/launcher/me?hwid=${encodeURIComponent(hwid)}`;
    console.log('[API] fetching:', url);
    const response = await fetchWithRetry(url, undefined, 3, 1500);

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    console.log('[API] /me response:', data.authenticated, data.user?.name);
    if (!data.authenticated) {
      return null;
    }

    const account = mapServerAccount(data);

    // Load full profile data directly from the site's public tRPC endpoints.
    // This bypasses the launcher backend until it is extended.
    if (account.accountId) {
      const [siteProfile, siteServerStats] = await Promise.all([
        fetchSiteProfile(account.accountId),
        fetchSiteServerStats(account.accountId),
      ]);

      if (siteProfile) {
        if (siteProfile.displayName) account.displayName = siteProfile.displayName;
        if (siteProfile.role) account.role = siteProfile.role;
        if (siteProfile.allRoles?.length) account.allRoles = siteProfile.allRoles;
        if (siteProfile.customRoleName) account.customRoleName = siteProfile.customRoleName;
        if (siteProfile.skinUrl) account.skinUrl = siteProfile.skinUrl;
        if (siteProfile.skinModel) account.skinModel = siteProfile.skinModel;
        if (siteProfile.totalMinutes !== undefined) account.totalMinutes = siteProfile.totalMinutes;
        if (siteProfile.weeklyMinutes !== undefined) account.weeklyMinutes = siteProfile.weeklyMinutes;
        if (siteProfile.hoursPlayed !== undefined) account.hoursPlayed = siteProfile.hoursPlayed;
        if (siteProfile.mcJoined !== undefined) account.mcJoined = siteProfile.mcJoined;
        if (siteProfile.siteJoined !== undefined) account.siteJoined = siteProfile.siteJoined;
        if (siteProfile.isOnline !== undefined) account.isOnline = siteProfile.isOnline;
        if (siteProfile.showHours !== undefined) account.showHours = siteProfile.showHours;
        if (siteProfile.showMcJoined !== undefined) account.showMcJoined = siteProfile.showMcJoined;
        if (siteProfile.showOnline !== undefined) account.showOnline = siteProfile.showOnline;
        if (siteProfile.showRank !== undefined) account.showRank = siteProfile.showRank;
        if (siteProfile.nickGradientFrom) account.nickGradientFrom = siteProfile.nickGradientFrom;
        if (siteProfile.nickGradientTo) account.nickGradientTo = siteProfile.nickGradientTo;
        if (siteProfile.roleGradientFrom) account.roleGradientFrom = siteProfile.roleGradientFrom;
        if (siteProfile.roleGradientTo) account.roleGradientTo = siteProfile.roleGradientTo;
      }
      if (siteServerStats) {
        account.topServers = siteServerStats.topServers;
        account.playtimeBanned = siteServerStats.playtimeBanned;
      }

      const discordId = account.discordId || account.id;
      if (discordId && discordId.length > 0 && discordId !== String(account.accountId)) {
        const activity = await fetchSiteActivity(discordId);
        if (activity) account.activity = activity;
      }
    }

    console.log('[API] final account:', account);
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

  // Return the fully merged account (site profile + activity + server stats)
  // instead of the bare /login-hwid response.
  const account = await fetchAccountByHwid(hwid);
  if (!account) {
    throw new Error('Login succeeded but failed to fetch account details');
  }
  return account;
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
