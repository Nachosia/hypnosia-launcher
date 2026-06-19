export interface Account {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  role: string;
  discordLinked: boolean;
  minecraftLinked: boolean;
  minecraftUsername?: string;
  accountId?: number;
  registeredAt?: string;

  // Profile preview fields (mock / future backend)
  skinUrl?: string;
  skinModel?: 'classic' | 'slim';
  nickGradientFrom?: string;
  nickGradientTo?: string;
  roleGradientFrom?: string;
  roleGradientTo?: string;
  hoursPlayed?: number;
  weeklyMinutes?: number;
  totalMinutes?: number;
  mcJoined?: string;
  siteJoined?: string;
  isOnline?: boolean;
  showHours?: boolean;
  showMcJoined?: boolean;
  showOnline?: boolean;
  showRank?: boolean;
  allRoles?: string[];
  customRoleName?: string;
  configsUploaded?: number;
  activity?: { date: string; dayName: string; hours: number }[];
  topServers?: { serverIp: string; displayName?: string; totalMinutes: number }[];
}

export interface AuthState {
  account: Account | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}
