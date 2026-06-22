import { useState, useEffect, useCallback } from 'react';
import type { Account, AuthState } from '../types/account';
import { getHardwareId, fetchAccountByHwid, loginWithDiscord, loginWithHwid, linkMinecraftAccount, linkDiscordAccount } from '../lib/api';

const STORAGE_KEY = 'hypnosia_account_v2';

// Shared across all useAccount instances so HomePage and AccountPage never
// fire multiple /api/launcher/me requests at the same time.
let globalLoadPromise: Promise<void> | null = null;

export function useAccount() {
  const [state, setState] = useState<AuthState>(() => {
    const cached = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (cached) {
      try {
        const account = JSON.parse(cached) as Account;
        return {
          account,
          isLoading: true,
          isAuthenticated: true,
          error: null,
        };
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    return {
      account: null,
      isLoading: true,
      isAuthenticated: false,
      error: null,
    };
  });

  const loadAccount = useCallback(async () => {
    // Prevent concurrent loadAccount calls across all useAccount instances.
    if (globalLoadPromise) {
      return globalLoadPromise;
    }

    globalLoadPromise = (async () => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const hwid = await getHardwareId();
        // Always verify with server; localStorage is only a fallback if server is unreachable
        let account: Account | null = await fetchAccountByHwid(hwid);

        if (!account) {
          // Try to recover from localStorage when offline
          const cached = localStorage.getItem(STORAGE_KEY);
          if (cached) {
            try {
              account = JSON.parse(cached);
            } catch {
              localStorage.removeItem(STORAGE_KEY);
            }
          }
        }

        if (account) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
          setState({
            account,
            isLoading: false,
            isAuthenticated: true,
            error: null,
          });
        } else {
          localStorage.removeItem(STORAGE_KEY);
          setState({
            account: null,
            isLoading: false,
            isAuthenticated: false,
            error: null,
          });
        }
      } catch (error) {
        // On network errors, keep cached account visible if available.
        const cached = localStorage.getItem(STORAGE_KEY);
        setState({
          account: cached ? JSON.parse(cached) : null,
          isLoading: false,
          isAuthenticated: !!cached,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    })();

    try {
      await globalLoadPromise;
    } finally {
      globalLoadPromise = null;
    }
  }, []);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  const login = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const account = await loginWithDiscord();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
      setState({
        account,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      }));
    }
  }, []);

  const loginHwid = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const hwid = await getHardwareId();
      const account = await loginWithHwid(hwid);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
      setState({
        account,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'HWID login failed',
      }));
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      account: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });
  }, []);

  const linkMinecraft = useCallback(
    async (code: string): Promise<{ success: boolean; error?: string; message?: string }> => {
      const hwid = await getHardwareId();
      const result = await linkMinecraftAccount(hwid, code);
      if (result.success) {
        await loadAccount();
      }
      return result;
    },
    [loadAccount]
  );

  const linkDiscord = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const hwid = await getHardwareId();
      const success = await linkDiscordAccount(hwid);
      if (success) {
        await loadAccount();
      }
      return success;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Discord link failed',
      }));
      return false;
    }
  }, [loadAccount]);

  return {
    ...state,
    login,
    loginHwid,
    logout,
    linkMinecraft,
    linkDiscord,
    refresh: loadAccount,
  };
}
