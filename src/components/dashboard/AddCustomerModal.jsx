'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useShop } from '@/lib/context/ShopContext';
import { addCustomer, createTransaction, uploadReceipt } from '@/lib/firebase/db';
import { normalizePhoneNumber } from '@/lib/utils/phone';
import { UserPlus, X, Loader2, ArrowUpRight, ArrowDownLeft, Camera, CheckCircle2, User, AlertCircle } from 'lucide-react';
import { compressBillImage, compressProfileImage } from '@/lib/utils/imageCompression';

export default function AddCustomerModal({ onClose, onCustomerAdded }) {
  const { currentShop, user } = useShop();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [openingAmount, setOpeningAmount] = useState('');
  const [openingType, setOpeningType] = useState('GAVE'); // 'GAVE' or 'GOT'

  // Profile Photo state
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);

  // Bill Receipt Photo state
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [uploadStatus, setUploadStatus] = useState(''); // 'compressing', 'uploading', 'done'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const profileInputRef = useRef(null);
  const billInputRef = useRef(null);

  // Cleanup object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (profilePreview) URL.revokeObjectURL(profilePreview);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [profilePreview, imagePreview]);

  const handlePhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(digitsOnly);
  };

  const handleProfilePhotoChange = (e) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Kripya valid profile photo select karein.');
      return;
    }

    if (profilePreview) URL.revokeObjectURL(profilePreview);

    setProfileFile(file);
    setProfilePreview(URL.createObjectURL(file));
    setError(null);
  };

  const removeProfilePhoto = () => {
    setProfileFile(null);
    if (profilePreview) URL.revokeObjectURL(profilePreview);
    setProfilePreview(null);
  };

  const handleImageChange = (e) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Kripya valid bill image file select karein.');
      return;
    }

    if (imagePreview) URL.revokeObjectURL(imagePreview);

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError(null);
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanName = name.trim();

    if (!cleanName || cleanName.length < 2) {
      setError('Kripya grahak ka valid naam darj karein (kam se kam 2 akshar).');
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

    if (!currentShop?.id) {
      setError('Active shop nahi mili. Kripya page refresh karein.');
      return;
    }

    const amountNum = parseFloat(openingAmount);
    if (openingAmount && (isNaN(amountNum) || amountNum < 0)) {
      setError('Opening balance valid positive number hona chahiye.');
      return;
    }

    if (imageFile && (isNaN(amountNum) || amountNum <= 0)) {
      setError('Purane hisab ka bill photo attach karne ke liye Opening Balance amount darj karein.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cleanPhone = phone ? normalizePhoneNumber(phone) : '';
      let customerPhotoUrl = null;

      // 1. Upload Profile Photo if selected
      if (profileFile) {
        setUploadStatus('compressing_profile');
        const compressedProfile = await compressProfileImage(profileFile);
        setUploadStatus('uploading_profile');
        const photoResult = await uploadReceipt({
          shopId: currentShop.id,
          customerId: 'profiles',
          file: compressedProfile,
        });
        customerPhotoUrl = photoResult?.billUrl || null;
      }

      // 2. Insert customer record in Firebase Realtime Database
      const newCustomer = await addCustomer(currentShop.id, {
        name: cleanName,
        phone: cleanPhone,
        photo_url: customerPhotoUrl,
        notes: notes.trim() || '',
        address: notes.trim() || '',
      });

      // 3. Upload bill receipt if present
      let billPath = null;
      let billUrl = null;
      if (imageFile) {
        setUploadStatus('compressing_bill');
        const compressedBill = await compressBillImage(imageFile);
        setUploadStatus('uploading_bill');
        const billRes = await uploadReceipt({
          shopId: currentShop.id,
          customerId: newCustomer.id,
          file: compressedBill,
        });
        billPath = billRes?.billPath;
        billUrl = billRes?.billUrl;
      }

      // 4. Create opening transaction if amount provided
      if (!isNaN(amountNum) && amountNum > 0) {
        const txRes = await createTransaction({
          shopId: currentShop.id,
          customerId: newCustomer.id,
          amount: amountNum,
          type: openingType,
          note: 'Opening Balance (Purana Hisab)',
          billPath,
          billUrl,
          userId: user?.uid || 'FNSMYvR9vhOcvFVPdfu6N7i1Lyc2',
        });
        if (txRes?.customer_balance !== undefined) {
          newCustomer.balance = txRes.customer_balance;
        }
      }

      if (onCustomerAdded) {
        onCustomerAdded(newCustomer);
      }
      onClose();
    } catch (err) {
      console.error('Failed to add customer:', err);
      setError(err.message || 'Failed to add customer. Please try again.');
    } finally {
      setLoading(false);
      setUploadStatus('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-base">Add New Customer</h2>
              <p className="text-xs text-slate-400">Naya Grahak Jodein</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
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

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          {/* Profile Photo Uploader */}
          <div className="flex flex-col items-center justify-center mb-1">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-300 group-hover:border-emerald-500 bg-slate-50 flex items-center justify-center overflow-hidden shadow-inner transition">
                {profilePreview ? (
                  <img
                    src={profilePreview}
                    alt="Customer Profile Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <User className="w-8 h-8 stroke-1" />
                  </div>
                )}
              </div>

              {/* Upload or Camera Button Badge */}
              <input
                ref={profileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfilePhotoChange}
                onClick={(e) => e.stopPropagation()}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => profileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-full shadow-md transition cursor-pointer"
                title="Customer Profile Photo Dalein"
                aria-label="Upload customer photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>

              {/* Remove profile photo button */}
              {profilePreview && (
                <button
                  type="button"
                  onClick={removeProfilePhoto}
                  className="absolute top-0 right-0 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-sm transition"
                  title="Remove Profile Photo"
                  aria-label="Remove profile photo"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-1.5">
              Customer Profile Photo (Optional)
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Customer Name (Grahak Ka Naam) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Mukesh Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mobile Number (10 Digits Only)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-sm font-semibold text-slate-400">
                +91
              </span>
              <input
                type="tel"
                placeholder="9876543210"
                value={phone}
                onChange={handlePhoneChange}
                maxLength={10}
                className="w-full pl-12 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Opening Balance Section */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Opening Balance (Purana Hisab - Optional)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOpeningType('GAVE')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition border ${
                  openingType === 'GAVE'
                    ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                <span>Maine Diye (Udhar)</span>
              </button>

              <button
                type="button"
                onClick={() => setOpeningType('GOT')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition border ${
                  openingType === 'GOT'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                <span>Mujhe Mile (Advance)</span>
              </button>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">
                ₹
              </span>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                className="w-full pl-8 pr-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
              />
            </div>

            {/* Bill Receipt Upload */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-600">
                  Purana Bill Photo / Parcha (Optional)
                </span>
                {imagePreview && (
                  <button
                    type="button"
                    onClick={removeImage}
                    className="text-[11px] text-rose-600 font-semibold hover:underline"
                  >
                    Hatao
                  </button>
                )}
              </div>

              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 h-28 bg-black/5 flex items-center justify-center">
                  <img
                    src={imagePreview}
                    alt="Receipt preview"
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div>
                  <input
                    ref={billInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageChange}
                    onClick={(e) => e.stopPropagation()}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => billInputRef.current?.click()}
                    className="w-full flex items-center gap-2 p-2.5 bg-white hover:bg-slate-100/80 border border-dashed border-slate-300 rounded-xl cursor-pointer transition text-left"
                  >
                    <Camera className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="text-xs font-semibold text-slate-600">
                      Purana Parcha / Bill Photo Jodein
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Address / Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Near Bus Stand, Ward 4"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition active:scale-98 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Customer...</span>
                </>
              ) : (
                <span>Save Customer (Grahak Jodein)</span>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
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
