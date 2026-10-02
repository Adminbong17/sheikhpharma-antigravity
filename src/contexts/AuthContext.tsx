import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  isVendor: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isAdmin: false,
  isVendor: false,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVendor, setIsVendor] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchRoles = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (error) {
        console.error("fetchRoles error:", error.message);
        setIsAdmin(false);
        setIsVendor(false);
        return;
      }

      const roles = (data || []).map((r) => r.role);
      setIsAdmin(roles.includes("admin"));
      setIsVendor(roles.includes("vendor"));
    } catch (e) {
      console.error("fetchRoles exception:", e);
      setIsAdmin(false);
      setIsVendor(false);
    }
  }, []);

  const applySession = useCallback((nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (nextSession?.user) {
      void fetchRoles(nextSession.user.id);
      return;
    }

    setIsAdmin(false);
    setIsVendor(false);
  }, [fetchRoles]);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { session: storedSession },
        } = await supabase.auth.getSession();

        let nextSession = storedSession;
        const isExpired = nextSession?.expires_at
          ? nextSession.expires_at * 1000 <= Date.now() + 5_000
          : false;

        if (isExpired) {
          const { data, error } = await supabase.auth.refreshSession();

          if (error) {
            console.error("refreshSession error:", error.message);
            await supabase.auth.signOut({ scope: "local" });
            nextSession = null;
          } else {
            nextSession = data.session;
          }
        }

        if (!isMounted) return;
        applySession(nextSession);
      } catch (error) {
        console.error("initializeAuth error:", error);
        if (!isMounted) return;
        applySession(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      applySession(nextSession);
    });

    void initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, isAdmin, isVendor, loading, signOut }}>
      {loading ? (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
