'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Settings } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const isCustomers = pathname === '/dashboard' || pathname.startsWith('/dashboard/customer');
  const isSettings = pathname.startsWith('/settings');

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 w-full bg-white border-t border-slate-200 z-30 shadow-lg pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto grid grid-cols-2 h-14">
        <Link
          href="/dashboard"
          className={`flex flex-col items-center justify-center gap-1 transition ${
            isCustomers ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[11px]">Customers (Grahak)</span>
        </Link>

        <Link
          href="/settings"
          className={`flex flex-col items-center justify-center gap-1 transition ${
            isSettings ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[11px]">Settings & Export</span>
        </Link>
      </div>
    </nav>
  );
}
