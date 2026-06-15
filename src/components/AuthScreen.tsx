import React, { useState } from 'react';
import {
  Heart,
  User,
  ChevronRight,
  ChevronLeft,
  Activity,
  Sparkles,
  LockKeyhole,
  Info,
  AlertCircle,
  MapPin,
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { t } from '../lib/lang';
import { mapApiUserToProfile } from '../lib/apiMappers';
import { loginUser, registerPatient } from '../lib/apiServices';
import AppShell from './ui/AppShell';
import LanguageSwitcher from './ui/LanguageSwitcher';

interface AuthScreenProps {
  onAuthSuccess: (user: UserProfile, token: string) => void;
  language?: 'lotin' | 'kirill';
  onLanguageChange?: (lang: 'lotin' | 'kirill') => void;
}

const IS_DEV = import.meta.env.DEV;

const FERGANA_REGIONS = [
  "Farg'ona shahri",
  "Marg'ilon shahri",
  "Qo'qon shahri",
  "Quva tumani",
  "Rishton tumani",
  "Oltiariq tumani",
  "Beshariq tumani",
  "Bag'dod tumani",
  "Buvayda tumani",
  "Dang'ara tumani",
  "Uchko'prik tumani",
  "Toshloq tumani",
  "Yozyovon tumani",
  "Quvasoy shahri",
  "Farg'ona tumani",
];

export default function AuthScreen({
  onAuthSuccess,
  language = 'lotin',
  onLanguageChange,
}: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const [login, setLogin] = useState('');
  const [parol, setParol] = useState('');
  const [ism, setIsm] = useState('');
  const [rol, setRol] = useState<UserRole>('foydalanuvchi');

  const [shaharTuman, setShaharTuman] = useState("Farg'ona shahri");
  const [yosh, setYosh] = useState('45');
  const [jins, setJins] = useState<'erkak' | 'ayol'>('erkak');
  const [boy, setBoy] = useState('172');
  const [vazn, setVazn] = useState('75');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const resetMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const resetRegisterFlow = () => {
    setRegisterStep(1);
    resetMessages();
  };

  const validateRegisterStep1 = (): boolean => {
    if (!login.trim() || !parol.trim()) {
      setErrorMsg("Iltimos, login va maxfiy so'zni kiriting.");
      return false;
    }
    if (!ism.trim()) {
      setErrorMsg("To'liq ism-sharifingizni kiriting.");
      return false;
    }
    return true;
  };

  const validateRegisterStep2 = (): boolean => {
    const yoshNum = parseInt(yosh, 10);
    const boyNum = parseInt(boy, 10);
    const vaznNum = parseInt(vazn, 10);
    if (!yosh || yoshNum < 1 || yoshNum > 120) {
      setErrorMsg("Yosh 1 dan 120 gacha bo'lishi kerak.");
      return false;
    }
    if (!boy || boyNum < 50 || boyNum > 250) {
      setErrorMsg("Bo'y 50–250 sm oralig'ida bo'lishi kerak.");
      return false;
    }
    if (!vazn || vaznNum < 20 || vaznNum > 300) {
      setErrorMsg("Vazn 20–300 kg oralig'ida bo'lishi kerak.");
      return false;
    }
    return true;
  };

  const handleRegisterNext = () => {
    resetMessages();
    if (validateRegisterStep1()) {
      setRegisterStep(2);
    }
  };

  const handleRegisterBack = () => {
    resetMessages();
    setRegisterStep(1);
  };

  const handleShortcutLogin = (demoLogin: string, demoParol: string) => {
    resetMessages();
    setLogin(demoLogin);
    setParol(demoParol);
    submitLogin(demoLogin, demoParol);
  };

  const submitLogin = async (usrLogin: string, usrParol: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await loginUser(usrLogin, usrParol);
      if (data.user && data.accessToken) {
        const user = mapApiUserToProfile(data.user) as UserProfile;
        onAuthSuccess(user, data.accessToken);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Tizim ulanishida ulanish xatosi.";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const submitRegister = async () => {
    if (!validateRegisterStep1() || !validateRegisterStep2()) return;

    setLoading(true);
    try {
      const data = await registerPatient({
        login: login.trim(),
        parol: parol.trim(),
        ism: ism.trim(),
        shaharTuman,
        yosh: parseInt(yosh, 10) || 40,
        jins,
        boy: parseInt(boy, 10) || 170,
        vazn: parseInt(vazn, 10) || 70,
      });

      if (data.accessToken && data.user) {
        const user = mapApiUserToProfile(data.user) as UserProfile;
        onAuthSuccess(user, data.accessToken);
        return;
      }

      setSuccessMsg("Hisob muvaffaqiyatli yaratildi! Kirish bo'limidan kiring.");
      setMode('login');
      resetRegisterFlow();
      setParol('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Ulanish xatosi.";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (mode === 'login') {
      if (!login.trim() || !parol.trim()) {
        setErrorMsg("Iltimos, login va maxfiy so'zni kiriting.");
        return;
      }
      await submitLogin(login, parol);
      return;
    }

    if (registerStep === 1) {
      handleRegisterNext();
      return;
    }

    await submitRegister();
  };

  const showLoginFields = mode === 'login' || (mode === 'register' && registerStep === 1);
  const showStep1Fields = mode === 'register' && registerStep === 1;
  const showStep2Fields = mode === 'register' && registerStep === 2;

  return (
    <AppShell className="flex items-center justify-center px-4 py-8 min-h-screen">
      <div className="max-w-sm w-full ios-auth-card" id="auth-container">
        <div className="ios-auth-header p-4 text-center space-y-2 relative">
          <div className="flex justify-center items-center gap-2">
            {onLanguageChange && (
              <LanguageSwitcher
                language={language}
                onChange={onLanguageChange}
                variant="light"
              />
            )}
          </div>
          <div className="absolute top-2.5 right-2.5 opacity-80">
            <Sparkles className="w-4 h-4 text-[var(--ios-accent)]" />
          </div>
          <div className="w-11 h-11 ios-icon-wrap ios-icon-wrap-heart rounded-full mx-auto flex items-center justify-center">
            <Heart className="w-5 h-5 shrink-0" />
          </div>
          <h1 className="text-sm sm:text-base font-bold ios-header-title px-2">
            {t("Intellektual Salomatlik Platformasi", language)}
          </h1>
          <p className="text-[11px] ios-header-muted px-2 leading-snug">
            {t("Kardiologik xavf prognozlash va salomatlik monitoringi", language)}
          </p>
        </div>

        <div className="ios-tab-bar">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              resetRegisterFlow();
            }}
            className={`ios-tab-btn ${mode === 'login' ? 'ios-tab-btn-active' : ''}`}
            id="tab-auth-login"
          >
            {t("Tizimga Kirish", language)}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setRol('foydalanuvchi');
              resetRegisterFlow();
            }}
            className={`ios-tab-btn ${mode === 'register' ? 'ios-tab-btn-active' : ''}`}
            id="tab-auth-register"
          >
            {t("Ro'yxatdan O'tish", language)}
          </button>
        </div>

        <div className="p-4">
          {errorMsg && (
            <div className="mb-4 ios-alert ios-alert-error">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{t(errorMsg, language)}</span>
            </div>
          )}
          {successMsg && (
            <div className="mb-4 ios-alert ios-alert-success">
              <Info className="w-4 h-4 shrink-0" />
              <span>{t(successMsg, language)}</span>
            </div>
          )}

          {mode === 'register' && (
            <div className="mb-3">
              <div className="ios-register-steps">
                <div
                  className={`ios-register-step-dot ${registerStep >= 1 ? 'ios-register-step-dot-active' : ''}`}
                >
                  1
                </div>
                <div
                  className={`ios-register-step-line ${registerStep >= 2 ? 'ios-register-step-line-active' : ''}`}
                />
                <div
                  className={`ios-register-step-dot ${registerStep >= 2 ? 'ios-register-step-dot-active' : ''}`}
                >
                  2
                </div>
              </div>
              <div className="ios-register-step-labels">
                <span className={registerStep === 1 ? 'active' : ''}>
                  {t("Asosiy ma'lumotlar", language)}
                </span>
                <span className={registerStep === 2 ? 'active' : ''}>
                  {t("Klinik ma'lumotlar", language)}
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="ios-auth-form space-y-3.5">
            {showLoginFields && (
              <>
                <div className="ios-auth-field">
                  <label className="ios-label">{t("Foydalanuvchi logini *", language)}</label>
                  <div className="ios-auth-input-wrap">
                    <User className="ios-auth-field-icon" aria-hidden="true" />
                    <input
                      type="text"
                      placeholder={t("Masalan: Sardor2026", language)}
                      value={login}
                      onChange={(e) => setLogin(e.target.value)}
                      required={mode === 'login'}
                      className="ios-auth-input"
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="ios-auth-field">
                  <label className="ios-label">{t("Maxfiy parol *", language)}</label>
                  <div className="ios-auth-input-wrap">
                    <LockKeyhole className="ios-auth-field-icon" aria-hidden="true" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={parol}
                      onChange={(e) => setParol(e.target.value)}
                      required={mode === 'login'}
                      className="ios-auth-input"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    />
                  </div>
                </div>
              </>
            )}

            {showStep1Fields && (
              <div className="ios-auth-field animate-fadeIn">
                <label className="ios-label">{t("Ism va Sharifingiz *", language)}</label>
                <div className="ios-auth-input-wrap">
                  <input
                    type="text"
                    placeholder={t("Masalan: Qodirov Sardorbek", language)}
                    value={ism}
                    onChange={(e) => setIsm(e.target.value)}
                    className="ios-auth-input"
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            {showStep2Fields && rol === 'foydalanuvchi' && (
              <div className="ios-register-panel space-y-3 animate-fadeIn">
                <div className="flex items-center gap-1.5 text-[var(--ios-accent)] pb-0.5">
                  <Activity className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="text-xs font-semibold">
                    {t("Klinik ma'lumotlar", language)}
                  </span>
                </div>

                <div className="ios-auth-field">
                  <label className="ios-label flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0 opacity-70" aria-hidden="true" />
                    {t("Siz yashaydigan Hudud", language)}
                  </label>
                  <div className="ios-auth-input-wrap ios-auth-input-wrap-select">
                    <select
                      value={shaharTuman}
                      onChange={(e) => setShaharTuman(e.target.value)}
                      className="ios-auth-input ios-auth-select"
                    >
                    {FERGANA_REGIONS.map((reg) => (
                      <option key={reg} value={reg}>{t(reg, language)}</option>
                    ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="ios-auth-field">
                    <label className="ios-label">{t("Yoshingiz (yillarda)", language)}</label>
                    <div className="ios-auth-input-wrap">
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={yosh}
                        onChange={(e) => setYosh(e.target.value)}
                        className="ios-auth-input"
                      />
                    </div>
                  </div>
                  <div className="ios-auth-field">
                    <label className="ios-label">{t("Jins", language)}</label>
                    <div className="ios-auth-input-wrap ios-auth-input-wrap-select">
                      <select
                        value={jins}
                        onChange={(e) => setJins(e.target.value as 'erkak' | 'ayol')}
                        className="ios-auth-input ios-auth-select"
                      >
                      <option value="erkak">{t("Erkak", language)}</option>
                      <option value="ayol">{t("Ayol", language)}</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="ios-auth-field">
                    <label className="ios-label">{t("Bo'y", language)} (sm)</label>
                    <div className="ios-auth-input-wrap">
                      <input
                        type="number"
                        min="50"
                        max="250"
                        value={boy}
                        onChange={(e) => setBoy(e.target.value)}
                        className="ios-auth-input font-mono tabular-nums"
                      />
                    </div>
                  </div>
                  <div className="ios-auth-field">
                    <label className="ios-label">{t("Vazn", language)} (kg)</label>
                    <div className="ios-auth-input-wrap">
                      <input
                        type="number"
                        min="20"
                        max="300"
                        value={vazn}
                        onChange={(e) => setVazn(e.target.value)}
                        className="ios-auth-input font-mono tabular-nums"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {mode === 'login' && (
              <button
                type="submit"
                disabled={loading}
                className="ios-btn ios-btn-primary ios-btn-block"
                id="btn-auth-submit"
              >
                <span>
                  {loading ? t('Kuting, ulanish bormoqda...', language) : t('Tizimga Kirish', language)}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {mode === 'register' && registerStep === 1 && (
              <button
                type="button"
                onClick={handleRegisterNext}
                disabled={loading}
                className="ios-btn ios-btn-primary ios-btn-block"
                id="btn-register-next"
              >
                <span>{t('Keyingi', language)}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {mode === 'register' && registerStep === 2 && (
              <div className="flex gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={handleRegisterBack}
                  disabled={loading}
                  className="ios-btn ios-btn-frost ios-btn-sm flex-1"
                  id="btn-register-back"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>{t('Orqaga', language)}</span>
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="ios-btn ios-btn-primary ios-btn-sm flex-[2]"
                  id="btn-auth-submit"
                >
                  <span>
                    {loading
                      ? t('Kuting...', language)
                      : t("Ro'yxatdan O'tish", language)}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </form>

          {IS_DEV && (
            <div className="mt-8 border-t border-slate-200 pt-5 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center flex items-center justify-center gap-1">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {t("Sinov uchun tezkor rolli kirishlar (Demo)", language)}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleShortcutLogin('foydalanuvchi', 'foydalanuvchi123')}
                  className="p-3 ios-card text-left hover:scale-[1.02] transition-transform cursor-pointer"
                >
                  <span className="block text-[10px] font-bold uppercase text-[var(--ios-accent)]">
                    {t("Bemor", language)}
                  </span>
                  <span className="block text-sm font-bold text-slate-800">
                    {t("Sardor Salimov", language)}
                  </span>
                  <span className="block text-[10px] font-mono text-slate-400 mt-0.5">login: foydalanuvchi</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleShortcutLogin('shifokor', 'shifokor123')}
                  className="p-3 ios-card text-left hover:scale-[1.02] transition-transform cursor-pointer"
                >
                  <span className="block text-[10px] font-bold uppercase text-[var(--ios-accent)]">
                    {t("Shifokor", language)}
                  </span>
                  <span className="block text-sm font-bold text-slate-800">
                    {t("Dr. A. Qodirov", language)}
                  </span>
                  <span className="block text-[10px] font-mono text-slate-400 mt-0.5">login: shifokor</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleShortcutLogin('admin', 'admin123')}
                  className="p-3 ios-card text-left hover:scale-[1.02] transition-transform cursor-pointer"
                >
                  <span className="block text-[10px] font-bold uppercase text-[var(--ios-accent)]">
                    {t("Administrator", language)}
                  </span>
                  <span className="block text-sm font-bold text-slate-800">System Admin</span>
                  <span className="block text-[10px] font-mono text-slate-400 mt-0.5">login: admin</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
