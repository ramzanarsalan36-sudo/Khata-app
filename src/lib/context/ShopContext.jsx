'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { subscribeUserShops, createShop as createShopDb } from '@/lib/firebase/db';
import { useRouter, usePathname } from 'next/navigation';

export const AUTHORIZED_UID = 'FNSMYvR9vhOcvFVPdfu6N7i1Lyc2';

const ShopContext = createContext({
  user: null,
  shops: [],
  currentShop: null,
  currentRole: null,
  loading: true,
  switchShop: () => {},
  refreshShops: () => {},
  createShop: async () => {},
  signOut: async () => {},
});

export function ShopProvider({ children }) {
  const [user, setUser] = useState(null);
  const [shops, setShops] = useState([]);
  const [currentShop, setCurrentShop] = useState(null);
  const [currentRole, setCurrentRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();

  const handleShopsLoaded = useCallback((loadedShops) => {
    setShops(loadedShops || []);

    const savedShopId = typeof window !== 'undefined' ? localStorage.getItem('khata_active_shop_id') : null;
    let selected = (loadedShops || []).find((s) => s.id === savedShopId) || (loadedShops && loadedShops[0]) || null;

    setCurrentShop(selected);
    setCurrentRole(selected ? selected.role : 'owner');
    setLoading(false);
  }, []);

  // Listen strictly to Firebase Auth
  useEffect(() => {
    let unsubscribeShops = null;

    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
      if (unsubscribeShops) unsubscribeShops();

      if (authUser) {
        // Strict UID Check: Only authorized UID can access
        if (authUser.uid !== AUTHORIZED_UID) {
          console.warn('Unauthorized user attempted login. Signing out.');
          await firebaseSignOut(auth);
          setUser(null);
          setShops([]);
          setCurrentShop(null);
          setCurrentRole(null);
          setLoading(false);
          router.push('/login');
          return;
        }

        setUser(authUser);
        unsubscribeShops = subscribeUserShops(authUser.uid, handleShopsLoaded);
      } else {
        setUser(null);
        setShops([]);
        setCurrentShop(null);
        setCurrentRole(null);
        setLoading(false);

        // Protect dashboard and settings routes
        const isProtected = pathname.startsWith('/dashboard') || pathname.startsWith('/settings');
        if (isProtected) {
          router.push('/login');
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeShops) unsubscribeShops();
    };
  }, [handleShopsLoaded, pathname, router]);

  const switchShop = (shopId) => {
    const target = shops.find((s) => s.id === shopId);
    if (target) {
      setCurrentShop(target);
      setCurrentRole(target.role || 'owner');
      if (typeof window !== 'undefined') {
        localStorage.setItem('khata_active_shop_id', target.id);
      }
    }
  };

  const createShop = async ({ shop_name, owner_name, phone, address }) => {
    try {
      const uid = user?.uid || AUTHORIZED_UID;
      const created = await createShopDb(
        {
          shop_name,
          owner_name,
          phone,
          address,
        },
        uid
      );

      setShops((prev) => [...prev, created]);
      setCurrentShop(created);
      setCurrentRole('owner');
      if (typeof window !== 'undefined') {
        localStorage.setItem('khata_active_shop_id', created.id);
      }
      return { success: true, shop: created };
    } catch (err) {
      console.error('Failed to create shop:', err);
      return { success: false, error: err.message };
    }
  };

  const signOut = async () => {
    try {
      if (auth) {
        await firebaseSignOut(auth);
      }
      if (typeof window !== 'undefined') {
        localStorage.removeItem('khata_active_shop_id');
      }
      setUser(null);
      setShops([]);
      setCurrentShop(null);
      setCurrentRole(null);
      router.push('/login');
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  return (
    <ShopContext.Provider
      value={{
        user,
        shops,
        currentShop,
        currentRole,
        loading,
        switchShop,
        refreshShops: () => {},
        createShop,
        signOut,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
}
