'use client';

import React, { useEffect, useState } from 'react';
import { storage } from '@/lib/firebase/config';
import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import { X, Download, Loader2, ImageOff } from 'lucide-react';

export default function ReceiptViewerModal({ billPath, onClose }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadReceiptUrl() {
      if (!billPath) {
        setLoading(false);
        return;
      }

      // 1. Direct URL (Data URI or HTTPS URL)
      if (billPath.startsWith('http') || billPath.startsWith('data:')) {
        setImageUrl(billPath);
        setLoading(false);
        return;
      }

      // 2. Firebase Storage Path
      try {
        setLoading(true);
        setError(null);
        if (storage) {
          const fileRef = storageRef(storage, billPath);
          const url = await getDownloadURL(fileRef);
          setImageUrl(url);
        } else {
          setImageUrl(billPath);
        }
      } catch (err) {
        console.error('Error fetching receipt download URL:', err);
        setError('Receipt photo load nahi ho payi.');
      } finally {
        setLoading(false);
      }
    }

    loadReceiptUrl();
  }, [billPath]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-slate-900 rounded-3xl max-w-lg w-full p-5 shadow-2xl border border-slate-800 text-white animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <h3 className="font-bold text-sm text-slate-200">Bill / Receipt Photo</h3>
          <div className="flex items-center gap-2">
            {imageUrl && (
              <a
                href={imageUrl}
                download="bill_receipt.jpg"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition flex items-center gap-1.5 text-xs font-semibold"
                title="Download image"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="relative min-h-[300px] max-h-[70vh] flex items-center justify-center bg-slate-950/80 rounded-2xl overflow-hidden p-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              <p className="text-xs font-medium">Loading receipt photo...</p>
            </div>
          ) : error || !imageUrl ? (
            <div className="flex flex-col items-center justify-center gap-2 text-slate-500 p-6 text-center">
              <ImageOff className="w-10 h-10 stroke-1 text-slate-600" />
              <p className="text-xs font-semibold">{error || 'Receipt photo not found'}</p>
            </div>
          ) : (
            <img
              src={imageUrl}
              alt="Transaction Receipt"
              className="w-full h-auto max-h-[65vh] object-contain rounded-xl"
            />
          )}
        </div>
      </div>
    </div>
  );
}
