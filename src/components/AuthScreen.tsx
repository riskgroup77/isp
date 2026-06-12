import React, { useState } from 'react';
import { 
  Heart, 
  User, 
  Lock, 
  ChevronRight, 
  Building2, 
  MapPin, 
  Activity, 
  Award,
  Sparkles,
  LockKeyhole,
  Info,
  AlertCircle
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { t } from '../lib/lang';
import MedicalDisclaimer from './MedicalDisclaimer';
import { mapApiUserToProfile } from '../lib/apiMappers';
import { loginUser, registerPatient } from '../lib/apiServices';
import AppShell from './ui/AppShell';
import LanguageSwitcher from './ui/LanguageSwitcher';
import ThemeToggle from './ui/ThemeToggle';

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
  "Farg'ona tumani"
];

export default function AuthScreen({ onAuthSuccess, language = 'lotin', onLanguageChange }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [login, setLogin] = useState('');
  const [parol, setParol] = useState('');
  const [ism, setIsm] = useState('');
  const [rol, setRol] = useState<UserRole>('foydalanuvchi');
  
  // Patient fields
  const [shaharTuman, setShaharTuman] = useState("Farg'ona shahri");
  const [yosh, setYosh] = useState('45');
  const [jins, setJins] = useState<'erkak' | 'ayol'>('erkak');
  const [boy, setBoy] = useState('172');
  const [vazn, setVazn] = useState('75');

  // Doctor fields
  const [mutaxassislik, setMutaxassislik] = useState('Kardiolog, Ilmiy xodim');
  const [shifoxona, setShifoxona] = useState("Farg'ona viloyat kardiologiya dispanseri");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const resetMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleShortcutLogin = (demoLogin: string, demoParol: string) => {
    resetMessages();
    setLogin(demoLogin);
    setParol(demoParol);
    // Submit login directly
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
    } catch (err: any) {
      setErrorMsg(err.message || "Tizim ulanishida ulanish xatosi.");
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!login.trim() || !parol.trim()) {
      setErrorMsg("Iltimos, login va maxfiy so'zni kiriting.");
      return;
    }

    if (mode === 'login') {
      await submitLogin(login, parol);
    } else {
      // REGISTER
      if (!ism.trim()) {
        setErrorMsg("To'liq ism-sharifingizni kiriting.");
        return;
      }
      setLoading(true);
      try {
        const data = await registerPatient({
          login: login.trim(),
          parol: parol.trim(),
          ism: ism.trim(),
          shaharTuman: shaharTuman,
          yosh: parseInt(yosh) || 40,
          jins: jins,
          boy: parseInt(boy) || 170,
          vazn: parseInt(vazn) || 70,
        });

        if (data.accessToken && data.user) {
          const user = mapApiUserToProfile(data.user) as UserProfile;
          onAuthSuccess(user, data.accessToken);
          return;
        }

        setSuccessMsg("Hisob muvaffaqiyatli yaratildi! Kirish bo'limidan kiring.");
        setMode('login');
        setParol('');
      } catch (err: any) {
        setErrorMsg(err.message || "Ulanish xatosi.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <AppShell className="flex items-center justify-center px-4 py-8 min-h-screen">
      <div className="max-w-md w-full ios-auth-card" id="auth-container">

      {/* Header card banner */}
      <div className="ios-auth-header p-6 text-center space-y-3 relative">
        <div className="flex justify-center items-center gap-2 mb-1">
          {onLanguageChange && (
            <LanguageSwitcher
              language={language}
              onChange={onLanguageChange}
            />
          )}
          <ThemeToggle language={language} />
        </div>
        <div className="absolute top-3 right-3 opacity-80">
          <Sparkles className="w-5 h-5 text-[var(--ios-accent)]" />
        </div>
        <div className="w-14 h-14 ios-icon-wrap ios-icon-wrap-heart rounded-full mx-auto">
          <Heart className="w-7 h-7 shrink-0" />
        </div>
        <h2 className="text-xs sm:text-sm font-semibold ios-header-muted tracking-wide leading-relaxed px-2">
          {t("Noinfeksion kardiologik xavflarni prognozlash va monitoring qilish milliy-ilmiy ko'p rolli portali", language)}
        </h2>
      </div>

      {/* Tabs list triggers */}
      <div className="ios-tab-bar">
        <button
          type="button"
          onClick={() => { setMode('login'); resetMessages(); }}
          className={`ios-tab-btn ${mode === 'login' ? 'ios-tab-btn-active' : ''}`}
          id="tab-auth-login"
        >
          {t("Tizimga Kirish", language)}
        </button>
        <button
          type="button"
          onClick={() => { setMode('register'); setRol('foydalanuvchi'); resetMessages(); }}
          className={`ios-tab-btn ${mode === 'register' ? 'ios-tab-btn-active' : ''}`}
          id="tab-auth-register"
        >
          {t("Ro'yxatdan O'tish", language)}
        </button>
      </div>

      <div className="p-6">
        
        {/* Error/Success alerts */}
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

        <MedicalDisclaimer language={language} variant="auth" className="mb-4" />

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          
          {/* USERNAME / LOGIN */}
          <div>
            <label className="ios-label">
              {t("Foydalanuvchi logini *", language)}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder={t("Masalan: Sardor2026", language)}
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                required
                className="ios-input ios-input-icon text-xs"
              />
            </div>
          </div>

          {/* PAROL (Password) */}
          <div>
            <label className="ios-label">
              {t("Maxfiy parol *", language)}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <LockKeyhole className="w-4 h-4" />
              </span>
              <input
                type="password"
                placeholder="********"
                value={parol}
                onChange={(e) => setParol(e.target.value)}
                required
                className="ios-input ios-input-icon text-xs"
              />
            </div>
          </div>

          {/* ADDITIONAL FIELDS FOR REGISTER ONLY */}
          {mode === 'register' && (
            <div className="space-y-4 border-t border-dashed border-slate-200 pt-4 animate-fadeIn">
              
              {/* FULL NAME */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1">
                  {t("Ism va Sharifingiz *", language)}
                </label>
                <input
                  type="text"
                  placeholder={t("Masalan: Qodirov Sardorbek", language)}
                  value={ism}
                  onChange={(e) => setIsm(e.target.value)}
                  className="w-full text-xs rounded border border-slate-300 p-2.5 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* ROLE SELECTION */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1">
                  {t("Portal Tizimidagi Rolingiz", language)}
                </label>
                <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800">{t("Bemor (Foydalanuvchi) 👤", language)}</span>
                  <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded-full">{t("Faqat Bemor", language)}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                  {t("Xavfsizlikni ta'minlash maqsadida mustaqil ravishda faqat Bemor bo'lib ro'yxatdan o'tish imkoniyati mavjud. Shifokor va Admin hisoblari tizim ma'muriyati orqali taqdim etiladi.", language)}
                </p>
              </div>

              {/* CONDITIONAL SUB-FORMS */}
              {rol === 'foydalanuvchi' && (
                <div className="bg-slate-55 p-3 rounded-xl border border-slate-200/80 space-y-3">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2 border-b pb-1">
                     {t("Klinik & Nutritiv boshlang'ich kadr", language)}
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                        {t("Siz yashaydigan Hudud", language)}
                      </label>
                      <select
                        value={shaharTuman}
                        onChange={(e) => setShaharTuman(e.target.value)}
                        className="w-full text-[10px] rounded border border-slate-300 p-1.5 focus:outline-none bg-white text-slate-800"
                      >
                        {FERGANA_REGIONS.map((reg) => (
                          <option key={reg} value={reg}>{t(reg, language)}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                        {t("Yoshingiz (yillarda)", language)}
                      </label>
                      <input
                        type="number"
                        value={yosh}
                        onChange={(e) => setYosh(e.target.value)}
                        className="w-full text-[10px] rounded border border-slate-300 p-1.5 focus:outline-none bg-white text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                        {t("Jins", language)}
                      </label>
                      <select
                        value={jins}
                        onChange={(e) => setJins(e.target.value as any)}
                        className="w-full text-[10px] rounded border border-slate-300 p-1.5 focus:outline-none bg-white text-slate-800"
                      >
                        <option value="erkak">{t("Erkak", language)}</option>
                        <option value="ayol">{t("Ayol", language)}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                        {t("Bo'y", language)} (sm)
                      </label>
                      <input
                        type="number"
                        value={boy}
                        onChange={(e) => setBoy(e.target.value)}
                        className="w-full text-[10px] rounded border border-slate-300 p-1.5 focus:outline-none bg-white text-slate-800 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                        {t("Vazn", language)} (kg)
                      </label>
                      <input
                        type="number"
                        value={vazn}
                        onChange={(e) => setVazn(e.target.value)}
                        className="w-full text-[10px] rounded border border-slate-300 p-1.5 focus:outline-none bg-white text-slate-800 font-mono"
                      />
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="ios-btn ios-btn-primary ios-btn-lg ios-btn-block uppercase tracking-widest"
            id="btn-auth-submit"
          >
            <span>{loading ? t('Kuting, ulanish bormoqda...', language) : (mode === 'login' ? t('Tizimga Kirish', language) : t('Portalda Ro\'yxatdan O\'tish', language))}</span>
            <ChevronRight className="w-4 h-4" />
          </button>

        </form>

        {/* DEMO ACCOUNTS — faqat development rejimida */}
        {IS_DEV && (
        <div className="mt-8 border-t border-slate-200 pt-5 space-y-3">
          <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider text-center flex items-center justify-center gap-1">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {t("Sinov uchun tezkor rolli kirishlar (Demo)", language)}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            
            {/* patient shortcut button */}
            <button
              type="button"
              onClick={() => handleShortcutLogin('foydalanuvchi', 'foydalanuvchi123')}
              className="p-3 ios-card text-left hover:scale-[1.02] transition-transform cursor-pointer"
            >
              <span className="block text-[8px] font-extrabold uppercase text-[var(--ios-accent)]">{t("Bemor", language)} / {t("Birlamchi", language)}</span>
              <span className="block text-[11px] font-bold text-slate-800">{t("Sardor Salimov", language)}</span>
              <span className="block text-[8px] font-mono text-slate-400 mt-0.5">login: foydalanuvchi</span>
            </button>

            {/* doctor shortcut button */}
            <button
              type="button"
              onClick={() => handleShortcutLogin('shifokor', 'shifokor123')}
              className="p-3 ios-card text-left hover:scale-[1.02] transition-transform cursor-pointer"
            >
              <span className="block text-[8px] font-extrabold uppercase text-[var(--ios-accent)]">{t("Shifokor", language)} / {t("Vodiydan", language)}</span>
              <span className="block text-[11px] font-bold text-slate-800">{t("Dr. A. Qodirov", language)}</span>
              <span className="block text-[8px] font-mono text-slate-455 mt-0.5">login: shifokor</span>
            </button>

            {/* admin shortcut button */}
            <button
              type="button"
              onClick={() => handleShortcutLogin('admin', 'admin123')}
              className="p-3 ios-card text-left hover:scale-[1.02] transition-transform cursor-pointer"
            >
              <span className="block text-[8px] font-extrabold uppercase text-[var(--ios-accent)]">{t("Administrator", language)}</span>
              <span className="block text-[11px] font-bold text-slate-800">System Admin</span>
              <span className="block text-[8px] font-mono text-slate-400 mt-0.5">login: admin</span>
            </button>

          </div>
        </div>
        )}
      </div>

      </div>
    </AppShell>
  );
}
