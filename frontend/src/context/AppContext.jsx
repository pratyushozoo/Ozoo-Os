import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

export function AppProvider({ children }) {
  const { user } = useAuth();
  const [boot, setBoot] = useState(null);
  const [business, setBusiness] = useState("all");

  useEffect(() => {
    if (!user) return;
    api.bootstrap().then((b) => {
      setBoot(b);
      if (user.role === "super_admin") setBusiness("all");
      else if (user.business_id) setBusiness(user.business_id);
      else setBusiness("all");
    });
  }, [user]);

  const byId = useMemo(() => {
    const idx = (arr) => Object.fromEntries((arr || []).map((x) => [x.id, x]));
    return {
      usersById: idx(boot?.users),
      teamsById: idx(boot?.teams),
      servicesById: idx(boot?.services),
      clientsById: idx(boot?.clients),
      departmentsById: idx(boot?.departments),
      businessesById: idx(boot?.businesses),
    };
  }, [boot]);

  const value = {
    boot,
    business,
    setBusiness,
    businessId: business === "all" ? undefined : business,
    businesses: boot?.businesses || [],
    ...byId,
    lists: {
      users: boot?.users || [],
      teams: boot?.teams || [],
      services: boot?.services || [],
      clients: boot?.clients || [],
      departments: boot?.departments || [],
    },
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
