'use client';

import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { Loader2, LogOut, Mail, ShieldCheck, UserCircle2, X } from 'lucide-react';
import { auth, googleProvider } from '@/lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
}

function mapFirebaseAuthError(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: string }).code)
      : '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please check your credentials and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completing.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not yet enabled in Firebase Console Authentication settings.';
    case 'auth/unauthorized-domain':
      return 'This domain is not yet allowlisted in Firebase Authentication settings.';
    default:
      return err instanceof Error
        ? err.message
        : 'Authentication failed. Please try again.';
  }
}

export function AuthModal({ isOpen, user, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setBusy(true);
    setErrorMsg(null);
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        const nameToSet = displayName.trim().slice(0, 80);
        if (nameToSet) {
          await updateProfile(cred.user, { displayName: nameToSet });
        }
      } else {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
      }
      setPassword('');
      onClose();
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleAuth = async () => {
    setBusy(true);
    setErrorMsg(null);
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    setErrorMsg(null);
    try {
      await signOut(auth);
      onClose();
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
    >
      <div className="bg-white/95 border border-white/90 w-full max-w-md rounded-3xl p-6 space-y-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0">
              <UserCircle2 className="w-5 h-5 text-sky-600" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="auth-modal-title"
                className="font-display text-base font-bold text-slate-900"
              >
                {user ? 'Studio Account' : mode === 'signin' ? 'Sign In' : 'Create Account'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Sync export history across sessions · Audio stays local
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close account dialog"
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {user ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50/90 border border-slate-200/80 p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-900 truncate">
                  {user.displayName || user.email?.split('@')[0] || 'Studio Creator'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-700">
                  Signed In
                </span>
              </div>
              <p className="text-xs text-slate-600 truncate">{user.email}</p>
            </div>

            <div className="rounded-xl bg-sky-50/80 border border-sky-100 p-3 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-[11px] text-sky-900 leading-relaxed">
                Your exported MP4 settings and track names are saved to your account
                history. Audio files and video renders stay 100% in your browser.
              </p>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800"
              >
                {errorMsg}
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Done
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSignOut()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 disabled:opacity-50 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMsg(null);
                }}
                className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  mode === 'signin'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMsg(null);
                }}
                className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  mode === 'signup'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Google Sign-In */}
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleGoogleAuth()}
              className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 shadow-xs disabled:opacity-50 transition-all"
            >
              <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-sky-500 via-emerald-500 to-amber-400 inline-block shrink-0" />
              <span>Continue with Google</span>
            </button>

            <div className="relative flex items-center justify-center">
              <hr className="w-full border-slate-200" />
              <span className="px-2.5 bg-white text-[11px] font-medium text-slate-400">
                or with email
              </span>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={(e) => void handleEmailAuth(e)} className="space-y-3">
              {mode === 'signup' && (
                <div>
                  <label
                    htmlFor="auth-display-name"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Display Name (optional)
                  </label>
                  <input
                    id="auth-display-name"
                    type="text"
                    maxLength={80}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Creator Name"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="auth-email-input"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Email Address
                </label>
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
              </div>

              <div>
                <label
                  htmlFor="auth-password-input"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Password
                </label>
                <input
                  id="auth-password-input"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800"
                >
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 shadow-sm shadow-sky-600/25 disabled:opacity-50 transition-all"
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Mail className="w-4 h-4" aria-hidden="true" />
                )}
                <span>
                  {mode === 'signin' ? 'Sign In with Email' : 'Create Account'}
                </span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
