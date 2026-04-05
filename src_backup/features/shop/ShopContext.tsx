"use client";

import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";

interface ShopContextType {
  activeShopId: string | null;
  setActiveShopId: (shopId: string | null) => void;
  availableShops: { shopId: string; role: string; industry: string; shopName?: string }[];
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export const ShopProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [activeShopId, setActiveShopIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("gx_active_shop_id");
  });

  // 完全依赖 user.bindings，废除 isMockMode 逻辑
  const availableShops = useMemo(() => {
    return user && "bindings" in user && user.bindings ? user.bindings : [];
  }, [user]);

  const resolvedActiveShopId = useMemo(() => {
    if (availableShops.length === 0) return null;
    if (activeShopId && availableShops.some(s => s.shopId === activeShopId)) {
      return activeShopId;
    }
    if (typeof window !== "undefined") {
      const savedShopId = localStorage.getItem("gx_active_shop_id");
      if (savedShopId && availableShops.some(s => s.shopId === savedShopId)) {
        return savedShopId;
      }
    }
    return availableShops[0].shopId;
  }, [availableShops, activeShopId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (resolvedActiveShopId) {
      localStorage.setItem("gx_active_shop_id", resolvedActiveShopId);
    } else {
      localStorage.removeItem("gx_active_shop_id");
    }
  }, [resolvedActiveShopId]);

  const setActiveShopId = (shopId: string | null) => {
    setActiveShopIdState(shopId);
  };

  return (
    <ShopContext.Provider value={{ activeShopId: resolvedActiveShopId, setActiveShopId, availableShops }}>
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (context === undefined) {
    throw new Error("useShop must be used within a ShopProvider");
  }
  return context;
};
