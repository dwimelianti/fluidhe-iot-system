'use client';

import React from 'react';
import {
  Shield,
  Users,
  Mail,
  Key,
  AlertTriangle,
  Info,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  RefreshCw,
  Send,
  CheckCircle2,
  Check,
  X,
  Clock,
  ArrowLeft
} from 'lucide-react';
import { UserRole } from '@/types';

export interface LoginScreenProps {
  selectedDemoRole: UserRole;
  setSelectedDemoRole: (role: UserRole) => void;
  loginEmail: string;
  setLoginEmail: (email: string) => void;
  loginPassword: string;
  setLoginPassword: (pw: string) => void;
  loginError: string | null;
  setLoginError: (err: string | null) => void;
  showLoginPassword: boolean;
  setShowLoginPassword: (show: boolean) => void;
  handleLogin: () => void;
  onGuestLogin?: () => void;

  // Reset Password Modal Props
  isResetModalOpen: boolean;
  setIsResetModalOpen: (open: boolean) => void;
  resetStep: 'INPUT_EMAIL' | 'VERIFY_OTP' | 'NEW_PASSWORD' | 'SUCCESS';
  setResetStep: (step: 'INPUT_EMAIL' | 'VERIFY_OTP' | 'NEW_PASSWORD' | 'SUCCESS') => void;
  resetEmailInput: string;
  setResetEmailInput: (email: string) => void;
  enteredOtp: string;
  setEnteredOtp: (otp: string) => void;
  newPasswordInput: string;
  setNewPasswordInput: (pw: string) => void;
  confirmPasswordInput: string;
  setConfirmPasswordInput: (pw: string) => void;
  showNewPassword: boolean;
  setShowNewPassword: (show: boolean) => void;
  resetError: string | null;
  setResetError: (err: string | null) => void;
  isSendingEmail: boolean;
  otpResendCountdown: number;
  otpTimeLeft?: number;
  smtpStatusInfo: string | null;
  handleRequestOtp: (e: React.FormEvent) => void;
  handleVerifyOtp: (e: React.FormEvent) => void;
  handleSaveNewPassword: (e: React.FormEvent) => void;
  getPasswordStrength: (pw: string) => {
    score: number;
    hasMinLength: boolean;
    hasUpperCase: boolean;
    hasLowerCase: boolean;
    hasNumber: boolean;
    isValid: boolean;
  };
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  selectedDemoRole,
  setSelectedDemoRole,
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  loginError,
  setLoginError,
  showLoginPassword,
  setShowLoginPassword,
  handleLogin,
  onGuestLogin,
  isResetModalOpen,
  setIsResetModalOpen,
  resetStep,
  setResetStep,
  resetEmailInput,
  setResetEmailInput,
  enteredOtp,
  setEnteredOtp,
  newPasswordInput,
  setNewPasswordInput,
  confirmPasswordInput,
  setConfirmPasswordInput,
  showNewPassword,
  setShowNewPassword,
  resetError,
  setResetError,
  isSendingEmail,
  otpResendCountdown,
  otpTimeLeft = 0,
  smtpStatusInfo,
  handleRequestOtp,
  handleVerifyOtp,
  handleSaveNewPassword,
  getPasswordStrength
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#90c5fd] via-[#3b82f6] to-[#1d4ed8] flex flex-col justify-between p-2.5 sm:p-6 md:p-8 relative overflow-hidden font-sans text-slate-100 selection:bg-sky-400 selection:text-slate-900">

      {/* ─── SOFT AMBIENT LIGHTING & TOP GLOW ─── */}
      {/* Soft Bright Top-Center Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[480px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.75)_0%,rgba(186,230,253,0.4)_40%,transparent_75%)] pointer-events-none z-0" />

      {/* Ambient Mid Floating Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-sky-300/25 rounded-full blur-3xl pointer-events-none z-0" />

      {/* ─── CRISP BLUEPRINT GRID PATTERN WITH GRADIENT MASK ─── */}
      <div className="absolute inset-0 blueprint-grid-pattern-lg opacity-70 grid-mask-fade pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(29,78,216,0.25)_100%)] pointer-events-none z-0" />

      {/* ─── 3D FLOATING LAYERED GLASS BOXES (KHUSUS DESKTOP / WEB TAMPIL, MOBILE BERSIH GRID SAJA) ─── */}
      {/* Bottom-Left 3D Layered Glass Tiles */}
      <div className="hidden sm:block absolute -bottom-16 -left-16 sm:-bottom-10 sm:-left-10 pointer-events-none select-none z-0">
        {/* Layer 3: Deepest Ambient Box */}
        <div className="w-56 sm:w-72 h-56 sm:h-72 rounded-[2.5rem] sm:rounded-[3rem] spatial-glass-tile-subtle -rotate-[28deg] -translate-x-10 translate-y-12 opacity-50 animate-float-delayed" />
        {/* Layer 2: Middle Translucent Glass Box with Shadow */}
        <div className="absolute top-2 left-2 w-64 sm:w-84 h-64 sm:h-84 rounded-[2.8rem] sm:rounded-[3.2rem] spatial-glass-tile -rotate-[18deg] -translate-x-4 translate-y-6 opacity-75 animate-float-slow" />
        {/* Layer 1: Foreground High-Gloss Glass Box */}
        <div className="absolute top-8 left-8 w-56 sm:w-72 h-56 sm:h-72 rounded-[2.4rem] sm:rounded-[2.8rem] bg-gradient-to-tr from-white/25 via-white/10 to-transparent backdrop-blur-xl border border-white/40 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.3)] -rotate-[10deg] opacity-90" />
      </div>

      {/* Bottom-Right 3D Layered Glass Tiles */}
      <div className="hidden sm:block absolute -bottom-16 -right-16 sm:-bottom-10 sm:-right-10 pointer-events-none select-none z-0">
        {/* Layer 3: Deepest Ambient Box */}
        <div className="w-56 sm:w-72 h-56 sm:h-72 rounded-[2.5rem] sm:rounded-[3rem] spatial-glass-tile-subtle rotate-[28deg] translate-x-10 translate-y-12 opacity-50 animate-float-delayed" />
        {/* Layer 2: Middle Translucent Glass Box with Shadow */}
        <div className="absolute top-2 right-2 w-64 sm:w-84 h-64 sm:h-84 rounded-[2.8rem] sm:rounded-[3.2rem] spatial-glass-tile rotate-[18deg] translate-x-4 translate-y-6 opacity-75 animate-float-slow" />
        {/* Layer 1: Foreground High-Gloss Glass Box */}
        <div className="absolute top-8 right-8 w-56 sm:w-72 h-56 sm:h-72 rounded-[2.4rem] sm:rounded-[2.8rem] bg-gradient-to-tl from-white/25 via-white/10 to-transparent backdrop-blur-xl border border-white/40 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.3)] rotate-[10deg] opacity-90" />
      </div>

      {/* ─── TOP HEADER (FLUIDHE KIRI - MOBILE & DESKTOP) ─── */}
      <header className="flex justify-between items-center max-w-7xl mx-auto w-full z-10 gap-2 sm:gap-3 py-1">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 sm:bg-white/40 sm:backdrop-blur-xl sm:border sm:border-white/65 sm:px-3.5 sm:py-2 sm:rounded-2xl sm:shadow-[0_8px_30px_rgba(0,0,0,0.08)] min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 relative flex items-center justify-center p-1 bg-white rounded-xl shadow-sm shrink-0 border border-white/80">
              <img src="/uad-logo.png" alt="Logo UAD" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-900 flex items-center gap-1 sm:gap-1.5">
                FluidHE <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-sky-900/15 text-slate-900 font-bold border border-sky-900/20 shrink-0">v2.5 IoT</span>
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-800 font-medium truncate">Universitas Ahmad Dahlan • Dual Heater Control</p>
            </div>
          </div>
        </div>
      </header>

      {/* ─── MAIN HERO & LOGIN CONTAINER ─── */}
      <main className="max-w-md w-full mx-auto my-auto py-2 sm:py-4 z-10 relative">
        {/* Main Glassmorphic Card (Normal Size) */}
        <div className="p-5 sm:p-8 bg-white/95 backdrop-blur-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.6)] rounded-3xl sm:rounded-[2.5rem] border border-white relative overflow-hidden text-slate-900">

          {/* Subtle Inner Glow Highlight */}
          <div className="absolute top-0 inset-x-0 h-20 sm:h-24 bg-gradient-to-b from-sky-100/50 to-transparent pointer-events-none rounded-t-3xl sm:rounded-t-[2.5rem]" />

          {/* Logo with Concentric Glowing Rings */}
          <div className="text-center mb-4 sm:mb-6 relative">
            <div className="relative inline-flex items-center justify-center p-2 sm:p-2.5 bg-gradient-to-b from-white to-sky-50 rounded-2xl mb-2 sm:mb-2.5 border border-sky-100 shadow-md sm:shadow-lg w-16 h-16 sm:w-22 sm:h-22">
              <div className="absolute -inset-1.5 sm:-inset-2 rounded-2xl sm:rounded-3xl bg-sky-400/20 blur-md -z-10 animate-pulse-glow" />
              <div className="absolute -inset-3 sm:-inset-4 rounded-2xl sm:rounded-3xl bg-blue-500/10 blur-xl -z-20" />
              <img src="/uad-logo.png" alt="Logo UAD" className="w-full h-full object-contain scale-105 sm:scale-110" />
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">Masuk ke Sistem</h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">Laboratorium Teknik Kimia & IoT Industri UAD</p>
          </div>

          {/* Main Lab Role Switcher (Operator & Admin) */}
          <div className="mb-4 sm:mb-5 p-1 bg-slate-100/90 rounded-2xl flex border border-slate-200/90 gap-1 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setSelectedDemoRole('operator');
                setLoginError(null);
              }}
              className={`flex-1 py-2 px-2 sm:px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${selectedDemoRole === 'operator'
                ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-600/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Operator <span className="font-normal opacity-85 text-[10px] hidden xs:inline">(Mahasiswa)</span></span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedDemoRole('admin');
                setLoginError(null);
              }}
              className={`flex-1 py-2 px-2 sm:px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${selectedDemoRole === 'admin'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
            >
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Admin <span className="font-normal opacity-85 text-[10px] hidden xs:inline">(Dosen/KaLab)</span></span>
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            autoComplete="off"
            className="space-y-3 sm:space-y-4"
          >
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email / Username</label>
              <div className="relative">
                <input
                  type="text"
                  name="email"
                  autoComplete="off"
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value);
                    setLoginError(null);
                  }}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800 transition font-medium"
                  placeholder="Masukkan email resmi akun Anda..."
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-700">Kata Sandi</label>
                <button
                  type="button"
                  onClick={() => {
                    setIsResetModalOpen(true);
                    setResetStep('INPUT_EMAIL');
                    setResetError(null);
                    setResetEmailInput(loginEmail || '');
                  }}
                  className="text-[11px] font-bold text-sky-600 hover:text-sky-800 transition"
                >
                  Lupa / Ganti Sandi?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="new-password"
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    setLoginError(null);
                  }}
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800 transition font-medium"
                  placeholder="••••••••"
                />
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="p-2.5 sm:p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg sm:rounded-xl text-xs flex items-start gap-2 animate-in fade-in duration-200">
                <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 sm:space-y-1">
                  <p className="font-bold">{loginError}</p>
                </div>
              </div>
            )}

            <div className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-[10px] sm:text-xs flex items-start gap-2 leading-snug sm:leading-relaxed ${selectedDemoRole === 'admin'
              ? 'bg-emerald-50/90 border-emerald-100 text-emerald-800'
              : 'bg-sky-50/90 border-sky-100 text-sky-800'
              }`}>
              <Info className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 mt-0.5 ${selectedDemoRole === 'admin' ? 'text-emerald-600' : 'text-sky-600'
                }`} />
              <span>
                {selectedDemoRole === 'admin'
                  ? 'Akses penuh kendali hardware, verifikasi alarm & pemantauan CCTV.'
                  : 'Pengoperasian praktikum mahasiswa, pemantauan sensor real-time & unduh data Excel.'}
              </span>
            </div>

            <button
              type="submit"
              className={`w-full py-2.5 sm:py-3 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${selectedDemoRole === 'admin'
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 shadow-emerald-500/25'
                : 'bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 shadow-sky-500/25'
                }`}
            >
              Masuk ke Dashboard Lab
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Pemisah Garis Tipis & Masuk sebagai Tamu */}
            {onGuestLogin && (
              <div className="pt-2">
                <div className="relative my-2.5 flex items-center justify-center">
                  <div className="w-full border-t border-slate-200/90" />
                  <span className="absolute bg-white px-2.5 text-[10px] font-medium text-slate-400">
                    atau
                  </span>
                </div>

                <div className="text-center pt-0.5">
                  <button
                    type="button"
                    onClick={onGuestLogin}
                    className="text-xs font-semibold text-slate-500 hover:text-sky-600 transition-colors cursor-pointer py-1 px-2 inline-flex items-center gap-1.5 rounded hover:bg-slate-50"
                  >
                    Masuk sebagai Tamu
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Copyright Footer Khusus Mobile (Dekat di Bawah Card Login) */}
        <footer className="sm:hidden text-center text-[10px] text-white/80 z-10 pt-3 pb-1 px-4 leading-relaxed font-medium">
          © 2026 Heat Exchanger Control System • Universitas Ahmad Dahlan
        </footer>
      </main>

      {/* Copyright Footer Khusus Desktop / Web (Di Bawah Halaman Seperti Gambar) */}
      <footer className="hidden sm:block text-center text-xs text-white/70 z-10 py-2.5 px-4 leading-relaxed font-medium">
        © 2026 Heat Exchanger Control System • Universitas Ahmad Dahlan
      </footer>

      {/* ─── TRIPLECYCLE BRANDING BADGE (Pengganti Indikator Next.js di Pojok Kiri Bawah - Ukuran Sama dengan Dashboard) ─── */}
      <div
        className="fixed bottom-3.5 left-3 sm:bottom-4 sm:left-4 z-30 select-none group pointer-events-auto"
        title="TripleCycle System"
      >
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white shadow-[0_8px_25px_-4px_rgba(0,0,0,0.25)] border-2 border-slate-200/90 hover:border-sky-400 transition-all duration-300 transform group-hover:scale-110 group-hover:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.35)] flex items-center justify-center overflow-hidden">
          <img
            src="/triplecycle-logo.png"
            alt="TripleCycle Logo"
            className="w-full h-full object-contain p-1 rounded-full"
          />
        </div>
      </div>

      {/* ─── SECURE EMAIL OTP PASSWORD RESET MODAL ─── */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-100 text-slate-800 animate-in zoom-in-95 duration-200 space-y-4">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center border border-sky-100">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    Verifikasi & Ganti Sandi Akun
                  </h3>
                  <p className="text-[10.5px] text-slate-500">Verifikasi OTP dikirim ke email resmi pengguna</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress Steps Header */}
            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
              <div className={`p-1.5 rounded-xl border transition ${resetStep === 'INPUT_EMAIL' ? 'bg-sky-50 border-sky-300 text-sky-700' : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                1. Email Akun
              </div>
              <div className={`p-1.5 rounded-xl border transition ${resetStep === 'VERIFY_OTP' ? 'bg-sky-50 border-sky-300 text-sky-700' : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                2. Kode OTP
              </div>
              <div className={`p-1.5 rounded-xl border transition ${resetStep === 'NEW_PASSWORD' || resetStep === 'SUCCESS' ? 'bg-sky-50 border-sky-300 text-sky-700' : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                3. Sandi Baru
              </div>
            </div>

            {/* Error Notice */}
            {resetError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{resetError}</span>
              </div>
            )}

            {/* STEP 1: INPUT REGISTERED EMAIL */}
            {resetStep === 'INPUT_EMAIL' && (
              <form onSubmit={handleRequestOtp} className="space-y-3.5">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Masukkan email terdaftar akun Anda untuk menerima kode verifikasi OTP.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Resmi Terdaftar</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={resetEmailInput}
                      onChange={(e) => setResetEmailInput(e.target.value)}
                      placeholder="nama@webmail.uad.ac.id"
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSendingEmail}
                  className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-extrabold rounded-xl shadow-md shadow-sky-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSendingEmail ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Mengirim Email OTP...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Kirim Kode OTP ke Email
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: ENTER 6-DIGIT OTP CODE */}
            {resetStep === 'VERIFY_OTP' && (
              <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 leading-relaxed flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="w-full">
                    <span>Kode verifikasi 6-digit telah dikirim ke: <strong>{resetEmailInput}</strong>.</span>
                    <p className="text-[11px] text-emerald-700 mt-0.5">Buka email Anda, lalu masukkan 6-digit kode OTP.</p>

                    <div className="mt-2 pt-2 border-t border-emerald-200/70 flex items-center justify-between">
                      <span className="text-[11px] text-slate-600 flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-500" /> Batas Waktu OTP:
                      </span>
                      {otpTimeLeft > 0 ? (
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                          ⏱ {Math.floor(otpTimeLeft / 60)}:{(otpTimeLeft % 60).toString().padStart(2, '0')}
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300">
                          ⚠️ Kedaluwarsa (&gt;5 mnt)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {smtpStatusInfo === 'UNCONFIGURED' && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-[11px] text-amber-900 leading-relaxed space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-amber-800">
                      <Info className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Pengiriman Email Memerlukan Kredensial SMTP</span>
                    </div>
                    <p>
                      Agar email terkirim ke Gmail asli Anda, isi <code>SMTP_USER</code> dan <code>SMTP_PASS</code> (Google App Password) di file <code>.env.local</code>.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 text-center">
                    Masukkan 6 Digit Kode OTP
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="Contoh: 849201"
                    className="w-full py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-mono font-black tracking-widest focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900"
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Tidak menerima email?</span>
                  <button
                    type="button"
                    disabled={otpResendCountdown > 0}
                    onClick={handleRequestOtp}
                    className={`font-bold transition ${otpResendCountdown > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-sky-600 hover:text-sky-800 underline'
                      }`}
                  >
                    {otpResendCountdown > 0 ? `Kirim ulang (${otpResendCountdown}s)` : 'Kirim Ulang OTP'}
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setResetStep('INPUT_EMAIL')}
                    className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                  >
                    Kembali
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-extrabold rounded-xl shadow-md shadow-sky-600/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> Verifikasi OTP
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: SET NEW PASSWORD WITH SECURITY CHECKLIST */}
            {resetStep === 'NEW_PASSWORD' && (() => {
              const strength = getPasswordStrength(newPasswordInput);
              return (
                <form onSubmit={handleSaveNewPassword} className="space-y-3.5">
                  <div className="p-3 bg-sky-50 border border-sky-200 rounded-2xl text-xs text-sky-800 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                    <span>Verifikasi Berhasil! Buat kata sandi baru untuk <strong>{resetEmailInput}</strong>.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Kata Sandi Baru</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPasswordInput}
                        onChange={(e) => setNewPasswordInput(e.target.value)}
                        placeholder="Min. 8 karakter (Huruf besar, kecil, angka)"
                        className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800"
                      />
                      <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Live Password Security Strength Indicator */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-slate-600">Kekuatan Keamanan Sandi:</span>
                      <span className={`font-black ${strength.score <= 1
                        ? 'text-rose-600'
                        : strength.score <= 3
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                        }`}>
                        {strength.score <= 1 ? 'Sangat Lemah' : strength.score <= 3 ? 'Sedang' : 'Kuat & Aman ✓'}
                      </span>
                    </div>

                    {/* Strength Progress Bar */}
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden flex gap-1">
                      <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strength.score >= 1 ? (strength.score <= 2 ? 'bg-rose-500' : strength.score === 3 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-transparent'
                        }`} />
                      <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strength.score >= 2 ? (strength.score === 2 ? 'bg-rose-500' : strength.score === 3 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-transparent'
                        }`} />
                      <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strength.score >= 3 ? (strength.score === 3 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-transparent'
                        }`} />
                      <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strength.score >= 4 ? 'bg-emerald-500' : 'bg-transparent'
                        }`} />
                    </div>

                    {/* Security Requirements Checklist */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10.5px]">
                      <div className={`flex items-center gap-1.5 ${strength.hasMinLength ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                        <CheckCircle2 className={`w-3.5 h-3.5 ${strength.hasMinLength ? 'text-emerald-600' : 'text-slate-300'}`} />
                        <span>Minimal 8 karakter</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${strength.hasUpperCase ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                        <CheckCircle2 className={`w-3.5 h-3.5 ${strength.hasUpperCase ? 'text-emerald-600' : 'text-slate-300'}`} />
                        <span>Huruf besar (A-Z)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${strength.hasLowerCase ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                        <CheckCircle2 className={`w-3.5 h-3.5 ${strength.hasLowerCase ? 'text-emerald-600' : 'text-slate-300'}`} />
                        <span>Huruf kecil (a-z)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${strength.hasNumber ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                        <CheckCircle2 className={`w-3.5 h-3.5 ${strength.hasNumber ? 'text-emerald-600' : 'text-slate-300'}`} />
                        <span>Angka (0-9)</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Konfirmasi Kata Sandi Baru</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={confirmPasswordInput}
                        onChange={(e) => setConfirmPasswordInput(e.target.value)}
                        placeholder="Ulangi kata sandi baru"
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800"
                      />
                      <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!strength.isValid}
                    className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-extrabold rounded-xl shadow-md shadow-sky-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-4 h-4" /> Simpan Kata Sandi Baru
                  </button>
                </form>
              );
            })()}

            {/* STEP 4: SUCCESS CONFIRMATION */}
            {resetStep === 'SUCCESS' && (
              <div className="text-center space-y-3.5 py-2">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-7 h-7" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-base font-black text-slate-900">Kata Sandi Berhasil Diperbarui!</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Kata sandi baru untuk akun <strong>{resetEmailInput}</strong> telah tersimpan dengan aman. Anda sekarang dapat langsung masuk ke dashboard.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsResetModalOpen(false);
                    setLoginEmail(resetEmailInput);
                  }}
                  className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-extrabold rounded-xl shadow-md transition cursor-pointer"
                >
                  Masuk Sekarang
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};
export default LoginScreen;
