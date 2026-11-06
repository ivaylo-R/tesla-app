import { AppState, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type AuthResult = { error: string | null; confirmationRequired?: boolean };
type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  processingAuthLink: boolean;
  authLinkError: string | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, displayName: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function errorMessage(error: AuthError | null) {
  return error?.message ?? null;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [processingAuthLink, setProcessingAuthLink] = useState(false);
  const [authLinkError, setAuthLinkError] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    let mounted = true;
    const seenAuthUrls = new Set<string>();

    const subscription = client.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession);
        setLoading(false);
      }
    }).data.subscription;

    void client.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
      if (error) console.warn('Unable to restore Supabase session:', error.message);
    }).catch((error: unknown) => {
      if (!mounted) return;
      setLoading(false);
      console.warn('Unable to restore Supabase session:', error);
    });

    const handleAuthUrl = async (url: string | null) => {
      if (!url || seenAuthUrls.has(url)) return;
      const parsed = Linking.parse(url);
      const callbackPath = [parsed.hostname, parsed.path].filter(Boolean).join('/').replace(/^\/+/, '');
      if (!callbackPath.endsWith('auth/callback')) return;
      seenAuthUrls.add(url);
      setProcessingAuthLink(true);
      setAuthLinkError(null);

      try {
        const code = typeof parsed.queryParams?.code === 'string' ? parsed.queryParams.code : null;
        if (code) {
          const { error } = await client.auth.exchangeCodeForSession(code);
          if (error) {
            setAuthLinkError('Линкът може да е изтекъл или вече да е използван. Поискай нов имейл за потвърждение.');
            console.warn('Unable to complete email confirmation:', error.message);
          }
          setProcessingAuthLink(false);
          return;
        }

        const hash = url.split('#')[1];
        if (!hash) {
          setAuthLinkError('Линкът за потвърждение е невалиден.');
          setProcessingAuthLink(false);
          return;
        }
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (!accessToken || !refreshToken) {
          setAuthLinkError('Линкът за потвърждение е невалиден.');
          setProcessingAuthLink(false);
          return;
        }

        const { error } = await client.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          setAuthLinkError('Линкът може да е изтекъл или вече да е използван. Поискай нов имейл за потвърждение.');
          console.warn('Unable to complete email confirmation:', error.message);
        }
        setProcessingAuthLink(false);
      } catch (error) {
        setAuthLinkError('Не успяхме да потвърдим линка. Опитай отново.');
        setProcessingAuthLink(false);
        console.warn('Unable to process the authentication link:', error);
      }
    };

    void Linking.getInitialURL().then(handleAuthUrl);
    const urlSubscription = Linking.addEventListener('url', ({ url }) => {
      void handleAuthUrl(url);
    });

    const appStateSubscription = Platform.OS === 'web'
      ? null
      : AppState.addEventListener('change', (state) => {
          if (state === 'active') void client.auth.startAutoRefresh();
          else client.auth.stopAutoRefresh();
        });

    if (Platform.OS !== 'web' && AppState.currentState === 'active') {
      void client.auth.startAutoRefresh();
    }

    return () => {
      mounted = false;
      subscription.unsubscribe();
      urlSubscription.remove();
      appStateSubscription?.remove();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    session,
    loading,
    configured: isSupabaseConfigured,
    processingAuthLink,
    authLinkError,
    signIn: async (email, password) => {
      if (!supabase) return { error: 'Supabase не е конфигуриран.' };
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      return { error: errorMessage(error) };
    },
    signUp: async (email, password, displayName) => {
      if (!supabase) return { error: 'Supabase не е конфигуриран.' };
      const emailRedirectTo = Linking.createURL('auth/callback');
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo,
          data: { display_name: displayName.trim() },
        },
      });
      return {
        error: errorMessage(error),
        confirmationRequired: !error && !data.session,
      };
    },
    signOut: async () => {
      if (!supabase) return { error: 'Supabase не е конфигуриран.' };
      const { error } = await supabase.auth.signOut();
      return { error: errorMessage(error) };
    },
  }), [authLinkError, loading, processingAuthLink, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
