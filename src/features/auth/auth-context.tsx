import { AppState, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type AuthResult = { error: string | null; confirmationRequired?: boolean };
type AuthLinkFlow = 'confirmation' | 'recovery';
type AuthLinkStatus = 'idle' | 'processing' | 'success' | 'error';
type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  recoveryRequired: boolean;
  authLinkStatus: AuthLinkStatus;
  authLinkFlow: AuthLinkFlow;
  authLinkError: string | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, displayName: string) => Promise<AuthResult>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  updatePasswordAndSignOut: (password: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const RECOVERY_PENDING_KEY = 'teslaapp.auth.recovery-pending';
const processedAuthUrls = new Set<string>();

function getErrorDetails(error: unknown) {
  if (typeof error !== 'object' || error === null) return {};
  const candidate = error as { name?: unknown; message?: unknown; code?: unknown; status?: unknown };
  return {
    name: typeof candidate.name === 'string' ? candidate.name : undefined,
    message: typeof candidate.message === 'string' ? candidate.message : undefined,
    code: typeof candidate.code === 'string' ? candidate.code : undefined,
    status: typeof candidate.status === 'number' ? candidate.status : undefined,
  };
}

function logAuthError(operation: string, error: unknown) {
  if (__DEV__) {
    const { name, message, code, status } = getErrorDetails(error);
    console.warn(`[Auth] ${operation} failed`, { name, message, code, status });
  }
}

function userFriendlyError(
  error: unknown,
  operation: 'sign-in' | 'sign-up' | 'recovery-request' | 'password-update' | 'callback' | 'generic'
) {
  const { name, message, code, status } = getErrorDetails(error);
  const detail = `${code ?? ''} ${message ?? ''}`.toLowerCase();

  if (detail.includes('email_not_confirmed') || detail.includes('email not confirmed')) {
    return 'Моля, потвърди имейла си преди вход.';
  }
  if (detail.includes('invalid_credentials') || detail.includes('invalid login credentials')) {
    return 'Невалиден имейл или парола.';
  }
  if (status === 429 || detail.includes('too many requests') || detail.includes('rate limit') || detail.includes('rate_limit') || detail.includes('too_many')) {
    return 'Твърде много опити. Моля, изчакай и опитай отново.';
  }
  if (name === 'AuthRetryableFetchError' || /network|fetch failed|timeout|timed out|internet/.test(detail)) {
    return 'Няма връзка със сървъра. Опитай отново.';
  }
  if (
    operation === 'recovery-request' &&
    detail.includes('redirect') &&
    (detail.includes('not allowed') || detail.includes('allow list'))
  ) {
    return 'Адресът за връщане не е разрешен в Supabase Authentication → URL Configuration.';
  }
  if (detail.includes('weak_password') || detail.includes('password should be')) {
    return 'Паролата трябва да съдържа поне 8 символа.';
  }
  if (operation === 'password-update') {
    if (detail.includes('session missing') || detail.includes('invalid session')) {
      return 'Линкът за смяна на паролата е изтекъл или невалиден. Поискай нов линк.';
    }
    if (detail.includes('same password') || detail.includes('different from the old password')) {
      return 'Новата парола трябва да е различна от старата.';
    }
    if (message) return `Не успяхме да сменим паролата: ${message}`;
    return `Не успяхме да сменим паролата${code ? ` (${code})` : ''}. Опитай отново.`;
  }
  if (operation === 'recovery-request') return 'Не успяхме да изпратим линка. Провери връзката и опитай отново.';
  if (operation === 'callback') return 'Линкът е невалиден или е изтекъл. Поискай нов имейл и опитай отново.';
  if (operation === 'sign-up') return 'Не успяхме да създадем профил. Провери данните и опитай отново.';
  if (operation === 'sign-in') return 'Не успяхме да влезем в профила. Опитай отново.';
  return 'Възникна грешка. Опитай отново.';
}

function isDuplicateRegistration(error: AuthError) {
  const { code, message } = getErrorDetails(error);
  return ['user_already_exists', 'email_exists'].includes(code ?? '') ||
    /already registered|user already exists|email already exists/.test((message ?? '').toLowerCase());
}

function setPersistedRecoveryPending(pending: boolean) {
  try {
    if (typeof localStorage === 'undefined') return;
    if (pending) localStorage.setItem(RECOVERY_PENDING_KEY, 'true');
    else localStorage.removeItem(RECOVERY_PENDING_KEY);
  } catch (error) {
    logAuthError('recovery state storage', error);
  }
}

function getPersistedRecoveryPending() {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(RECOVERY_PENDING_KEY) === 'true';
  } catch (error) {
    logAuthError('recovery state restore', error);
    return false;
  }
}

function createAuthRedirect(flow?: AuthLinkFlow) {
  if (flow !== 'recovery') return Linking.createURL('auth/callback');

  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !window.location?.origin || window.location.origin === 'null') {
      throw new Error(
        'Cannot create the password recovery redirect: browser window.location.origin is unavailable.'
      );
    }

    const redirectUrl = new URL('/auth/reset-password', window.location.origin);
    redirectUrl.searchParams.set('flow', flow);
    return redirectUrl.toString();
  }

  // Expo Linking selects exp/exps in Expo Go and the configured scheme in native builds.
  return Linking.createURL('auth/reset-password', { queryParams: { flow } });
}

function firstQueryValue(params: URLSearchParams, key: string) {
  return params.get(key);
}

function rememberAuthUrl(url: string) {
  if (processedAuthUrls.has(url)) return false;
  processedAuthUrls.add(url);
  if (processedAuthUrls.size > 24) {
    const oldest = processedAuthUrls.values().next().value;
    if (oldest) processedAuthUrls.delete(oldest);
  }
  return true;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [recoveryRequired, setRecoveryRequired] = useState(false);
  const [authLinkStatus, setAuthLinkStatus] = useState<AuthLinkStatus>('idle');
  const [authLinkFlow, setAuthLinkFlow] = useState<AuthLinkFlow>('confirmation');
  const [authLinkError, setAuthLinkError] = useState<string | null>(null);
  const recoveryLinkInFlight = useRef(false);
  const recoveryLinkAccepted = useRef(false);

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    let mounted = true;
    const subscription = client.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setLoading(false);

      if (event === 'PASSWORD_RECOVERY') {
        recoveryLinkInFlight.current = false;
        recoveryLinkAccepted.current = true;
        setPersistedRecoveryPending(true);
        setRecoveryRequired(true);
        setAuthLinkFlow('recovery');
      } else if (event === 'SIGNED_OUT') {
        recoveryLinkInFlight.current = false;
        recoveryLinkAccepted.current = false;
        setPersistedRecoveryPending(false);
        setRecoveryRequired(false);
      }
    }).data.subscription;

    void client.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
      if (!recoveryLinkInFlight.current && !recoveryLinkAccepted.current) {
        if (data.session) {
          const recoveryPending = getPersistedRecoveryPending();
          recoveryLinkAccepted.current = recoveryPending;
          setRecoveryRequired(recoveryPending);
        } else {
          setPersistedRecoveryPending(false);
          setRecoveryRequired(false);
        }
      }
      if (error) logAuthError('session restoration', error);
    }).catch((error: unknown) => {
      if (!mounted) return;
      setLoading(false);
      logAuthError('session restoration', error);
    });

    const handleAuthUrl = async (url: string | null) => {
      if (!url) return;
      const parsed = Linking.parse(url);
      const callbackPath = [parsed.hostname, parsed.path].filter(Boolean).join('/').replace(/^\/+/, '');
      const isRecoveryRoute = callbackPath.endsWith('auth/reset-password');
      if (
        (!callbackPath.endsWith('auth/callback') && !isRecoveryRoute) ||
        !rememberAuthUrl(url)
      ) return;

      setAuthLinkStatus('processing');
      setAuthLinkError(null);
      const withoutHash = url.split('#')[0];
      const queryString = withoutHash.includes('?') ? withoutHash.slice(withoutHash.indexOf('?') + 1) : '';
      const hashString = url.includes('#') ? url.slice(url.indexOf('#') + 1) : '';
      const query = new URLSearchParams(queryString);
      const hash = new URLSearchParams(hashString);
      const callbackType = firstQueryValue(query, 'type') ?? firstQueryValue(hash, 'type');
      const isRecovery =
        isRecoveryRoute ||
        firstQueryValue(query, 'flow') === 'recovery' ||
        callbackType === 'recovery';

      setAuthLinkFlow(isRecovery ? 'recovery' : 'confirmation');
      if (isRecovery) {
        recoveryLinkAccepted.current = false;
        recoveryLinkInFlight.current = true;
      }

      const markAuthLinkSuccess = () => {
        if (isRecovery) {
          if (!recoveryLinkAccepted.current) {
            throw new Error('password_recovery_event_missing');
          }
          recoveryLinkInFlight.current = false;
          setRecoveryRequired(true);
          setPersistedRecoveryPending(true);
        }
        setAuthLinkStatus('success');
      };

      try {
        const errorCode = firstQueryValue(query, 'error_code') ?? firstQueryValue(hash, 'error_code');
        const authError = firstQueryValue(query, 'error') ?? firstQueryValue(hash, 'error');
        if (errorCode || authError) {
          throw new Error(errorCode ?? authError ?? 'callback_error');
        }

        const code = firstQueryValue(query, 'code');
        if (code) {
          const { error } = await client.auth.exchangeCodeForSession(code);
          if (error) throw error;
          markAuthLinkSuccess();
          return;
        }

        const tokenHash = firstQueryValue(query, 'token_hash');
        const tokenHashType =
          callbackType === 'signup' || callbackType === 'email' || callbackType === 'recovery'
            ? callbackType
            : isRecovery
              ? 'recovery'
              : null;
        if (tokenHash && tokenHashType) {
          const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: tokenHashType });
          if (error) throw error;
          markAuthLinkSuccess();
          return;
        }

        const accessToken = firstQueryValue(query, 'access_token') ?? firstQueryValue(hash, 'access_token');
        const refreshToken = firstQueryValue(query, 'refresh_token') ?? firstQueryValue(hash, 'refresh_token');
        if (accessToken && refreshToken) {
          const { error } = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (error) throw error;
          markAuthLinkSuccess();
          return;
        }

        throw new Error('callback_payload_missing');
      } catch (error) {
        setAuthLinkError(userFriendlyError(error, 'callback'));
        setAuthLinkStatus('error');
        if (isRecovery) {
          recoveryLinkInFlight.current = false;
          recoveryLinkAccepted.current = false;
          setPersistedRecoveryPending(false);
          setRecoveryRequired(false);
        }
        logAuthError('authentication callback', error);
      }
    };

    void Linking.getInitialURL().then(handleAuthUrl).catch((error: unknown) => {
      logAuthError('initial authentication link lookup', error);
    });
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
    recoveryRequired,
    authLinkStatus,
    authLinkFlow,
    authLinkError,
    signIn: async (email, password) => {
      if (!supabase) return { error: 'Supabase не е конфигуриран.' };
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (!error) return { error: null };
      logAuthError('sign in', error);
      return { error: userFriendlyError(error, 'sign-in') };
    },
    signUp: async (email, password, displayName) => {
      if (!supabase) return { error: 'Supabase не е конфигуриран.' };
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: createAuthRedirect(),
          data: { display_name: displayName.trim() },
        },
      });
      if (error) {
        logAuthError('sign up', error);
        if (isDuplicateRegistration(error)) return { error: null, confirmationRequired: true };
        return { error: userFriendlyError(error, 'sign-up') };
      }
      // Supabase intentionally returns the same shape for some duplicate and pending signups.
      // Keep the notice neutral and never claim that an account was definitely created.
      return { error: null, confirmationRequired: !data.session };
    },
    requestPasswordReset: async (email) => {
      if (!supabase) return { error: 'Supabase не е конфигуриран.' };
      const redirectTo = createAuthRedirect('recovery');
      if (__DEV__) console.info('[Auth] Password recovery redirect URL:', redirectTo);
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (!error) return { error: null };
      logAuthError('password recovery request', error);
      return { error: userFriendlyError(error, 'recovery-request') };
    },
    updatePasswordAndSignOut: async (password) => {
      if (!supabase) return { error: 'Supabase не е конфигуриран.' };
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        logAuthError('password update', error);
        return { error: userFriendlyError(error, 'password-update') };
      }

      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
      if (signOutError) logAuthError('local sign out after password update', signOutError);
      recoveryLinkInFlight.current = false;
      recoveryLinkAccepted.current = false;
      setPersistedRecoveryPending(false);
      setRecoveryRequired(false);
      return { error: null };
    },
    signOut: async () => {
      if (!supabase) return { error: 'Supabase не е конфигуриран.' };
      const { error } = await supabase.auth.signOut();
      if (!error) return { error: null };
      logAuthError('sign out', error);
      return { error: userFriendlyError(error, 'generic') };
    },
  }), [authLinkError, authLinkFlow, authLinkStatus, loading, recoveryRequired, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
