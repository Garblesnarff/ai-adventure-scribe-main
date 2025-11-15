import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { User, Session, AuthError, SupabaseClient } from '@supabase/supabase-js';

import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';
import { addNetworkListener, isOffline } from '@/utils/network';

export type BlogRole = 'admin' | 'editor' | 'author' | 'contributor' | 'viewer';
export type UserPlan = 'free' | 'pro' | 'enterprise';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  blogRole: BlogRole | null;
  blogRoleLoading: boolean;
  isBlogAdmin: boolean;
  refreshBlogRole: () => Promise<void>;
  userPlan: UserPlan | null;
  userPlanLoading: boolean;
  refreshUserPlan: () => Promise<void>;
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
  const [blogRole, setBlogRole] = useState<BlogRole | null>(null);
  const [blogRoleLoading, setBlogRoleLoading] = useState(false);
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [userPlanLoading, setUserPlanLoading] = useState(false);
  const hasBootstrapped = useRef(false);

  const setAuthState = useMemo(
    () => (nextSession: Session | null) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      persistSession(nextSession);

      if (!nextSession?.user) {
        setBlogRole(null);
        setBlogRoleLoading(false);
        setUserPlan(null);
        setUserPlanLoading(false);
      }
    },
    [],
  );

  const fetchBlogRole = useCallback(async () => {
    if (!user) {
      setBlogRole(null);
      setBlogRoleLoading(false);
      return;
    }

    if (isOffline()) {
      setBlogRoleLoading(false);
      return;
    }

    setBlogRoleLoading(true);
    try {
      // Dev override: allow admin access in non-production without email setup
      const devAdminEmail = (import.meta as any)?.env?.VITE_DEV_BLOG_ADMIN_EMAIL as
        | string
        | undefined;
      const devOverrideRaw = (import.meta as any)?.env?.VITE_BLOG_ADMIN_DEV_OVERRIDE as
        | string
        | undefined;
      const isDev = (import.meta as any)?.env?.MODE !== 'production';
      const enableDevOverride =
        devOverrideRaw === 'true' ||
        devOverrideRaw === '1' ||
        (devOverrideRaw === undefined && !devAdminEmail);
      if (isDev && enableDevOverride) {
        setBlogRole('admin');
        return;
      }
      // If a specific dev admin email is set, grant admin for that user
      if (
        isDev &&
        devAdminEmail &&
        user.email &&
        user.email.toLowerCase() === devAdminEmail.toLowerCase()
      ) {
        setBlogRole('admin');
        return;
      }

      const client = supabase as SupabaseClient<any, any, any>;
      // Use RPC that encapsulates role resolution across profiles/authors instead of querying a table directly
      const { data, error } = await client.rpc('blog_role_for_user', { p_user_id: user.id });

      if (error) throw error;

      setBlogRole((data as BlogRole | null) ?? null);
    } catch (error) {
      logger.warn('Failed to load blog role', error);
      setBlogRole(null);
    } finally {
      setBlogRoleLoading(false);
    }
  }, [user]);

  const fetchUserPlan = useCallback(async () => {
    if (!user || !session?.access_token) {
      setUserPlan(null);
      setUserPlanLoading(false);
      return;
    }

    if (isOffline()) {
      setUserPlanLoading(false);
      return;
    }

    setUserPlanLoading(true);
    try {
      const response = await fetch('http://localhost:8888/v1/llm/quota', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user plan');
      }

      const data = await response.json();
      setUserPlan((data.plan as UserPlan) || 'free');
    } catch (error) {
      logger.warn('Failed to load user plan', error);
      setUserPlan('free'); // Default to free on error
    } finally {
      setUserPlanLoading(false);
    }
  }, [user, session]);

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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== 'INITIAL_SESSION') {
        logger.info('Auth state changed:', { event, hasSession: !!session });
      }
      setAuthState(session ?? null);
      setLoading(false);
    });

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
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchBlogRole();
    // Recompute role only when user.id changes, not when fetchBlogRole reference changes
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    fetchUserPlan();
    // Recompute plan only when user.id or session changes
  }, [user?.id, session?.access_token]);

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
    blogRole,
    blogRoleLoading,
    isBlogAdmin: blogRole === 'admin',
    refreshBlogRole: fetchBlogRole,
    userPlan,
    userPlanLoading,
    refreshUserPlan: fetchUserPlan,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
