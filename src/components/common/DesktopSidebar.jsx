'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useShop } from '@/lib/context/ShopContext';
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
  const { user, currentShop, shops, switchShop, currentRole, signOut } = useShop();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showCreateShopModal, setShowCreateShopModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-200 min-h-screen shrink-0 sticky top-0 h-screen select-none">
        {/* Brand & Shop Switcher Area */}
        <div className="p-5 border-b border-slate-200">
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition text-left group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <Store className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-extrabold text-sm text-slate-900 truncate">
                    {currentShop?.shop_name || 'My Shop'}
                  </h2>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    {currentRole && getRoleBadge(currentRole)}
                  </div>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition shrink-0 ml-2" />
            </button>

            {/* Shop Switcher Dropdown */}
            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Switch Shop
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {shops.map((shop) => (
                    <button
                      key={shop.id}
                      onClick={() => {
                        switchShop(shop.id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-left transition ${
                        currentShop?.id === shop.id
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate pr-2">{shop.shop_name}</span>
                      {currentShop?.id === shop.id && (
                        <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="border-t border-slate-100 mt-2 pt-2 px-2">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      setShowCreateShopModal(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create New Shop</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Menu
          </div>

          <Link
            href="/dashboard"
            className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition ${
              isDashboard
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Customers & Ledger</span>
          </Link>

          <Link
            href="/settings"
            className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition ${
              isSettings
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings & Profile</span>
          </Link>
        </nav>

        {/* User Card & Logout Bottom Area */}
        <div className="p-4 border-t border-slate-200 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
              <User className="w-4 h-4 text-slate-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">
                {user?.displayName || currentShop?.owner_name || 'Dukaan Malik'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {user?.email || user?.phoneNumber || 'Active Session'}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition disabled:opacity-50"
          >
            {loggingOut ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogOut className="w-3.5 h-3.5" />
            )}
            <span>Log Out (Bahir Niklein)</span>
          </button>
        </div>
      </aside>

      {/* Create Shop Modal */}
      {showCreateShopModal && (
        <CreateShopModal onClose={() => setShowCreateShopModal(false)} />
      )}
    </>
  );
}
