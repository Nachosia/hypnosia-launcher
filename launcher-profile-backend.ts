/**
 * Backend integration for the launcher profile section.
 *
 * This file is a reference/snippet intended to be merged into
 * `/opt/nachosia/app/api/launcher-router.ts` on the server.
 *
 * It reuses the site's own tRPC procedures:
 *   - profile.getById
 *   - profile.activity
 *   - profile.serverStats
 *
 * The launcher frontend already calls:
 *   - GET /api/launcher/me?hwid=...
 *   - GET /api/launcher/profile/activity?hwid=...
 *   - GET /api/launcher/profile/server-stats?hwid=...
 */

// ---------------------------------------------------------------------------
// 1. Add near the top of launcher-router.ts
// ---------------------------------------------------------------------------

const SITE_TRPC_BASE = process.env.SITE_TRPC_BASE || 'http://127.0.0.1:3001/api/trpc';

interface SiteProfile {
  accountId: number;
  discordId: string | null;
  displayName: string;
  effectiveRole: string;
  role: string;
  allRoles: string[];
  hoursPlayed?: number;
  totalMinutes?: string;
  weeklyMinutes?: string;
  mcJoined?: string | null;
  siteJoined?: string;
  isOnline?: string;
  showHours?: string;
  showMcJoined?: string;
  showOnline?: string;
  showRank?: string;
  skinUrl?: string | null;
  skinModel?: string;
  nickGradientFrom?: string;
  nickGradientTo?: string;
  roleGradientFrom?: string;
  roleGradientTo?: string;
  customRoleName?: string | null;
  serverStats?: {
    playtimeBanned?: boolean;
    topServers?: Array<{
      serverIp: string;
      displayName?: string;
      totalMinutes: number;
      weekMinutes?: string;
      monthMinutes?: string;
    }>;
  };
}

interface ActivityDay {
  date: string;
  dayName: string;
  hours: number;
}

async function trpcQuery<R>(procedure: string, input: unknown): Promise<R | null> {
  try {
    const url = new URL(`${SITE_TRPC_BASE}/${procedure}`);
    url.searchParams.set('input', JSON.stringify({ json: input }));
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      console.error(`[launcher-profile] tRPC ${procedure} failed: ${res.status}`);
      return null;
    }
    const json = (await res.json()) as { result?: { data?: { json?: R } } };
    return json?.result?.data?.json ?? null;
  } catch (err) {
    console.error(`[launcher-profile] tRPC ${procedure} error:`, err);
    return null;
  }
}

async function fetchSiteProfile(accountId: number): Promise<SiteProfile | null> {
  return trpcQuery<SiteProfile>('profile.getById', { id: String(accountId) });
}

async function fetchSiteActivity(discordId: string): Promise<ActivityDay[] | null> {
  return trpcQuery<ActivityDay[]>('profile.activity', { discordId });
}

async function fetchSiteServerStats(accountId: number): Promise<SiteProfile['serverStats'] | null> {
  return trpcQuery<SiteProfile['serverStats']>('profile.serverStats', { accountId });
}

function boolString(v?: string): boolean {
  return v === 'true';
}

function minutesFromString(v?: string | number): number | undefined {
  if (v === undefined || v === null) return undefined;
  const n = typeof v === 'string' ? Number(v) : v;
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
}

// ---------------------------------------------------------------------------
// 2. Update buildMeResponse in launcher-router.ts
// ---------------------------------------------------------------------------
// After you have resolved the modAccount (and therefore the accountId),
// merge the site profile data into the response.
//
// Example (inside buildMeResponse, after modAccount lookup):
//
//   const siteProfile = modAccount?.accountId
//     ? await fetchSiteProfile(modAccount.accountId)
//     : null;
//
//   return {
//     authenticated: true,
//     user: { ... },
//     minecraft: { ... },
//     discordLinked: true,
//     skinUrl: siteProfile?.skinUrl ?? profile?.skinUrl ?? null,
//     skinModel: siteProfile?.skinModel ?? profile?.skinModel ?? 'classic',
//     totalMinutes: minutesFromString(siteProfile?.totalMinutes),
//     weeklyMinutes: minutesFromString(siteProfile?.weeklyMinutes),
//     hoursPlayed: siteProfile?.hoursPlayed,
//     mcJoined: siteProfile?.mcJoined ?? null,
//     siteJoined: siteProfile?.siteJoined ?? null,
//     isOnline: boolString(siteProfile?.isOnline),
//     showHours: boolString(siteProfile?.showHours),
//     showMcJoined: boolString(siteProfile?.showMcJoined),
//     showOnline: boolString(siteProfile?.showOnline),
//     showRank: boolString(siteProfile?.showRank),
//     allRoles: siteProfile?.allRoles,
//     customRoleName: siteProfile?.customRoleName ?? null,
//     nickGradientFrom: siteProfile?.nickGradientFrom,
//     nickGradientTo: siteProfile?.nickGradientTo,
//     roleGradientFrom: siteProfile?.roleGradientFrom,
//     roleGradientTo: siteProfile?.roleGradientTo,
//     playtimeBanned: siteProfile?.serverStats?.playtimeBanned ?? false,
//     playtimeFrozen: false, // site profile does not expose this on getById
//   };
//
// Do the same for the HWID-only branch if you want those users to see
// their stats too (requires accountId).

// ---------------------------------------------------------------------------
// 3. Add new routes in launcher-router.ts
// ---------------------------------------------------------------------------
//
// app.get('/api/launcher/profile/activity', async (c) => {
//   const hwid = c.req.query('hwid') ?? '';
//   if (!hwid) return c.json({ error: 'HWID_REQUIRED' }, 400);
//
//   const device = await findDeviceByHwid(hwid);
//   if (!device?.discordId) return c.json([], 200);
//
//   const activity = await fetchSiteActivity(device.discordId);
//   return c.json(activity ?? [], 200);
// });
//
// app.get('/api/launcher/profile/server-stats', async (c) => {
//   const hwid = c.req.query('hwid') ?? '';
//   if (!hwid) return c.json({ error: 'HWID_REQUIRED' }, 400);
//
//   const device = await findDeviceByHwid(hwid);
//   const accountId = device?.accountId; // or from modAccounts lookup
//   if (!accountId) return c.json({ topServers: [] }, 200);
//
//   const stats = await fetchSiteServerStats(accountId);
//   return c.json(stats ?? { topServers: [] }, 200);
// });
