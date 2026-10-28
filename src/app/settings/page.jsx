'use client';

import React, { useState } from 'react';
import { useShop } from '@/lib/context/ShopContext';
import { useRouter } from 'next/navigation';
import ShopProfileForm from '@/components/settings/ShopProfileForm';
import ExportSection from '@/components/settings/ExportSection';
import CreateShopModal from '@/components/dashboard/CreateShopModal';
import DesktopSidebar from '@/components/common/DesktopSidebar';
import BottomNav from '@/components/common/BottomNav';
import { Store, LogOut, Plus, User, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const { user, currentShop, shops, switchShop, currentRole, signOut } = useShop();
  const [showCreateShopModal, setShowCreateShopModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('khata_active_shop_id');
      }
      if (signOut) {
        await signOut();
      } else {
        router.push('/login');
      }
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
            <h1 className="font-extrabold text-xl text-slate-900">Settings & Profile</h1>
            <p className="text-xs text-slate-400">
              Manage your shop profile, data exports, and switch accounts
            </p>
          </div>
        </div>

        {/* Content Container */}
        <div className="p-4 lg:p-8 max-w-4xl w-full space-y-6">
          {/* Shop Switcher Card (Mobile & Tablet) */}
          <div className="lg:hidden bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-emerald-700" />
                <h2 className="font-bold text-sm text-slate-800">Your Shops</h2>
              </div>
              <button
                onClick={() => setShowCreateShopModal(true)}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Shop</span>
              </button>
            </div>

            <div className="space-y-2">
              {shops.map((shop) => (
                <button
                  key={shop.id}
                  onClick={() => switchShop(shop.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition ${
                    currentShop?.id === shop.id
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-2xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{shop.shop_name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{shop.owner_name}</p>
                  </div>
                  {currentShop?.id === shop.id && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                      Active
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Shop Profile Form */}
          <ShopProfileForm />

          {/* Export Statements & Reports Section */}
          <ExportSection />

          {/* Account & Logout Card */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <User className="w-5 h-5 text-slate-600" />
              <h2 className="font-extrabold text-base text-slate-900">Account Details</h2>
            </div>

            <div className="flex items-center justify-between text-xs p-3 bg-slate-50 rounded-2xl">
              <div>
                <p className="font-bold text-slate-700">{user?.displayName || currentShop?.owner_name || 'Dukaan Malik'}</p>
                <p className="text-slate-400">{user?.email || user?.phoneNumber || 'Active Session'}</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                {currentRole || 'Owner'}
              </span>
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-sm rounded-2xl border border-rose-200 transition active:scale-98 disabled:opacity-50"
            >
              {loggingOut ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Logging out...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  <span>Log Out (Bahir Niklein)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Nav for Mobile */}
      <BottomNav />

      {/* Create Shop Modal */}
      {showCreateShopModal && (
        <CreateShopModal onClose={() => setShowCreateShopModal(false)} />
      )}
    </div>
  );
}
