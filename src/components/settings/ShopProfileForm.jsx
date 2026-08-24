'use client';

import React, { useState, useEffect } from 'react';
import { useShop } from '@/lib/context/ShopContext';
import { createClient } from '@/lib/supabase/client';
import { normalizePhoneNumber, get10DigitPhone } from '@/lib/utils/phone';
import { Store, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ShopProfileForm() {
  const { currentShop, currentRole, refreshShops } = useShop();
  const [shopName, setShopName] = useState(currentShop?.shop_name || '');
  const [ownerName, setOwnerName] = useState(currentShop?.owner_name || '');
  const [phone, setPhone] = useState(get10DigitPhone(currentShop?.phone) || '');
  const [address, setAddress] = useState(currentShop?.address || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (currentShop) {
      setShopName(currentShop.shop_name || '');
      setOwnerName(currentShop.owner_name || '');
      setPhone(get10DigitPhone(currentShop.phone) || '');
      setAddress(currentShop.address || '');
    }
  }, [currentShop]);

  const supabase = createClient();
  const isOwnerOrManager = currentRole === 'owner' || currentRole === 'manager';

  const handlePhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(digitsOnly);
  };

  const handleReset = () => {
    if (currentShop) {
      setShopName(currentShop.shop_name || '');
      setOwnerName(currentShop.owner_name || '');
      setPhone(get10DigitPhone(currentShop.phone) || '');
      setAddress(currentShop.address || '');
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentShop?.id) return;
    if (!isOwnerOrManager) {
      setError('Staff shop settings edit nahi kar sakte.');
      return;
    }

    const cleanShopName = shopName.trim();
    const cleanOwnerName = ownerName.trim();

    if (!cleanShopName || cleanShopName.length < 2) {
      setError('Dukan ka valid naam likhein (kam se kam 2 akshar).');
      return;
    }

    if (!cleanOwnerName || cleanOwnerName.length < 2) {
      setError('Dukandar / Owner ka valid naam likhein (kam se kam 2 akshar).');
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
    setSuccess(false);

    try {
      const cleanPhone = phone ? normalizePhoneNumber(phone) : null;

      const { error: updateError } = await supabase
        .from('shops')
        .update({
          shop_name: cleanShopName,
          owner_name: cleanOwnerName,
          phone: cleanPhone,
          address: address.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentShop.id);

      if (updateError) throw updateError;

      setSuccess(true);
      await refreshShops();
      setTimeout(() => setSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to update shop:', err);
      setError(err.message || 'Shop details update karne me truti hui.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
        <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
          <Store className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold text-slate-800 text-sm">Shop & Owner Profile</h2>
          <p className="text-xs text-slate-400">Dukan aur Malik ki jankari update karein</p>
        </div>
      </div>

      {error && (
        <div className="mb-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-semibold flex items-center gap-1.5 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>Dukan ki jankari safaltapoorvak save ho gayi!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Shop Name (Dukan Ka Naam) <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            disabled={!isOwnerOrManager}
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white disabled:opacity-60 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Owner Name (Malik Ka Naam) <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            disabled={!isOwnerOrManager}
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white disabled:opacity-60 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Owner Phone Number (10 Digits Only)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-xs font-semibold text-slate-400">
              +91
            </span>
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={10}
              placeholder="9876543210"
              disabled={!isOwnerOrManager}
              value={phone}
              onChange={handlePhoneChange}
              className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white disabled:opacity-60 transition"
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Sirf 10 digit ka number likhein.</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Address / City (Pata)
          </label>
          <input
            type="text"
            disabled={!isOwnerOrManager}
            placeholder="e.g. Main Market, Near SBI Bank"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white disabled:opacity-60 transition"
          />
        </div>

        {isOwnerOrManager && (
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition active:scale-98 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Profile Changes</span>
              )}
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition disabled:opacity-50"
            >
              Reset
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
