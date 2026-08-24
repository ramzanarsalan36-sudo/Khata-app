'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useShop } from '@/lib/context/ShopContext';
import { createClient } from '@/lib/supabase/client';
import {
  Store,
  Users,
  Settings,
  FileSpreadsheet,
  LogOut,
  Plus,
  ChevronDown,
  ShieldCheck,
  Shield,
  UserCheck,
  User,
  Loader2,
} from 'lucide-react';
import CreateShopModal from '@/components/dashboard/CreateShopModal';

export default function DesktopSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, currentShop, shops, switchShop, currentRole } = useShop();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showCreateShopModal, setShowCreateShopModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const supabase = createClient();

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

  const isDashboard = pathname === '/dashboard' || pathname.startsWith('/dashboard/customer');
  const isSettings = pathname.startsWith('/settings');

  const getRoleBadge = (role) => {
    switch (role) {
      case 'owner':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" /> Owner
          </span>
        );
      case 'manager':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Shield className="w-3.5 h-3.5" /> Manager
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <UserCheck className="w-3.5 h-3.5" /> Staff
          </span>
        );
    }
  };

  return (
    <>
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 bg-white border-r border-slate-200 shrink-0 h-screen sticky top-0 z-40 select-none">
        {/* Top Header & Brand */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
              <Store className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-sm text-slate-900 tracking-tight block truncate">
                Digital Udhar Khata
              </span>
              <span className="text-[11px] text-slate-400 font-medium block">
                Business Ledger System
              </span>
            </div>
          </div>

          {/* Shop Switcher Card */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between transition group"
            >
              <div className="text-left min-w-0 pr-2">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {currentShop?.shop_name || 'My Shop'}
                </p>
                <div className="mt-0.5">
                  {currentRole && getRoleBadge(currentRole)}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition shrink-0" />
            </button>

            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden py-1">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Switch Shop ({shops.length})
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {shops.map((shop) => (
                      <button
                        key={shop.id}
                        onClick={() => {
                          switchShop(shop.id);
                          setDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition ${
                          currentShop?.id === shop.id
                            ? 'bg-emerald-50 text-emerald-800 font-bold'
                            : 'text-slate-700'
                        }`}
                      >
                        <div className="truncate">
                          <p className="truncate">{shop.shop_name}</p>
                          <p className="text-[10px] text-slate-400 capitalize">{shop.role}</p>
                        </div>
                        {currentShop?.id === shop.id && (
                          <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-slate-100 mt-1">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        setShowCreateShopModal(true);
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-bold text-emerald-700 flex items-center gap-1.5 hover:bg-emerald-50 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Create New Shop</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Navigation Menu Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
              isDashboard
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Users className={`w-4 h-4 ${isDashboard ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>Customers & Khata</span>
          </Link>

          <Link
            href="/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
              isSettings
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Settings className={`w-4 h-4 ${isSettings ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>Settings & Export</span>
          </Link>
        </nav>

        {/* User Account & Logout Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/80 mb-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-slate-800 truncate">
                {user?.email || user?.phone || 'Authenticated User'}
              </p>
              <p className="text-[10px] text-slate-400 capitalize">{currentRole || 'Member'}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50 active:scale-98"
          >
            {loggingOut ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Signing out...</span>
              </>
            ) : (
              <>
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {showCreateShopModal && (
        <CreateShopModal onClose={() => setShowCreateShopModal(false)} />
      )}
    </>
  );
}
