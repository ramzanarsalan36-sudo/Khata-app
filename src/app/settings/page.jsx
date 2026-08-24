'use client';

import React, { useState } from 'react';
import { useShop } from '@/lib/context/ShopContext';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import ShopProfileForm from '@/components/settings/ShopProfileForm';
import ExportSection from '@/components/settings/ExportSection';
import CreateShopModal from '@/components/dashboard/CreateShopModal';
import DesktopSidebar from '@/components/common/DesktopSidebar';
import BottomNav from '@/components/common/BottomNav';
import { Store, LogOut, Plus, User, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const { user, currentShop, shops, switchShop, currentRole } = useShop();
  const [showCreateShopModal, setShowCreateShopModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await supabase.auth.signOut();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('khata_active_shop_id');
      }
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">
      {/* Desktop Left Sidebar (>= 1024px) */}
      <DesktopSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-8">
        {/* Mobile Header (< 1024px) */}
        <div className="lg:hidden bg-emerald-700 text-white p-4 sticky top-0 z-30 shadow-md">
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="p-1 -ml-1 text-emerald-100 hover:text-white rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-bold text-base">Settings & Profile</h1>
          </div>
        </div>

        {/* Desktop Header (>= 1024px) */}
        <div className="hidden lg:flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200 sticky top-0 z-30">
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Settings & Business Profile
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Manage shop details, data exports, team roles, and account settings
            </p>
          </div>
        </div>

        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          {/* Responsive 2-Column Grid on Desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Shop Switcher & Account Details (4 Cols on Desktop) */}
            <div className="lg:col-span-4 space-y-4">
              {/* Shop Switcher Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                    Your Shops ({shops.length})
                  </h3>
                  <button
                    onClick={() => setShowCreateShopModal(true)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Shop</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {shops.map((shop) => (
                    <button
                      key={shop.id}
                      onClick={() => switchShop(shop.id)}
                      className={`w-full p-3 rounded-xl text-left text-xs font-medium flex items-center justify-between transition ${
                        currentShop?.id === shop.id
                          ? 'bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-100'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <p className="truncate font-semibold">{shop.shop_name}</p>
                        <p className="text-[10px] text-slate-400 font-normal capitalize">
                          Role: {shop.role}
                        </p>
                      </div>
                      {currentShop?.id === shop.id && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-600 text-white font-bold shrink-0">
                          Active
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* User Account Info & Logout Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800 text-sm">Account Details</p>
                    <p className="text-xs text-slate-400 truncate">
                      {user?.email || user?.phone || 'Authenticated User'}
                    </p>
                    <p className="text-[11px] text-emerald-700 font-semibold capitalize mt-0.5">
                      Role: {currentRole || 'Member'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-50"
                >
                  {loggingOut ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Signing out...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out / Logout</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column: Shop Profile & Data Export (8 Cols on Desktop) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Shop Profile Form */}
              <ShopProfileForm />

              {/* Export & Data Backup */}
              <ExportSection />
            </div>
          </div>
        </main>

        {/* Mobile Bottom Navigation (< 1024px) */}
        <BottomNav />
      </div>

      {showCreateShopModal && (
        <CreateShopModal onClose={() => setShowCreateShopModal(false)} />
      )}
    </div>
  );
}
