import React, { useState } from 'react';
import {
  Building2,
  Loader2,
  Lock,
  MapPin,
  Stethoscope,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import { t, type AppLanguage } from '../../lib/lang';
import { FERGANA_REGIONS } from '../../lib/constants';
import { createAdminDoctor, createPatientUser } from '../../lib/apiServices';
import { useToast } from '../ui/Toast';

type CreateRole = 'foydalanuvchi' | 'shifokor';

interface AdminCreateUserPanelProps {
  language: AppLanguage;
  onClose: () => void;
  onCreated: () => void;
}

export default function AdminCreateUserPanel({
  language,
  onClose,
  onCreated,
}: AdminCreateUserPanelProps) {
  const { showToast } = useToast();
  const [createRole, setCreateRole] = useState<CreateRole>('foydalanuvchi');
  const [loading, setLoading] = useState(false);

  const [login, setLogin] = useState('');
  const [parol, setParol] = useState('');
  const [ism, setIsm] = useState('');
  const [shaharTuman, setShaharTuman] = useState(FERGANA_REGIONS[0]);
  const [yosh, setYosh] = useState('45');
  const [jins, setJins] = useState<'erkak' | 'ayol'>('erkak');
  const [boy, setBoy] = useState('170');
  const [vazn, setVazn] = useState('70');
  const [mutaxassislik, setMutaxassislik] = useState('Kardiolog');
  const [shifoxona, setShifoxona] = useState("Farg'ona viloyat kardiologiya dispanseri");
  const [tasdiqlangan, setTasdiqlangan] = useState(true);

  const resetForm = () => {
    setLogin('');
    setParol('');
    setIsm('');
    setShaharTuman(FERGANA_REGIONS[0]);
    setYosh('45');
    setJins('erkak');
    setBoy('170');
    setVazn('70');
    setMutaxassislik('Kardiolog');
    setShifoxona("Farg'ona viloyat kardiologiya dispanseri");
    setTasdiqlangan(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!login.trim() || !parol.trim() || !ism.trim()) {
      showToast(t("Login, parol va ism majburiy.", language), 'error');
      return;
    }
    if (parol.trim().length < 6) {
      showToast(t("Parol kamida 6 belgidan iborat bo'lishi kerak.", language), 'error');
      return;
    }

    setLoading(true);
    try {
      if (createRole === 'shifokor') {
        if (!mutaxassislik.trim() || !shifoxona.trim()) {
          showToast(t("Mutaxassislik va shifoxona majburiy.", language), 'error');
          setLoading(false);
          return;
        }
        await createAdminDoctor({
          login: login.trim(),
          parol: parol.trim(),
          ism: ism.trim(),
          mutaxassislik: mutaxassislik.trim(),
          shifoxona: shifoxona.trim(),
          shaharTuman: shaharTuman,
          tasdiqlangan: tasdiqlangan,
        });
        showToast(t("Shifokor hisobi muvaffaqiyatli yaratildi.", language), 'success');
      } else {
        await createPatientUser({
          login: login.trim(),
          parol: parol.trim(),
          ism: ism.trim(),
          shaharTuman: shaharTuman,
          yosh: parseInt(yosh) || undefined,
          jins: jins,
          boy: parseInt(boy) || undefined,
          vazn: parseInt(vazn) || undefined,
        });
        showToast(t("Bemor hisobi muvaffaqiyatli yaratildi.", language), 'success');
      }

      resetForm();
      onCreated();
      onClose();
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : t("Hisob yaratishda xatolik.", language),
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10003] ios-overlay flex items-center justify-center p-4">
      <div
        className="ios-card ios-modal max-w-lg w-full overflow-hidden animate-fadeIn"
        id="admin-create-user-panel"
      >
        <div className="ios-header px-5 py-4 flex items-center justify-between text-white rounded-none">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-black uppercase tracking-wide">
              {t("Yangi foydalanuvchi yaratish", language)}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Yopish"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Rol tanlash */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCreateRole('foydalanuvchi')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                createRole === 'foydalanuvchi'
                  ? 'bg-purple-50 border-purple-300 text-purple-800 ring-1 ring-purple-200'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <User className="w-4 h-4 inline mr-1" />
              {t("Bemor", language)}
            </button>
            <button
              type="button"
              onClick={() => setCreateRole('shifokor')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                createRole === 'shifokor'
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-800 ring-1 ring-indigo-200'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Stethoscope className="w-4 h-4 inline mr-1" />
              {t("Shifokor", language)}
            </button>
          </div>

          <p className="text-[10px] text-slate-500 leading-relaxed bg-slate-50 border border-slate-100 rounded-lg p-2.5">
            {createRole === 'shifokor'
              ? t(
                  "Shifokor hisoblari faqat administrator orqali yaratiladi. Tasdiqlangan shifokor tizimga kira oladi.",
                  language
                )
              : t(
                  "Bemor hisobi ochiq ro'yxatdan o'tish API orqali yaratiladi. Login telefon yoki email bo'lishi mumkin.",
                  language
                )}
          </p>

          {/* Umumiy maydonlar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                {t("Login (telefon/email)", language)} *
              </label>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="998901234567"
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                {t("Maxfiy parol", language)} *
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="password"
                  value={parol}
                  onChange={(e) => setParol(e.target.value)}
                  minLength={6}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 pl-8 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              {t("Ism va sharif", language)} *
            </label>
            <input
              type="text"
              value={ism}
              onChange={(e) => setIsm(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              <MapPin className="w-3 h-3 inline mr-0.5" />
              {t("Shahar / tuman", language)}
            </label>
            <select
              value={shaharTuman}
              onChange={(e) => setShaharTuman(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {FERGANA_REGIONS.map((reg) => (
                <option key={reg} value={reg}>{t(reg, language)}</option>
              ))}
            </select>
          </div>

          {/* Bemor qo'shimcha maydonlar */}
          {createRole === 'foydalanuvchi' && (
            <div className="space-y-3 border-t border-dashed border-slate-200 pt-3">
              <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                {t("Klinik boshlang'ich ma'lumotlar", language)}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">
                    {t("Yosh", language)}
                  </label>
                  <input
                    type="number"
                    value={yosh}
                    onChange={(e) => setYosh(e.target.value)}
                    className="w-full text-xs rounded border border-slate-300 p-2"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">
                    {t("Jins", language)}
                  </label>
                  <select
                    value={jins}
                    onChange={(e) => setJins(e.target.value as 'erkak' | 'ayol')}
                    className="w-full text-xs rounded border border-slate-300 p-2"
                  >
                    <option value="erkak">{t("Erkak", language)}</option>
                    <option value="ayol">{t("Ayol", language)}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">
                    {t("Bo'yi", language)} (sm)
                  </label>
                  <input
                    type="number"
                    value={boy}
                    onChange={(e) => setBoy(e.target.value)}
                    className="w-full text-xs rounded border border-slate-300 p-2"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">
                    {t("Vazni", language)} (kg)
                  </label>
                  <input
                    type="number"
                    value={vazn}
                    onChange={(e) => setVazn(e.target.value)}
                    className="w-full text-xs rounded border border-slate-300 p-2"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Shifokor qo'shimcha maydonlar */}
          {createRole === 'shifokor' && (
            <div className="space-y-3 border-t border-dashed border-slate-200 pt-3">
              <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                {t("Kasbiy ma'lumotlar", language)}
              </p>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">
                  {t("Mutaxassislik", language)} *
                </label>
                <input
                  type="text"
                  value={mutaxassislik}
                  onChange={(e) => setMutaxassislik(e.target.value)}
                  placeholder="Kardiolog"
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5"
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">
                  <Building2 className="w-3 h-3 inline mr-0.5" />
                  {t("Shifoxona", language)} *
                </label>
                <input
                  type="text"
                  value={shifoxona}
                  onChange={(e) => setShifoxona(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5"
                  required
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tasdiqlangan}
                  onChange={(e) => setTasdiqlangan(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-semibold text-slate-700">
                  {t("Hisobni darhol tasdiqlash (shifokor login qila oladi)", language)}
                </span>
              </label>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              {t("Bekor qilish", language)}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {t("Hisob yaratish", language)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
