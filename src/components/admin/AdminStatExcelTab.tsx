import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  ExternalLink,
  FileSpreadsheet,
  Loader2,
  Upload,
} from 'lucide-react';
import {
  analyzeExcelStatistics,
  type ExcelAnalyzeResponse,
} from '../../lib/adminStatisticsApi';
import { t, type AppLanguage } from '../../lib/lang';
import { useToast } from '../ui/Toast';
import AnketaTahlilPanel from '../patient/AnketaTahlilPanel';
import { ApiError } from '../../lib/api';

interface AdminStatExcelTabProps {
  language?: AppLanguage;
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  milliy_standart: 'Milliy standart',
  xalqaro: 'Xalqaro',
  ilmiy_adabiyot: 'Ilmiy adabiyot',
  statistika: 'Statistika',
  gemini_tahlil: 'Gemini tahlil',
};

export default function AdminStatExcelTab({ language = 'lotin' }: AdminStatExcelTabProps) {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [izoh, setIzoh] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExcelAnalyzeResponse | null>(null);

  const onPickFile = (selected: File | null) => {
    setResult(null);
    if (!selected) {
      setFile(null);
      return;
    }
    if (!selected.name.toLowerCase().endsWith('.xlsx')) {
      showToast(t("Faqat .xlsx fayl yuklash mumkin.", language), 'error');
      return;
    }
    if (selected.size > 30 * 1024 * 1024) {
      showToast(t("Fayl 30 MB dan katta bo'lishi mumkin emas.", language), 'error');
      return;
    }
    setFile(selected);
  };

  const handleAnalyze = async () => {
    if (!file) {
      showToast(t('Avval Excel fayl tanlang.', language), 'error');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const data = await analyzeExcelStatistics(file, izoh || undefined);
      setResult(data);
      showToast(t('Excel tahlili tayyor.', language), 'success');
    } catch (err) {
      console.error(err);
      const msg =
        err instanceof ApiError
          ? err.message
          : t('Excel tahlilida xatolik.', language);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-stat-excel-tab">
      <div className="ios-card p-4 mb-3">
        <h3 className="font-extrabold text-slate-800 flex items-center gap-2 mb-1">
          <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
          {t('Excel yuklash va AI tahlil', language)}
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          {t(
            "Excel (.xlsx) faylni yuklang — tizim barcha varaqlarni o'rganib, anketa kabi umumiy tahlil, formulalar va manbalarni chiqaradi. AI 30–180 soniya olishi mumkin.",
            language
          )}
        </p>

        <div className="admin-stat-filter-grid">
          <div>
            <label className="admin-stat-field-label">{t('Excel fayl', language)}</label>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              className="ios-btn ios-btn-secondary ios-btn-sm w-full"
              onClick={() => inputRef.current?.click()}
              disabled={loading}
            >
              <Upload className="w-3.5 h-3.5" />
              {file ? file.name : t('Fayl tanlash', language)}
            </button>
            {file && (
              <p className="text-[10px] text-slate-500 mt-1">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            )}
          </div>
          <div>
            <label className="admin-stat-field-label">{t('Izoh (ixtiyoriy)', language)}</label>
            <input
              type="text"
              value={izoh}
              onChange={(e) => setIzoh(e.target.value)}
              className="admin-stat-search w-full"
              placeholder={t('Masalan: 2025-yil anketa eksporti', language)}
              disabled={loading}
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              className="ios-btn ios-btn-primary ios-btn-sm w-full"
              onClick={() => void handleAnalyze()}
              disabled={loading || !file}
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5" />
              )}
              {loading ? t('Tahlil qilinmoqda...', language) : t('Tahlil qilish', language)}
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="admin-stat-loading ios-card p-6 mb-3">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <div>
            <p className="font-bold text-sm">{t('Gemini AI Excel ni o\'rganmoqda...', language)}</p>
            <p className="text-xs text-slate-500">
              {t('Bu 30–180 soniya davom etishi mumkin. Sahifani yopmang.', language)}
            </p>
          </div>
        </div>
      )}

      {result && (
        <div className="admin-stat-excel-result space-y-3">
          {result.aiXato && (
            <div className="admin-stat-info-banner ios-card p-3 text-xs text-amber-900 bg-amber-50 border border-amber-200 flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                {t('AI ogohlantirishi', language)}: {result.aiXato}
              </span>
            </div>
          )}

          <div className="ios-card p-4">
            <p className="text-xs text-slate-500 mb-1">
              {t('Fayl', language)}: <strong>{result.faylNomi}</strong>
            </p>
            {result.varaqlar?.length > 0 && (
              <div className="admin-stat-excel-sheets">
                {result.varaqlar.map((sheet) => (
                  <span key={sheet.nomi} className="admin-stat-filter-chip">
                    {sheet.nomi} · {sheet.qatorlarSoni} {t('qator', language)}
                    {sheet.ustunlar?.length
                      ? ` · ${sheet.ustunlar.slice(0, 4).join(', ')}${
                          sheet.ustunlar.length > 4 ? '…' : ''
                        }`
                      : ''}
                  </span>
                ))}
              </div>
            )}
          </div>

          {result.umumiyXulosa && (
            <div className="ios-card p-4 admin-stat-ai-banner">
              <h4 className="font-extrabold text-sm mb-2">{t('Umumiy xulosa', language)}</h4>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {result.umumiyXulosa}
              </p>
            </div>
          )}

          {result.statistikaXulosasi?.length > 0 && (
            <div className="admin-stat-excel-sections">
              {result.statistikaXulosasi.map((section, idx) => (
                <div key={`${section.boLim}-${idx}`} className="ios-card p-4">
                  <h5 className="font-bold text-sm text-indigo-900 mb-2">{section.boLim}</h5>
                  {section.asosiyKoRsatkichlar?.length > 0 && (
                    <ul className="text-xs text-slate-600 mb-2 space-y-1">
                      {section.asosiyKoRsatkichlar.map((item, i) => (
                        <li key={`${idx}-k-${i}`}>• {item}</li>
                      ))}
                    </ul>
                  )}
                  <p className="text-sm text-slate-800">{section.xulosa}</p>
                </div>
              ))}
            </div>
          )}

          {result.tahlil && (
            <AnketaTahlilPanel
              tahlil={result.tahlil}
              aiXato={result.aiXato}
              language={language}
            />
          )}

          {result.formulalar?.length > 0 && (
            <div className="ios-card overflow-hidden">
              <div className="admin-stat-section-head">{t('Formulalar', language)}</div>
              <div className="admin-stat-q-table-wrap">
                <table className="admin-stat-q-table">
                  <thead>
                    <tr>
                      <th>{t('Nomi', language)}</th>
                      <th>{t('Formula', language)}</th>
                      <th>{t('Izoh', language)}</th>
                      <th>{t("Qo'llanilgan qism", language)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.formulalar.map((f, i) => (
                      <tr key={`formula-${i}-${f.nomi}`}>
                        <td>{f.nomi}</td>
                        <td className="font-mono text-xs">{f.formula}</td>
                        <td>{f.izoh}</td>
                        <td>{f.qoLlanilganQism}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.manbalar?.length > 0 && (
            <div className="ios-card overflow-hidden">
              <div className="admin-stat-section-head">{t('Manbalar', language)}</div>
              <div className="admin-stat-q-table-wrap">
                <table className="admin-stat-q-table">
                  <thead>
                    <tr>
                      <th>{t('Nomi', language)}</th>
                      <th>{t('Turi', language)}</th>
                      <th>{t('Havola', language)}</th>
                      <th>{t('Izoh', language)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.manbalar.map((m, i) => (
                      <tr key={`source-${i}-${m.nomi}`}>
                        <td>{m.nomi}</td>
                        <td>{SOURCE_TYPE_LABELS[m.turi] ?? m.turi}</td>
                        <td>
                          {m.havola ? (
                            <a
                              href={m.havola}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                            >
                              {t('Ochish', language)}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>{m.izoh}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
