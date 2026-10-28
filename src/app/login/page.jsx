'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/config';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { Store, ShieldCheck, Mail, Lock, Loader2, AlertCircle, ArrowRight } from 'lucide-react';

const AUTHORIZED_UID = 'FNSMYvR9vhOcvFVPdfu6N7i1Lyc2';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const router = useRouter();

  const handlePasswordAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!auth) {
        throw new Error('Firebase configuration missing');
      }

      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);

      // Kadak Security: Sirf authorized UID hi access kar sakti hai
      if (cred.user.uid !== AUTHORIZED_UID) {
        await signOut(auth);
        throw new Error('Access Denied: Aap is khata ledger ke authorized malik nahi hain.');
      }

      router.push('/dashboard');
    } catch (err) {
      console.error('Auth error:', err);
      let userMsg = err.message;
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        userMsg = 'Invalid email ya password. Kripya sahi credentials darj karein.';
      } else if (err.code === 'auth/too-many-requests') {
        userMsg = 'Kayi baar galat password try kiya gaya. Kripya thodi der baad koshish karein.';
      }
      setError(userMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-800 via-emerald-700 to-emerald-900 text-white flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md mx-auto flex flex-col items-center">
        {/* Branding Header (Original Repo Design) */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-xl mx-auto flex items-center justify-center text-emerald-700 mb-3 border-2 border-emerald-500/30">
            <Store className="w-9 h-9" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Digital Udhar Khata
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm font-medium mt-1">
            Indian Retail & Business Ledger System
          </p>
        </div>

        {/* Main Login Card */}
        <div className="w-full bg-white text-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl mb-6">
          <div className="mb-5 pb-3 border-b border-slate-100">
            <h2 className="font-extrabold text-base text-slate-900">Sign In to Khata</h2>
            <p className="text-xs text-slate-400">Apne registered email aur password se login karein</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handlePasswordAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="shopkeeper@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition active:scale-98 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Khata</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security Guarantee (Original Repo Design) */}
        <div className="text-center text-emerald-100 text-xs flex items-center justify-center gap-1.5 pb-2">
          <ShieldCheck className="w-4 h-4 text-emerald-300" />
          <span>100% Safe & Secure Private Cloud Ledger</span>
        </div>
      </div>
    </div>
  );
}
