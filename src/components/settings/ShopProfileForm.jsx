'use client';

import React, { useState } from 'react';
import { useShop } from '@/lib/context/ShopContext';
import { createClient } from '@/lib/supabase/client';
import { Store, Loader2, CheckCircle2 } from 'lucide-react';

export default function ShopProfileForm() {
  const { currentShop, currentRole, refreshShops } = useShop();
  const [shopName, setShopName] = useState(currentShop?.shop_name || '');
  const [ownerName, setOwnerName] = useState(currentShop?.owner_name || '');
  const [phone, setPhone] = useState(currentShop?.phone || '');
  const [address, setAddress] = useState(currentShop?.address || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const supabase = createClient();
  const isOwnerOrManager = currentRole === 'owner' || currentRole === 'manager';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentShop?.id) return;
    if (!isOwnerOrManager) {
      setError('Staff cannot edit shop settings');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: updateError } = await supabase
        .from('shops')
        .update({
          shop_name: shopName.trim(),
          owner_name: ownerName.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentShop.id);

      if (updateError) throw updateError;

      setSuccess(true);
      await refreshShops();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update shop:', err);
      setError(err.message || 'Failed to update shop details.');
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
          <h2 className="font-bold text-slate-800 text-sm">Shop Profile</h2>
          <p className="text-xs text-slate-400">Dukan ki jankari update karein</p>
        </div>
      </div>

      {error && (
        <div className="mb-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-semibold flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" />
          <span>Shop profile updated successfully!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Shop Name
          </label>
          <input
            type="text"
            required
            disabled={!isOwnerOrManager}
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Owner Name
          </label>
          <input
            type="text"
            required
            disabled={!isOwnerOrManager}
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            disabled={!isOwnerOrManager}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Address / City
          </label>
          <input
            type="text"
            disabled={!isOwnerOrManager}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
          />
        </div>

        {isOwnerOrManager && (
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition active:scale-98 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        )}
      </form>
    </div>
  );
}
