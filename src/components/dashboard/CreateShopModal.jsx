'use client';

import React, { useState } from 'react';
import { useShop } from '@/lib/context/ShopContext';
import { normalizePhoneNumber } from '@/lib/utils/phone';
import { Store, X, Loader2, AlertCircle } from 'lucide-react';

export default function CreateShopModal({ onClose, isInitial = false }) {
  const { createShop } = useShop();
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(digitsOnly);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanShop = shopName.trim();
    const cleanOwner = ownerName.trim();

    if (!cleanShop || cleanShop.length < 2) {
      setError('Dukan ka valid naam darj karein (kam se kam 2 akshar).');
      return;
    }
    if (!cleanOwner || cleanOwner.length < 2) {
      setError('Malik ka valid naam darj karein (kam se kam 2 akshar).');
      return;
    }

    if (phone && phone.length > 0 && phone.length !== 10) {
      setError('Mobile number pure 10 digits ka hona chahiye.');
      return;
    }

    if (phone && !/^[6-9]\d{9}$/.test(phone)) {
      setError('Valid 10-digit Indian mobile number darj karein (6, 7, 8 ya 9 se shuru hona chahiye).');
      return;
    }

    setLoading(true);
    setError(null);

    const cleanPhone = phone ? normalizePhoneNumber(phone) : null;

    const res = await createShop({
      shop_name: cleanShop,
      owner_name: cleanOwner,
      phone: cleanPhone,
      address: address.trim() || null,
    });

    setLoading(false);

    if (res.success) {
      if (onClose) onClose();
    } else {
      setError(res.error || 'Failed to create shop. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl sm:rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-base">
                {isInitial ? 'Set Up Your Shop' : 'Add New Shop'}
              </h2>
              <p className="text-xs text-slate-400">
                {isInitial ? 'Create your first digital khata' : 'Manage another business/branch'}
              </p>
            </div>
          </div>
          {!isInitial && (
            <button
              onClick={onClose}
              disabled={loading}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg disabled:opacity-50"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Shop / Business Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sharma General Store"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Owner Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Sharma"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Shop Phone Number (10 Digits Only)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-sm font-semibold text-slate-400">
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                placeholder="9876543210"
                value={phone}
                onChange={handlePhoneChange}
                className="w-full pl-12 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Sirf 10 digit ka number likhein.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Address / City (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Main Market, Jaipur"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>

          <div className="space-y-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition active:scale-98 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Shop...</span>
                </>
              ) : (
                <span>Create Shop & Open Khata</span>
              )}
            </button>

            {!isInitial && onClose && (
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="w-full py-2.5 text-slate-500 hover:text-slate-700 text-xs font-bold text-center transition hover:bg-slate-100 rounded-xl disabled:opacity-50"
              >
                Cancel (Radd Karein)
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
