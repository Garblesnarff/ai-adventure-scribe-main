import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';
import { addNetworkListener, isOffline } from '@/utils/network';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const SESSION_STORAGE_KEY = 'aas_supabase_cached_session';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const loadCachedSession = (): Session | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch (error) {
    logger.warn('Failed to parse cached session', error);
    return null;
  }
};

const persistSession = (session: Session | null) => {
  if (typeof window === 'undefined') return;
  if (session) {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const hasBootstrapped = useRef(false);

  const setAuthState = useMemo(
    () =>
      (nextSession: Session | null) => {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        persistSession(nextSession);
      },
    []
  );

  useEffect(() => {
    // Get initial session
    const bootstrapSession = async () => {
      if (hasBootstrapped.current) return;
      hasBootstrapped.current = true;

      if (isOffline()) {
        const cached = loadCachedSession();
        if (cached) {
          setAuthState(cached);
        }
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.getSession();

      if (error) {
        logger.error('Error getting session:', error);
        const cached = loadCachedSession();
        if (cached) {
          setAuthState(cached);
        }
      } else {
        setAuthState(data.session ?? null);
      }
      setLoading(false);
    };

    bootstrapSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.info('Auth state changed:', { event, hasSession: !!session });
        setAuthState(session ?? null);
        setLoading(false);
      }
    );

    const disposers: Array<() => void> = [() => subscription.unsubscribe()];

    const handleOnline = async () => {
      logger.info('Network status: online - syncing Supabase session');
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        logger.error('Error refreshing session after reconnect:', error);
        return;
      }
      setAuthState(data.session ?? null);
    };

    const handleOffline = () => {
      logger.info('Network status: offline - using cached session');
      const cached = loadCachedSession();
      if (cached) {
        setAuthState(cached);
      }
    };

    disposers.push(addNetworkListener('online', handleOnline));
    disposers.push(addNetworkListener('offline', handleOffline));

    return () => {
      disposers.forEach((dispose) => dispose());
    };
  }, [setAuthState]);

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error('Error signing out:', error);
    }
    setAuthState(null);
    setLoading(false);
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};