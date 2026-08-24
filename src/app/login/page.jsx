'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Store, ShieldCheck, Mail, Lock, Phone, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { normalizePhoneNumber } from '@/lib/utils/phone';

export default function LoginPage() {
  const [authMode, setAuthMode] = useState('password'); // 'password', 'magiclink', 'phone'
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const supabase = createClient();
  const router = useRouter();

  const handlePasswordAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const redirectOrigin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${redirectOrigin}/dashboard`,
          },
        });
        if (signUpError) throw signUpError;
        setMessage('Account created! Logging you in...');
        // Auto sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) {
          setMessage('Check your email for confirmation link if required, or sign in.');
        } else {
          router.push('/dashboard');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendPhoneOtp = async (e) => {
    e.preventDefault();
    const clean = normalizePhoneNumber(phone);
    if (clean.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: `+91${clean}`,
      });
      if (otpError) throw otpError;
      setOtpSent(true);
      setMessage(`OTP sent to +91 ${clean}`);
    } catch (err) {
      setError(err.message || 'Failed to send OTP. SMS provider may require configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async (e) => {
    e.preventDefault();
    const clean = normalizePhoneNumber(phone);
    setLoading(true);
    setError(null);

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: `+91${clean}`,
        token: otp.trim(),
        type: 'sms',
      });
      if (verifyError) throw verifyError;
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-800 via-emerald-700 to-emerald-900 text-white flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md mx-auto flex flex-col items-center">
        {/* Branding Header */}
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
          {/* Auth Method Selector */}
          <div className="flex border-b border-slate-100 mb-5 text-xs sm:text-sm font-bold">
            <button
              type="button"
              onClick={() => {
                setAuthMode('password');
                setError(null);
                setMessage(null);
              }}
              className={`flex-1 pb-2.5 transition border-b-2 ${
                authMode === 'password'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Email & Password
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('phone');
                setError(null);
                setMessage(null);
              }}
              className={`flex-1 pb-2.5 transition border-b-2 ${
                authMode === 'phone'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Phone OTP
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl">
              {message}
            </div>
          )}

          {/* 1. Password Auth */}
          {authMode === 'password' && (
            <form onSubmit={handlePasswordAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    placeholder="shopkeeper@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition active:scale-98 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>{isSignUp ? 'Create New Account' : 'Sign In to Khata'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-xs text-emerald-700 font-semibold hover:underline"
                >
                  {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </button>
              </div>
            </form>
          )}

          {/* 2. Phone OTP Auth */}
          {authMode === 'phone' && (
            <div className="space-y-4">
              {!otpSent ? (
                <form onSubmit={handleSendPhoneOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mobile Number
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-sm font-semibold text-slate-400">
                        +91
                      </span>
                      <input
                        type="tel"
                        required
                        placeholder="98765 43210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-12 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition active:scale-98 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending OTP...</span>
                      </>
                    ) : (
                      <span>Send Verification OTP</span>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyPhoneOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Enter 6-Digit OTP
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      autoFocus
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full text-center tracking-widest text-lg font-bold py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition active:scale-98 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <span>Verify & Continue</span>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Change Phone Number
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Security Guarantee */}
        <div className="text-center text-emerald-100 text-xs flex items-center justify-center gap-1.5 pb-2">
          <ShieldCheck className="w-4 h-4 text-emerald-300" />
          <span>100% Safe & Secure Multi-Tenant Cloud Ledger</span>
        </div>
      </div>
    </div>
  );
}
