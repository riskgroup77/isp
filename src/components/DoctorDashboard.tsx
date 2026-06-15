import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Search, 
  MapPin, 
  Activity, 
  Clock, 
  TrendingUp, 
  CheckCircle, 
  User, 
  Plus, 
  Sparkles, 
  ShieldAlert,
  Send,
  Loader2,
  Calendar,
  Layers,
  ArrowLeft,
  XCircle,
  TrendingDown,
  Clipboard,
  FileText,
  Printer,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { QuestionnaireData, PatientAdvice, HealthJournalEntry, UserProfile } from '../types';
import { t } from '../lib/lang';
import MedicalDisclaimer from './MedicalDisclaimer';
import type { SafeUserProfile } from '../lib/auth';
import { toServerHistory } from '../lib/screeningHistory';
import {
  getPatientAdvices,
  getPatientsForDoctor,
  postPatientAdvice,
  predictRisk,
} from '../lib/apiServices';
import { useToast } from './ui/Toast';
import AppShell from './ui/AppShell';
import LanguageSwitcher from './ui/LanguageSwitcher';

interface DoctorDashboardProps {
  doctorUser: SafeUserProfile;
  onLogout: () => void;
  language?: 'lotin' | 'kirill';
  onLanguageChange?: (lang: 'lotin' | 'kirill') => void;
}

export default function DoctorDashboard({ 
  doctorUser, 
  onLogout, 
  language = 'lotin', 
  onLanguageChange 
}: DoctorDashboardProps) {
  const { showToast } = useToast();
  const [patients, setPatients] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('barchasi');
  const [selectedRiskZone, setSelectedRiskZone] = useState('barchasi');
  
  // Selected Patient states
  const [activePatient, setActivePatient] = useState<UserProfile | null>(null);
  const [patientAdvices, setPatientAdvices] = useState<PatientAdvice[]>([]);
  const [newAdviceText, setNewAdviceText] = useState('');
  const [submittingAdvice, setSubmittingAdvice] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load patients from API
  const fetchPatients = async () => {
    setLoading(true);
    try {
      const data = await getPatientsForDoctor();
      setPatients(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Bemorlar ro'yxatini yuklashda muammo yuz berdi.";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // Fetch advice records for the chosen patient
  const fetchPatientAdvices = async (patientId: string) => {
    try {
      const data = await getPatientAdvices(patientId);
      setPatientAdvices(data);
    } catch (err) {
      console.error('Error fetching patient advices:', err);
    }
  };

  // Active Patient Navigation Tabs
  const [activeTab, setActiveTab] = useState<'tahlil' | 'skrining' | 'journal' | 'advices'>('tahlil');

  // Screening form state (Pre-filled on select)
  const [screeningForm, setScreeningForm] = useState<QuestionnaireData>({
    yosh: 50,
    jins: 'erkak',
    boy: 170,
    vazn: 70,
    sistolik: 120,
    diastolik: 80,
    glyukoza: '',
    xolesterin: '',
    tuzIstemi: 'ortacha',
    shakarVaXamir: 'ortacha',
    sabzavotMeva: 'har_kuni',
    jismoniyFaollik: 'ortacha',
    chekish: 'yoq',
    nosvoy: 'yoq',
    oiladaKasallik: [],
    tibbiyotXodimi: false,
    nazariyBilimDarajasi: 'yaxshi',
    realKomplayens: 'ortacha',
    shaharTuman: "Farg'ona shahri",
    erkinShikoyat: ''
  });

  // Daily live journal measurement entry state code
  const [journalForm, setJournalForm] = useState({
    sistolik: 120,
    diastolik: 80,
    puls: 75,
    glyukoza: '' as number | '',
    vazn: '' as number | '',
    uyqu: 'ortacha' as 'yaxshi' | 'ortacha' | 'yomon',
    stress: 'ortacha' as 'past' | 'ortacha' | 'yuqori',
    alomatlar: [] as string[],
    qaydlar: ''
  });

  const [submittingScreening, setSubmittingScreening] = useState(false);
  const [submittingJournal, setSubmittingJournal] = useState(false);

  interface CustomTooltipProps {
    active?: boolean;
    payload?: any[];
    label?: string;
  }

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-slate-100 p-3 rounded-xl shadow-xl border border-slate-700/80 text-xs space-y-1.5 font-sans">
          <p className="font-extrabold text-slate-400 border-b border-slate-700 pb-1 mb-1 font-mono">{label}</p>
          {payload.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.stroke || item.color }} />
                {item.name}:
              </span>
              <span className="font-mono font-extrabold" style={{ color: item.stroke || item.color }}>
                {item.value} {item.name.toLowerCase().includes('puls') ? 'zarba/min' : 'mmHg'}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const handleSelectPatient = (patient: UserProfile) => {
    setActivePatient(patient);
    setNewAdviceText('');
    fetchPatientAdvices(patient.id);

    const latestScr = patient.soglik_skrining_tarixi && patient.soglik_skrining_tarixi.length > 0 
      ? patient.soglik_skrining_tarixi[0].data 
      : null;

    setScreeningForm({
      yosh: patient.yosh || latestScr?.yosh || 50,
      jins: patient.jins || latestScr?.jins || 'erkak',
      boy: patient.boy || latestScr?.boy || 170,
      vazn: patient.vazn || latestScr?.vazn || 70,
      sistolik: latestScr?.sistolik || 120,
      diastolik: latestScr?.diastolik || 80,
      glyukoza: latestScr?.glyukoza !== undefined && latestScr?.glyukoza !== null ? latestScr.glyukoza : '',
      xolesterin: latestScr?.xolesterin !== undefined && latestScr?.xolesterin !== null ? latestScr.xolesterin : '',
      tuzIstemi: latestScr?.tuzIstemi || 'ortacha',
      shakarVaXamir: latestScr?.shakarVaXamir || 'ortacha',
      sabzavotMeva: latestScr?.sabzavotMeva || 'har_kuni',
      jismoniyFaollik: latestScr?.jismoniyFaollik || 'ortacha',
      chekish: latestScr?.chekish || 'yoq',
      nosvoy: latestScr?.nosvoy || 'yoq',
      oiladaKasallik: latestScr?.oiladaKasallik || [],
      tibbiyotXodimi: latestScr?.tibbiyotXodimi || false,
      nazariyBilimDarajasi: latestScr?.nazariyBilimDarajasi || 'yaxshi',
      realKomplayens: latestScr?.realKomplayens || 'ortacha',
      shaharTuman: patient.shaharTuman || latestScr?.shaharTuman || "Farg'ona shahri",
      erkinShikoyat: ''
    });

    const latestJour = patient.soglik_kundaligi && patient.soglik_kundaligi.length > 0
      ? patient.soglik_kundaligi[0]
      : null;

    setJournalForm({
      sistolik: latestJour?.sistolik || 120,
      diastolik: latestJour?.diastolik || 80,
      puls: latestJour?.puls || 75,
      glyukoza: latestJour?.glyukoza !== undefined && latestJour?.glyukoza !== null ? latestJour.glyukoza : '',
      vazn: patient.vazn || latestJour?.vazn || '',
      uyqu: 'ortacha',
      stress: 'ortacha',
      alomatlar: [],
      qaydlar: ''
    });

    setActiveTab('tahlil');
  };

  const handleFamilyDiseaseToggle = (diseaseId: string) => {
    setScreeningForm((prev: any) => {
      const currentList = prev.oiladaKasallik || [];
      const updatedList = currentList.includes(diseaseId)
        ? currentList.filter((d: string) => d !== diseaseId)
        : [...currentList, diseaseId];
      return { ...prev, oiladaKasallik: updatedList };
    });
  };

  const handleSymptomToggle = (symptomId: string) => {
    setJournalForm((prev: any) => {
      const currentList = prev.alomatlar || [];
      const updatedList = currentList.includes(symptomId)
        ? currentList.filter((s: string) => s !== symptomId)
        : [...currentList, symptomId];
      return { ...prev, alomatlar: updatedList };
    });
  };

  const submitDoctorScreening = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient) return;

    if (!doctorUser.tasdiqlangan) {
      showToast(
        t(
          "Shifokorlik hisobingiz hali tasdiqlanmagan. Administrator tasdiqlashini kuting.",
          language
        ),
        'error'
      );
      return;
    }

    setSubmittingScreening(true);
    try {
      const riskResult = await predictRisk(screeningForm);

      const newHistoryItem = {
        id: `hist-${Date.now()}`,
        sana:
          new Date().toLocaleDateString('uz-UZ') +
          ' ' +
          new Date().toLocaleTimeString('uz-UZ', { hour12: false }),
        data: { ...screeningForm },
        riskResult,
      };

      const updatedHistory = toServerHistory([
        newHistoryItem,
        ...(activePatient.soglik_skrining_tarixi || []),
      ]).map((item) => ({
        riskResult: item.riskResult,
        data: item.data,
        sana: item.sana,
      }));

      showToast(
        t(
          "Skrining tahlili yakunlandi (ko'rish rejimi — serverga yozish faqat bemorda).",
          language
        ),
        'success'
      );

      const updatedPatientDetails = {
        ...activePatient,
        soglik_skrining_tarixi: updatedHistory,
        yosh: screeningForm.yosh,
        jins: screeningForm.jins,
        boy: screeningForm.boy,
        vazn: screeningForm.vazn,
        shaharTuman: screeningForm.shaharTuman
      };
      
      setActivePatient(updatedPatientDetails);
      fetchPatients();
      setActiveTab('tahlil');
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : t("Xatolik yuz berdi", language),
        'error'
      );
    } finally {
      setSubmittingScreening(false);
    }
  };

  const submitDoctorDailyLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient) return;

    if (!doctorUser.tasdiqlangan) {
      showToast(t("Shifokorlik hisobingiz tasdiqlanmagan!", language), 'error');
      return;
    }

    setSubmittingJournal(true);
    try {
      const newLog: HealthJournalEntry = {
        id: 'doc-log-' + Date.now(),
        sana: new Date().toISOString().split('T')[0],
        vaqt: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false }),
        sistolik: Number(journalForm.sistolik),
        diastolik: Number(journalForm.diastolik),
        puls: Number(journalForm.puls),
        glyukoza: journalForm.glyukoza !== '' ? Number(journalForm.glyukoza) : '',
        vazn: journalForm.vazn !== '' ? Number(journalForm.vazn) : '',
        uyqu: journalForm.uyqu,
        stress: journalForm.stress,
        alomatlar: journalForm.alomatlar,
        dorilar: [],
        qaydlar: journalForm.qaydlar
      };

      const updatedJournalStr = [newLog, ...(activePatient.soglik_kundaligi || [])];

      showToast(
        t(
          "Qabul yozuvi sessiya uchun saqlandi (API faqat bemorga sync ruxsat beradi).",
          language
        ),
        'info'
      );

      const updatedPatientDetails = {
        ...activePatient,
        soglik_kundaligi: updatedJournalStr
      };

      setActivePatient(updatedPatientDetails);
      fetchPatients();
      setActiveTab('tahlil');
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : t("Xatolik yuz berdi", language),
        'error'
      );
    } finally {
      setSubmittingJournal(false);
    }
  };

  const handlePostAdvice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdviceText.trim() || !activePatient) return;

    if (!doctorUser.tasdiqlangan) {
      showToast(
        t(
          "Shifokorlik hisobingiz hali tasdiqlanmagan! Administrator tasdiqlashini kuting.",
          language
        ),
        'error'
      );
      return;
    }

    setSubmittingAdvice(true);
    try {
      const now = new Date();
      const advice = await postPatientAdvice(
        activePatient.id,
        newAdviceText.trim(),
        now.toISOString().split('T')[0],
        now.toLocaleTimeString('uz-UZ', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      );

      setPatientAdvices((prev) => [advice, ...prev]);
      setNewAdviceText('');
      showToast(t("Maslahat muvaffaqiyatli yuborildi.", language), 'success');
      fetchPatients();
    } catch (err: unknown) {
      showToast(
        err instanceof Error
          ? err.message
          : t("Maslahat yuborishda xatolik.", language),
        'error'
      );
    } finally {
      setSubmittingAdvice(false);
    }
  };

  // Filter conditions
  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.ism.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.login && p.login.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRegion = selectedRegion === 'barchasi' || p.shaharTuman === selectedRegion;
    
    // Calculate custom risk factor zone based on their latest screening result
    let riskZone = 'noaniq';
    if (p.soglik_skrining_tarixi && p.soglik_skrining_tarixi.length > 0) {
      const activeRisk = p.soglik_skrining_tarixi[0].riskResult || (p.soglik_skrining_tarixi[0] as any).result;
      riskZone = activeRisk?.zona || 'noaniq';
    }
    const matchesRisk = selectedRiskZone === 'barchasi' || riskZone === selectedRiskZone;

    return matchesSearch && matchesRegion && matchesRisk;
  });

  // Extract unique regions for select filter dropdown
  const regionsList = Array.from(new Set(patients.map(p => p.shaharTuman).filter(Boolean)));

  return (
    <AppShell className="ios-app min-h-screen pb-12">
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6" id="doctor-portal-root">
      
      {/* Upper info banner */}
      <div className="ios-header rounded-[var(--ios-radius-lg)] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 ios-icon-wrap">
            <User className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="ios-badge ios-badge-accent">
                {t("Vrach-Shifokor Kabineti", language)}
              </span>
              {doctorUser.tasdiqlangan ? (
                <span className="text-xs bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> {t("Tasdiqlangan amaliyotchi", language)}
                </span>
              ) : (
                <span className="text-xs bg-amber-800 text-amber-100 px-2 py-0.5 rounded font-black flex items-center gap-1 animate-pulse">
                  <ShieldAlert className="w-3 h-3 text-amber-300" /> {t("Tasdiqlanish kutilmoqda", language)}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold ios-header-title mt-1 tracking-tight">{doctorUser.ism}</h2>
            <p className="ios-header-muted text-xs mt-0.5 font-medium">
              💼 {doctorUser.mutaxassislik} • 🏥 {doctorUser.shifoxona}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onLanguageChange && (
            <LanguageSwitcher language={language} onChange={onLanguageChange} variant="light" />
          )}
          <button
            type="button"
            onClick={fetchPatients}
            className="ios-btn ios-btn-secondary ios-btn-sm"
          >
            {t("Sinxron yig'ish", language)}
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

      {/* WARNING OVERLAY IF NOT VERIFIED BY ADMIN */}
      {!doctorUser.tasdiqlangan && (
        <div className="ios-alert ios-alert-warn p-5 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0" />
            <h3 className="font-extrabold text-sm uppercase tracking-wide">{t("Hisobingiz hali faollashtirilmagan", language)}</h3>
          </div>
          <p className="text-xs leading-relaxed text-slate-700">
            {t(
              "Tizim qoidalariga ko'ra, bemorlarni boshqarish va maslahat yozish uchun administrator tasdiqlashi shart. Hozirda siz bemorlar profilini faqat kuzatish rejimida ko'ra olasiz.",
              language
            )}
          </p>
        </div>
      )}

      {errorMsg && (
        <div className="ios-alert ios-alert-error text-xs">
          ⚠️ {t(errorMsg, language)}
        </div>
      )}

      {/* Main Grid: list + active patient view */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* PATIENTS SIDEBAR LIST */}
        <div className="lg:col-span-4 space-y-4">
          <div className="ios-card ios-card-lg p-4 space-y-4">
            <h3 className="text-xs font-bold text-slate-750 uppercase tracking-widest border-b pb-2 flex items-center justify-between">
              <span>{t("Mening bemorlarim", language)}</span>
              <span className="font-mono bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[10px]">
                {filteredPatients.length} {t("ta", language)}
              </span>
            </h3>

            {/* SEACH & FILTER */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute top-3 left-3" />
                <input
                  type="text"
                  placeholder={t("Ism yoki login bo'yicha...", language)}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs rounded border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[8px] font-bold text-slate-400 uppercase">{t("Hudud", language)}</label>
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="w-full text-[10px] rounded border border-slate-200 bg-white p-1 text-slate-800"
                  >
                    <option value="barchasi">{t("Barchasi", language)}</option>
                    {regionsList.map((reg: any) => (
                      <option key={reg} value={reg}>{t(reg, language)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[8px] font-bold text-slate-400 uppercase">{t("Salomatlik darajasi", language)}</label>
                  <select
                    value={selectedRiskZone}
                    onChange={(e) => setSelectedRiskZone(e.target.value)}
                    className="w-full text-[10px] rounded border border-slate-200 bg-white p-1 text-slate-800"
                  >
                    <option value="barchasi">{t("Barchasi", language)}</option>
                    <option value="yashil">{t("Sog'lom (Yashil)", language)}</option>
                    <option value="sariq">{t("Mo'tadil (Sariq)", language)}</option>
                    <option value="qizil">{t("Baland xavfli (Qizil)", language)}</option>
                    <option value="noaniq">{t("Skrining o'tmagan", language)}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* LIST CARDS */}
            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {loading ? (
                <div className="text-center py-8 text-xs text-slate-400 flex items-center justify-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> Profil ma'lumotlari zaxiralanmoqda...
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Mos tushuvchi bemorlar topilmadi.
                </div>
              ) : (
                filteredPatients.map((p) => {
                  const latestRecord = p.soglik_skrining_tarixi && p.soglik_skrining_tarixi.length > 0 
                    ? p.soglik_skrining_tarixi[0] 
                    : null;
                  
                  const isSardor = p.id === 'user-1';

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPatient(p)}
                      className={`w-full p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 relative cursor-pointer ${
                        activePatient?.id === p.id
                          ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-500/30'
                          : 'border-slate-200 hover:bg-slate-50 bg-white'
                      }`}
                    >
                      {/* Left initial circle */}
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-650 tracking-wider shrink-0 text-xs border border-slate-200">
                        {p.ism.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                      </div>

                      {/* Info details */}
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-extrabold text-xs text-slate-800 truncate block">
                            {p.ism}
                          </span>
                          {latestRecord && (() => {
                            const recResult = latestRecord.riskResult || (latestRecord as any).result;
                            if (!recResult) return null;
                            return (
                              <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase ${
                                recResult.zona === 'yashil' 
                                  ? 'bg-emerald-50 text-emerald-700' 
                                  : (recResult.zona === 'sariq' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700')
                              }`}>
                                {recResult.riskFoizi}% R
                              </span>
                            );
                          })()}
                        </div>

                        <div className="flex items-center text-[9px] text-slate-500 gap-2">
                          <span>{p.yosh || "No"} yosh</span>
                          <span>•</span>
                          <span className="truncate">{p.shaharTuman}</span>
                        </div>

                        <div className="flex items-center justify-between text-[8px] font-mono text-slate-400">
                          <span>skrining: {p.skriningSoni || 0} ta</span>
                          <span>arxiv kundalik: {p.kundalikSoni || 0}</span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

          </div>
        </div>

        {/* ACTIVE PATIENT HEALTH RECORD SHEET (LARGE VIEW WITH WORKSPACE) */}
        <div className="lg:col-span-8">
          {activePatient ? (
            <div className="ios-card ios-card-lg p-6 space-y-6 animate-fadeIn" id="patient-record-sheet">
              
              {/* Patient header info */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-200 shrink-0">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800">{activePatient.ism}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                      Yashash joyi: {activePatient.shaharTuman || "Kiritilmagan"} • Yosh: {activePatient.yosh || "Noma'lum"} • Jins: {activePatient.jins || "Noma'lum"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-slate-50 p-2.5 rounded-xl border">
                  <div className="text-center px-2">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Bo'yi</span>
                    <span className="text-xs font-bold text-slate-700">{activePatient.boy || 170} sm</span>
                  </div>
                  <div className="border-l h-6"></div>
                  <div className="text-center px-2">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Vazni</span>
                    <span className="text-xs font-bold text-slate-700">{activePatient.vazn || 70} kg</span>
                  </div>
                  <div className="border-l h-6"></div>
                  <div className="text-center px-2">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Yaratilgan</span>
                    <span className="text-[10px] font-mono text-slate-600">{activePatient.yaratilganSana}</span>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs for Doctors */}
              <div className="flex flex-wrap border-b border-slate-200 gap-1 mt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('tahlil')}
                  className={`flex-1 min-w-[120px] py-2.5 text-center text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeTab === 'tahlil'
                      ? 'border-indigo-600 text-indigo-600 font-extrabold bg-indigo-50/20'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  📊 Tahlillar va Dinamika
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('skrining')}
                  className={`flex-1 min-w-[120px] py-2.5 text-center text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeTab === 'skrining'
                      ? 'border-indigo-600 text-indigo-600 font-extrabold bg-indigo-50/20'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  📋 Yangi Skrining
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('journal')}
                  className={`flex-1 min-w-[120px] py-2.5 text-center text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeTab === 'journal'
                      ? 'border-indigo-600 text-indigo-600 font-extrabold bg-indigo-50/20'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  🩺 Yangi Ko'rsatkich
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('advices')}
                  className={`flex-1 min-w-[120px] py-2.5 text-center text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeTab === 'advices'
                      ? 'border-indigo-600 text-indigo-600 font-extrabold bg-indigo-50/20'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  💬 Tavsiyalar ({patientAdvices.length})
                </button>
              </div>

              {/* Tab 1: Tahlillar va Dinamika */}
              {activeTab === 'tahlil' && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* Dynamic Line Chart */}
                  {(() => {
                    const chartData = [...(activePatient.soglik_kundaligi || [])]
                      .reverse()
                      .slice(-10)
                      .map(entry => ({
                        sana: entry.sana ? entry.sana.substring(5) : "",
                        sistolik: entry.sistolik,
                        diastolik: entry.diastolik,
                        puls: entry.puls
                      }));

                    if (chartData.length > 0) {
                      return (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
                            <div>
                              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                                <TrendingUp className="w-4 h-4 text-indigo-500 animate-pulse" /> Bemor Ko'rsatkichlari Dinamikasi
                              </h4>
                              <p className="text-[10px] text-slate-400 mt-0.5">Qon bosimi (mmHg) va puls (zarba/min) oxirgi 10 ta o'zgarishlari</p>
                            </div>
                            <div className="flex gap-4 text-[9px] font-bold">
                              <span className="flex items-center gap-1 text-rose-500">■ Sistolik: {activePatient.soglik_kundaligi?.[0]?.sistolik || '--'}</span>
                              <span className="flex items-center gap-1 text-indigo-500">■ Diastolik: {activePatient.soglik_kundaligi?.[0]?.diastolik || '--'}</span>
                              <span className="flex items-center gap-1 text-emerald-500">■ Puls: {activePatient.soglik_kundaligi?.[0]?.puls || '--'}</span>
                            </div>
                          </div>
                          <div className="h-56 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="sana" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} stroke="#cbd5e1" />
                                <YAxis domain={['dataMin - 15', 'dataMax + 15']} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} stroke="#cbd5e1" />
                                <Tooltip content={<CustomTooltip />} />
                                <Line type="monotone" dataKey="sistolik" name="Sistolik qon bosimi" stroke="#f43f5e" strokeWidth={3} activeDot={{ r: 6 }} />
                                <Line type="monotone" dataKey="diastolik" name="Diastolik qon bosimi" stroke="#6366f1" strokeWidth={2.5} />
                                <Line type="monotone" dataKey="puls" name="Puls ko'rsatkichi" stroke="#10b981" strokeWidth={2} strokeDasharray="3 3" />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="bg-slate-50/50 p-6 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400 leading-relaxed">
                        📈 Grafik chizish uchun etarli ko'rsatkichlar mavjud emas.<br/>Bemor yangi o'lchov natijalarini kiritganidan so'ng, bu yerda o'zgarishlar dinamikasi ko'rinadi.
                      </div>
                    );
                  })()}

                  {/* Sub cards showing latest screening and logs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* 1. LATEST SCREENING RESULTS */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/60 space-y-4">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-1.5 flex items-center justify-between">
                        <span>1. Oxirgi profilaktik skrining</span>
                        <Layers className="w-4 h-4 text-emerald-500" />
                      </h4>

                      {activePatient.soglik_skrining_tarixi && activePatient.soglik_skrining_tarixi.length > 0 ? (
                        (() => {
                          const latest = activePatient.soglik_skrining_tarixi[0];
                          const data = latest.data;
                          const res = latest.riskResult || (latest as any).result || {};
                          
                          return (
                            <div className="space-y-3.5">
                              {/* Risk stats circles */}
                              <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-xl shrink-0 ${
                                  res.zona === 'yashil' ? 'bg-emerald-100 text-emerald-700' : (res.zona === 'sariq' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')
                                }`}>
                                  <Activity className="w-7 h-7 shrink-0" />
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">Cardio risk asoratlari xavfi</span>
                                  <div className="flex items-baseline gap-1.5">
                                    <span className="text-2xl font-black text-slate-800">{res.riskFoizi}%</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      res.zona === 'yashil' ? 'bg-emerald-100 text-emerald-800' : (res.zona === 'sariq' ? 'bg-amber-100/80 text-amber-800' : 'bg-red-100 text-red-800')
                                    }`}>
                                      {res.zona === 'yashil' ? "Past-Sog'lom" : (res.zona === 'sariq' ? "Mo'tadil xavf" : 'Yuqori xavfli zona')}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Physiological measurements */}
                              <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-lg border">
                                <div className="text-xs">
                                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Arterial Bosim</span>
                                  <span className="font-extrabold text-slate-800">{data.sistolik}/{data.diastolik} mmHg</span>
                                </div>
                                <div className="text-xs">
                                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Glyukoza miqdori</span>
                                  <span className="font-extrabold text-slate-800">{data.glyukoza ? `${data.glyukoza} mmol/l` : 'Noaniq'}</span>
                                </div>
                                <div className="text-xs border-t pt-1.5 mt-1.5 col-span-2">
                                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Zararli Status</span>
                                  <span className="font-extrabold text-slate-800 text-[10px]">
                                    Nosvoy: {data.nosvoy === 'ha' ? '✅ Otadi' : '❌ Yoq'} • Chekish: {data.chekish === 'ha' ? '🚬 Chekadi' : '❌ Yoq'}
                                  </span>
                                </div>
                                <div className="text-xs border-t pt-1.5 mt-1.5 col-span-2">
                                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Nutritiv status xatolar</span>
                                  <span className="font-extrabold text-slate-700 text-[10px] block leading-tight">
                                    Tuz iste'moli: <b className="text-red-600 font-bold">{data.tuzIstemi}</b>, Shakar/xamirlar: {data.shakarVaXamir}
                                  </span>
                                </div>
                              </div>

                              {data.tibbiyotXodimi && (
                                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-[10px] text-rose-900 leading-tight">
                                  👩‍⚕️ <b>Vrach-Pedagog o'zaro nomutanosibligi:</b> Nazariy bilim darajasi "{data.nazariyBilimDarajasi}", hayotiy komplayens pasayishi "{data.realKomplayens}".
                                </div>
                              )}

                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                                  Populyatsion kardiologik tavsiyasi
                                </span>
                                <p className="text-[10px] text-slate-600 bg-white p-2 rounded border leading-relaxed">
                                  {res.klinikXulosa || "Klinik xulosa taqdim etilmagan."}
                                </p>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="py-12 text-center text-xs text-slate-400">
                          Bemor hali biron marta kardiologik skriningdan o'tmagan.
                        </div>
                      )}
                    </div>

                    {/* 2. RECENT DIARY ENTRIES */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/60 space-y-4">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-1.5 flex items-center justify-between">
                        <span>2. Kundalik o'lchovlar bayonnomasi</span>
                        <Clock className="w-4 h-4 text-indigo-500" />
                      </h4>

                      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                        {activePatient.soglik_kundaligi && activePatient.soglik_kundaligi.length > 0 ? (
                          activePatient.soglik_kundaligi.map((log: HealthJournalEntry) => (
                            <div key={log.id} className="bg-white p-3 rounded-lg border text-xs space-y-2">
                              <div className="flex items-center justify-between text-slate-400 font-mono text-[9px]">
                                <span className="flex items-center gap-1 font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                  <Calendar className="w-3 h-3" /> {log.sana} {log.vaqt}
                                </span>
                                <span>Og'irligi: {log.vazn ? `${log.vazn} kg` : 'kiritilmagan'}</span>
                              </div>

                              <div className="grid grid-cols-3 gap-1 text-center font-mono text-[10px]">
                                <div className="bg-slate-50 p-1.5 rounded">
                                  <span className="block text-[8px] text-slate-400">QON BOSIMI</span>
                                  <span className={`font-bold ${log.sistolik >= 140 ? 'text-red-550 font-extrabold' : 'text-slate-700'}`}>
                                    {log.sistolik}/{log.diastolik}
                                  </span>
                                </div>
                                <div className="bg-slate-50 p-1.5 rounded">
                                  <span className="block text-[8px] text-slate-400">PULS</span>
                                  <span className="font-bold text-slate-700">{log.puls} /m</span>
                                </div>
                                <div className="bg-slate-50 p-1.5 rounded">
                                  <span className="block text-[8px] text-slate-400">UYQU/STRESS</span>
                                  <span className="font-semibold text-slate-700 text-[8px] block mt-0.5">
                                    Uyqu: {log.uyqu} / Str: {log.stress}
                                  </span>
                                </div>
                              </div>

                              {log.alomatlar && log.alomatlar.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {log.alomatlar.map((al) => (
                                    <span key={al} className="bg-rose-50 text-rose-700 text-[8px] px-1.5 py-0.5 rounded border border-rose-100 font-extrabold">
                                      ⚠️ {al}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {log.qaydlar && (
                                <p className="text-[10px] text-slate-550 italic leading-relaxed border-l-2 pl-2 border-slate-300">
                                  "{log.qaydlar}"
                                </p>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="py-12 text-center text-xs text-slate-400">
                            Bemor kiritgan biron-bir kundalik o'lchov qaydlari mavjud emas.
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* Tab 2: Yangi Skrining o'tkazish */}
              {activeTab === 'skrining' && (
                <div className="bg-slate-50 border rounded-xl p-5 space-y-4 animate-fadeIn font-sans">
                  <div className="flex items-center gap-2 border-b pb-3 mb-2">
                    <Clipboard className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Bemor uchun Kardiologik Skrining va Xavf baholash</h4>
                      <p className="text-[10px] text-slate-500">Ushbu oyna orqali bemorning klinik ahvolini to'liq tekshirib, xavf foizini hisoblash mumkin.</p>
                    </div>
                  </div>

                  <form onSubmit={submitDoctorScreening} className="space-y-4 text-xs">
                    
                    {/* Block A: Tana Parametrlari */}
                    <div className="space-y-3 bg-white p-3.5 rounded-lg border">
                      <h5 className="font-bold text-[11px] text-slate-700 uppercase tracking-wider">A. Jismoniy ma'lumotlar</h5>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1 font-semibold">Yosh</label>
                          <input
                            type="number"
                            required
                            min={18}
                            max={110}
                            value={screeningForm.yosh}
                            onChange={(e) => setScreeningForm((prev: any) => ({ ...prev, yosh: Number(e.target.value) }))}
                            className="w-full text-xs rounded border border-slate-300 p-1.5 bg-slate-50 text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1 font-semibold">Jins</label>
                          <select
                            value={screeningForm.jins}
                            onChange={(e) => setScreeningForm((prev: any) => ({ ...prev, jins: e.target.value as any }))}
                            className="w-full text-xs rounded border border-slate-300 p-1.5 bg-slate-50 text-slate-800"
                          >
                            <option value="erkak">Erkak</option>
                            <option value="ayol">Ayol</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1 font-semibold">Bo'yi (sm)</label>
                          <input
                            type="number"
                            required
                            min={100}
                            max={250}
                            value={screeningForm.boy}
                            onChange={(e) => setScreeningForm((prev: any) => ({ ...prev, boy: Number(e.target.value) }))}
                            className="w-full text-xs rounded border border-slate-300 p-1.5 bg-slate-50 text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1 font-semibold">Vazni (kg)</label>
                          <input
                            type="number"
                            required
                            min={30}
                            max={250}
                            value={screeningForm.vazn}
                            onChange={(e) => setScreeningForm((prev: any) => ({ ...prev, vazn: Number(e.target.value) }))}
                            className="w-full text-xs rounded border border-slate-300 p-1.5 bg-slate-50 text-slate-800"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Block B: Klinik o'lchov ko'rsatkichlari */}
                    <div className="space-y-3 bg-white p-3.5 rounded-lg border">
                      <h5 className="font-bold text-[11px] text-slate-700 uppercase tracking-wider">B. Klinik O'lchovlar</h5>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1 font-semibold">Sistolik QB (mmHg)</label>
                          <input
                            type="number"
                            required
                            min={70}
                            max={250}
                            value={screeningForm.sistolik}
                            onChange={(e) => setScreeningForm((prev: any) => ({ ...prev, sistolik: Number(e.target.value) }))}
                            className="w-full text-xs rounded border border-slate-300 p-1.5 bg-slate-50 text-slate-800 font-bold text-red-600"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1 font-semibold">Diastolik QB (mmHg)</label>
                          <input
                            type="number"
                            required
                            min={40}
                            max={160}
                            value={screeningForm.diastolik}
                            onChange={(e) => setScreeningForm((prev: any) => ({ ...prev, diastolik: Number(e.target.value) }))}
                            className="w-full text-xs rounded border border-slate-300 p-1.5 bg-slate-50 text-slate-800 font-bold text-indigo-600"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1 font-semibold">Glyukoza (mmol/l)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="Ixtiyoriy"
                            value={screeningForm.glyukoza}
                            onChange={(e) => setScreeningForm((prev: any) => ({ ...prev, glyukoza: e.target.value !== '' ? Number(e.target.value) : '' }))}
                            className="w-full text-xs rounded border border-slate-300 p-1.5 bg-slate-50 text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1 font-semibold">Xolesterin (mmol/l)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="Ixtiyoriy"
                            value={screeningForm.xolesterin}
                            onChange={(e) => setScreeningForm((prev: any) => ({ ...prev, xolesterin: e.target.value !== '' ? Number(e.target.value) : '' }))}
                            className="w-full text-xs rounded border border-slate-300 p-1.5 bg-slate-50 text-slate-800"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Block C: Hayottarzi va Ovqatlanish */}
                    <div className="space-y-3 bg-white p-3.5 rounded-lg border">
                      <h5 className="font-bold text-[11px] text-slate-700 uppercase tracking-wider">C. Odatlar va Turmush tarzi</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1 font-semibold">Tuz iste'moli</label>
                          <select
                            value={screeningForm.tuzIstemi}
                            onChange={(e) => setScreeningForm((prev: any) => ({ ...prev, tuzIstemi: e.target.value as any }))}
                            className="w-full text-xs rounded border border-slate-300 p-1.5 bg-slate-50"
                          >
                            <option value="past">Kamaytirilgan (Past xavf)</option>
                            <option value="ortacha">Me'yorda (Ortacha)</option>
                            <option value="yuqori">Ko'p (Zararli / Yuqori xavf)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1 font-semibold">Uglevodlar / Shirinliklar</label>
                          <select
                            value={screeningForm.shakarVaXamir}
                            onChange={(e) => setScreeningForm((prev: any) => ({ ...prev, shakarVaXamir: e.target.value as any }))}
                            className="w-full text-xs rounded border border-slate-300 p-1.5 bg-slate-50"
                          >
                            <option value="kam">Kam (Sog'lom)</option>
                            <option value="ortacha">O'rtacha</option>
                            <option value="kop">Ko'p (Xamir, pishiriqlarga o'ch)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1 font-semibold">Meva / Sabzavotlar</label>
                          <select
                            value={screeningForm.sabzavotMeva}
                            onChange={(e) => setScreeningForm((prev: any) => ({ ...prev, sabzavotMeva: e.target.value as any }))}
                            className="w-full text-xs rounded border border-slate-300 p-1.5 bg-slate-50"
                          >
                            <option value="har_kuni">Har kuni (Yetarli miqdorda)</option>
                            <option value="kam_yoki_yoq">Kam yoki mutlaqo yo'q</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1 font-semibold">Jismoniy faollik</label>
                          <select
                            value={screeningForm.jismoniyFaollik}
                            onChange={(e) => setScreeningForm((prev: any) => ({ ...prev, jismoniyFaollik: e.target.value as any }))}
                            className="w-full text-xs rounded border border-slate-300 p-1.5 bg-slate-50"
                          >
                            <option value="kam">Gipodinamiya (Kam faol)</option>
                            <option value="ortacha">O'rtacha faol</option>
                            <option value="yuqori">Sportchi / Juda faol</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1 font-semibold">Tamaki chekish</label>
                          <select
                            value={screeningForm.chekish}
                            onChange={(e) => setScreeningForm((prev: any) => ({ ...prev, chekish: e.target.value as any }))}
                            className="w-full text-xs rounded border border-slate-300 p-1.5 bg-slate-50"
                          >
                            <option value="yoq">Hech qachon chekmaydi</option>
                            <option value="chekar_edi">Ilgari chekardi (tashlagan)</option>
                            <option value="ha">Faol chekuvchi 🚬</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1 font-semibold">Nosvoy iste'moli</label>
                          <select
                            value={screeningForm.nosvoy}
                            onChange={(e) => setScreeningForm((prev: any) => ({ ...prev, nosvoy: e.target.value as any }))}
                            className="w-full text-xs rounded border border-slate-300 p-1.5 bg-slate-50"
                          >
                            <option value="yoq">Hech qachon otmaydi</option>
                            <option value="ha">Ha, nos kash (zararli) ⚠️</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Block D: Oilaviy va Kasbiy omillar */}
                    <div className="space-y-3 bg-white p-3.5 rounded-lg border">
                      <h5 className="font-bold text-[11px] text-slate-700 uppercase tracking-wider">D. Professional va Oilaviy tarixdagi xastaliklar</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={screeningForm.tibbiyotXodimi}
                              onChange={(e) => setScreeningForm((prev: any) => ({ ...prev, tibbiyotXodimi: e.target.checked }))}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-0"
                            />
                            <span className="font-semibold text-slate-700 text-[10px]">Tibbiyot yoki ta'lim xodimi (O'qituvchi, Shifokor)</span>
                          </label>

                          {screeningForm.tibbiyotXodimi && (
                            <div className="mt-2.5 grid grid-cols-2 gap-2 p-2 bg-indigo-50/40 rounded border border-indigo-100">
                              <div>
                                <label className="block text-[8px] font-bold text-slate-500 uppercase">Nazariy bilim</label>
                                <select
                                  value={screeningForm.nazariyBilimDarajasi}
                                  onChange={(e) => setScreeningForm((prev: any) => ({ ...prev, nazariyBilimDarajasi: e.target.value as any }))}
                                  className="w-full p-1 text-[10px] rounded border border-slate-200"
                                >
                                  <option value="past">Past</option>
                                  <option value="yaxshi">Yaxshi</option>
                                  <option value="mukammal">A'lo</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[8px] font-bold text-slate-500 uppercase">Amaliy komplayens</label>
                                <select
                                  value={screeningForm.realKomplayens}
                                  onChange={(e) => setScreeningForm((prev: any) => ({ ...prev, realKomplayens: e.target.value as any }))}
                                  className="w-full p-1 text-[10px] rounded border border-slate-200"
                                >
                                  <option value="yaxshi">Yaxshi</option>
                                  <option value="ortacha">O'rtacha</option>
                                  <option value="past">Past</option>
                                </select>
                              </div>
                            </div>
                          )}
                        </div>

                        <div>
                          <span className="block text-[10px] text-slate-500 mb-1 font-semibold">Nasliy kasalliklar (Yaqin oila a'zolarida)</span>
                          <div className="grid grid-cols-2 gap-1 px-1">
                            {['gipertoniya', 'diabet', 'yurak_xastaligi', 'insult'].map((dis) => (
                              <label key={dis} className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={(screeningForm.oiladaKasallik || []).includes(dis)}
                                  onChange={() => handleFamilyDiseaseToggle(dis)}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-0"
                                />
                                <span className="text-[10px] font-medium text-slate-600 capitalize">
                                  {dis.replace('_', ' ')}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Block E: Erkin Shikoyat */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">E. bemordagi erkin shikoyat va simptonlar matni (AI Tahlili uchun)</label>
                      <textarea
                        placeholder="Yozilishi ixtiyoriy. Masalan: Bemorda oxirgi paytlarda ensa sohasida og'riq kuzatiladi, zinasida yurganda nafas qisishi va holsizlik bo'lib turadi..."
                        value={screeningForm.erkinShikoyat}
                        onChange={(e) => setScreeningForm((prev: any) => ({ ...prev, erkinShikoyat: e.target.value }))}
                        rows={2}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingScreening || !doctorUser.tasdiqlangan}
                      className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider text-xs text-white transition-all flex items-center justify-center gap-2 ${
                        !doctorUser.tasdiqlangan 
                          ? 'bg-slate-400 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-700 shadow-md cursor-pointer'
                      }`}
                    >
                      {submittingScreening ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Diagnoz hisoblanmoqda...
                        </>
                      ) : (
                        <>
                          <Heart className="w-4 h-4 fill-white" /> Skriningni hisoblash va bemor profiliga yuklash
                        </>
                      )}
                    </button>

                  </form>
                </div>
              )}

              {/* Tab 3: Yangi Ko'rsatkich kiritish (Live Measurements) */}
              {activeTab === 'journal' && (
                <div className="bg-slate-50 border rounded-xl p-5 space-y-4 animate-fadeIn font-sans">
                  <div className="flex items-center gap-2 border-b pb-3 mb-2">
                    <Activity className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Bemorning qon bosimi va puls o'lchovlarini kiritish</h4>
                      <p className="text-[10px] text-slate-500">Shifokor qabuli davrida o'lchangan joriy hayotiy ko'rsatkichlarni tezkorlik bilan bemorga dars qiling.</p>
                    </div>
                  </div>

                  <form onSubmit={submitDoctorDailyLog} className="space-y-4 text-xs">
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-white p-4 rounded-lg border">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1 font-semibold">Systemic pressure (Sistolik QB - mmHg)</label>
                        <input
                          type="number"
                          required
                          min={60}
                          max={240}
                          value={journalForm.sistolik}
                          onChange={(e) => setJournalForm(prev => ({ ...prev, sistolik: Number(e.target.value) }))}
                          className="w-full rounded border border-slate-300 p-2 font-bold text-rose-600 bg-slate-50 font-mono text-center text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1 font-semibold">Diastolic pressure (Diastolik QB - mmHg)</label>
                        <input
                          type="number"
                          required
                          min={40}
                          max={150}
                          value={journalForm.diastolik}
                          onChange={(e) => setJournalForm(prev => ({ ...prev, diastolik: Number(e.target.value) }))}
                          className="w-full rounded border border-slate-300 p-2 font-bold text-indigo-600 bg-slate-50 font-mono text-center text-sm"
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-[10px] text-slate-500 mb-1 font-semibold">Puls (zarba/min)</label>
                        <input
                          type="number"
                          required
                          min={40}
                          max={200}
                          value={journalForm.puls}
                          onChange={(e) => setJournalForm(prev => ({ ...prev, puls: Number(e.target.value) }))}
                          className="w-full rounded border border-slate-300 p-2 font-bold text-emerald-600 bg-slate-50 font-mono text-center text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1 font-semibold">Glyukoza darajasi (mmol/l)</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Ixtiyoriy"
                          value={journalForm.glyukoza}
                          onChange={(e) => setJournalForm(prev => ({ ...prev, glyukoza: e.target.value !== '' ? Number(e.target.value) : '' }))}
                          className="w-full rounded border border-slate-300 p-2 bg-slate-50 font-mono text-center"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1 font-semibold">Joriy Og'irligi (kg)</label>
                        <input
                          type="number"
                          placeholder="Ixtiyoriy"
                          value={journalForm.vazn}
                          onChange={(e) => setJournalForm(prev => ({ ...prev, vazn: e.target.value !== '' ? Number(e.target.value) : '' }))}
                          className="w-full rounded border border-slate-300 p-2 bg-slate-50 font-mono text-center"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 col-span-2 sm:col-span-1">
                        <div>
                          <label className="block text-[8px] text-slate-500 mb-0.5 font-bold uppercase">Uyqu</label>
                          <select
                            value={journalForm.uyqu}
                            onChange={(e) => setJournalForm(prev => ({ ...prev, uyqu: e.target.value as any }))}
                            className="w-full rounded border border-slate-300 p-1.5 bg-slate-50"
                          >
                            <option value="yaxshi">Yaxshi</option>
                            <option value="ortacha">O'rtacha</option>
                            <option value="yomon">Yomon</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[8px] text-slate-500 mb-0.5 font-bold uppercase">Stress</label>
                          <select
                            value={journalForm.stress}
                            onChange={(e) => setJournalForm(prev => ({ ...prev, stress: e.target.value as any }))}
                            className="w-full rounded border border-slate-300 p-1.5 bg-slate-50"
                          >
                            <option value="past">Past</option>
                            <option value="ortacha">O'rtacha</option>
                            <option value="yuqori">Yuqori</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Symptoms checkbox selector grid */}
                    <div className="space-y-2 bg-white p-4 rounded-lg border">
                      <span className="block text-[10px] text-slate-500 font-semibold mb-1">Bemorda qabul paytida jismoniy alomatlar bormi?</span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { id: 'ogriq', label: '💔 Ko\'krak sohasidagi og\'riq' },
                          { id: 'nafas_qisilishi', label: '🫁 Nafas qisilishi' },
                          { id: 'bosh_aylanishi', label: '🌀 Bosh aylanishi' },
                          { id: 'yurak_oynashi', label: '💓 Yurak o\'ynashi' },
                          { id: 'shishlar', label: '🦵 Qo\'l-oyoq mustaqil shishlari' },
                          { id: 'holsizlik', label: '💤 Ishtahasizlik / Holsizlik' }
                        ].map((sym) => (
                          <label key={sym.id} className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-slate-50">
                            <input
                              type="checkbox"
                              checked={journalForm.alomatlar.includes(sym.id)}
                              onChange={() => handleSymptomToggle(sym.id)}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-0"
                            />
                            <span className="text-[10px] select-none text-slate-700 font-medium">{sym.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Free medical check-up notes */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Erkin klinik tahlil sharhlari / kardiolog qaydlari</label>
                      <textarea
                        value={journalForm.qaydlar}
                        onChange={(e) => setJournalForm(prev => ({ ...prev, qaydlar: e.target.value }))}
                        placeholder="Masalan: Bemordagi giperteniya lozap 50mg qabulidan keyin yaxshi dekompensatsiyalangan. Tana vaznini haftada 1 kiloga kamaytirish tavsiya etildi."
                        rows={3}
                        className="w-full text-xs p-3 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingJournal || !doctorUser.tasdiqlangan}
                      className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider text-xs text-white transition-all flex items-center justify-center gap-2 ${
                        !doctorUser.tasdiqlangan 
                          ? 'bg-slate-400 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-700 shadow-md cursor-pointer'
                      }`}
                    >
                      {submittingJournal ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Qayd ko'rsatkichlari dars qilinmoqda...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" /> Bemor hayotiy ko'rsatkichlarini hisobga olish va saqlash
                        </>
                      )}
                    </button>

                  </form>
                </div>
              )}

              {/* Tab 4: Tavsiyalar (Clinical Advisories with posting form) */}
              {activeTab === 'advices' && (
                <div className="space-y-6 animate-fadeIn font-sans">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    
                    {/* Advisories submission column */}
                    <div className="md:col-span-5 space-y-3">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                        Cardio retsept / Klinik maslahat berish
                      </h4>

                      <form onSubmit={handlePostAdvice} className="space-y-3">
                        <textarea
                          placeholder="Masalan: Lozap ichish tartibini o'zgartirmang, yog'liq chorva go'shtini cheklang, har kuni kamida 35 daqiqa toza havoda piyoda yuring..."
                          value={newAdviceText}
                          onChange={(e) => setNewAdviceText(e.target.value)}
                          rows={6}
                          required
                          disabled={submittingAdvice}
                          className="w-full text-xs rounded-xl border border-slate-300 p-3 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                        />

                        <button
                          type="submit"
                          disabled={submittingAdvice || !newAdviceText.trim() || !doctorUser.tasdiqlangan}
                          className={`w-full py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest text-white transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            !doctorUser.tasdiqlangan 
                              ? 'bg-slate-400 cursor-not-allowed'
                              : 'bg-indigo-600 hover:bg-indigo-700 shadow-md'
                          }`}
                        >
                          {submittingAdvice ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Yozilmoqda...
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" /> Retsept / maslahatni yuklash
                            </>
                          )}
                        </button>
                      </form>
                    </div>

                    {/* Advisory timeline logs */}
                    <div className="md:col-span-7 space-y-3">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-1.5 flex items-center justify-between">
                        <span>O'tmishdagi Tavsiyalar tarixi({patientAdvices.length})</span>
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      </h4>

                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                        {patientAdvices.length === 0 ? (
                          <div className="py-12 text-center text-xs text-slate-400 font-medium">
                            Ushbu bemorga hali vrach tavsiyalari yozilmagan.
                          </div>
                        ) : (
                          patientAdvices.map((ad) => (
                            <div key={ad.id} className="bg-indigo-50/20 border border-indigo-100 rounded-xl p-3.5 space-y-2 relative">
                              <div className="flex items-center justify-between text-[10px] text-indigo-800 font-bold border-b border-indigo-50 pb-1.5">
                                <div>
                                  <span>👨‍⚕️ {ad.shifokorIsm}</span>
                                  <span className="block text-[8px] text-slate-400 font-normal">{ad.shifokorMutaxassislik}</span>
                                </div>
                                <span className="font-mono text-slate-500">{ad.sana} {ad.vaqt}</span>
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed italic whitespace-pre-line">
                                "{ad.matn}"
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="ios-card ios-card-lg py-24 text-center space-y-3 text-slate-400 font-sans" id="no-active-patient-placeholder">
              <Activity className="w-12 h-12 text-slate-300 mx-auto animate-pulse shrink-0" />
              <h3 className="font-extrabold text-sm text-slate-600 uppercase tracking-widest">Klinik Shaxsiy Karta Workspace</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Chap tarafdagi bemorlar ro'yxatidan birortasini tanlang. Uning shaxsiy kartasining barcha dori eslatmalari, yangi kardiologik skrining o'tkazish hamda ko'rsatkichlarni bevosita yozish kabineti faollashadi.
              </p>
            </div>
          )}
        </div>

      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8">
        <MedicalDisclaimer language={language} variant="card" />
      </div>

    </div>
    </AppShell>
  );
}
