"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import {
  getPermissionsForRole,
  isAccountManager as checkAccountManager,
  isAdmin as checkAdmin,
  isPartner as checkPartner,
  roleHasPermission,
} from "@/lib/auth/permissions";
import type { AppSession, Permission, UserRole, UserStatus } from "@/types";

interface CurrentUserContextValue {
  user: AppSession | null;
  role: UserRole | null;
  partnerId: string | null;
  accountManagerId: string | null;
  status: UserStatus | null;
  permissions: Permission[];
  isAuthenticated: boolean;
  isAdmin: boolean;
  isAccountManager: boolean;
  isPartner: boolean;
  can: (permission: Permission) => boolean;
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

interface CurrentUserProviderProps {
  children: ReactNode;
  session: AppSession | null;
}

export function CurrentUserProvider({
  children,
  session,
}: CurrentUserProviderProps) {
  const value = useMemo<CurrentUserContextValue>(() => {
    const role = session?.role ?? null;
    const permissions = role ? getPermissionsForRole(role) : [];

    return {
      user: session,
      role,
      partnerId: session?.partnerId ?? null,
      accountManagerId: session?.accountManagerId ?? null,
      status: session?.status ?? null,
      permissions,
      isAuthenticated: session !== null,
      isAdmin: checkAdmin(role),
      isAccountManager: checkAccountManager(role),
      isPartner: checkPartner(role),
      can: (permission: Permission) =>
        role ? roleHasPermission(role, permission) : false,
    };
  }, [session]);

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): CurrentUserContextValue {
  const context = useContext(CurrentUserContext);

  if (!context) {
    throw new Error("useCurrentUser must be used within CurrentUserProvider");
  }

  return context;
}
