'use client';

import React, { useState } from 'react';
import { useShop } from '@/lib/context/ShopContext';
import { Store, ChevronDown, Plus, Settings, ShieldCheck, UserCheck, Shield } from 'lucide-react';
import Link from 'next/link';
import CreateShopModal from '@/components/dashboard/CreateShopModal';

export default function Navbar() {
  const { currentShop, shops, switchShop, currentRole } = useShop();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showCreateShopModal, setShowCreateShopModal] = useState(false);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'owner':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
            <ShieldCheck className="w-3 h-3" /> Owner
          </span>
        );
      case 'manager':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
            <Shield className="w-3 h-3" /> Manager
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
            <UserCheck className="w-3 h-3" /> Staff
          </span>
        );
    }
  };

  return (
    <>
      {/* Mobile Top Navbar (Visible on Mobile & Tablet < 1024px) */}
      <header className="lg:hidden bg-emerald-700 text-white px-4 py-3 sticky top-0 z-40 shadow-md">
        <div className="flex items-center justify-between">
          {/* Shop Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 text-left focus:outline-none focus:ring-2 focus:ring-white/40 rounded-lg p-1 transition"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-800 flex items-center justify-center text-emerald-200 border border-emerald-600">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="font-bold text-sm leading-tight max-w-[160px] sm:max-w-xs truncate">
                    {currentShop?.shop_name || 'My Shop'}
                  </h1>
                  <ChevronDown className="w-3.5 h-3.5 text-emerald-200 opacity-80" />
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {currentRole && getRoleBadge(currentRole)}
                </div>
              </div>
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute left-0 mt-2 w-64 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden py-1">
                  <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Your Shops
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {shops.map((shop) => (
                      <button
                        key={shop.id}
                        onClick={() => {
                          switchShop(shop.id);
                          setDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2.5 text-left text-sm flex items-center justify-between hover:bg-slate-50 transition ${
                          currentShop?.id === shop.id
                            ? 'bg-emerald-50 text-emerald-700 font-semibold'
                            : 'text-slate-700'
                        }`}
                      >
                        <div className="truncate">
                          <p className="truncate font-medium">{shop.shop_name}</p>
                          <p className="text-xs text-slate-400 capitalize">{shop.role}</p>
                        </div>
                        {currentShop?.id === shop.id && (
                          <span className="w-2 h-2 rounded-full bg-emerald-600" />
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
                      className="w-full px-3 py-2.5 text-left text-xs font-semibold text-emerald-700 flex items-center gap-2 hover:bg-emerald-50 transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Create New Shop</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Quick Settings Icon */}
          <Link
            href="/settings"
            className="w-9 h-9 rounded-lg bg-emerald-800/80 hover:bg-emerald-800 flex items-center justify-center text-white transition border border-emerald-600/50"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Desktop Top Header Bar (Visible on Desktop >= 1024px) */}
      <header className="hidden lg:flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200 sticky top-0 z-30">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
            {currentShop?.shop_name || 'My Shop'}
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            {currentShop?.address || 'Digital Udhar Khata Ledger'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span>Settings</span>
          </Link>
        </div>
      </header>

      {showCreateShopModal && (
        <CreateShopModal onClose={() => setShowCreateShopModal(false)} />
      )}
    </>
  );
}
