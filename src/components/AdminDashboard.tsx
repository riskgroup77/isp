import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  ShieldAlert, 
  Trash2, 
  Settings, 
  Loader2, 
  Activity, 
  MapPin, 
  Award,
  RefreshCw,
  Search,
  UserPlus,
  Pencil,
  BarChart3,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { t } from '../lib/lang';
import MedicalDisclaimer from './MedicalDisclaimer';
import type { SafeUserProfile } from '../lib/auth';
import {
  deleteAdminUser,
  getAdminUsers,
  updateAdminUser,
} from '../lib/apiServices';
import { useToast } from './ui/Toast';
import AdminCreateUserPanel from './admin/AdminCreateUserPanel';
import AdminEditUserPanel from './admin/AdminEditUserPanel';
import AdminStatisticsPanel from './admin/AdminStatisticsPanel';
import AdminAnketaEditor from './admin/AdminAnketaEditor';
import { downloadUsersExcel } from '../lib/adminExport';
import AppShell from './ui/AppShell';
import LanguageSwitcher from './ui/LanguageSwitcher';

interface AdminDashboardProps {
  adminUser: SafeUserProfile;
  onLogout: () => void;
  language?: 'lotin' | 'kirill';
  onLanguageChange?: (lang: 'lotin' | 'kirill') => void;
}

export default function AdminDashboard({ 
  adminUser, 
  onLogout, 
  language = 'lotin', 
  onLanguageChange 
}: AdminDashboardProps) {
  const { showToast, showConfirm } = useToast();
  const [users, setUsers] = useState<SafeUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('barchasi');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [editUser, setEditUser] = useState<SafeUserProfile | null>(null);
  const [mainTab, setMainTab] = useState<'users' | 'statistics' | 'anketa'>('statistics');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getAdminUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch admin users roster:', err);
      showToast(t("Foydalanuvchilar ro'yxatini yuklashda xatolik.", language), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleDoctorApproval = async (userId: string, currentStatus: boolean) => {
    setActionLoadingId(userId);
    try {
      const updated = await updateAdminUser(userId, {
        tasdiqlangan: !currentStatus,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...updated } : u))
      );
      showToast(t("Shifokor holati yangilandi.", language), 'success');
    } catch (err) {
      console.error('Doctor approval toggle error:', err);
      showToast(t("Shifokor holatini yangilashda xatolik.", language), 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName?: string) => {
    if (userId === adminUser.id || userId === 'admin-1') {
      showToast(
        t("Faol administrator hisobini o'chirib bo'lmaydi.", language),
        'error'
      );
      return;
    }
    const confirmed = await showConfirm(
      userName
        ? t(
            `${userName} hisobini butunlay o'chirmoqchimisiz? Barcha yozuvlar o'chiriladi!`,
            language
          )
        : t(
            "Haqiqatdan ham ushbu foydalanuvchini platformadan butunlay o'chirmoqchimisiz?",
            language
          )
    );
    if (!confirmed) return;

    setActionLoadingId(userId);
    try {
      await deleteAdminUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      showToast(t("Foydalanuvchi o'chirildi.", language), 'success');
    } catch (err) {
      console.error('Error deleting user:', err);
      showToast(t("Foydalanuvchini o'chirishda xatolik.", language), 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Stats calculation
  const totalUsers = users.length;
  const totalPatients = users.filter(u => u.rol === 'foydalanuvchi').length;
  const totalDoctors = users.filter(u => u.rol === 'shifokor').length;
  const unverifiedDoctors = users.filter(u => u.rol === 'shifokor' && !u.tasdiqlangan);
  const totalAdmins = users.filter(u => u.rol === 'admin').length;

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.ism.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.login.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'barchasi' || u.rol === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <AppShell className="ios-app min-h-screen pb-12">
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6" id="admin-portal-root">
      
      {/* Title & Banner */}
      <div className="ios-header rounded-[var(--ios-radius-lg)] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 ios-icon-wrap">
            <Settings className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="ios-badge ios-badge-accent">
                {t("Administrator Boshqaruv Markazi", language)}
              </span>
              <span className="ios-badge ios-badge-glass font-mono">
                System Active
              </span>
            </div>
            <h2 className="text-2xl font-bold ios-header-title mt-1 tracking-tight">{adminUser.ism} (Admin)</h2>
            <p className="ios-header-muted text-xs mt-0.5">
              ⚙️ {t("Platforma foydalanuvi profillarini boshqarish va vrach ruxsatnomalarini tasdiqlash bosh qismi.", language)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onLanguageChange && (
            <LanguageSwitcher language={language} onChange={onLanguageChange} variant="light" />
          )}
          <button
            type="button"
            onClick={() => setShowCreatePanel(true)}
            className="ios-btn ios-btn-primary ios-btn-sm"
          >
            <UserPlus className="w-3.5 h-3.5" /> {t("Foydalanuvchi yaratish", language)}
          </button>
          <button
            type="button"
            onClick={fetchUsers}
            className="ios-btn ios-btn-secondary ios-btn-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" /> {t("Ma'lumotlarni yangilash", language)}
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="ios-btn ios-btn-danger ios-btn-sm"
          >
            {t("Chiqish", language)}
          </button>
        </div>
      </div>

      {/* Main navigation tabs */}
      <div className="admin-main-tabs">
        <button
          type="button"
          className={`admin-main-tab ${mainTab === 'statistics' ? 'active' : ''}`}
          onClick={() => setMainTab('statistics')}
        >
          <BarChart3 className="w-4 h-4" />
          {t("Statistika va hisobotlar", language)}
        </button>
        <button
          type="button"
          className={`admin-main-tab ${mainTab === 'anketa' ? 'active' : ''}`}
          onClick={() => setMainTab('anketa')}
        >
          <FileText className="w-4 h-4" />
          {t("Anketa tahriri", language)}
        </button>
        <button
          type="button"
          className={`admin-main-tab ${mainTab === 'users' ? 'active' : ''}`}
          onClick={() => setMainTab('users')}
        >
          <Users className="w-4 h-4" />
          {t("Foydalanuvchilar boshqaruvi", language)}
        </button>
      </div>

      {mainTab === 'statistics' && (
        <AdminStatisticsPanel language={language} />
      )}

      {mainTab === 'anketa' && (
        <AdminAnketaEditor language={language} />
      )}

      {mainTab === 'users' && (
      <>
      {/* KPI Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 ios-stagger">
        
        {/* Card 1: Total Users */}
        <div className="ios-card p-4 space-y-1">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Platforma Hisoblari</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-slate-800">{totalUsers}</span>
            <Users className="w-5 h-5 text-slate-400 shrink-0" />
          </div>
          <span className="block text-[8px] text-slate-500 font-medium font-mono">barcha rollar jami</span>
        </div>

        {/* Card 2: Patients */}
        <div className="ios-card p-4 space-y-1">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Jami Bemorlar (👤)</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-[var(--ios-accent)]">{totalPatients}</span>
            <Activity className="w-5 h-5 text-[var(--ios-accent)] shrink-0 opacity-80" />
          </div>
          <span className="block text-[8px] text-slate-500 font-medium font-mono">foydalanuvchi roldagilar</span>
        </div>

        {/* Card 3: Total Doctors */}
        <div className="ios-card p-4 space-y-1">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Shifokorlar (🥼)</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-[var(--ios-accent)]">{totalDoctors}</span>
            <Award className="w-5 h-5 text-[var(--ios-accent)] shrink-0 opacity-80" />
          </div>
          <span className="block text-[8px] text-slate-500 font-medium font-mono">tibbi muassis xodimlari</span>
        </div>

        {/* Card 4: Unverified Doctors (Urgent Action!) */}
        <div className="ios-card p-4 space-y-1 border-[var(--ios-warn)]/20">
          <span className="block text-[10px] font-extrabold text-amber-600 uppercase tracking-widest">Tasdiqlanmagan Vrach</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-amber-600">{unverifiedDoctors.length} ta</span>
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 animate-pulse" />
          </div>
          <span className="block text-[8px] text-slate-500 font-semibold text-rose-600/90 leading-tight">Tasdiq kutayotgan shifokorlar</span>
        </div>

        {/* Card 5: System Admins */}
        <div className="ios-card p-4 space-y-1">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tizim Adminlari</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-[var(--ios-accent)]">{totalAdmins}</span>
            <UserCheck className="w-5 h-5 text-[var(--ios-accent)] shrink-0 opacity-80" />
          </div>
          <span className="block text-[8px] text-slate-500 font-medium font-mono">boshqaruvchi ruxsatiga ega</span>
        </div>

      </div>

      {/* Main Table card */}
      <div className="ios-card ios-card-lg overflow-hidden">
        
        {/* Table header control bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Foydalanuvchilar Rosteri</h3>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute top-2.5 left-2.5" />
              <input
                type="text"
                placeholder="Login yoki Ism bo'yicha qidirish..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-xs rounded border border-slate-300 bg-white pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800"
              />
            </div>

            {/* Role filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs rounded border border-slate-300 bg-white p-1.5 focus:outline-none text-slate-800"
            >
              <option value="barchasi">Barcha Rollar</option>
              <option value="admin">Adminlar (admin)</option>
              <option value="shifokor">Shifokorlar (shifokor)</option>
              <option value="foydalanuvchi">Foydalanuvchi / Bemor (foydalanuvchi)</option>
            </select>

            <button
              type="button"
              onClick={() => {
                downloadUsersExcel(filteredUsers);
                showToast(t('Excel fayl yuklab olindi.', language), 'success');
              }}
              disabled={filteredUsers.length === 0}
              className="ios-btn ios-btn-primary ios-btn-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel
            </button>
          </div>
        </div>

        {/* Table content placeholder */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-16 text-slate-400 flex items-center justify-center gap-1.5">
              <Loader2 className="w-5 h-5 animate-spin text-amber-500" /> {t("Portal hisoblari yuklanmoqda...", language)}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs font-medium">
              Hech qanday foydalanuvchi filtrlarga mos kelmadi.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/50 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <th className="p-4">Foydalanuvchi / Login</th>
                  <th className="p-4">Tizimdagi Rol</th>
                  <th className="p-4">Kasbiy / Hududiy Kadr</th>
                  <th className="p-4">Ro'yxatg_Sana</th>
                  <th className="p-4">Tasdiq holati (Doctor)</th>
                  <th className="p-4 text-right">Tizim amallari</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs text-slate-700">
                {filteredUsers.map((u) => {
                  const isPendingDoc = u.rol === 'shifokor' && !u.tasdiqlangan;
                  const isActionLoading = actionLoadingId === u.id;

                  return (
                    <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${isPendingDoc ? 'bg-amber-50/15' : ''}`}>
                      
                      {/* Name & Login */}
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] border ${
                            u.rol === 'admin' 
                              ? 'bg-amber-50 text-amber-700 border-amber-200' 
                              : (u.rol === 'shifokor' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-purple-50 text-purple-700 border-purple-200')
                          }`}>
                            {u.ism.split(' ').map(n=>n[0]).slice(0, 2).join('').toUpperCase()}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-800 block leading-tight">{u.ism}</span>
                            <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                              login: <b>{u.login}</b>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Rol badge */}
                      <td className="p-4">
                        <span
                          className={`inline-flex px-2 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide border ${
                            u.rol === 'admin'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : u.rol === 'shifokor'
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                : 'bg-purple-50 text-purple-800 border-purple-200'
                          }`}
                        >
                          {u.rol === 'admin'
                            ? t('Admin', language)
                            : u.rol === 'shifokor'
                              ? t('Shifokor', language)
                              : t('Bemor', language)}
                        </span>
                      </td>

                      {/* Location / Specialty */}
                      <td className="p-4">
                        {u.rol === 'foydalanuvchi' && (
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                            <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span>{u.shaharTuman || "Farg'ona shahri"}</span>
                          </div>
                        )}
                        {u.rol === 'shifokor' && (
                          <div className="space-y-0.5 leading-tight">
                            <span className="font-bold text-indigo-900 block text-[11px]">{u.mutaxassislik}</span>
                            <span className="text-[10px] text-slate-400 block truncate max-w-xs">🏢 {u.shifoxona}</span>
                          </div>
                        )}
                        {u.rol === 'admin' && (
                          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">Boshqaruv chi paneli</span>
                        )}
                      </td>

                      {/* Created date */}
                      <td className="p-4 font-mono text-[10px] text-slate-500">
                        {u.yaratilganSana}
                      </td>

                      {/* Approve status toggle */}
                      <td className="p-4">
                        {u.rol === 'shifokor' ? (
                          <button
                            type="button"
                            onClick={() => handleToggleDoctorApproval(u.id, !!u.tasdiqlangan)}
                            disabled={isActionLoading}
                            className={`px-2.5 py-1 rounded text-[10px] font-extrabold uppercase tracking-wide cursor-pointer transition-colors ${
                              u.tasdiqlangan
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-amber-100 text-amber-800 hover:bg-amber-200 animate-pulse'
                            }`}
                          >
                            {u.tasdiqlangan ? "✅ Faol" : "⚠️ Kutilmoqda (Faollash)"}
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">-</span>
                        )}
                      </td>

                      {/* Actions: Tahrirlash + O'chirish */}
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setEditUser(u)}
                            disabled={isActionLoading}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Pencil className="w-3.5 h-3.5 shrink-0" />
                            {t("Tahrirlash", language)}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id, u.ism)}
                            disabled={
                              isActionLoading ||
                              u.id === adminUser.id
                            }
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                              u.id === adminUser.id
                                ? 'opacity-30 cursor-not-allowed bg-slate-50 text-slate-400 border-slate-200'
                                : 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5 shrink-0" />
                            {t("O'chirish", language)}
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>

      </>
      )}

      <div className="max-w-7xl mx-auto px-4 mt-8">
        <MedicalDisclaimer language={language} variant="card" />
      </div>

      {showCreatePanel && (
        <AdminCreateUserPanel
          language={language}
          onClose={() => setShowCreatePanel(false)}
          onCreated={fetchUsers}
        />
      )}

      {editUser && (
        <AdminEditUserPanel
          user={editUser}
          currentAdminId={adminUser.id}
          language={language}
          onClose={() => setEditUser(null)}
          onUpdated={fetchUsers}
        />
      )}

    </div>
    </AppShell>
  );
}
