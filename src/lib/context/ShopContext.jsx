'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const ShopContext = createContext({
  user: null,
  shops: [],
  currentShop: null,
  currentRole: null,
  loading: true,
  switchShop: () => {},
  refreshShops: () => {},
  createShop: async () => {},
});

export function ShopProvider({ children }) {
  const [user, setUser] = useState(null);
  const [shops, setShops] = useState([]);
  const [currentShop, setCurrentShop] = useState(null);
  const [currentRole, setCurrentRole] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();
  const router = useRouter();

  const loadUserAndShops = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !authUser) {
        setUser(null);
        setShops([]);
        setCurrentShop(null);
        setCurrentRole(null);
        setLoading(false);
        return;
      }

      setUser(authUser);

      // Fetch user's shops with roles
      const { data: memberData, error: memberError } = await supabase
        .from('shop_members')
        .select(`
          role,
          created_at,
          shop:shops (
            id,
            shop_name,
            owner_name,
            phone,
            address,
            is_active,
            created_at
          )
        `)
        .eq('user_id', authUser.id);

      if (memberError) {
        console.error('Error fetching shops:', memberError);
        setLoading(false);
        return;
      }

      const activeShops = (memberData || [])
        .filter((item) => item.shop && item.shop.is_active)
        .map((item) => ({
          ...item.shop,
          role: item.role,
        }));

      setShops(activeShops);

      // Check saved shop in localStorage or default to first
      const savedShopId = typeof window !== 'undefined' ? localStorage.getItem('khata_active_shop_id') : null;
      let selected = activeShops.find((s) => s.id === savedShopId) || activeShops[0] || null;

      setCurrentShop(selected);
      setCurrentRole(selected ? selected.role : null);
    } catch (err) {
      console.error('Unexpected error loading shops:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadUserAndShops();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadUserAndShops();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setShops([]);
        setCurrentShop(null);
        setCurrentRole(null);
        setLoading(false);
        router.push('/login');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [loadUserAndShops, supabase, router]);

  const switchShop = (shopId) => {
    const target = shops.find((s) => s.id === shopId);
    if (target) {
      setCurrentShop(target);
      setCurrentRole(target.role);
      if (typeof window !== 'undefined') {
        localStorage.setItem('khata_active_shop_id', target.id);
      }
    }
  };

  const createShop = async ({ shop_name, owner_name, phone, address }) => {
    try {
      const { data, error } = await supabase.rpc('create_shop_with_owner', {
        p_shop_name: shop_name,
        p_owner_name: owner_name,
        p_phone: phone || null,
        p_address: address || null,
      });

      if (error) throw error;
      await loadUserAndShops();
      return { success: true, shop: data.shop };
    } catch (err) {
      console.error('Failed to create shop:', err);
      return { success: false, error: err.message };
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
        refreshShops: loadUserAndShops,
        createShop,
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
