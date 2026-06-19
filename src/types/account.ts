export interface ProfileActivity {
  date: string;
  dayName: string;
  hours: number;
}

export interface TopServer {
  serverIp: string;
  displayName?: string;
  totalMinutes: number;
}

export interface ProfileServerStats {
  playtimeBanned?: boolean;
  topServers: TopServer[];
}

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

  // Profile fields
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
  playtimeBanned?: boolean;
  playtimeFrozen?: boolean;
  activity?: ProfileActivity[];
  topServers?: TopServer[];
}

export interface AuthState {
  account: Account | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}
