'use client';

import React, { useState, useEffect } from 'react';
import { useShop } from '@/lib/context/ShopContext';
import { subscribeShopCustomers } from '@/lib/firebase/db';
import SummaryCards from '@/components/dashboard/SummaryCards';
import CustomerList from '@/components/dashboard/CustomerList';
import AddCustomerModal from '@/components/dashboard/AddCustomerModal';
import AddCustomerFAB from '@/components/common/AddCustomerFAB';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function DashboardPage() {
  const { currentShop, loading: shopLoading } = useShop();
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

  // Subscribe to real-time customers from Firebase Realtime Database
  useEffect(() => {
    if (!currentShop?.id) {
      if (!shopLoading) setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = subscribeShopCustomers(currentShop.id, (customers) => {
      const totalUdhaar = customers.reduce(
        (sum, c) => (Number(c.balance) > 0 ? sum + Number(c.balance) : sum),
        0
      );
      const totalAdvance = customers.reduce(
        (sum, c) => (Number(c.balance) < 0 ? sum + Math.abs(Number(c.balance)) : sum),
        0
      );

      setStats({
        total_customers: customers.length,
        total_udhaar: totalUdhaar,
        total_advance: totalAdvance,
        net_balance: totalUdhaar - totalAdvance,
        today_udhaar: 0,
        today_jama: 0,
      });

      const debtors = customers
        .filter((c) => Number(c.balance) > 0)
        .sort((a, b) => Number(b.balance) - Number(a.balance))
        .slice(0, 5);

      setTopDebtors(debtors);
      setLoading(false);
      setRefreshing(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentShop?.id, shopLoading]);

  const handleRefresh = () => {
    setRefreshing(true);
    setListRefreshKey((prev) => prev + 1);
    setTimeout(() => setRefreshing(false), 600);
  };

  const handleCustomerAdded = () => {
    setListRefreshKey((prev) => prev + 1);
  };

  if ((loading || shopLoading) && !refreshing) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <LoadingSpinner size="lg" text="Loading realtime ledger..." />
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

      {/* Realtime Searched & Filtered Customer List */}
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
