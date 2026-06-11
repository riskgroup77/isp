import React, { useState } from 'react';
import {
  Building2,
  Loader2,
  Lock,
  MapPin,
  Pencil,
  Stethoscope,
  User,
  X,
} from 'lucide-react';
import { t, type AppLanguage } from '../../lib/lang';
import { FERGANA_REGIONS } from '../../lib/constants';
import type { SafeUserProfile } from '../../lib/auth';
import { updateAdminUser, type AdminUserUpdatePayload } from '../../lib/apiServices';
import { UserRole } from '../../types';
import { useToast } from '../ui/Toast';

interface AdminEditUserPanelProps {
  user: SafeUserProfile;
  currentAdminId: string;
  language: AppLanguage;
  onClose: () => void;
  onUpdated: () => void;
}

export default function AdminEditUserPanel({
  user,
  currentAdminId,
  language,
  onClose,
  onUpdated,
}: AdminEditUserPanelProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const [ism, setIsm] = useState(user.ism);
  const [rol, setRol] = useState<UserRole>(user.rol);
  const [parol, setParol] = useState('');
  const [shaharTuman, setShaharTuman] = useState(user.shaharTuman || FERGANA_REGIONS[0]);
  const [yosh, setYosh] = useState(String(user.yosh ?? ''));
  const [jins, setJins] = useState<'erkak' | 'ayol'>(user.jins || 'erkak');
  const [boy, setBoy] = useState(String(user.boy ?? ''));
  const [vazn, setVazn] = useState(String(user.vazn ?? ''));
  const [mutaxassislik, setMutaxassislik] = useState(user.mutaxassislik || '');
  const [shifoxona, setShifoxona] = useState(user.shifoxona || '');
  const [tasdiqlangan, setTasdiqlangan] = useState(user.tasdiqlangan ?? false);

  const isSelf = user.id === currentAdminId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ism.trim()) {
      showToast(t("Ism majburiy.", language), 'error');
      return;
    }
    if (parol.trim() && parol.trim().length < 6) {
      showToast(t("Parol kamida 6 belgidan iborat bo'lishi kerak.", language), 'error');
      return;
    }

    const payload: AdminUserUpdatePayload = {
      ism: ism.trim(),
    };

    if (!isSelf && rol !== user.rol) {
      payload.rol = rol;
    }

    if (parol.trim()) {
      payload.parol = parol.trim();
    }

    if (rol === 'foydalanuvchi' || user.rol === 'foydalanuvchi') {
      payload.shaharTuman = shaharTuman;
      if (yosh) payload.yosh = parseInt(yosh) || undefined;
      if (jins) payload.jins = jins;
      if (boy) payload.boy = parseInt(boy) || undefined;
      if (vazn) payload.vazn = parseFloat(vazn) || undefined;
    }

    if (rol === 'shifokor' || user.rol === 'shifokor') {
      payload.mutaxassislik = mutaxassislik.trim();
      payload.shifoxona = shifoxona.trim();
      payload.tasdiqlangan = tasdiqlangan;
      payload.shaharTuman = shaharTuman;
    }

    setLoading(true);
    try {
      await updateAdminUser(user.id, payload);
      showToast(t("Foydalanuvchi ma'lumotlari yangilandi.", language), 'success');
      onUpdated();
      onClose();
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : t("Tahrirlashda xatolik.", language),
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10003] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden"
        id="admin-edit-user-panel"
      >
        <div className="bg-indigo-900 px-5 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-indigo-300" />
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide">
                {t("Foydalanuvchini tahrirlash", language)}
              </h3>
              <p className="text-[10px] text-indigo-200 font-mono mt-0.5">
                login: {user.login}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-indigo-800 transition-colors"
            aria-label="Yopish"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              {t("Ism va sharif", language)} *
            </label>
            <input
              type="text"
              value={ism}
              onChange={(e) => setIsm(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                {t("Tizimdagi rol", language)}
              </label>
              <select
                value={rol}
                onChange={(e) => setRol(e.target.value as UserRole)}
                disabled={isSelf}
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white disabled:bg-slate-100 disabled:text-slate-500"
              >
                <option value="foydalanuvchi">{t("Bemor", language)}</option>
                <option value="shifokor">{t("Shifokor", language)}</option>
                <option value="admin">{t("Admin", language)}</option>
              </select>
              {isSelf && (
                <p className="text-[9px] text-amber-600 mt-1">
                  {t("O'z rolingizni o'zgartira olmaysiz.", language)}
                </p>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                {t("Yangi parol", language)}
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="password"
                  value={parol}
                  onChange={(e) => setParol(e.target.value)}
                  placeholder={t("O'zgartirmaslik uchun bo'sh qoldiring", language)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 pl-8 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              <MapPin className="w-3 h-3 inline mr-0.5" />
              {t("Shahar / tuman", language)}
            </label>
            <select
              value={shaharTuman}
              onChange={(e) => setShaharTuman(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {FERGANA_REGIONS.map((reg) => (
                <option key={reg} value={reg}>{t(reg, language)}</option>
              ))}
            </select>
          </div>

          {(rol === 'foydalanuvchi' || user.rol === 'foydalanuvchi') && rol !== 'admin' && (
            <div className="space-y-3 border-t border-dashed border-slate-200 pt-3">
              <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {t("Bemor ma'lumotlari", language)}
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

          {(rol === 'shifokor' || user.rol === 'shifokor') && (
            <div className="space-y-3 border-t border-dashed border-slate-200 pt-3">
              <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                <Stethoscope className="w-3.5 h-3.5" />
                {t("Shifokor ma'lumotlari", language)}
              </p>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">
                  {t("Mutaxassislik", language)}
                </label>
                <input
                  type="text"
                  value={mutaxassislik}
                  onChange={(e) => setMutaxassislik(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">
                  <Building2 className="w-3 h-3 inline mr-0.5" />
                  {t("Shifoxona", language)}
                </label>
                <input
                  type="text"
                  value={shifoxona}
                  onChange={(e) => setShifoxona(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5"
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
                  {t("Tasdiqlangan (login ruxsati)", language)}
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
              className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Pencil className="w-4 h-4" />
              )}
              {t("Saqlash", language)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
