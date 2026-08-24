'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useShop } from '@/lib/context/ShopContext';
import { createClient } from '@/lib/supabase/client';
import SummaryCards from '@/components/dashboard/SummaryCards';
import CustomerList from '@/components/dashboard/CustomerList';
import AddCustomerModal from '@/components/dashboard/AddCustomerModal';
import AddCustomerFAB from '@/components/common/AddCustomerFAB';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function DashboardPage() {
  const { currentShop } = useShop();
  const [stats, setStats] = useState({
    total_customers: 0,
    total_udhaar: 0,
    total_advance: 0,
    net_balance: 0,
    today_udhaar: 0,
    today_jama: 0,
  });
  const [topDebtors, setTopDebtors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  const supabase = createClient();

  const loadDashboardData = useCallback(async () => {
    if (!currentShop?.id) return;
    try {
      // 1. Fetch Aggregated Financial Statistics via Database RPC (or direct fallback)
      let dashboardStats = null;
      try {
        const { data: rpcStats, error: rpcError } = await supabase.rpc('get_dashboard_stats', {
          p_shop_id: currentShop.id,
        });
        if (!rpcError && rpcStats) {
          dashboardStats = rpcStats;
        }
      } catch (err) {
        console.warn('RPC get_dashboard_stats error, falling back:', err);
      }

      // Fallback query if RPC is not yet created in Supabase SQL editor
      if (!dashboardStats) {
        const { data: custRows, error: custErr } = await supabase
          .from('customers')
          .select('balance')
          .eq('shop_id', currentShop.id)
          .is('deleted_at', null);

        if (!custErr && custRows) {
          const totalUdhaar = custRows.reduce((sum, c) => (Number(c.balance) > 0 ? sum + Number(c.balance) : sum), 0);
          const totalAdvance = custRows.reduce((sum, c) => (Number(c.balance) < 0 ? sum + Math.abs(Number(c.balance)) : sum), 0);
          dashboardStats = {
            total_customers: custRows.length,
            total_udhaar: totalUdhaar,
            total_advance: totalAdvance,
            net_balance: totalUdhaar - totalAdvance,
          };
        }
      }

      if (dashboardStats) {
        setStats(dashboardStats);
      }

      // 2. Fetch Top Outstanding Debtors via RPC (or query fallback)
      let debtors = [];
      try {
        const { data: rpcDebtors, error: debtorsError } = await supabase.rpc('get_top_debtors', {
          p_shop_id: currentShop.id,
          p_limit: 5,
        });
        if (!debtorsError && rpcDebtors) {
          debtors = rpcDebtors;
        }
      } catch (err) {
        console.warn('RPC get_top_debtors error, falling back:', err);
      }

      if (!debtors || debtors.length === 0) {
        const { data: qDebtors } = await supabase
          .from('customers')
          .select('id, name, phone, photo_url, balance')
          .eq('shop_id', currentShop.id)
          .is('deleted_at', null)
          .gt('balance', 0)
          .order('balance', { ascending: false })
          .limit(5);

        if (qDebtors) debtors = qDebtors;
      }

      setTopDebtors(debtors || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentShop?.id, supabase]);

  useEffect(() => {
    if (currentShop?.id) {
      setLoading(true);
      loadDashboardData();
    }
  }, [currentShop?.id, loadDashboardData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
    setListRefreshKey((prev) => prev + 1);
  };

  const handleCustomerAdded = () => {
    loadDashboardData();
    setListRefreshKey((prev) => prev + 1);
  };

  if (loading && !refreshing) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <LoadingSpinner size="lg" text="Loading ledger dashboard..." />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative">
      {/* Financial Summary Top Card */}
      <SummaryCards
        totalUdhaar={Number(stats.total_udhaar || 0)}
        totalAdvance={Number(stats.total_advance || 0)}
        customerCount={Number(stats.total_customers || 0)}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      {/* Server-Side Paginated, Searched & Filtered Customer List */}
      <CustomerList
        key={`${currentShop?.id}_${listRefreshKey}`}
        topDebtors={topDebtors}
        onAddCustomerClick={() => setShowAddModal(true)}
      />

      {/* Single Source of Truth Floating Action Button */}
      <AddCustomerFAB onClick={() => setShowAddModal(true)} />

      {/* Add Customer Modal */}
      {showAddModal && (
        <AddCustomerModal
          onClose={() => setShowAddModal(false)}
          onCustomerAdded={handleCustomerAdded}
        />
      )}
    </div>
  );
}

