'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Order, Role, User, Zone } from './types';
import { apiFetch, ApiError } from './api';

interface StoreShape {
  user: User | null;
  token: string | null;
  hydrated: boolean;
  orders: Order[];
  ordersLoading: boolean;
  register: (
    name: string,
    phone: string,
    password: string,
    opts?: { role?: Role; businessName?: string; address?: string }
  ) => Promise<User>;
  login: (phone: string, password: string) => Promise<User>;
  logout: () => void;
  refreshOrders: () => Promise<void>;
  placeOrder: (
    pickup: string,
    pickupZone: Zone,
    destination: string,
    dropoffZone: Zone,
    item: string,
    weight: string
  ) => Promise<Order>;
  payOrder: (orderId: string, momoPhone?: string) => Promise<{ ok: boolean; order: Order }>;
  cancelOrder: (orderId: string) => Promise<Order>;
  rateOrder: (orderId: string, stars: number, comment: string) => Promise<Order>;
  getOrder: (orderId: string) => Order | undefined;
}

const StoreContext = createContext<StoreShape | null>(null);

const LS_TOKEN = 'nyaruka_token';
const LS_USER = 'nyaruka_user';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const refreshOrders = useCallback(async (authToken?: string | null) => {
    const t = authToken ?? token;
    if (!t) return;
    setOrdersLoading(true);
    try {
      const data = await apiFetch<{ orders: Order[] }>('/orders', { token: t });
      setOrders(data.orders);
    } catch {
      // leave existing cached orders in place on a transient failure
    } finally {
      setOrdersLoading(false);
    }
  }, [token]);

  useEffect(() => {
    async function hydrate() {
      try {
        const storedToken = localStorage.getItem(LS_TOKEN);
        const storedUser = localStorage.getItem(LS_USER);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          // Re-verify against the server in case the session was revoked elsewhere.
          const data = await apiFetch<{ user: User }>('/auth/me', { token: storedToken });
          setUser(data.user);
          localStorage.setItem(LS_USER, JSON.stringify(data.user));
          await refreshOrders(storedToken);
        }
      } catch {
        localStorage.removeItem(LS_TOKEN);
        localStorage.removeItem(LS_USER);
        setToken(null);
        setUser(null);
      }
      setHydrated(true);
    }
    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistSession = useCallback((nextUser: User, nextToken: string) => {
    setUser(nextUser);
    setToken(nextToken);
    localStorage.setItem(LS_USER, JSON.stringify(nextUser));
    localStorage.setItem(LS_TOKEN, nextToken);
  }, []);

  const register = useCallback(
    async (
      name: string,
      phone: string,
      password: string,
      opts?: { role?: Role; businessName?: string; address?: string }
    ) => {
      const data = await apiFetch<{ user: User; token: string }>('/auth/register', {
        method: 'POST',
        body: { name, phone, password, ...opts },
      });
      persistSession(data.user, data.token);
      await refreshOrders(data.token);
      return data.user;
    },
    [persistSession, refreshOrders]
  );

  const login = useCallback(
    async (phone: string, password: string) => {
      const data = await apiFetch<{ user: User; token: string }>('/auth/login', {
        method: 'POST',
        body: { phone, password },
      });
      persistSession(data.user, data.token);
      await refreshOrders(data.token);
      return data.user;
    },
    [persistSession, refreshOrders]
  );

  const logout = useCallback(() => {
    if (token) {
      apiFetch('/auth/logout', { method: 'POST', token }).catch(() => {});
    }
    setUser(null);
    setToken(null);
    setOrders([]);
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_USER);
  }, [token]);

  const placeOrder = useCallback(
    async (pickup: string, pickupZone: Zone, destination: string, dropoffZone: Zone, item: string, weight: string) => {
      const data = await apiFetch<{ order: Order }>('/orders', {
        method: 'POST',
        token,
        body: { pickup, pickupZone, dropoff: destination, dropoffZone, item, weight },
      });
      setOrders((prev) => [data.order, ...prev]);
      return data.order;
    },
    [token]
  );

  const payOrder = useCallback(
    async (orderId: string, momoPhone?: string) => {
      const data = await apiFetch<{ ok: boolean; order: Order }>(`/orders/${orderId}/pay`, {
        method: 'POST',
        token,
        body: { momoPhone },
      });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
      return data;
    },
    [token]
  );

  const cancelOrder = useCallback(
    async (orderId: string) => {
      const data = await apiFetch<{ order: Order }>(`/orders/${orderId}/cancel`, { method: 'POST', token });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
      return data.order;
    },
    [token]
  );

  const rateOrder = useCallback(
    async (orderId: string, stars: number, comment: string) => {
      const data = await apiFetch<{ order: Order }>(`/orders/${orderId}/rate`, {
        method: 'POST',
        token,
        body: { stars, comment },
      });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
      return data.order;
    },
    [token]
  );

  const getOrder = useCallback((orderId: string) => orders.find((o) => o.id === orderId), [orders]);

  return (
    <StoreContext.Provider
      value={{
        user,
        token,
        hydrated,
        orders,
        ordersLoading,
        register,
        login,
        logout,
        refreshOrders,
        placeOrder,
        payOrder,
        cancelOrder,
        rateOrder,
        getOrder,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

export { ApiError };
