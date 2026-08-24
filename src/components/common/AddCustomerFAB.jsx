'use client';

import React from 'react';
import { Plus } from 'lucide-react';

/**
 * AddCustomerFAB - Single Source of Truth Floating Action Button
 * Fixed in the bottom-right of the viewport with safe margins.
 * Accessible with a circular 56px+ touch target and subtle glow animation.
 */
export default function AddCustomerFAB({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Add Customer"
      title="Add Customer (Naya Grahak Jodein)"
      className="fixed bottom-20 lg:bottom-8 right-5 lg:right-8 z-40 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex items-center justify-center shadow-2xl border-2 border-white ring-4 ring-emerald-600/30 animate-fab-glow transition duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 cursor-pointer select-none"
    >
      <Plus className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5]" aria-hidden="true" />
      <span className="sr-only">Add Customer</span>
    </button>
  );
}
