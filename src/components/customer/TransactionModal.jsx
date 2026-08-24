'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useShop } from '@/lib/context/ShopContext';
import { compressBillImage } from '@/lib/utils/imageCompression';
import { X, Camera, Loader2, ArrowUpRight, ArrowDownLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export default function TransactionModal({
  customer,
  initialType = 'GAVE', // 'GAVE' or 'GOT'
  onClose,
  onTransactionSuccess,
}) {
  const { currentShop } = useShop();
  const [type, setType] = useState(initialType);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(''); // 'compressing', 'uploading', 'done'
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const supabase = createClient();
  const isGave = type === 'GAVE';

  // Cleanup object URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleImageChange = (e) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    // Reset file input value so user can reselect the same photo or retake if needed
    if (e.target) {
      e.target.value = '';
    }

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Kripya valid image file select karein.');
      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError(null);
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  };

  const handleQuickAdd = (value) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + value).toString());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    if (!currentShop?.id || !customer?.id) {
      setError('Missing shop or customer information');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let billPath = null;

      // 1. Upload receipt if attached
      if (imageFile) {
        setUploadStatus('compressing');
        const compressedFile = await compressBillImage(imageFile);

        setUploadStatus('uploading');
        const fileExt = compressedFile.name ? compressedFile.name.split('.').pop() : 'jpg';
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${currentShop.id}/${customer.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('bill-receipts')
          .upload(filePath, compressedFile, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw new Error(`Receipt upload failed: ${uploadError.message}`);
        }

        billPath = filePath;
        setUploadStatus('done');
      }

      // 2. Generate unique client transaction ID for idempotency & double-tap protection
      const clientTxId = crypto.randomUUID();

      // 3. Call Atomic PostgreSQL RPC
      const { data, error: rpcError } = await supabase.rpc('create_transaction', {
        p_shop_id: currentShop.id,
        p_customer_id: customer.id,
        p_amount: numAmount,
        p_type: type,
        p_note: note.trim() || null,
        p_bill_path: billPath,
        p_client_transaction_id: clientTxId,
      });

      if (rpcError) throw rpcError;

      if (onTransactionSuccess) {
        onTransactionSuccess({
          transaction: data.transaction,
          customerBalance: data.customer_balance,
          isDuplicate: data.is_duplicate,
          amount: numAmount,
          type,
          note,
        });
      }

      onClose();
    } catch (err) {
      console.error('Transaction save error:', err);
      setError(err.message || 'Failed to save transaction. Please try again.');
    } finally {
      setSubmitting(false);
      setUploadStatus('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        {/* Header with Type Selector */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setType('GAVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                isGave
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>BAKI (Diya)</span>
            </button>
            <button
              type="button"
              onClick={() => setType('GOT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                !isGave
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>JAMA (Liya)</span>
            </button>
          </div>

          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Big Amount Input */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Enter Amount (Rakam)
            </label>
            <div className="relative">
              <span
                className={`absolute left-3.5 top-2.5 text-2xl font-black ${
                  isGave ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                ₹
              </span>
              <input
                type="number"
                step="any"
                min="1"
                required
                autoFocus
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full pl-9 pr-4 py-2.5 text-2xl font-black rounded-xl border focus:outline-none transition ${
                  isGave
                    ? 'border-rose-200 focus:ring-2 focus:ring-rose-500 bg-rose-50/40 text-rose-700'
                    : 'border-emerald-200 focus:ring-2 focus:ring-emerald-500 bg-emerald-50/40 text-emerald-700'
                }`}
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex items-center gap-1.5 mt-2">
              {[100, 500, 1000, 2000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAdd(val)}
                  className="flex-1 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-lg transition"
                >
                  +{val}
                </button>
              ))}
            </div>
          </div>

          {/* Note / Item details */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Item Details / Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 5kg Rice, Oil, Cash payment"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>

          {/* Bill Photo Attachment */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Attach Bill / Receipt Photo (Optional)
            </label>

            {imagePreview ? (
              <div className="relative inline-block border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <img
                  src={imagePreview}
                  alt="Receipt Preview"
                  className="w-24 h-24 object-cover"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-sm transition"
                  title="Remove Receipt"
                  aria-label="Remove receipt photo"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  onClick={(e) => e.stopPropagation()}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl cursor-pointer transition text-left"
                >
                  <Camera className="w-5 h-5 text-slate-500 shrink-0" />
                  <span className="text-xs font-semibold text-slate-600">
                    Take Photo or Upload Receipt
                  </span>
                </button>
              </div>
            )}

            {uploadStatus && (
              <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1 animate-pulse">
                <CheckCircle2 className="w-3 h-3" />
                {uploadStatus === 'compressing' && 'Compressing photo for fast upload...'}
                {uploadStatus === 'uploading' && 'Uploading bill photo to private vault...'}
                {uploadStatus === 'done' && 'Photo attached securely'}
              </p>
            )}
          </div>

          {/* Submit Action Button with Double-Tap Prevention & Cancel */}
          <div className="space-y-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3.5 text-white font-extrabold text-sm sm:text-base rounded-xl flex items-center justify-center gap-2 shadow-lg transition active:scale-98 disabled:opacity-50 ${
                isGave
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Saving to Ledger...</span>
                </>
              ) : (
                <span>Save Entry (Khata Save Karein)</span>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-full py-2.5 text-slate-500 hover:text-slate-700 text-xs font-bold text-center transition hover:bg-slate-100 rounded-xl disabled:opacity-50"
            >
              Cancel (Radd Karein)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
