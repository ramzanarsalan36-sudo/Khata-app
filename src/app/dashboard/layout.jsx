'use client';

import React from 'react';
import Navbar from '@/components/common/Navbar';
import DesktopSidebar from '@/components/common/DesktopSidebar';
import BottomNav from '@/components/common/BottomNav';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import CreateShopModal from '@/components/dashboard/CreateShopModal';
import { useShop } from '@/lib/context/ShopContext';

export default function DashboardLayout({ children }) {
  const { currentShop, shops, loading } = useShop();

  if (loading && !currentShop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" text="Loading your Khata..." />
      </div>
    );
  }

  // If user hasn't created or joined any shop yet
  if (!loading && (!shops || shops.length === 0)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <CreateShopModal isInitial={true} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">
      {/* Desktop Left Sidebar (>= 1024px) */}
      <DesktopSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-8">
        <Navbar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6">
          {children}
        </main>
        {/* Mobile Bottom Navigation (< 1024px) */}
        <BottomNav />
      </div>
    </div>
  );
}
