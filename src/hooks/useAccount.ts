import { useState, useEffect, useCallback, useRef } from 'react';
import type { Account, AuthState } from '../types/account';
import { getHardwareId, fetchAccountByHwid, loginWithDiscord, loginWithHwid, linkMinecraftAccount, linkDiscordAccount } from '../lib/api';

const STORAGE_KEY = 'hypnosia_account';

export function useAccount() {
  const [state, setState] = useState<AuthState>({
    account: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  const loadPromiseRef = useRef<Promise<void> | null>(null);

  const loadAccount = useCallback(async () => {
    // Prevent concurrent loadAccount calls from racing each other.
    if (loadPromiseRef.current) {
      return loadPromiseRef.current;
    }

    loadPromiseRef.current = (async () => {
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
        setState({
          account: null,
          isLoading: false,
          isAuthenticated: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    })();

    try {
      await loadPromiseRef.current;
    } finally {
      loadPromiseRef.current = null;
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
    const hwid = await getHardwareId();
    const success = await linkDiscordAccount(hwid);
    if (success) {
      await loadAccount();
    }
    return success;
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
