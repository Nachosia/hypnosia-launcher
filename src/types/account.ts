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
}

export interface AuthState {
  account: Account | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}
