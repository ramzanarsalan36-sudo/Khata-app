'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useShop } from '@/lib/context/ShopContext';
import { createTransaction, uploadReceipt } from '@/lib/firebase/db';
import { compressBillImage } from '@/lib/utils/imageCompression';
import { X, Camera, Loader2, ArrowUpRight, ArrowDownLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export default function TransactionModal({
  customer,
  initialType = 'GAVE', // 'GAVE' or 'GOT'
  onClose,
  onTransactionSuccess,
}) {
  const { currentShop, user } = useShop();
  const [type, setType] = useState(initialType);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(''); // 'compressing', 'uploading', 'done'
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

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
      let billUrl = null;

      // 1. Upload receipt if attached
      if (imageFile) {
        setUploadStatus('compressing');
        const compressedFile = await compressBillImage(imageFile);

        setUploadStatus('uploading');
        const uploadResult = await uploadReceipt({
          shopId: currentShop.id,
          customerId: customer.id,
          file: compressedFile,
        });

        billPath = uploadResult?.billPath || null;
        billUrl = uploadResult?.billUrl || null;
        setUploadStatus('done');
      }

      // 2. Generate unique client transaction ID for idempotency & double-tap protection
      const clientTxId = crypto.randomUUID();

      // 3. Call Firebase Realtime Database Atomic Mutation
      const data = await createTransaction({
        shopId: currentShop.id,
        customerId: customer.id,
        amount: numAmount,
        type,
        note: note.trim() || null,
        billPath,
        billUrl,
        userId: user?.uid || 'FNSMYvR9vhOcvFVPdfu6N7i1Lyc2',
        clientTransactionId: clientTxId,
      });

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
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div
              className={`p-2 rounded-xl ${
                isGave ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              {isGave ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-base">
                {isGave ? 'Maine Diye (Udhaar)' : 'Mujhe Mile (Jama/Advance)'}
              </h2>
              <p className="text-xs text-slate-400 font-medium">Customer: {customer.name}</p>
            </div>
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
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* GAVE vs GOT Type Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setType('GAVE')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                isGave
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Maine Diye (Udhar)</span>
            </button>
            <button
              type="button"
              onClick={() => setType('GOT')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                !isGave
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Mujhe Mile (Liya)</span>
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Raqam (Amount in ₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-lg font-extrabold text-slate-400">
                ₹
              </span>
              <input
                type="number"
                step="any"
                min="1"
                required
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full pl-9 pr-4 py-2.5 text-lg font-bold rounded-xl border focus:outline-none focus:ring-2 transition ${
                  isGave
                    ? 'border-slate-200 focus:border-rose-500 focus:ring-rose-200 text-rose-700'
                    : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-200 text-emerald-700'
                }`}
              />
            </div>

            {/* Quick Amount Pills */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar">
              {[50, 100, 200, 500, 1000, 2000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAdd(val)}
                  className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition active:scale-95 shrink-0"
                >
                  +{val}
                </button>
              ))}
            </div>
          </div>

          {/* Bill Receipt Upload */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Bill / Parcha Photo (Optional)
              </label>
              {imagePreview && (
                <button
                  type="button"
                  onClick={removeImage}
                  className="text-xs text-rose-600 font-semibold hover:underline"
                >
                  Photo Hatao
                </button>
              )}
            </div>

            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 h-28 bg-black/5 flex items-center justify-center">
                <img
                  src={imagePreview}
                  alt="Receipt Preview"
                  className="w-full h-full object-contain"
                />
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
                  className="w-full flex items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl cursor-pointer transition"
                >
                  <Camera className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-600">
                    Camera se Photo Khichein ya File Chunein
                  </span>
                </button>
              </div>
            )}

            {uploadStatus && (
              <p className="text-[11px] text-emerald-600 font-semibold mt-1.5 flex items-center gap-1 animate-pulse">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {uploadStatus === 'compressing' && 'Compressing photo for fast upload...'}
                {uploadStatus === 'uploading' && 'Uploading bill photo...'}
                {uploadStatus === 'done' && 'Photo attached successfully'}
              </p>
            )}
          </div>

          {/* Notes Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Vivaran / Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 5kg Cheeni, Sabun, Ghee"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>

          {/* Submit & Cancel */}
          <div className="space-y-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3.5 font-extrabold text-sm rounded-xl text-white shadow-md flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-50 ${
                isGave ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Transaction...</span>
                </>
              ) : (
                <span>Save Karein (₹{amount || '0.00'})</span>
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
