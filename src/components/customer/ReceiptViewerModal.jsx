'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Download, Loader2, ImageOff } from 'lucide-react';

export default function ReceiptViewerModal({ billPath, onClose }) {
  const [signedUrl, setSignedUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadReceiptUrl() {
      if (!billPath) return;
      try {
        setLoading(true);
        setError(null);

        // Generate signed URL with 60 minute expiry
        const { data, error: signError } = await supabase.storage
          .from('bill-receipts')
          .createSignedUrl(billPath, 3600);

        if (signError) throw signError;
        setSignedUrl(data.signedUrl);
      } catch (err) {
        console.error('Error generating signed URL for receipt:', err);
        setError('Unable to load receipt image.');
      } finally {
        setLoading(false);
      }
    }

    loadReceiptUrl();
  }, [billPath, supabase]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-slate-900 rounded-3xl max-w-lg w-full p-5 shadow-2xl border border-slate-800 text-white animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <h3 className="font-bold text-sm text-slate-200">Bill / Receipt Photo</h3>
          <div className="flex items-center gap-2">
            {signedUrl && (
              <a
                href={signedUrl}
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

        {/* Content Body */}
        <div className="min-h-[300px] sm:min-h-[380px] flex items-center justify-center bg-black/40 rounded-2xl overflow-hidden p-2">
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin text-emerald-500" />
              <span className="text-xs">Loading secure receipt...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 text-rose-400 p-6 text-center">
              <ImageOff className="w-10 h-10 opacity-60" />
              <p className="text-xs font-semibold">{error}</p>
            </div>
          ) : (
            <img
              src={signedUrl}
              alt="Bill Receipt"
              className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-lg"
            />
          )}
        </div>
      </div>
    </div>
  );
}
