/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Activity, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  User, 
  MapPin, 
  TrendingDown, 
  Printer, 
  BookOpen, 
  Award, 
  Percent, 
  Clock, 
  ArrowRight, 
  Globe, 
  RefreshCw, 
  FileDown, 
  Search, 
  Sparkles, 
  Plus, 
  Trash2,
  AlertCircle,
  Bell,
  Volume2,
  Pencil,
  Menu,
  X,
  GraduationCap,
  Presentation
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
import {
  QuestionnaireData,
  RiskAnalysisResult,
  TextAnalysisResponse,
  HealthJournalEntry,
  PatientAdvice,
  MedicationAlarm,
  UserProfile,
} from '../../types';
import Anketa2025Form from './Anketa2025Form';
import MedicalDisclaimer from '../MedicalDisclaimer';
import { translateContent } from '../../lib/disclaimer';
import { t, type AppLanguage } from '../../lib/lang';
import {
  advisorChat,
  analyzeComplaint,
  applyServerPatientDataToLocal,
  getPatientAdvices,
  getUnsyncedJournalEntries,
  hydratePatientData,
  mapApiChatToUi,
  mapUiChatToApiHistory,
  markJournalIdsSynced,
  predictRisk,
  deleteAllPatientScreenings,
  deletePatientScreening,
  syncFullScreeningHistory,
  syncNewJournalEntries,
} from '../../lib/apiServices';
import {
  normalizeScreeningHistory,
  toClientHistory,
  isServerScreeningId,
  type ClientScreeningHistoryItem,
} from '../../lib/screeningHistory';
import type { SafeUserProfile } from '../../lib/auth';
import { normalizeRiskResult } from '../../lib/riskResult';
import { useToast } from '../ui/Toast';
import AppShell from '../ui/AppShell';
import LanguageSwitcher from '../ui/LanguageSwitcher';

// Default initial state
const defaultQuestionnaire: QuestionnaireData = {
  yosh: 35,
  jins: 'erkak',
  boy: 172,
  vazn: 74,
  sistolik: 122,
  diastolik: 78,
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
};

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

const AVAILABLE_DISEASES = [
  { id: 'gipertoniya', label: 'Arterial Gipertoniya' },
  { id: 'diabet', label: 'Qandli Diabet' },
  { id: 'yurak_xastaligi', label: 'Yurak ishemik kasalligi' },
  { id: 'insult', label: 'Insult va Infarkt' }
];

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

interface PatientPortalProps {
  user: SafeUserProfile;
  onLogout: () => void;
  language: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
}

export default function PatientPortal({
  user: currentUser,
  onLogout: handleLogout,
  language,
  onLanguageChange: setLanguage,
}: PatientPortalProps) {
  const { showToast, showConfirm } = useToast();

  const [patientAdvices, setPatientAdvices] = useState<PatientAdvice[]>([]);

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'screening' | 'history' | 'journal' | 'advices'>('screening');
  
  // Health Journal states
  const [journalEntries, setJournalEntries] = useState<HealthJournalEntry[]>([]);
  const [journalForm, setJournalForm] = useState({
    sana: new Date().toISOString().split('T')[0],
    vaqt: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false }),
    sistolik: 120,
    diastolik: 80,
    puls: 72,
    glyukoza: '' as number | '',
    vazn: '' as number | '',
    uyqu: 'yaxshi' as 'yaxshi' | 'ortacha' | 'yomon',
    stress: 'past' as 'past' | 'ortacha' | 'yuqori',
    alomatlar: [] as string[],
    dorilar: [
      { nomi: 'Lisinopril', doza: '10 mg', ichildi: false },
      { nomi: 'Amlodipin', doza: '5 mg', ichildi: false }
    ] as { nomi: string; doza: string; ichildi: boolean }[],
    qaydlar: ''
  });
  
  const [newMedNomi, setNewMedNomi] = useState('');
  const [newMedDoza, setNewMedDoza] = useState('');

  // Medication alarms for reminders (stored in localStorage)
  const [medAlarms, setMedAlarms] = useState<MedicationAlarm[]>(() => {
    try {
      const stored = localStorage.getItem('soglik_dori_reminders');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse med alarms:", e);
    }
    return [
      { id: 'al-1', nomi: 'Lozap H', doza: '50 mg', vaqt: '08:00', faol: true, ichildiBugun: false, oxirgiIchilganSana: '' },
      { id: 'al-2', nomi: 'Cardiomagnyl', doza: '75 mg', vaqt: '14:00', faol: true, ichildiBugun: false, oxirgiIchilganSana: '' },
      { id: 'al-3', nomi: 'Bisoprolol', doza: '5 mg', vaqt: '20:00', faol: true, ichildiBugun: false, oxirgiIchilganSana: '' }
    ];
  });

  const [activeNotification, setActiveNotification] = useState<MedicationAlarm | null>(null);
  const [editingAlarm, setEditingAlarm] = useState<MedicationAlarm | null>(null);

  // Play a beautiful soft medical alert chime via Web Audio API
  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      gain1.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
      
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5
      gain2.gain.setValueAtTime(0.10, audioCtx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5);
      
      osc1.start();
      osc1.stop(audioCtx.currentTime + 1.5);
      osc2.start(audioCtx.currentTime + 0.15);
      osc2.stop(audioCtx.currentTime + 1.8);
    } catch (e) {
      console.warn("Audio Context could not play chime:", e);
    }
  };

  // Keep track of which alarms were triggered at which exact hour/minute today
  // to prevent double trigger within the same minute.
  const [triggeredAlarmsThisMin, setTriggeredAlarmsThisMin] = useState<{ [key: string]: string }>({});

  // Sync alarms back to localStorage
  useEffect(() => {
    localStorage.setItem('soglik_dori_reminders', JSON.stringify(medAlarms));
  }, [medAlarms]);

  // Real-time interval checker for medication times
  useEffect(() => {
    if (!currentUser || currentUser.rol !== 'foydalanuvchi') return;

    const interval = setInterval(() => {
      const hozir = new Date();
      const bugunSana = hozir.toISOString().split('T')[0];
      const joriyVaqt = hozir.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false });

      setMedAlarms(prev => {
        let isChanged = false;
        const updated = prev.map(al => {
          // Reset ichildi status if date has changed
          if (al.oxirgiIchilganSana && al.oxirgiIchilganSana !== bugunSana && al.ichildiBugun) {
            isChanged = true;
            return { ...al, ichildiBugun: false };
          }
          return al;
        });
        return isChanged ? updated : prev;
      });

      // Filter active alarms for current time
      medAlarms.forEach(alarm => {
        if (alarm.faol && alarm.vaqt === joriyVaqt) {
          const triggerKey = `${alarm.id}-${bugunSana}-${joriyVaqt}`;
          if (!triggeredAlarmsThisMin[triggerKey] && alarm.oxirgiIchilganSana !== bugunSana) {
            // Trigger!
            setTriggeredAlarmsThisMin(prev => ({ ...prev, [triggerKey]: 'triggered' }));
            setActiveNotification(alarm);
            playChime();
          }
        }
      });
    }, 12000); // Check every 12 seconds

    return () => clearInterval(interval);
  }, [medAlarms, triggeredAlarmsThisMin, currentUser]);

  // Load journal entries from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('soglik_kundaligi');
      if (stored) {
        setJournalEntries(JSON.parse(stored));
      } else {
        const initialSamples: HealthJournalEntry[] = [
          {
            id: 'sample-1',
            sana: '2026-06-09',
            vaqt: '08:30',
            sistolik: 135,
            diastolik: 87,
            puls: 78,
            glyukoza: 5.6,
            vazn: 74,
            uyqu: 'ortacha',
            stress: 'ortacha',
            alomatlar: ['holsizlik'],
            dorilar: [
              { nomi: 'Lisinopril', doza: '10 mg', ichildi: true },
              { nomi: 'Amlodipin', doza: '5 mg', ichildi: false }
            ],
            qaydlar: 'Ertalab biroz bosh aylanishi his qilindi. Oliy ma\'lumotli pedagog xodim bo\'lganligim sababli dori ichish tartibiga rioya qilishim kerak.'
          },
          {
            id: 'sample-2',
            sana: '2026-06-10',
            vaqt: '10:15',
            sistolik: 124,
            diastolik: 80,
            puls: 72,
            glyukoza: 5.2,
            vazn: 73.8,
            uyqu: 'yaxshi',
            stress: 'past',
            alomatlar: [],
            dorilar: [
              { nomi: 'Lisinopril', doza: '10 mg', ichildi: true },
              { nomi: 'Amlodipin', doza: '5 mg', ichildi: true }
            ],
            qaydlar: 'Bugun o\'zimni juda yaxshi his qilyapman. Milliy taomlardagi tuz va paxta yog\'ini chekladim. Kunlik 8000 qadam piyoda yurish bajarildi!'
          }
        ];
        setJournalEntries(initialSamples);
        localStorage.setItem('soglik_kundaligi', JSON.stringify(initialSamples));
      }
    } catch (e) {
      console.error("Failed to load journal entries:", e);
    }
  }, []);

  // Form mode: standardized vs AI Complaint
  const [intakeMode, setIntakeMode] = useState<'standard' | 'student' | 'pedagog' | 'complaint'>('standard');
  const [showDoctorReport, setShowDoctorReport] = useState<boolean>(false);
  
  // State for forms
  const [formData, setFormData] = useState<QuestionnaireData>({ ...defaultQuestionnaire });
  const [complaintText, setComplaintText] = useState<string>('');
  const [isAnalyzingComplaint, setIsAnalyzingComplaint] = useState<boolean>(false);
  const [aiTextResult, setAiTextResult] = useState<TextAnalysisResponse | null>(null);
  
  // Prediction result
  const [riskResult, setRiskResult] = useState<RiskAnalysisResult | null>(null);
  const [isCalculatingRisk, setIsCalculatingRisk] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // History list
  const [historyList, setHistoryList] = useState<ClientScreeningHistoryItem[]>([]);
  const [deletingHistoryId, setDeletingHistoryId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const applyHydratedPatientData = (serverUser: UserProfile) => {
    const { history, journal } = applyServerPatientDataToLocal(serverUser);
    setHistoryList(history);
    setJournalEntries(journal);
  };

  const hydrateFromServer = async (user: SafeUserProfile) => {
    try {
      const serverUser = await hydratePatientData(user.id, user);
      applyHydratedPatientData(serverUser);
    } catch (e) {
      console.error('Failed to hydrate patient data from server:', e);
    }
  };

  const syncJournalEntriesToServer = async (
    user: SafeUserProfile,
    entries: HealthJournalEntry[]
  ) => {
    const unsynced = getUnsyncedJournalEntries(user.id, entries);
    if (unsynced.length === 0) return;

    try {
      const serverUser = await syncNewJournalEntries(user.id, unsynced, user);
      markJournalIdsSynced(user.id, unsynced.map((e) => e.id));
      applyHydratedPatientData(serverUser);
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : "Kundalikni serverga yuborishda xatolik yuz berdi.";
      showToast(msg, 'error');
    }
  };

  // Advisory remarks fetcher
  const fetchPatientAdvices = async (userId: string) => {
    try {
      const advices = await getPatientAdvices(userId);
      setPatientAdvices(advices);
    } catch (e) {
      console.error('Failed to fetch medical advices:', e);
    }
  };

  // Serverdan ma'lumotlarni yuklash
  useEffect(() => {
    if (currentUser.rol === 'foydalanuvchi') {
      fetchPatientAdvices(currentUser.id);
      hydrateFromServer(currentUser);
    }
  }, [currentUser.id]);

  // Simulation modifications state (for "What-If" prediction models)
  const [simulatedWeight, setSimulatedWeight] = useState<number | null>(null);
  const [simulatedSalt, setSimulatedSalt] = useState<'past' | 'ortacha' | 'yuqori' | null>(null);
  const [simulatedActivity, setSimulatedActivity] = useState<'kam' | 'ortacha' | 'yuqori' | null>(null);
  const [simulatedTobacco, setSimulatedTobacco] = useState<'yoq' | 'ha' | null>(null);
  const [simulatedNosvoy, setSimulatedNosvoy] = useState<'yoq' | 'ha' | null>(null);
  const [simulatedResult, setSimulatedResult] = useState<number | null>(null);

  // AI Advisor Chat states
  const [chatMessages, setChatMessages] = useState<{ id: string; role: 'user' | 'model'; text: string }[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isSendingToChat, setIsSendingToChat] = useState<boolean>(false);

  // Whenever riskResult changes, restart chat with personalized welcome message
  useEffect(() => {
    if (riskResult) {
      setChatMessages([
        {
          id: 'welcome',
          role: 'model',
          text: `Assalomu alaykum! Men sizning shaxsiy salomatlik va kardiologik profilaktika maslahatchingizman. Sizning risk ko'rsatkickingiz ${riskResult.riskFoizi}% deb hisoblandi va siz ${riskResult.zona === 'yashil' ? 'xavf darajasi past yashil' : (riskResult.zona === 'sariq' ? 'xavf darajasi o\'rtacha sariq' : 'yuqori xavfli qizil')} zonadasiz. Farg'ona vodiysi aholisi uchun maxsus ishlab chiqilgan parhez oshyo'rig'i, jismoniy mashg'ulotlar yoki nosvoyni bekor qilish sirlari haqida qanday savolingiz bor?`
        }
      ]);
    } else {
      setChatMessages([]);
    }
  }, [riskResult]);

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSendingToChat || !riskResult) return;

    const userMsg = {
      id: Math.random().toString(),
      role: 'user' as const,
      text: chatInput.trim()
    };

    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setChatInput('');
    setIsSendingToChat(true);

    try {
      const tarix = mapUiChatToApiHistory(updatedMessages);
      const resData = await advisorChat(userMsg.text, tarix);
      const uiMessages = mapApiChatToUi(resData.tarix);
      setChatMessages(uiMessages);
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          role: 'model',
          text: `Kechirasiz, maslahat olishda internet uzilishi yoki xatolik kuzatildi: ${err.message || 'tizimli xato'}. Iltimos, qaytadan urinib ko'ring.`
        }
      ]);
    } finally {
      setIsSendingToChat(false);
    }
  };

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('soglik_skrining_tarixi');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const normalized = parsed.map((item: any, idx: number) => ({
            id: item.id || `hist-${idx}-${Math.random().toString(36).substr(2, 5)}`,
            date: item.date || item.sana || new Date().toLocaleString('uz-UZ', { hour12: false }),
            data: item.data,
            result: item.result || item.riskResult
          }));
          setHistoryList(normalized);
        }
      }
    } catch (e) {
      console.error("Failed to load history:", e);
    }
  }, []);

  // Save history helper
  const saveToHistory = (dataRecord: QuestionnaireData, resultRecord: RiskAnalysisResult) => {
    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toLocaleString('uz-UZ', { hour12: false }),
      data: { ...dataRecord },
      result: { ...resultRecord }
    };
    const updated = [newItem, ...historyList].slice(0, 30); // limit to 30 items
    setHistoryList(updated);
    localStorage.setItem('soglik_skrining_tarixi', JSON.stringify(updated));
  };

  const deleteHistoryItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const confirmed = await showConfirm(
      t("Ushbu skrining yozuvini arxivdan o'chirmoqchimisiz?", language)
    );
    if (!confirmed) return;

    if (riskResult && historyList[0]?.id === id) {
      setRiskResult(null);
    }

    setDeletingHistoryId(id);
    try {
      if (isServerScreeningId(id)) {
        await deletePatientScreening(currentUser.id, id);
      } else {
        const updated = historyList.filter((item) => item.id !== id);
        await syncFullScreeningHistory(currentUser.id, updated, currentUser);
      }

      const serverUser = await hydratePatientData(currentUser.id, currentUser);
      applyHydratedPatientData(serverUser);
      showToast(t("Skrining yozuvi o'chirildi.", language), 'success');
    } catch (err) {
      console.error('Failed to delete screening history item:', err);
      const updated = historyList.filter((item) => item.id !== id);
      setHistoryList(updated);
      localStorage.setItem('soglik_skrining_tarixi', JSON.stringify(updated));
      showToast(
        t("Skrining yozuvini o'chirishda xatolik yuz berdi.", language),
        'error'
      );
    } finally {
      setDeletingHistoryId(null);
    }
  };

  const clearAllHistory = async () => {
    const confirmed = await showConfirm(
      t("Haqiqatdan ham barcha skrining arxivini o'chirib yubormoqchimisiz?", language)
    );
    if (!confirmed) return;

    setRiskResult(null);
    setDeletingHistoryId('all');
    try {
      await deleteAllPatientScreenings(currentUser.id);
      const serverUser = await hydratePatientData(currentUser.id, currentUser);
      applyHydratedPatientData(serverUser);
      showToast(t("Skrining arxivi tozalandi.", language), 'success');
    } catch (err) {
      console.error('Failed to clear screening history on server:', err);
      setHistoryList([]);
      localStorage.removeItem('soglik_skrining_tarixi');
      showToast(
        t("Skrining arxivini tozalashda xatolik yuz berdi.", language),
        'error'
      );
    } finally {
      setDeletingHistoryId(null);
    }
  };

  const handleAddJournalEntry = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newEntry: HealthJournalEntry = {
      id: Math.random().toString(36).substr(2, 9),
      sana: journalForm.sana,
      vaqt: journalForm.vaqt,
      sistolik: Number(journalForm.sistolik) || 120,
      diastolik: Number(journalForm.diastolik) || 80,
      puls: Number(journalForm.puls) || 72,
      glyukoza: journalForm.glyukoza !== '' ? Number(journalForm.glyukoza) : '',
      vazn: journalForm.vazn !== '' ? Number(journalForm.vazn) : '',
      uyqu: journalForm.uyqu,
      stress: journalForm.stress,
      alomatlar: [...journalForm.alomatlar],
      dorilar: journalForm.dorilar.map(d => ({ ...d })),
      qaydlar: journalForm.qaydlar
    };

    const updated = [newEntry, ...journalEntries];
    setJournalEntries(updated);
    localStorage.setItem('soglik_kundaligi', JSON.stringify(updated));
    if (currentUser) {
      syncJournalEntriesToServer(currentUser, updated);
    }

    // Reset part of form
    setJournalForm(prev => ({
      ...prev,
      sana: new Date().toISOString().split('T')[0],
      vaqt: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false }),
      glyukoza: '',
      vazn: '',
      alomatlar: [],
      dorilar: prev.dorilar.map(d => ({ ...d, ichildi: false })),
      qaydlar: ''
    }));
  };

  const handleDeleteJournalEntry = (id: string) => {
    const updated = journalEntries.filter(e => e.id !== id);
    setJournalEntries(updated);
    localStorage.setItem('soglik_kundaligi', JSON.stringify(updated));
    if (currentUser) {
      syncJournalEntriesToServer(currentUser, updated);
    }
  };

  const downloadJournalCSV = () => {
    if (journalEntries.length === 0) {
      showToast(t("Hozircha kundalikka yozuvlar kiritilmagan.", language), 'info');
      return;
    }
    
    // Header columns in Uzbek for clarity
    const headers = [
      "Sana",
      "Vaqt",
      "Sistolik qon bosimi (mmHg)",
      "Diastolik qon bosimi (mmHg)",
      "Puls (zarba/min)",
      "Qondagi qand miqdori (mmol/l)",
      "Vazn (kg)",
      "Uyqu sifati",
      "Stress darajasi",
      "Alomatlar",
      "Qabul qilingan dorilar",
      "Qaydlar"
    ];
    
    const rows = journalEntries.map(e => {
      const alomatlarStr = e.alomatlar.length > 0 
        ? e.alomatlar.map(a => {
            if (a === 'ogriq') return "Ko'krak og'rig'i";
            if (a === 'nafas_qisilishi') return "Nafas qisilishi";
            if (a === 'bosh_aylanishi') return "Bosh aylanishi";
            if (a === 'yurak_oynashi') return "Yurak o'ynashi";
            if (a === 'shishlar') return "Oyoqlarda shishlar";
            if (a === 'holsizlik') return "Holsizlik";
            return a;
          }).join(', ')
        : "Yo'q";
        
      const dorilarStr = e.dorilar.length > 0
        ? e.dorilar.map(d => `${d.nomi} (${d.doza}) - ${d.ichildi ? 'Ichildi' : 'Ichilmadi'}`).join(' | ')
        : "Yo'qtir";
        
      return [
        e.sana,
        e.vaqt,
        e.sistolik,
        e.diastolik,
        e.puls,
        e.glyukoza !== '' ? e.glyukoza : "Kiritilmagan",
        e.vazn !== '' ? e.vazn : "Kiritilmagan",
        e.uyqu === 'yaxshi' ? 'Yaxshi' : (e.uyqu === 'ortacha' ? 'O\'rtacha' : 'Yomon'),
        e.stress === 'past' ? 'Past' : (e.stress === 'ortacha' ? 'O\'rtacha' : 'Yuqori'),
        `"${alomatlarStr}"`,
        `"${dorilarStr}"`,
        `"${(e.qaydlar || "").replace(/"/g, '""')}"`
      ];
    });
    
    // Create CSV content with UTF-8 BOM
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Kardiologik_Salomatlik_Kundaligi_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddMedication = () => {
    if (!newMedNomi.trim()) return;
    const nomi = newMedNomi.trim();
    const doza = newMedDoza.trim() || 'me\'yorda';
    
    setJournalForm(prev => {
      const exists = prev.dorilar.some(d => d.nomi.toLowerCase() === nomi.toLowerCase());
      if (exists) return prev;
      return {
        ...prev,
        dorilar: [...prev.dorilar, { nomi, doza, ichildi: false }]
      };
    });
    setNewMedNomi('');
    setNewMedDoza('');
  };

  const handleRemoveMedication = (nomi: string) => {
    setJournalForm(prev => ({
      ...prev,
      dorilar: prev.dorilar.filter(d => d.nomi !== nomi)
    }));
  };

  const toggleMedicationIchildi = (nomi: string) => {
    setJournalForm(prev => ({
      ...prev,
      dorilar: prev.dorilar.map(d => d.nomi === nomi ? { ...d, ichildi: !d.ichildi } : d)
    }));
  };

  // Trigger Local/AI Risk Calculations
  const handleCalculateRisk = async (e?: React.FormEvent, customData?: QuestionnaireData) => {
    if (e) e.preventDefault();
    setIsCalculatingRisk(true);
    setErrorMsg(null);
    
    // Reset simulation overrides
    setSimulatedWeight(null);
    setSimulatedSalt(null);
    setSimulatedActivity(null);
    setSimulatedTobacco(null);
    setSimulatedNosvoy(null);
    setSimulatedResult(null);

    const dataToSubmit = customData || formData;

    try {
      const data = await predictRisk(dataToSubmit);
      setRiskResult(data);
      await hydrateFromServer(currentUser);
    } catch (err: any) {
      setErrorMsg(err.message || "Xatolik yuz berdi");
    } finally {
      setIsCalculatingRisk(false);
    }
  };

  // Run What-If Simulation
  useEffect(() => {
    if (!riskResult) return;
    
    // Quick local simulation approximation logic based on backend formula offsets
    let simPointsOffset = 0;
    const baseWeight = simulatedWeight !== null ? simulatedWeight : formData.vazn;
    const baseSalt = simulatedSalt !== null ? simulatedSalt : formData.tuzIstemi;
    const baseActivity = simulatedActivity !== null ? simulatedActivity : formData.jismoniyFaollik;
    const baseTob = simulatedTobacco !== null ? simulatedTobacco : formData.chekish;
    const baseNos = simulatedNosvoy !== null ? simulatedNosvoy : formData.nosvoy;

    // BMI simulation offset
    const originalTmi = formData.vazn / Math.pow(formData.boy / 100, 2);
    const newTmi = baseWeight / Math.pow(formData.boy / 100, 2);
    
    // rough points calculations delta
    let origTmiPts = originalTmi >= 30 ? 5 : (originalTmi >= 25 ? 2 : 0);
    let newTmiPts = newTmi >= 30 ? 5 : (newTmi >= 25 ? 2 : 0);
    simPointsOffset += (newTmiPts - origTmiPts);

    // Salt adjustment
    let origSaltPts = formData.tuzIstemi === 'yuqori' ? 4 : (formData.tuzIstemi === 'ortacha' ? 1 : 0);
    let newSaltPts = baseSalt === 'yuqori' ? 4 : (baseSalt === 'ortacha' ? 1 : 0);
    simPointsOffset += (newSaltPts - origSaltPts);

    // Activity
    let origActPts = formData.jismoniyFaollik === 'kam' ? 4 : (formData.jismoniyFaollik === 'ortacha' ? 1 : 0);
    let newActPts = baseActivity === 'kam' ? 4 : (baseActivity === 'ortacha' ? 1 : 0);
    simPointsOffset += (newActPts - origActPts);

    // Tobacco
    let origTobPts = formData.chekish === 'ha' ? 4 : (formData.chekish === 'chekar_edi' ? 1 : 0);
    let newTobPts = baseTob === 'ha' ? 4 : (baseTob === 'chekar_edi' ? 1 : 0);
    simPointsOffset += (newTobPts - origTobPts);

    // Nosvoy
    let origNosPts = formData.nosvoy === 'ha' ? 3 : 0;
    let newNosPts = baseNos === 'ha' ? 3 : 0;
    simPointsOffset += (newNosPts - origNosPts);

    // Project points translation
    // Retrieve approximate points used for base prediction
    let estOriginalPoints = 0;
    if (riskResult.riskFoizi <= 24) {
      estOriginalPoints = riskResult.riskFoizi / 3;
    } else if (riskResult.riskFoizi > 24 && riskResult.riskFoizi <= 67) {
      estOriginalPoints = 8 + (riskResult.riskFoizi - 25) / 3;
    } else {
      estOriginalPoints = 22 + (riskResult.riskFoizi - 68) / 1.8;
    }

    let simPoints = estOriginalPoints + simPointsOffset;
    let simPct = 5;
    if (simPoints <= 8) {
      simPct = Math.round(simPoints * 3);
    } else if (simPoints > 8 && simPoints <= 22) {
      simPct = Math.round(25 + (simPoints - 8) * 3);
    } else {
      simPct = Math.round(Math.min(99, 68 + (simPoints - 22) * 1.8));
    }
    
    setSimulatedResult(Math.max(3, simPct));

  }, [simulatedWeight, simulatedSalt, simulatedActivity, simulatedTobacco, simulatedNosvoy, riskResult]);

  // Handle complaint parsing
  const handleAnalyzeComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintText.trim()) return;

    setIsAnalyzingComplaint(true);
    setErrorMsg(null);
    setAiTextResult(null);

    try {
      const data = await analyzeComplaint(complaintText);
      setAiTextResult(data);

      // Pre-fill fields that were parsed successfully
      if (data.aniqlanganParametrlar) {
        setFormData(prev => ({
          ...prev,
          ...data.aniqlanganParametrlar
        }));
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Tahlilda xato");
    } finally {
      setIsAnalyzingComplaint(false);
    }
  };

  const applyExtractedParamsAndCalculate = () => {
    if (!aiTextResult) return;
    handleCalculateRisk(undefined, formData);
  };

  const handleDiseaseCheck = (id: string) => {
    setFormData(prev => {
      const active = prev.oiladaKasallik.includes(id)
        ? prev.oiladaKasallik.filter(item => item !== id)
        : [...prev.oiladaKasallik, id];
      return { ...prev, oiladaKasallik: active };
    });
  };

  const printReport = () => {
    window.print();
  };

  const latestRiskPercent =
    historyList[0]?.result?.riskFoizi ??
    (currentUser.soglik_skrining_tarixi?.[0] as { riskResult?: RiskAnalysisResult } | undefined)
      ?.riskResult?.riskFoizi;

  return (
    <AppShell className="ios-app min-h-screen antialiased pb-12">
      
      {/* PUSH NOTIFICATION STYLE REMINDER MODAL */}
      {activeNotification && (
        <div className="fixed bottom-5 right-5 sm:top-5 sm:bottom-auto z-[9999] max-w-sm w-full glass-dark-strong text-white rounded-[var(--ios-radius-lg)] shadow-2xl border border-[var(--ios-accent-border)] overflow-hidden p-5 space-y-4 animate-fadeIn" id="medication-alert-toast">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <Bell className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-red-400 uppercase tracking-widest block font-mono">рџ’Љ DORI VAQTI BO'LDI!</span>
                <h4 className="font-extrabold text-base text-slate-50">{activeNotification.nomi}</h4>
              </div>
            </div>
            <button 
              onClick={() => setActiveNotification(null)}
              className="text-slate-400 hover:text-white font-black text-2xl leading-none transition"
              title="Yopish"
            >
              Г—
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Siz oilaviy shifokoringiz belgilagan dori qabul qilish jadvaliga muvofiq, hozir (soat <b className="text-white bg-slate-800 px-1 py-0.5 rounded font-mono">{activeNotification.vaqt}</b> da) dorini qabul qilishingiz va uni tasdiqlashingiz kerak!
          </p>

          <div className="bg-slate-800 p-3 rounded-xl border border-slate-700/60 text-xs flex justify-between items-center">
            <span className="text-slate-400">Dozirovka / Miqdori:</span>
            <span className="font-extrabold text-indigo-300 bg-indigo-950/50 px-2.5 py-0.5 rounded-full border border-indigo-500/30 text-[11px]">{activeNotification.doza}</span>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => {
                const alarmId = activeNotification.id;
                const bugunSana = new Date().toISOString().split('T')[0];
                
                setMedAlarms(prev => prev.map(al => {
                  if (al.id === alarmId) {
                    return { ...al, ichildiBugun: true, oxirgiIchilganSana: bugunSana };
                  }
                  return al;
                }));

                // Auto-register inside today's diary to encourage compliance
                const vaqtStr = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false });
                setJournalEntries(prev => {
                  const exists = prev.find(e => e.sana === bugunSana);
                  if (exists) {
                    return prev.map(e => e.sana === bugunSana ? {
                      ...e,
                      dorilar: e.dorilar.some(d => d.nomi === activeNotification.nomi)
                        ? e.dorilar.map(d => d.nomi === activeNotification.nomi ? { ...d, ichildi: true } : d)
                        : [...e.dorilar, { nomi: activeNotification.nomi, doza: activeNotification.doza, ichildi: true }]
                    } : e);
                  } else {
                    return [{
                      id: 'j-' + Math.random().toString(36).substr(2, 9),
                      sana: bugunSana,
                      vaqt: vaqtStr,
                      sistolik: 120,
                      diastolik: 80,
                      puls: 72,
                      glyukoza: '',
                      vazn: '',
                      uyqu: 'yaxshi',
                      stress: 'past',
                      alomatlar: [],
                      dorilar: [{ nomi: activeNotification.nomi, doza: activeNotification.doza, ichildi: true }],
                      qaydlar: `Eslatma tizimi yordamida "${activeNotification.nomi}" dorisi muvaffaqiyatli qabul qilindi.`
                    }, ...prev];
                  }
                });

                setActiveNotification(null);
                showToast(
                  t(`Muvaffaqiyatli! "${activeNotification.nomi} (${activeNotification.doza})" dori qabul qilinganligi Salomatlik Kundaligiga yozildi.`, language),
                  'success'
                );
              }}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 rounded-xl text-center cursor-pointer transition shadow hover:scale-[1.02] active:scale-95"
            >
              вњ“ Ichdim (Tasdiqlash)
            </button>
            <button
              onClick={() => {
                setActiveNotification(null);
                showToast(t("Eslatuvchi keyinga surildi. Doringizni o'z vaqtida ichishni unutmang!", language), 'info');
              }}
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs py-2.5 px-3 rounded-xl text-center cursor-pointer transition"
            >
              Keyinroq вЏ°
            </button>
          </div>
        </div>
      )}
      
      {/* SHIFOKOR UCHUN KARDIOLOGIK HISOBOT MODAL (PDF / PRINT TAYYoR) */}
      {showDoctorReport && (
        <div className="fixed inset-0 z-[9999] ios-overlay flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:absolute print:inset-0">
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              body {
                background: white !important;
                color: black !important;
              }
              header, footer, nav, button, aside, .print\\:hidden, #medication-alert-toast, #patient-main-print-surface {
                display: none !important;
              }
              #medical-disclaimer-print, #medical-disclaimer-diagnostic-print {
                display: block !important;
              }
              #doctor-report-print-area {
                display: block !important;
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                padding: 0 !important;
                margin: 0 !important;
                overflow: visible !important;
              }
            }
          `}} />
          
          <div className="ios-card ios-modal max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh] print:max-h-full print:shadow-none print:rounded-none print:bg-white">
            
            {/* Header Controls (Hidden on Print) */}
            <div className="bg-slate-950 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 print:hidden shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-50">{t("Shifokor uchun Kardiologik Hisobot", language)}</h3>
                  <p className="text-[10px] text-slate-400">{t("Salomatlik kundaligingizning rasmiy shifokorbop xulosasi", language)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  {t("PDF / Chop Etish", language)}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDoctorReport(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
                >
                  {t("Yopish", language)}
                </button>
              </div>
            </div>

            {/* Printable Content Body */}
            <div className="p-8 space-y-6 overflow-y-auto print:overflow-visible print:p-0" id="doctor-report-print-area">
              
              {/* Report Header */}
              <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="space-y-1">
                  <div className="text-[10px] tracking-widest font-extrabold text-slate-500 uppercase">{t("Respublika Ixtisoslashtirilgan Kardiologiya Ilmiy-Amaliy Tibbiyot Markazi ko'magida", language)}</div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight uppercase font-serif">{t("Kardiologik Skrining & Nazorat Hisoboti", language)}</h1>
                  <p className="text-xs text-slate-500">{t("Salomatlik Kundaligi tizimidagi ma'lumotlar tahlili", language)}</p>
                </div>
                
                {/* Stamp/Date */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-right shrink-0">
                  <div className="text-[9px] font-extrabold text-slate-400 uppercase font-bold">{t("Hisobot Sanasi", language)}</div>
                  <div className="font-mono text-sm font-bold text-slate-800">{new Date().toLocaleDateString('uz-UZ')}</div>
                  <div className="text-[10px] text-indigo-700 font-bold mt-1">{t("Sog'lom Yurak Platformasi", language)}</div>
                </div>
              </div>

              {/* Patient details & summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <div className="text-[9px] font-extrabold text-slate-400 uppercase font-bold">Foydalanuvchi profile</div>
                  <div className="text-sm font-bold text-slate-800 mt-0.5">{currentUser.ism || "Bemor Kiritilmagan"}</div>
                  <div className="text-slate-500 mt-0.5">Murojaat id: <span className="font-mono font-bold text-slate-700">{currentUser.id}</span></div>
                </div>
                <div>
                  <div className="text-[9px] font-extrabold text-slate-400 uppercase font-bold">Birlamchi Skrining</div>
                  <div className="text-sm font-bold text-slate-800 mt-0.5">
                    Kardiologik Xavf: <span className="text-red-600 font-black">{latestRiskPercent !== undefined ? `${latestRiskPercent}%` : t('Skrining qilinmagan', language)}</span>
                  </div>
                  <div className="text-slate-500 mt-0.5">Yashash joyi: {currentUser.shaharTuman || t("Farg'ona vodiysi, O'zbekiston", language)}</div>
                </div>
                <div>
                  <div className="text-[9px] font-extrabold text-slate-400 uppercase font-bold text-xs">Yozuvlar Oralig'i</div>
                  <div className="text-sm font-bold text-slate-800 mt-0.5">{journalEntries.length} ta qayd mavjud</div>
                  <div className="text-slate-500 mt-0.5">So'nggi yozuv: {journalEntries[0]?.sana || "Yo'q"}</div>
                </div>
              </div>

              {/* Core metrics / averages */}
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold text-slate-950 uppercase tracking-wider border-b pb-1">Tibbiy Ko'rsatkichlar O'rtacha Qiymatlari</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="border border-slate-200 p-3 rounded-lg bg-white shadow-sm space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">O'rtacha qon bosimi</span>
                    <span className="font-black text-sm sm:text-base text-slate-800">
                      {journalEntries.length > 0
                        ? `${Math.round(journalEntries.reduce((sum, e) => sum + e.sistolik, 0) / journalEntries.length)} / ${Math.round(journalEntries.reduce((sum, e) => sum + e.diastolik, 0) / journalEntries.length)}`
                        : 'N/A'
                      } <span className="text-[10px] font-normal text-slate-500 font-sans">mmHg</span>
                    </span>
                  </div>
                  <div className="border border-slate-200 p-3 rounded-lg bg-white shadow-sm space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">O'rtacha Puls</span>
                    <span className="font-black text-sm sm:text-base text-slate-800">
                      {journalEntries.length > 0
                        ? Math.round(journalEntries.reduce((sum, e) => sum + e.puls, 0) / journalEntries.length)
                        : 'N/A'
                      } <span className="text-[10px] font-normal text-slate-500 font-sans">zarba/min</span>
                    </span>
                  </div>
                  <div className="border border-slate-200 p-3 rounded-lg bg-white shadow-sm space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Dori Qabul Intizomi</span>
                    <span className="font-black text-sm sm:text-base text-slate-800">
                      {(() => {
                        let totalMeds = 0;
                        let takenMeds = 0;
                        journalEntries.forEach(entry => {
                          entry.dorilar.forEach(d => {
                            totalMeds++;
                            if (d.ichildi) takenMeds++;
                          });
                        });
                        return totalMeds > 0 ? `${Math.round((takenMeds / totalMeds) * 100)}%` : 'N/A';
                      })()}
                    </span>
                  </div>
                  <div className="border border-slate-200 p-3 rounded-lg bg-white shadow-sm space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Ogohlantirishlar</span>
                    <span className="font-black text-sm sm:text-base text-amber-600">
                      {journalEntries.filter(e => e.sistolik >= 140 || e.diastolik >= 90 || e.alomatlar.length > 0).length} marotaba
                    </span>
                  </div>
                </div>
              </div>

              {/* Primary logs table */}
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold text-slate-955 uppercase tracking-wider border-b pb-1">Barcha qayd etilgan ma'lumotlar tarixi</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-700 font-extrabold uppercase text-[9px] border-b border-slate-300">
                        <th className="py-2 px-3">Sana & Vaqt</th>
                        <th className="py-2 px-3">Qon bosimi</th>
                        <th className="py-2 px-3">Puls (/min)</th>
                        <th className="py-2 px-3">Shakar (mmol/l)</th>
                        <th className="py-2 px-3">Alomatlar</th>
                        <th className="py-2 px-3">Dorilar</th>
                        <th className="py-2 px-3">Izoh/Qaydlar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {journalEntries.map((e) => {
                        const alertState = e.sistolik >= 140 || e.diastolik >= 90 || e.alomatlar.length > 0;
                        return (
                          <tr key={e.id} className={`${alertState ? "bg-red-50/40" : "bg-white"} hover:bg-slate-50`}>
                            <td className="py-2.5 px-3 font-mono font-semibold whitespace-nowrap">{e.sana} ({e.vaqt})</td>
                            <td className="py-2.5 px-3">
                              <span className={`font-black text-xs sm:text-sm ${alertState ? 'text-red-700 font-extrabold' : 'text-slate-800'}`}>
                                {e.sistolik} / {e.diastolik} <span className="text-[9px] font-normal text-slate-400">mmHg</span>
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-semibold">{e.puls}</td>
                            <td className="py-2.5 px-3 font-mono">{e.glyukoza !== '' ? `${e.glyukoza}` : 'вЂ”'}</td>
                            <td className="py-2.5 px-3">
                              {e.alomatlar.length > 0 ? (
                                <span className="bg-red-105 border border-red-200 text-red-800 font-extrabold text-[9px] px-1.5 py-0.5 rounded uppercase">
                                  {e.alomatlar.map(id => {
                                    if (id === 'ogriq') return translateContent("Ko'krak og'rig'i", language);
                                    if (id === 'nafas_qisilishi') return translateContent("Nafas qisilishi", language);
                                    if (id === 'bosh_aylanishi') return translateContent("Bosh aylanishi", language);
                                    if (id === 'yurak_oynashi') return translateContent("Yurak o'ynashi", language);
                                    return translateContent(id, language);
                                  }).join(', ')}
                                </span>
                              ) : (
                                <span className="text-slate-400">Yo'q</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {e.dorilar.length > 0 ? (
                                <div className="space-y-0.5">
                                  {e.dorilar.map(d => (
                                    <div key={d.nomi} className="text-[10px] leading-tight flex items-center gap-1">
                                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${d.ichildi ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                      <span className={d.ichildi ? 'text-slate-700 font-semibold' : 'text-slate-400 line-through'}>{d.nomi}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400">вЂ”</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 italic max-w-xs truncate" title={e.qaydlar}>{e.qaydlar ? translateContent(e.qaydlar, language) : "вЂ”"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Yuridik ogohlantirish вЂ” chop etishda tanlangan til (lotin/kirill) */}
              <div className="pt-6 border-t-2 border-slate-900 space-y-4" id="medical-disclaimer-diagnostic-print">
                <MedicalDisclaimer language={language} variant="diagnostic" />
                <MedicalDisclaimer language={language} variant="print" className="rounded-lg" />
                <div className="flex flex-col sm:flex-row justify-between items-end gap-4 text-[10px] text-slate-550">
                  <div className="text-right sm:text-left">
                    <p className="font-extrabold text-slate-800">{t("Sog'lom Yurak Akademik Platformasi", language)}</p>
                    <p className="text-[9px] text-slate-400 uppercase font-mono">{t("Dasturiy tahlil kodi: 3d3c6054-VODIYa", language)}</p>
                  </div>
                  <div className="h-10 w-24 border border-dashed border-slate-300 rounded flex items-center justify-center p-1 text-[9px] text-slate-400 font-mono shrink-0">
                    {t("MUHR VA IMZO", language)}
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}
      
      {/* DORINI TAHRIRLASH MODAL OYNASI */}
      {editingAlarm && (
        <div className="fixed inset-0 z-[10000] ios-overlay flex items-center justify-center p-4">
          <div className="ios-card ios-modal max-w-sm w-full overflow-hidden">
            {/* Modal Header */}
            <div className="bg-indigo-950 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-400" />
                <h3 className="font-extrabold text-sm text-slate-50 uppercase">Eslatmani Tahrirlash</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingAlarm(null)}
                className="text-slate-400 hover:text-white font-black text-2xl transition leading-none cursor-pointer"
                title="Yopish"
              >
                &times;
              </button>
            </div>

            {/* Modal Content / Form */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!editingAlarm.nomi.trim()) {
                  showToast(t("Iltimos, dori nomini kiriting!", language), 'error');
                  return;
                }
                setMedAlarms(prev => prev.map(al => al.id === editingAlarm.id ? editingAlarm : al));
                setEditingAlarm(null);
                showToast(t("Dori eslatmasi muvaffaqiyatli yangilandi!", language), 'success');
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Dori Vositasi Nomi
                </label>
                <input
                  type="text"
                  value={editingAlarm.nomi}
                  onChange={(e) => setEditingAlarm(prev => prev ? { ...prev, nomi: e.target.value } : null)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="masalan: Lozap, Enap"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                    Dozasi (Miqdori)
                  </label>
                  <input
                    type="text"
                    value={editingAlarm.doza}
                    onChange={(e) => setEditingAlarm(prev => prev ? { ...prev, doza: e.target.value } : null)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="masalan: 50 mg, 1 tabletka"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                    Ichish Vaqti
                  </label>
                  <input
                    type="time"
                    value={editingAlarm.vaqt}
                    onChange={(e) => setEditingAlarm(prev => prev ? { ...prev, vaqt: e.target.value } : null)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800 font-mono font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Status information warning */}
              <div className="bg-amber-50 rounded-lg border border-amber-100 p-3 flex gap-2.5 text-amber-900 leading-relaxed text-[10px] font-medium">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  Eslatma tahrirlangandan so'ng, yangilangan dori nomi, miqdori va vaqtiga muvofiq o'zbekona push-alert xabarnomalari beriladi.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setEditingAlarm(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-center cursor-pointer transition text-xs"
                >
                  Bekor Qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2.5 rounded-xl text-center cursor-pointer transition text-xs shadow"
                >
                  Saqlash вњ“
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="min-h-screen print:block">
        {sidebarOpen && (
          <button
            type="button"
            className="ios-sidebar-overlay lg:hidden print:hidden"
            aria-label={t('Menyuni yopish', language)}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* SIDEBAR NAVIGATION */}
        <aside
          className={`ios-sidebar fixed top-0 left-0 z-50 h-screen w-64 flex flex-col print:hidden transition-transform duration-300 ease-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          aria-label={t('Asosiy navigatsiya', language)}
        >
          <div className="p-4 border-b border-[var(--ios-nav-bar-border)] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-2 ios-icon-wrap ios-icon-wrap-heart rounded-[var(--ios-radius-sm)] shrink-0">
                <Heart className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold ios-header-title leading-tight truncate">
                {t('Intellektual Salomatlik', language)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="ios-theme-toggle shrink-0"
              aria-label={t('Menyuni yopish', language)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto" aria-label="Tabs">
            <button
              type="button"
              onClick={() => setActiveTab('screening')}
              className={`ios-sidebar-link ${activeTab === 'screening' ? 'ios-sidebar-link-active' : ''}`}
              id="btn-tab-screening"
            >
              <Activity className="w-4 h-4 shrink-0" />
              <span>{t('Salomatlik Skriningi', language)}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`ios-sidebar-link ${activeTab === 'history' ? 'ios-sidebar-link-active' : ''}`}
              id="btn-tab-history"
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span>{t('Arxiv Tarixi', language)}</span>
              <span className="ios-sidebar-count">{historyList.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('journal')}
              className={`ios-sidebar-link ${activeTab === 'journal' ? 'ios-sidebar-link-active' : ''}`}
              id="btn-tab-journal"
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>{t('Salomatlik Kundaligi', language)}</span>
              <span className="ios-sidebar-count">{journalEntries.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('advices')}
              className={`ios-sidebar-link ${activeTab === 'advices' ? 'ios-sidebar-link-active' : ''}`}
              id="btn-tab-advices"
            >
              <Award className="w-4 h-4 shrink-0" />
              <span>{t('Shifokor Maslahati', language)}</span>
              <span className="ios-sidebar-count">{patientAdvices.length}</span>
            </button>
          </nav>
        </aside>

        <div
          className={`flex flex-col min-w-0 transition-[padding-left] duration-300 ease-out ${
            sidebarOpen ? 'lg:pl-64' : ''
          }`}
        >
      {/* HEADER */}
      <header className="ios-header relative print:hidden">
        <div className="px-4 py-4 md:py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {!sidebarOpen && (
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="ios-theme-toggle shrink-0"
                  aria-label={t('Menyuni ochish', language)}
                >
                  <Menu className="w-4 h-4" />
                </button>
              )}
              <h1 className="text-lg md:text-2xl font-bold tracking-tight ios-header-title truncate">
                {t("Intellektual Salomatlik Platformasi", language)}
              </h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <LanguageSwitcher
                language={language}
                onChange={setLanguage}
                variant="light"
              />

              <div className="hidden sm:flex items-center gap-2 glass-dark p-2 rounded-[var(--ios-radius-sm)]">
                <div className="w-7 h-7 rounded-lg ios-icon-wrap flex items-center justify-center font-bold text-[11px] uppercase tracking-widest">
                  {currentUser.ism.split(' ').map(n=>n[0]).slice(0, 2).join('')}
                </div>
                <div className="text-left min-w-0 max-w-[100px]">
                  <span className="block text-[8px] font-bold ios-header-muted uppercase tracking-widest">Bemor</span>
                  <span className="block font-semibold text-xs ios-header-title truncate">{currentUser.ism}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="ios-btn ios-btn-danger ios-btn-sm"
              >
                {t('Chiqish', language)}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* PRINT BANNER & INFO CONTROLLER вЂ” tanlangan til formatida */}
      <div className="hidden print:block bg-white p-6 border-b-2 border-slate-950 mb-6 text-black">
        <div className="flex justify-between items-start border-b pb-4">
          <div>
            <h2 className="text-xl font-bold uppercase">{t("INTELLEKTUAL SALOMATLIK PORTALI - KARTASI", language)}</h2>
            <p className="text-xs">{t("Farg'ona viloyati XNIZ erta aniqlash va profilaktik yo'riqnomalar model tizimi", language)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold">{t("Vaqt", language)}: {new Date().toLocaleString()}</p>
            <p className="text-xs text-slate-600">{t("Hudud", language)}: {t(formData.shaharTuman, language)}</p>
          </div>
        </div>
        <MedicalDisclaimer language={language} variant="compact" className="mt-4 border-t border-slate-300 pt-3" />
      </div>

      {/* CORE WORKSPACE LIMITS CONTAINER */}
      <main className="w-full px-4 md:px-6 mt-6" id="patient-main-print-surface">
        {errorMsg && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-r-lg mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{t('Xatolik yuz berdi', language)}</p>
              <p className="text-sm">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* TAB 1: SCREENING & ASSESSMENT ENGINE */}
        {activeTab === 'screening' && (
          <div className="space-y-6">
            
            {/* INPUT SECTION вЂ” to'liq kenglik */}
            <div className="w-full space-y-6 print:hidden">
              
              {/* FOUR CHANNEL SWITCHER */}
              <div className="ios-card shadow-sm overflow-hidden">
                <div className="p-1.5 bg-slate-100 flex flex-wrap gap-1 intake-mode-tabs">
                  <button
                    onClick={() => setIntakeMode('standard')}
                    className={`intake-mode-tab ${intakeMode === 'standard' ? 'active' : ''}`}
                    id="btn-intake-standard"
                    type="button"
                  >
                    <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                    Standart So'rovnoma
                  </button>
                  <button
                    onClick={() => setIntakeMode('student')}
                    className={`intake-mode-tab ${intakeMode === 'student' ? 'active' : ''}`}
                    id="btn-intake-student"
                    type="button"
                  >
                    <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0" />
                    Talaba
                  </button>
                  <button
                    onClick={() => setIntakeMode('pedagog')}
                    className={`intake-mode-tab ${intakeMode === 'pedagog' ? 'active' : ''}`}
                    id="btn-intake-pedagog"
                    type="button"
                  >
                    <Presentation className="w-4 h-4 text-violet-600 shrink-0" />
                    Pedagog
                  </button>
                  <button
                    onClick={() => setIntakeMode('complaint')}
                    className={`intake-mode-tab ${intakeMode === 'complaint' ? 'active' : ''}`}
                    id="btn-intake-complaint"
                    type="button"
                  >
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0 animate-pulse" />
                    AI Erkin Shikoyat
                  </button>
                </div>

                {/* AI COMPLAINT INTAKE MODE */}
                {intakeMode === 'complaint' && (
                  <div className="p-5 space-y-4">
                    <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-200/50">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-blue-800 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        Tabiiy Tilni Semantik Tahlil Qilish (NLP)
                      </h4>
                      <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                        Siz o'z salomatligingiz bo'yicha his qilayotgan muammolar, charchoqlar, qon bosimi yoki odatlaringizni milliy so'zlar bilan erkin yozing (masalan, <i>"boshim tez-tez og'riydi, choyxonada ko'p osh yeymiz, qon bosimim 140 ga chiqadi"</i>). Sun'iy Intellekt buni tahlil qilib, so'rovnomadagi maydonlarni avtomatik to'ldiradi!
                      </p>
                    </div>

                    <form onSubmit={handleAnalyzeComplaint} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                          Shikoyat va alomatlar matnini yozing
                        </label>
                        <textarea
                          rows={6}
                          value={complaintText}
                          onChange={(e) => setComplaintText(e.target.value)}
                          placeholder="Foydalanuvchi shikoyatini kiriting: masalan: Yoshi 54 da. Toshloq tumanidan. Bosh og'riydi va ko'krak qisib siqadi. Oxirgi marta qon bosimi 145/95 bo'lgan edi, sho'r ovqatlarni juda yaxshi ko'radi, nosvoy otadi..."
                          className="w-full text-sm rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isAnalyzingComplaint || complaintText.trim().length < 5}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-sm"
                        id="btn-submit-complaint"
                      >
                        {isAnalyzingComplaint ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            AI Tahlil qilmoqda...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-emerald-400" />
                            Matnni Semantik Tahlil Qilish в†’
                          </>
                        )}
                      </button>
                    </form>

                    {aiTextResult && (
                      <div className="mt-4 p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Matn Muofaqatli Tahlil qilindi
                          </span>
                          <span className="text-[10px] text-slate-500">Heuristic + Gemini AI</span>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed font-medium">
                          {aiTextResult.tahlilMatni}
                        </p>

                        {aiTextResult.yanaMalumotKerakmi && (
                          <div className="bg-amber-50 rounded p-2.5 border border-amber-200">
                            <h5 className="text-[11px] font-bold text-amber-900 uppercase">Qo'shimcha ma'lumotlar zarur:</h5>
                            <ul className="list-disc pl-4 text-[11px] text-amber-800 space-y-1 mt-1">
                              {aiTextResult.aniqlashtiruvchiSavollar.map((q, idx) => (
                                <li key={idx}>{q}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="pt-2">
                          <h5 className="text-xs font-bold text-slate-800 mb-1">Dastlabki maslahatlar:</h5>
                          <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
                            {aiTextResult.tavsiyalar.map((t, idx) => (
                              <li key={idx}>{t}</li>
                            ))}
                          </ul>
                        </div>

                        <button
                          onClick={applyExtractedParamsAndCalculate}
                          className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded transition-all flex items-center justify-center gap-1"
                        >
                          Tahlil maydonlariga o'tkazish & Riskni Hisoblash <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Anketa — Standart So'rovnoma */}
                {intakeMode === 'standard' && (
                  <div className="p-4 md:p-5">
                    <Anketa2025Form user={currentUser} language={language} surveyKind="anketa" />
                  </div>
                )}

                {/* Talaba so'rovnomasi */}
                {intakeMode === 'student' && (
                  <div className="p-4 md:p-5">
                    <Anketa2025Form user={currentUser} language={language} surveyKind="student" />
                  </div>
                )}

                {/* Pedagog so'rovnomasi */}
                {intakeMode === 'pedagog' && (
                  <div className="p-4 md:p-5">
                    <Anketa2025Form user={currentUser} language={language} surveyKind="pedagog" />
                  </div>
                )}

              </div>

              {/* STATISTICAL CONTEXT QUICK SIDE VIEW */}
              <div className="bg-slate-900 text-slate-300 p-5 rounded-xl border border-slate-800 space-y-4">
                <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-teal-400" />
                  Regional Gini ko'rsatkichlari (Farg'ona)
                </h4>
                <p className="text-xs leading-relaxed text-slate-400">
                  Ushbu tizim Farg'ona vodiysi hududidagi poliklinikalar, tibbiy ko'rik jarayonlari va pedagog xodimlarning somatik tahlillari asosida optimallashtirilgan ilmiy-tashkiliy algoritmlar bo'yicha integratsiya qilingan.
                </p>
                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                    <span>O'rtacha tizimli xato nisbati:</span>
                    <span className="text-emerald-400 font-bold">~0.08 (Model mantiqi)</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                    <span>Skrining etalon bosim standarti:</span>
                    <span className="text-emerald-400 font-bold">120/80 mmHg</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Amaliyot darajasi isbot kuchi (R):</span>
                    <span className="text-emerald-400 font-bold">0.89 (Random Forest)</span>
                  </div>
                </div>
              </div>

            </div>

            {/* NATIJA вЂ” faqat tahlil bo'lganda */}
            {riskResult && (
            <div className="w-full space-y-6">

                <div className="space-y-6">
                  
                  {/* TRAFFIC LIGHT & KEY METRICS HERO */}
                  <div className="ios-card shadow-sm overflow-hidden relative">
                    
                    {/* Top zone band */}
                    <div className={`h-3 w-full ${
                      riskResult.zona === 'yashil' ? 'bg-emerald-500' : (riskResult.zona === 'sariq' ? 'bg-amber-500' : 'bg-red-500')
                    }`} />

                    <div className="p-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold uppercase">
                              Skrining ID: #{Math.floor(riskResult.tmi * 1354)}
                            </span>
                            <span className="text-[10px] text-slate-500">Fergana Population Index</span>
                          </div>
                          <h2 className="text-2xl font-black text-slate-900 mt-1">Sizning Salomatlik Risk Hisobotingiz</h2>
                        </div>
                        
                        <button
                          onClick={printReport}
                          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 transition-all flex items-center gap-1.5 hidden sm:flex shrink-0 print:hidden"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Chop etish / PDF yuklash
                        </button>
                      </div>

                      {/* Score Board Layout */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-6 items-center">
                        
                        {/* Dynamic risk percentage wheel */}
                        <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-200 relative">
                          
                          {/* Semicircle display mock */}
                          <div className="relative w-36 h-36 flex items-center justify-center">
                            
                            {/* Radial background representing traffic zones */}
                            <svg className="w-full h-full transform -rotate-90">
                              <circle
                                cx="72"
                                cy="72"
                                r="55"
                                stroke="#f1f5f9"
                                strokeWidth="12"
                                fill="transparent"
                              />
                              <circle
                                cx="72"
                                cy="72"
                                r="55"
                                stroke={riskResult.zona === 'yashil' ? '#10b981' : (riskResult.zona === 'sariq' ? '#f59e0b' : '#ef4444')}
                                strokeWidth="12"
                                fill="transparent"
                                strokeDasharray={345}
                                strokeDashoffset={345 - (345 * riskResult.riskFoizi) / 100}
                                strokeLinecap="round"
                              />
                            </svg>

                            <div className="absolute text-center">
                              <span className="text-4xl font-extrabold tracking-tight text-slate-900">{riskResult.riskFoizi}%</span>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Xavf Darajasi</p>
                            </div>
                          </div>

                          <div className={`mt-3 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest text-center ${
                            riskResult.zona === 'yashil' 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                              : (riskResult.zona === 'sariq' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-red-100 text-red-800 border border-red-300')
                          }`}>
                            {riskResult.zona === 'yashil' ? t('Yashil Zona', language) : (riskResult.zona === 'sariq' ? t('Sariq Zona', language) : t('Qizil Zona', language))}
                          </div>
                        </div>

                        {/* Text summary & BMI status */}
                        <div className="md:col-span-8 space-y-4">
                          <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/50">
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Shifokor-Profilaktika Klinikasining Xulosasi</span>
                            <p className="text-sm font-semibold text-slate-900 mt-1.5 leading-relaxed">
                              {translateContent(riskResult.klinikXulosa, language)}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="bg-slate-100 p-2.5 rounded-lg">
                              <span className="text-slate-500 uppercase text-[9px] font-bold">Sizning TMI ko'rsatkichingiz</span>
                              <p className="text-base font-extrabold text-slate-800 mt-0.5">{(riskResult.tmi ?? 0).toFixed(1)} kg/mВІ</p>
                              <span className="text-[10px] text-indigo-700 font-medium">{translateContent(riskResult.tmiKategoriya, language)}</span>
                            </div>
                            <div className="bg-slate-100 p-2.5 rounded-lg flex flex-col justify-between">
                              <div>
                                <span className="text-slate-500 uppercase text-[9px] font-bold">Farg'ona Aholi Statistikasi</span>
                                <p className="text-sm font-extrabold text-slate-800 mt-0.5">Xavf darajasi: {riskResult.hududiyStatistika?.hududXavfi ?? 0}%</p>
                              </div>
                              <span className="text-[9px] text-slate-500">Me'yor: &lt; 30%</span>
                            </div>
                          </div>
                        </div>

                      </div>

                    </div>
                  </div>

                  {/* CLINICAL COMPLIANCE ANALYSIS (INNOVATION 4 DETAILED REPORT) */}
                  {riskResult.shaxsiyTavsiyalar?.komplayensTahlili?.nomutanosiblikKuzatildimi && (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-300 shadow-sm relative overflow-hidden">
                      <div className="absolute right-0 top-0 transform translate-x-3 -translate-y-3 bg-amber-500 text-white font-mono font-bold text-[9px] px-3 py-1 rounded-full uppercase tracking-wider">
                        Pedagog-Somatik Ziddiyat
                      </div>
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-extrabold text-xs uppercase tracking-wider text-amber-900">
                            {t("Komplayens tahlili", language)}
                          </h4>
                          <p className="text-sm text-amber-950 font-bold mt-1.5 leading-relaxed bg-white/60 p-3 rounded border border-amber-200">
                            {translateContent(riskResult.shaxsiyTavsiyalar?.komplayensTahlili?.maslahat ?? '', language)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* FACTOR GINI BAR DIAGRAM (Gini Importance & Dynamic Features) */}
                  <div className="ios-card shadow-sm p-6 space-y-4">
                    <div className="border-b pb-3 flex items-center justify-between">
                      <div>
                        <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">Tahlil qilingan xavf omillari (Gini ahamiyati)</h3>
                        <p className="text-xs text-slate-500">Har bir omilning kasallik rivojlanishidagi nisbiy ta'sir koeffitsiyenti (0 - 10)</p>
                      </div>
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded font-mono font-bold">100 pretsedent</span>
                    </div>

                    <div className="space-y-3.5">
                      {(riskResult.faktorlar ?? []).map((factor, index) => {
                        const tasirKuchi = factor.tasirKuchi ?? 0;
                        return (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-800">{translateContent(factor.nomi ?? '', language)}</span>
                            <div className="flex items-center gap-1.5">
                              {factor.boshqariladimi ? (
                                <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded-full font-semibold uppercase tracking-wider">Boshqariladigan omil</span>
                              ) : (
                                <span className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded-full font-semibold uppercase tracking-wider">Nasliy omil</span>
                              )}
                              <span className="font-mono font-black text-slate-900">{tasirKuchi.toFixed(1)} / 10</span>
                            </div>
                          </div>
                          
                          {/* Elegant HTML dynamic progress bar */}
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden relative border border-slate-200/50">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${
                                tasirKuchi >= 7.5 ? 'bg-red-500' : (tasirKuchi >= 5 ? 'bg-amber-500' : 'bg-emerald-500')
                              }`} 
                              style={{ width: `${Math.min(100, tasirKuchi * 10)}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-slate-500 italic mt-0.5">{translateContent(factor.tafsilot ?? '', language)}</p>
                        </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* SHAXSIYLASHTIRILGAN PROFILAKTIK MASLAHAT QURILMASI */}
                  <div className="ios-card shadow-sm p-6 space-y-6">
                    <div className="border-b pb-3">
                      <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                        <CheckCircle className="w-4.5 h-4.5 text-emerald-600" />
                        Shaxsiylashtirilgan tibbiy-profilaktik va parhez rejasi
                      </h3>
                      <p className="text-xs text-slate-500">{t("Farg'ona vodiysi nutritiv mezonlari asosidagi shaxsiy tavsiyalar", language)}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Ovqatlanish & Jismoniy parhez */}
                      <div className="space-y-4">
                        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200">
                          <h4 className="text-xs font-extrabold uppercase text-emerald-900 tracking-wider mb-2">Nutritiv & Parhez (Tuz/Yog'/Non)</h4>
                          <ul className="space-y-2.5 text-xs text-emerald-950">
                            {(riskResult.shaxsiyTavsiyalar?.ovqatlanish ?? []).map((o, idx) => (
                              <li key={idx} className="flex gap-1.5 items-start">
                                <span className="text-emerald-600 shrink-0 font-bold">вЂў</span>
                                <span>{translateContent(o, language)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-200">
                          <h4 className="text-xs font-extrabold uppercase text-indigo-900 tracking-wider mb-2">Jismoniy harakat va kardiomashqlar</h4>
                          <ul className="space-y-2.5 text-xs text-indigo-950">
                            {(riskResult.shaxsiyTavsiyalar?.jismoniyMashq ?? []).map((jm, idx) => (
                              <li key={idx} className="flex gap-1.5 items-start">
                                <span className="text-indigo-600 shrink-0 font-bold">вЂў</span>
                                <span>{translateContent(jm, language)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Tibbiy nazorat, Dori-darmon & Monitoring */}
                      <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <h4 className="text-xs font-extrabold uppercase text-slate-800 tracking-wider mb-2">Klinik tekshiruvlar va uchrashuv rejasi</h4>
                          <ul className="space-y-2.5 text-xs text-slate-700">
                            {(riskResult.shaxsiyTavsiyalar?.tibbiyReja ?? []).map((tr, idx) => (
                              <li key={idx} className="flex gap-1.5 items-start">
                                <span className="text-indigo-600 shrink-0 font-bold">вњ“</span>
                                <span>{translateContent(tr, language)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* NEXT RE-SCREENING CARD */}
                        <div className="bg-slate-900 text-slate-200 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-teal-400 font-bold uppercase tracking-widest">Keyingi profilaktik ko'rik</span>
                            <p className="text-lg font-black mt-0.5">{riskResult.hududiyStatistika?.tavsiyaEtilganSkriningKuni ?? 'вЂ”'}</p>
                            <p className="text-[10px] text-slate-400">Yarim yillik kardiomonitoring majburiyati</p>
                          </div>
                          <Clock className="w-10 h-10 text-teal-400 opacity-80" />
                        </div>
                      </div>

                    </div>

                    {/* INTERACTIVE WHAT-IF RISK ELIMINATION CALCULATOR - Dissertation Outcome */}
                    <div className="bg-slate-100 p-5 rounded-xl border border-slate-200/80 space-y-4 print:hidden">
                      <div className="border-b pb-2">
                        <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-bold uppercase shrink-0">{t("Simulyator", language)}</span>
                        <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider mt-1">
                          Interaktiv Harakatlarni Prognozlash Simulyatori ("Nima Bo'lardi-Agar" model)
                        </h4>
                        <p className="text-xs text-slate-500">
                          Hayot tarzingizdagi boshqariladigan omillarni dinamik tarzda o'zgartiring va oilaviy o'rtacha xavf ehtimolingiz o'yinda qanchaga kamayishini darhol ko'ring!
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        
                        {/* Sim 1: Lose weight if obese */}
                        {formData.vazn >= 78 && (
                          <div className="bg-white p-2.5 rounded border border-slate-200">
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Vaznni kamaytirish</label>
                            <select
                              value={simulatedWeight !== null ? simulatedWeight : formData.vazn}
                              onChange={(e) => setSimulatedWeight(Number(e.target.value))}
                              className="w-full text-xs rounded border border-slate-300 p-1"
                            >
                              <option value={formData.vazn}>Hozirgi ({formData.vazn} kg)</option>
                              <option value={formData.vazn - 5}>5 kg kamaytirilsa</option>
                              <option value={formData.vazn - 10}>10 kg kamaytirilsa</option>
                              <option value={formData.vazn - 15}>15 kg kamaytirilsa</option>
                            </select>
                          </div>
                        )}

                        {/* Sim 2: Salt custom reduction */}
                        <div className="bg-white p-2.5 rounded border border-slate-200">
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Tuz Ist'emoli</label>
                          <select
                            value={simulatedSalt !== null ? simulatedSalt : formData.tuzIstemi}
                            onChange={(e) => setSimulatedSalt(e.target.value as 'past' | 'ortacha' | 'yuqori')}
                            className="w-full text-xs rounded border border-slate-300 p-1"
                          >
                            <option value="yuqori">Sho'r (Yuqori xavf)</option>
                            <option value="ortacha">O'rtacha me'yor</option>
                            <option value="past">Kam tuz (Yaxshi)</option>
                          </select>
                        </div>

                        {/* Sim 3: Physical Activity increase */}
                        <div className="bg-white p-2.5 rounded border border-slate-200">
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Jismoniy Harakat</label>
                          <select
                            value={simulatedActivity !== null ? simulatedActivity : formData.jismoniyFaollik}
                            onChange={(e) => setSimulatedActivity(e.target.value as 'kam' | 'ortacha' | 'yuqori')}
                            className="w-full text-xs rounded border border-slate-300 p-1"
                          >
                            <option value="kam">Kam (Sedentary)</option>
                            <option value="ortacha">Me'yorli piyoda jurish</option>
                            <option value="yuqori">Kunlik faol jadal sport</option>
                          </select>
                        </div>

                        {/* Sim 4: Quit tobacco */}
                        {formData.chekish === 'ha' && (
                          <div className="bg-white p-2.5 rounded border border-slate-200">
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Tamaki kashandaligi</label>
                            <select
                              value={simulatedTobacco !== null ? simulatedTobacco : formData.chekish}
                              onChange={(e) => setSimulatedTobacco(e.target.value as 'yoq' | 'ha')}
                              className="w-full text-xs rounded border border-slate-300 p-1"
                            >
                              <option value="ha">Chekishni davom etaman</option>
                              <option value="yoq">Chekishni butunlay tashlash</option>
                            </select>
                          </div>
                        )}

                        {/* Sim 5: Nosvoy */}
                        {formData.nosvoy === 'ha' && (
                          <div className="bg-white p-2.5 rounded border border-slate-200">
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Nosvoy iste'moli</label>
                            <select
                              value={simulatedNosvoy !== null ? simulatedNosvoy : formData.nosvoy}
                              onChange={(e) => setSimulatedNosvoy(e.target.value as 'yoq' | 'ha')}
                              className="w-full text-xs rounded border border-slate-300 p-1"
                            >
                              <option value="ha">Nosvoy otishda davom etish</option>
                              <option value="yoq">Nosvoydan butunlay voz kechish</option>
                            </select>
                          </div>
                        )}

                      </div>

                      {/* Simulation result metrics */}
                      {simulatedResult !== null && (
                        <div className="bg-indigo-600 text-white p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-200">Simulyatsiya qilingan natija</span>
                            <h5 className="text-sm font-bold mt-0.5 leading-relaxed">
                              Ushbu o'zgarishlar va shaxsiy intizom natijasida sizning jami xavfingiz qariyb <span className="text-emerald-300 font-extrabold italic text-lg">{(riskResult.riskFoizi - simulatedResult) > 0 ? (riskResult.riskFoizi - simulatedResult) : 0}% ga</span> pasayadi!
                            </h5>
                          </div>
                          <div className="bg-slate-900/40 py-2 px-4 rounded-lg border border-white/20 text-center shrink-0">
                            <span className="text-[9px] uppercase font-bold text-slate-200 block">Yangi xavf zanjiri</span>
                            <span className="text-3xl font-black text-emerald-300 font-mono">{simulatedResult}%</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* PERSONALIZED HEALTH ADVISOR CHAT */}
                    <div className="bg-slate-900 text-slate-100 rounded-xl p-6 border border-slate-800 space-y-4 print:hidden animate-fadeIn shadow-lg">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-emerald-600 rounded-lg text-white">
                            <Sparkles className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-xs uppercase tracking-wide text-slate-200">
                              Sun'iy Intellekt Shaxsiy Kardiolog Maslahatchisi
                            </h4>
                            <p className="text-[10px] text-slate-400">
                              {t("Shaxsiy profilaktika va kardiologik maslahat", language)}
                            </p>
                          </div>
                        </div>
                        <span className="text-[9px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-900 border-dashed font-bold font-mono">
                          ONLINE & AKTIV
                        </span>
                      </div>

                      {/* Messages body */}
                      <div className="max-h-[350px] overflow-y-auto space-y-3.5 pr-1 md:max-h-[400px]">
                        {chatMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                          >
                            <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs font-sans leading-relaxed ${
                              msg.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-tl-none'
                            }`}>
                              <p className="whitespace-pre-line">{translateContent(msg.text, language)}</p>
                            </div>
                          </div>
                        ))}

                        {isSendingToChat && (
                          <div className="flex justify-start animate-pulse">
                            <div className="bg-slate-800 text-slate-400 border border-slate-700/50 rounded-xl rounded-tl-none px-3.5 py-2.5 text-xs flex items-center gap-2">
                              <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                              <span>AI maslahatchi tahlil qilib javob yozmoqda...</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Quick Option suggestion chips */}
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800">
                        <span className="text-[9px] font-bold text-slate-500 uppercase self-center mr-1">Tezkor savollar:</span>
                        <button
                          type="button"
                          onClick={() => { setChatInput("Farg'ona oshi (palov) ni qanday qilib sog'lomlashtirish mumkin?"); }}
                          className="text-[10px] bg-slate-800 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700 transition cursor-pointer"
                        >
                          Palovni parhez qilish рџЌІ
                        </button>
                        <button
                          type="button"
                          onClick={() => { setChatInput("Nosvoyning yurak xurujiga va arterial qon tomir spazmiga bog'liqligini isbotlab bering."); }}
                          className="text-[10px] bg-slate-800 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700 transition cursor-pointer"
                        >
                          Nosvoy biologik zarari рџљ­
                        </button>
                        <button
                          type="button"
                          onClick={() => { setChatInput("Kunda 5g dan kam tuz iste'mol qilishni qanday o'rgansam bo'ladi?"); }}
                          className="text-[10px] bg-slate-800 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700 transition cursor-pointer"
                        >
                          Tuzdan kamaytirish siri рџ§‚
                        </button>
                        <button
                          type="button"
                          onClick={() => { setChatInput("Salomatlik komplayensimni va dori ichish intizomini qanday yaxshilayman?"); }}
                          className="text-[10px] bg-slate-800 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700 transition cursor-pointer"
                        >
                          Shifokor Komplayensi рџ©є
                        </button>
                      </div>

                      {/* Chat text input */}
                      <form onSubmit={handleSendChatMessage} className="flex gap-2">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          disabled={isSendingToChat}
                          placeholder="AI kardiolog maslahatchiga o'zbek tilida savol bering (masalan: piyoda yurish qoidasi)..."
                          className="flex-1 text-xs rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-slate-500"
                        />
                        <button
                          type="submit"
                          disabled={isSendingToChat || !chatInput.trim()}
                          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs px-4 rounded-lg transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                          id="btn-send-chat"
                        >
                          <span>Yuborish</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    </div>

                  </div>

                </div>

            </div>
            )}

          </div>
        )}

        {/* TAB: ARCHIVE HISTORY LIST (USING LOCALSTORAGE) */}
        {activeTab === 'history' && (
          <div className="ios-card shadow-sm p-6 md:p-8 space-y-6">
            <div className="border-b border-[var(--ios-frost-border)] pb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div>
                <h2 className="text-xl font-extrabold uppercase">
                  {t('Salomatlik Skrininglari Arxiv Tarixi', language)}
                </h2>
                <p className="text-xs text-slate-500">
                  {t('Shaxsiy brauzeringizda saqlangan oxirgi kardiologik diagnostikalar tarixi (Maksimum 30 ta)', language)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="ios-badge ios-badge-accent font-mono">
                  {t('Jami arxiv', language)}: {historyList.length}
                </span>
                {historyList.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllHistory}
                    disabled={deletingHistoryId !== null}
                    className="ios-btn ios-btn-danger ios-btn-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {t("Barchasini o'chirish", language)}
                  </button>
                )}
              </div>
            </div>

            {historyList.length > 0 ? (
              <div className="space-y-4">
                {historyList.map((item) => {
                  const resObj = item.result || (item as any).riskResult || {};
                  const dateStr = item.date || (item as any).sana || "";
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setFormData(item.data);
                        setRiskResult(normalizeRiskResult(resObj));
                        setActiveTab('screening');
                      }}
                      className="border border-slate-200 hover:border-emerald-500 rounded-xl p-4 bg-slate-50 hover:bg-emerald-50/20 transition-all cursor-pointer flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-500">{dateStr}</span>
                          <span className="text-[10px] bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded uppercase">
                            {item.data.shaharTuman}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-slate-800">
                          Bemor: {item.data.yosh} yoshli {item.data.jins === 'erkak' ? 'Erkak' : 'Ayol'} | Vazn: {item.data.vazn} kg | Bosim: {item.data.sistolik}/{item.data.diastolik} mmHg
                        </p>
                        <p className="text-xs text-slate-500 line-clamp-1">{translateContent(resObj.klinikXulosa, language)}</p>
                      </div>

                      <div className="flex items-center gap-3 justify-between sm:justify-end">
                        <div className="text-right">
                          <div className="text-xs font-bold text-slate-500">Xavf darajasi</div>
                          <div className={`text-xl font-black ${
                            resObj.zona === 'yashil' ? 'text-emerald-600' : (resObj.zona === 'sariq' ? 'text-amber-500' : 'text-red-500')
                          }`}>
                            {resObj.riskFoizi}%
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => deleteHistoryItem(item.id, e)}
                          disabled={deletingHistoryId === item.id}
                          className="ios-btn ios-btn-danger ios-btn-sm shrink-0"
                          title={t("O'chirish", language)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {deletingHistoryId === item.id
                            ? t('Kutilmoqda...', language)
                            : t("O'chirish", language)}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 space-y-3">
                <Clock className="w-12 h-12 text-slate-300 mx-auto" />
                <h4 className="font-extrabold text-slate-700">Hozircha arxiv tarixi topilmadi</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Tizimda skrining so'rovnomasini to'ldirib, biror marta natija olganingizda, natijalar avtomat ravishda ushbu arxivda jamlanadi.
                </p>
              </div>
            )}

          </div>
        )}

        {/* TAB 5: HEALTH JOURNAL (Salomatlik Kundaligi) */}
        {activeTab === 'journal' && (
          <div className="space-y-6">
            
            {/* 1. JOURNAL HEADER STATISTICS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* average BP card */}
              <div className="ios-card shadow-sm p-5 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">O'rtacha qon bosimi</h3>
                  <p className="text-xl font-extrabold text-slate-800 mt-1">
                    {journalEntries.length > 0
                      ? `${Math.round(journalEntries.reduce((sum, e) => sum + e.sistolik, 0) / journalEntries.length)} / ${Math.round(journalEntries.reduce((sum, e) => sum + e.diastolik, 0) / journalEntries.length)}`
                      : 'Kiritilmagan'
                    } <span className="text-xs font-normal text-slate-500 font-sans">mmHg</span>
                  </p>
                  <div className="text-[10px] text-slate-400 mt-2 font-mono">
                    So'nggi {journalEntries.length} ta yozuv asosida
                  </div>
                </div>
                <div className={`p-3 rounded-full ${
                  journalEntries.length === 0 
                    ? 'bg-slate-100 text-slate-400' 
                    : (journalEntries.reduce((sum, e) => sum + e.sistolik, 0) / journalEntries.length > 130 
                        ? 'bg-red-105 text-red-600' 
                        : 'bg-emerald-100 text-emerald-600')
                }`}>
                  <Activity className="w-6 h-6" />
                </div>
              </div>

              {/* average pulse card */}
              <div className="ios-card shadow-sm p-5 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">O'rtacha puls</h3>
                  <p className="text-xl font-extrabold text-slate-800 mt-1">
                    {journalEntries.length > 0
                      ? Math.round(journalEntries.reduce((sum, e) => sum + e.puls, 0) / journalEntries.length)
                      : 'Kiritilmagan'
                    } <span className="text-xs font-normal text-slate-500 font-sans">zarba/min</span>
                  </p>
                  <div className="text-[10px] text-slate-400 mt-2 font-mono">
                    Normal me'yor: 60-90 zarba/min
                  </div>
                </div>
                <div className="p-3 bg-red-100 text-red-500 rounded-full">
                  <Heart className="w-6 h-6" />
                </div>
              </div>

              {/* medication compliance card */}
              <div className="ios-card shadow-sm p-5 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Dori ichish intizomi</h3>
                  <p className="text-xl font-extrabold text-slate-800 mt-1">
                    {(() => {
                      let totalMeds = 0;
                      let takenMeds = 0;
                      journalEntries.forEach(entry => {
                        entry.dorilar.forEach(d => {
                          totalMeds++;
                          if (d.ichildi) takenMeds++;
                        });
                      });
                      return totalMeds > 0 ? `${Math.round((takenMeds / totalMeds) * 100)}%` : 'Kiritilmagan';
                    })()}
                  </p>
                  <div className="text-[10px] text-slate-400 mt-2 font-mono">
                    Komplayens darajasi
                  </div>
                </div>
                <div className="p-3 bg-indigo-100 text-indigo-505 rounded-full">
                  <CheckCircle className="w-6 h-6" />
                </div>
              </div>

              {/* active cardiac alerts card */}
              <div className="ios-card shadow-sm p-5 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Ogohlantirishlar</h3>
                  <p className="text-xl font-extrabold text-slate-800 mt-1">
                    {(() => {
                      let warningCount = 0;
                      journalEntries.forEach(entry => {
                        if (entry.sistolik >= 140 || entry.diastolik >= 90 || entry.alomatlar.length > 0) {
                          warningCount++;
                        }
                      });
                      return `${warningCount} ta`;
                    })()}
                  </p>
                  <div className="text-[10px] text-slate-400 mt-2 font-mono text-red-500 font-bold">
                    Klinik e'tibor talab holatlar
                  </div>
                </div>
                <div className={`p-3 rounded-full ${
                  journalEntries.some(e => e.alomatlar.length > 0 || e.sistolik >= 140) 
                    ? 'bg-amber-100 text-amber-600' 
                    : 'bg-slate-100 text-slate-400'
                }`}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>

            </div>

            {/* 1.5 INTERACTIVE HEALTH CHART */}
            <div className="ios-card shadow-sm p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 uppercase flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-indigo-600" />
                    Salomatlik Ko'rsatkichlari Dinamikasi (Oxirgi 7 ta yozuv)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Qon bosimi (Sistolik / Diastolik) va Puls ko'rsatkichlarining o'zaro nisbiy o'zgarish tendensiyasi.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-1 bg-red-500 rounded-full" />
                    <span className="text-slate-600 font-semibold">Sistolik (SYS)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-1 bg-blue-500 rounded-full" />
                    <span className="text-slate-600 font-semibold">Diastolik (DIA)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-1 bg-emerald-500 rounded-full" />
                    <span className="text-slate-600 font-semibold">Puls (PUL)</span>
                  </div>
                </div>
              </div>

              {journalEntries.length > 0 ? (
                <div className="w-full h-[280px] sm:h-[320px] pt-4 font-sans">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      data={[...journalEntries]
                        .slice(0, 7)
                        .reverse()
                        .map(entry => ({
                          name: `${entry.sana.split('-').slice(1).join('/')} ${entry.vaqt}`,
                          sistolik: entry.sistolik,
                          diastolik: entry.diastolik,
                          puls: entry.puls
                        }))}
                      margin={{ top: 10, right: 15, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#94a3b8" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        dy={8}
                        className="font-mono text-[9px]"
                      />
                      <YAxis 
                        stroke="#94a3b8" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        domain={['dataMin - 10', 'dataMax + 10']}
                        dx={-8}
                        className="font-mono text-[9px]"
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey="sistolik" 
                        name="Sistolik qon bosimi" 
                        stroke="#ef4444" 
                        strokeWidth={3} 
                        activeDot={{ r: 6 }} 
                        dot={{ r: 3, strokeWidth: 1 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="diastolik" 
                        name="Diastolik qon bosimi" 
                        stroke="#3b82f6" 
                        strokeWidth={3} 
                        activeDot={{ r: 6 }} 
                        dot={{ r: 3, strokeWidth: 1 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="puls" 
                        name="Puls ko'rsatkichi" 
                        stroke="#10b981" 
                        strokeWidth={2} 
                        activeDot={{ r: 5 }} 
                        dot={{ r: 2, strokeWidth: 1 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 px-4 rounded-xl bg-slate-50/70 border border-dashed text-center space-y-3">
                  <Activity className="w-10 h-10 text-slate-300 animate-pulse" />
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-slate-700">Grafik yozuvlari mavjud emas</h4>
                    <p className="text-xs text-slate-500 max-w-sm">
                      Sizda hali salomatlik kundaligi yozuvlari mavjud emas. Quyidagi shakl orqali birinchi yozuvni kiriting va grafik zudlik bilan faollashadi.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 2. MAIN SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* LEFT COLUMN: FORM */}
              <div className="lg:col-span-12 xl:col-span-5 space-y-6">
                
                <div className="ios-card shadow-sm p-6 space-y-5">
                  <div className="border-b pb-3">
                    <h3 className="text-lg font-extrabold text-slate-800 uppercase flex items-center gap-2">
                      <Plus className="w-5 h-5 text-emerald-600" />
                      Yangi Kunlik Qayd Qo'shish
                    </h3>
                    <p className="text-xs text-slate-500">
                      Qon bosimi, puls va dorilar qabulini doimiy kiritib boring.
                    </p>
                  </div>

                  <form onSubmit={handleAddJournalEntry} className="space-y-4">
                    
                    {/* Date and Time */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Sana
                        </label>
                        <input
                          type="date"
                          value={journalForm.sana}
                          onChange={(e) => setJournalForm({ ...journalForm, sana: e.target.value })}
                          required
                          className="w-full text-xs rounded border border-slate-300 p-2 text-slate-800 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Vaqt
                        </label>
                        <input
                          type="text"
                          value={journalForm.vaqt}
                          onChange={(e) => setJournalForm({ ...journalForm, vaqt: e.target.value })}
                          required
                          placeholder="HH:MM"
                          className="w-full text-xs rounded border border-slate-300 p-2 text-slate-800 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                        />
                      </div>
                    </div>

                    {/* Blood pressure & pulse */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Sistolik (mmHg)
                        </label>
                        <input
                          type="number"
                          value={journalForm.sistolik}
                          onChange={(e) => setJournalForm({ ...journalForm, sistolik: parseInt(e.target.value) || 0 })}
                          required
                          min="50"
                          max="250"
                          className="w-full text-sm rounded border border-slate-300 p-2 text-slate-800 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-black"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Diastolik (mmHg)
                        </label>
                        <input
                          type="number"
                          value={journalForm.diastolik}
                          onChange={(e) => setJournalForm({ ...journalForm, diastolik: parseInt(e.target.value) || 0 })}
                          required
                          min="30"
                          max="150"
                          className="w-full text-sm rounded border border-slate-300 p-2 text-slate-800 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-black"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Puls (/min)
                        </label>
                        <input
                          type="number"
                          value={journalForm.puls}
                          onChange={(e) => setJournalForm({ ...journalForm, puls: parseInt(e.target.value) || 0 })}
                          required
                          min="40"
                          max="200"
                          className="w-full text-sm rounded border border-slate-300 p-2 text-slate-800 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-black"
                        />
                      </div>
                    </div>

                    {/* Glucose and Weight */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Qondagi qand (mmol/l)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Ixtiyoriy"
                          value={journalForm.glyukoza}
                          onChange={(e) => setJournalForm({ ...journalForm, glyukoza: e.target.value !== '' ? parseFloat(e.target.value) : '' })}
                          className="w-full text-xs rounded border border-slate-300 p-2 text-slate-800 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Vazn (kg)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Ixtiyoriy"
                          value={journalForm.vazn}
                          onChange={(e) => setJournalForm({ ...journalForm, vazn: e.target.value !== '' ? parseFloat(e.target.value) : '' })}
                          className="w-full text-xs rounded border border-slate-300 p-2 text-slate-800 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Sleep and Stress */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Uyqu sifati
                        </label>
                        <select
                          value={journalForm.uyqu}
                          onChange={(e) => setJournalForm({ ...journalForm, uyqu: e.target.value as any })}
                          className="w-full text-xs rounded border border-slate-300 p-2 text-slate-800 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="yaxshi">Yaxshi (Tinch uyqu)</option>
                          <option value="ortacha">O'rtacha (Tungi uyg'onishlar)</option>
                          <option value="yomon">Yomon (Uykusizlik)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Stress darajasi
                        </label>
                        <select
                          value={journalForm.stress}
                          onChange={(e) => setJournalForm({ ...journalForm, stress: e.target.value as any })}
                          className="w-full text-xs rounded border border-slate-300 p-2 text-slate-800 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="past">Past (Xotirjamlik)</option>
                          <option value="ortacha">O'rtacha (O'rtacha kuchanish)</option>
                          <option value="yuqori">Yuqori (Kuchli asabiylashish)</option>
                        </select>
                      </div>
                    </div>

                    {/* CARDIAC SYMPTOMS */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                        Kardiologik & Somatik belgilari (Semptomlar)
                      </label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        {[
                          { id: 'ogriq', label: "Ko'krak og'rig'i вљ пёЏ" },
                          { id: 'nafas_qisilishi', label: "Nafas qisilishi рџ«Ѓ" },
                          { id: 'bosh_aylanishi', label: "Bosh aylanishi рџЊЂ" },
                          { id: 'yurak_oynashi', label: "Yurak o'ynashi" },
                          { id: 'shishlar', label: "Oyoqlarda shishlar" },
                          { id: 'holsizlik', label: "Kuchli holsizlik" }
                        ].map((sym) => {
                          const isChecked = journalForm.alomatlar.includes(sym.id);
                          return (
                            <label
                              key={sym.id}
                              className={`flex items-start gap-2 p-1.5 rounded border text-slate-700 text-xs transition-colors cursor-pointer ${
                                isChecked 
                                  ? 'bg-amber-50 border-amber-300 font-semibold' 
                                  : 'bg-white hover:bg-slate-100 border-slate-200'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  const updated = isChecked
                                    ? journalForm.alomatlar.filter(id => id !== sym.id)
                                    : [...journalForm.alomatlar, sym.id];
                                  setJournalForm({ ...journalForm, alomatlar: updated });
                                }}
                                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                              />
                              <span>{sym.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* MEDICATION COMPLIANCE */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                        <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                          Kunlik Dorilar Qabuli
                        </label>
                        <span className="text-[9px] bg-slate-200 px-2 py-0.5 rounded font-mono font-bold text-slate-600">
                          {journalForm.dorilar.length} ta dori ro'yxatda
                        </span>
                      </div>

                      {journalForm.dorilar.length > 0 ? (
                        <div className="space-y-1.5">
                          {journalForm.dorilar.map((med) => (
                            <div key={med.nomi} className="flex items-center justify-between bg-white px-2 py-1 rounded border border-slate-200 text-xs text-slate-800">
                              <label className="flex items-center gap-2 cursor-pointer flex-1">
                                <input
                                  type="checkbox"
                                  checked={med.ichildi}
                                  onChange={() => toggleMedicationIchildi(med.nomi)}
                                  className="rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                                />
                                <span className={med.ichildi ? "line-through text-slate-400 font-semibold" : "text-slate-700 font-bold"}>
                                  {med.nomi} <span className="text-[10px] text-slate-500 font-normal">({med.doza})</span>
                                </span>
                              </label>
                              <button
                                type="button"
                                onClick={() => handleRemoveMedication(med.nomi)}
                                className="text-[10px] text-red-500 hover:text-red-700 ml-2"
                              >
                                O'chirish
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-500 italic text-center py-1">
                          Dori ro'yxati yo'q, quyida tezda dori qo'shing.
                        </p>
                      )}

                      <div className="flex gap-1.5 items-end pt-1 bg-white p-2 rounded border border-slate-200/60">
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Dori nomi (masalan: Lozap, Enap)"
                            value={newMedNomi}
                            onChange={(e) => setNewMedNomi(e.target.value)}
                            className="w-full text-[10px] rounded border border-slate-300 p-1.5 focus:outline-none text-slate-800 bg-slate-50"
                          />
                        </div>
                        <div className="w-[80px]">
                          <input
                            type="text"
                            placeholder="Doza"
                            value={newMedDoza}
                            onChange={(e) => setNewMedDoza(e.target.value)}
                            className="w-full text-[10px] rounded border border-slate-300 p-1.5 focus:outline-none text-slate-800 bg-slate-50"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleAddMedication}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded transition shrink-0 cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* NOTES */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                        Qo'shimcha Qaydlar (Nutritiv va faollik holati)
                      </label>
                      <textarea
                        rows={2}
                        value={journalForm.qaydlar}
                        onChange={(e) => setJournalForm({ ...journalForm, qaydlar: e.target.value })}
                        placeholder="Masalan: To'g'ri taomlandim, kamroq tuz ishlatildi. Kechki payt 40 daqiqa ko'chada sayr qildim..."
                        className="w-full text-xs rounded border border-slate-300 p-2 text-slate-800 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-lg shadow-sm transition-all cursor-pointer"
                    >
                      Kundalikka Saqlash рџ’ѕ
                    </button>

                  </form>
                </div>

                {/* HEART WARNING */}
                {journalForm.alomatlar.length > 0 && (
                  <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-r-lg shadow-sm space-y-1">
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                      <h4 className="font-extrabold text-xs uppercase text-red-900 tracking-wider">Zudlik bilan Vrach ko'rigi zarur!</h4>
                    </div>
                    <p className="text-[11px] text-red-800 leading-relaxed font-semibold">
                      Sizda kardiologik alomatlar tanlandi! Ko'krak qafasidagi og'riqlar va nafas qisilishi o'tkir kardiologik yuklanma belgisi bo'lishi mumkin. Sog'lig'ingizni xavf ostiga qo'ymasdan oilaviy shifokorga murojaat qiling!
                    </p>
                  </div>
                )}

              </div>

              {/* RIGHT COLUMN: HISTORY TIMELINE */}
              <div className="lg:col-span-12 xl:col-span-7 space-y-6">

                {/* DORI ESLATMALARI VA PUSH NOTIFICATION TIZIMI */}
                <div className="ios-card shadow-sm p-6 space-y-5">
                  <div className="border-b pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-800 uppercase flex items-center gap-2">
                        <Bell className="w-5 h-5 text-indigo-600 animate-pulse" />
                        Dorilar Eslatmalari Tizimi (Push Alert)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Kunlik kardiologik dori vositalaringizni ichish vaqtini o'zbekona push-ogohlantirish orqali nazorat qiling.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const testAlarm: MedicationAlarm = {
                          id: 'test-' + Math.random().toString(36).substr(2, 5),
                          nomi: 'Lozap H (Sinov)',
                          doza: '50 mg',
                          vaqt: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false }),
                          faol: true,
                          ichildiBugun: false,
                          oxirgiIchilganSana: ''
                        };
                        setActiveNotification(testAlarm);
                        playChime();
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow cursor-pointer uppercase tracking-wider shrink-0"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      Push Sinovi (Test)
                    </button>
                  </div>

                  {/* Alarms List */}
                  <div className="space-y-2">
                    {medAlarms.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {medAlarms.map((alarm) => (
                          <div key={alarm.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between gap-2 shadow-sm text-xs">
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${alarm.faol ? (alarm.ichildiBugun ? 'bg-emerald-500' : 'bg-red-500 animate-ping') : 'bg-slate-300'}`} />
                              <div>
                                <b className="text-slate-800 text-[13px]">{alarm.nomi}</b>
                                <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                  <span>Dozasi: <b>{alarm.doza}</b></span>
                                  <span>вЂў</span>
                                  <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-extrabold text-[9px]">{alarm.vaqt}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAlarm({ ...alarm });
                                }}
                                className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 p-1 rounded transition shrink-0 cursor-pointer"
                                title="Tahrirlash"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setMedAlarms(prev => prev.map(al => al.id === alarm.id ? { ...al, faol: !al.faol } : al));
                                }}
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded transition cursor-pointer ${alarm.faol ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                              >
                                {alarm.faol ? "Faol" : "Yopiq"}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setMedAlarms(prev => prev.filter(al => al.id !== alarm.id));
                                }}
                                className="text-red-500 hover:text-red-700 font-bold p-1 shrink-0 cursor-pointer"
                                title="Eslatmani o'chirish"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic text-center py-2 bg-slate-50 border border-dashed rounded-lg">Foydalanuvchi eslatmalari yo'q. Quyidagi kichik shakl orqali yangi eslatuvchini qo'shing!</p>
                    )}
                  </div>

                  {/* Add Alarm Form Inline */}
                  <div className="bg-indigo-50/40 rounded-xl border border-indigo-100 p-4 space-y-3">
                    <h5 className="text-[10px] font-extrabold text-indigo-950 uppercase tracking-widest flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5 text-indigo-600" />
                      Yangi Kunlik Eslatma Qo'shish
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-550 uppercase tracking-wider mb-1">Dori Nomi</label>
                        <input
                          type="text"
                          placeholder="masalan: Lozap, Enap, Bisoprolol"
                          id="alarm-input-name"
                          className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-550 uppercase tracking-wider mb-1">Dozasi & Vaqti</label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="Doza (masalan: 10 mg)"
                            id="alarm-input-dose"
                            className="w-1/2 text-xs rounded-lg border border-slate-300 p-2 bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500"
                          />
                          <input
                            type="time"
                            defaultValue="08:00"
                            id="alarm-input-time"
                            className="w-1/2 text-xs rounded-lg border border-slate-300 p-1.5 bg-white text-slate-800 font-mono focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const nameEl = document.getElementById('alarm-input-name') as HTMLInputElement;
                          const doseEl = document.getElementById('alarm-input-dose') as HTMLInputElement;
                          const timeEl = document.getElementById('alarm-input-time') as HTMLInputElement;
                          
                          if (!nameEl || !nameEl.value.trim()) {
                            showToast(t("Dori nomini kiritishingiz lozim!", language), 'error');
                            return;
                          }

                          const newAlarm: MedicationAlarm = {
                            id: 'alarm-' + Date.now(),
                            nomi: nameEl.value.trim(),
                            doza: doseEl ? (doseEl.value.trim() || '1 tab') : '1 tab',
                            vaqt: timeEl ? (timeEl.value || '08:00') : '08:00',
                            faol: true,
                            ichildiBugun: false,
                            oxirgiIchilganSana: ''
                          };

                          setMedAlarms(prev => [...prev, newAlarm]);
                          
                          // Clear values
                          nameEl.value = '';
                          if (doseEl) doseEl.value = '';
                        }}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2 rounded-lg transition-colors cursor-pointer text-center uppercase tracking-wider"
                      >
                        Qo'shish рџ””
                      </button>
                    </div>
                  </div>
                </div>

                <div className="ios-card shadow-sm p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-3">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-800 uppercase flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-emerald-600" />
                        Kundalik yozuvlar zanjiri (Timeline)
                      </h3>
                      <p className="text-xs text-slate-500">
                        O'zgarishlar dinamikasi qon tomirlar islohi uchun muhimdir.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={downloadJournalCSV}
                        className="text-[11px] bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer font-bold"
                        title="Kundalik qaydlarini Excel (CSV) formatida yuklab olish"
                      >
                        <FileDown className="w-3.5 h-3.5 text-emerald-600" />
                        CSV Yuklash
                      </button>

                      <button
                        onClick={() => setShowDoctorReport(true)}
                        className="text-[11px] bg-indigo-50 border border-indigo-300 hover:bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer font-bold"
                        title="Shifokorga ko'rsatish uchun maxsus PDF kardiologik hisobot tayyorlash"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        Shifokorga Hisobot (PDF)
                      </button>

                      <button
                        onClick={() => window.print()}
                        className="text-[11px] border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-500" />
                        Chop Etish
                      </button>
                      <button
                        onClick={async () => {
                          const ok = await showConfirm(
                            t("Haqiqatdan ham barcha kundalik qaydlarini o'chirib yubormoqchimisiz?", language)
                          );
                          if (ok) {
                            setJournalEntries([]);
                            localStorage.removeItem('soglik_kundaligi');
                            showToast(t("Kundalik tozalandi.", language), 'success');
                          }
                        }}
                        className="text-[11px] text-red-600 hover:bg-red-50 border border-red-250 px-3 py-1.5 rounded-lg transition cursor-pointer"
                      >
                        Tozalash
                      </button>
                    </div>
                  </div>

                  {/* TIMELINE LIST */}
                  {journalEntries.length > 0 ? (
                    <div className="space-y-6 pr-1">
                      {journalEntries.map((entry) => {
                        
                        // BP check
                        let bpCategory = { label: 'Normal', color: 'bg-emerald-50 text-emerald-800 border-emerald-300', score: 0 };
                        if (entry.sistolik >= 140 || entry.diastolik >= 90) {
                          bpCategory = { label: 'Gipertoniya рџ”ґ', color: 'bg-red-50 text-red-800 border-red-300 font-bold', score: 2 };
                        } else if (entry.sistolik >= 130 || entry.diastolik >= 80) {
                          bpCategory = { label: 'Pre-gipertoniya рџџЎ', color: 'bg-amber-50 text-amber-800 border-amber-350', score: 1 };
                        }

                        const totalMedCount = entry.dorilar.length;
                        const takenMedCount = entry.dorilar.filter(d => d.ichildi).length;

                        return (
                          <div
                            key={entry.id}
                            className="relative pl-6 border-l-2 border-slate-200 space-y-3 pb-2"
                          >
                            <div className={`absolute -left-[7px] top-1 w-3.5 h-3.5 rounded-full border-2 bg-white ${
                              bpCategory.score === 2 ? 'border-red-500 bg-red-500' : (bpCategory.score === 1 ? 'border-amber-500 bg-amber-400' : 'border-emerald-500 bg-emerald-500')
                            }`}></div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                                  рџ“… {entry.sana} ({entry.vaqt})
                                </span>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${bpCategory.color}`}>
                                  {bpCategory.label}
                                </span>
                              </div>
                              <button
                                onClick={() => handleDeleteJournalEntry(entry.id)}
                                className="text-[11px] text-slate-400 hover:text-red-500 transition cursor-pointer"
                              >
                                O'chirish
                              </button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200/60 rounded-xl p-3">
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-bold block">Arterial Bosim</span>
                                <span className="text-sm font-black text-slate-800 font-mono">
                                  {entry.sistolik} / {entry.diastolik} <span className="text-[10px] text-slate-500">mmHg</span>
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-bold block">Yurak Puls</span>
                                <span className="text-sm font-black text-slate-800 font-mono">
                                  вќ¤пёЏ {entry.puls} <span className="text-[10px] text-slate-500 font-sans">/daqiqa</span>
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-bold block">Qondagi qand</span>
                                <span className="text-sm font-bold text-slate-800 font-mono">
                                  {entry.glyukoza ? `рџ©ё ${entry.glyukoza} mmol/l` : 'Kiritilmagan'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-bold block">Sog'lom vazn</span>
                                <span className="text-sm font-bold text-slate-800 font-mono">
                                  вљ–пёЏ {entry.vazn ? `${entry.vazn} kg` : 'Kiritilmagan'}
                                </span>
                              </div>
                            </div>

                            {/* symptoms & medications */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              
                              <div className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                                <span className="text-[10px] text-slate-500 font-bold uppercase block">Kuzatilgan Semptomlar</span>
                                {entry.alomatlar.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {entry.alomatlar.map(s => (
                                      <span key={s} className="text-[9px] bg-red-100 text-red-850 border border-red-200 px-2 py-0.5 rounded-full font-bold">
                                        {s === 'ogriq' ? 'Ko\'krak og\'rig\'i вљ пёЏ' : (s === 'nafas_qisilishi' ? 'Nafas qisishi рџ«Ѓ' : (s === 'bosh_aylanishi' ? 'Bosh aylanishi рџЊЂ' : (s === 'yurak_oynashi' ? 'Yurak o\'ynashi' : s)))}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-emerald-600 font-medium block">
                                    вњ“ Hech qanday shikoyat yoki alomat yo'q
                                  </span>
                                )}
                              </div>

                              <div className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-slate-500 font-bold uppercase">Dorilar qabuli</span>
                                  {totalMedCount > 0 && (
                                    <span className="text-[9px] font-bold text-indigo-800">
                                      {takenMedCount} / {totalMedCount} ichildi
                                    </span>
                                  )}
                                </div>
                                {entry.dorilar.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {entry.dorilar.map(d => (
                                      <span key={d.nomi} className={`text-[9px] px-2 py-0.5 rounded ${
                                        d.ichildi 
                                          ? 'bg-emerald-100 text-emerald-805 font-semibold' 
                                          : 'bg-slate-100 text-slate-400 line-through'
                                      }`}>
                                        {d.ichildi ? 'вњ“' : 'вњ—'} {d.nomi} ({d.doza})
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic block">
                                    Dori kiritilmagan
                                  </span>
                                )}
                              </div>

                            </div>

                            {entry.qaydlar && (
                              <div className="bg-slate-100 text-slate-700 p-2 rounded border border-dashed text-xs italic">
                                <b>Qayd:</b> "{entry.qaydlar}"
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-16 space-y-3">
                      <BookOpen className="w-16 h-16 text-slate-300 mx-auto" />
                      <h4 className="font-extrabold text-slate-700">Hozircha kundalikka qaydlar kiritilmagan</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Muntazam ravishda o'z qon bosimingiz, pulsingiz va o'zgarishlar zanjirini kiritib boring!
                      </p>
                    </div>
                  )}

                </div>

              </div>

            </div>

          </div>
        )}

        {activeTab === 'advices' && (
          <div className="ios-card ios-card-lg p-6 space-y-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest border-b pb-3 flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              <span>Shifokorlaringiz Klinik Tavsiyalari va Retseptlari ({patientAdvices.length})</span>
            </h3>

            {patientAdvices.length === 0 ? (
              <div className="text-center py-16 space-y-3 bg-slate-50/50 rounded-2xl border">
                <Heart className="w-12 h-12 text-slate-300 mx-auto animate-pulse shrink-0" />
                <h4 className="font-extrabold text-slate-700">Shifokor maslahatlari hozircha yo'q</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Sizning hisobingizga vrachlar tomonidan biron-bir shaxsiy ko'rsatmalar yoki dori-darmon tartib-taomillari biriktirilmagan.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {patientAdvices.map((ad) => (
                  <div key={ad.id} className="p-5 rounded-2xl border border-indigo-100 bg-indigo-50/15 space-y-3 shadow-sm relative">
                    <div className="flex items-center justify-between border-b pb-2 text-xs">
                      <div>
                        <span className="font-black text-indigo-950 block">рџ‘ЁвЂЌвљ•пёЏ {ad.shifokorIsm}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{ad.shifokorMutaxassislik}</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border">
                        {ad.sana} {ad.vaqt}
                      </span>
                    </div>

                    <p className="text-xs text-slate-750 leading-relaxed font-normal whitespace-pre-line bg-white/70 p-3 rounded-lg border italic">
                      "{translateContent(ad.matn, language)}"
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>рџЏҐ Farg'ona kardio-klaster markazi</span>
                      <span className="text-emerald-600 font-bold">вњ“ Tasdiqlangan Retsept</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Umumiy chop etish uchun yuridik ogohlantirish (skrining / kundalik) */}
      <div className="hidden print:block max-w-7xl mx-auto px-4 mt-8 pb-8">
        <MedicalDisclaimer language={language} variant="print" />
      </div>

      {/* FOOTER & DISCLAIMER */}
      <footer className="ios-footer max-w-7xl mx-auto px-4 mt-12 border-t pt-6 text-center space-y-3 print:hidden">
        <p className="text-xs">
          {t("В© 2026 Intellektual Salomatlik Axborot Tizimi. Farg'ona Vodiysi profiling va kardiologik so'nggi ma'lumotlar bazasi zaxirasi.", language)}
        </p>
        <MedicalDisclaimer language={language} variant="card" className="max-w-4xl mx-auto" />
      </footer>
        </div>
      </div>
    </AppShell>
  );
}

