import React, { useCallback, useEffect, useState } from 'react';
import { FileSpreadsheet, Loader2, User } from 'lucide-react';
import { t, type AppLanguage } from '../../lib/lang';
import {
  downloadUserStatisticsExcel,
  fetchStatisticsUsers,
  fetchUserStatistics,
  SURVEY_KIND_LABELS,
  type StatisticsUserItem,
  type SurveyKind,
  type UserStatisticsDetail,
} from '../../lib/adminStatisticsApi';
import { useToast } from '../ui/Toast';

const SURVEY_KINDS: SurveyKind[] = ['anketa', 'student', 'pedagog'];

function zoneClass(zona: string | null | undefined): string {
  if (zona === 'yashil') return 'text-emerald-600';
  if (zona === 'qizil') return 'text-red-600';
  if (zona === 'sariq') return 'text-amber-600';
  return 'text-slate-600';
}

interface AdminStatUserTabProps {
  language?: AppLanguage;
}

export default function AdminStatUserTab({ language = 'lotin' }: AdminStatUserTabProps) {
  const { showToast } = useToast();
  const [users, setUsers] = useState<StatisticsUserItem[]>([]);
  const [userId, setUserId] = useState('');
  const [kind, setKind] = useState<SurveyKind>('anketa');
  const [detail, setDetail] = useState<UserStatisticsDetail | null>(null);
  const [source, setSource] = useState<'api' | 'fallback' | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingUsers(true);
      try {
        const list = await fetchStatisticsUsers();
        setUsers(list);
        if (list.length > 0) setUserId((prev) => prev || list[0].id);
      } catch (err) {
        console.error(err);
        showToast(t('Foydalanuvchilar ro\'yxatini yuklashda xatolik.', language), 'error');
      } finally {
        setLoadingUsers(false);
      }
    })();
  }, [language, showToast]);

  const loadDetail = useCallback(async () => {
    if (!userId) return;
    setLoadingDetail(true);
    try {
      const result = await fetchUserStatistics(userId, kind);
      setDetail(result.data);
      setSource(result.source);
    } catch (err) {
      console.error(err);
      setDetail(null);
      setSource(null);
      showToast(t('Foydalanuvchi statistikasini yuklashda xatolik.', language), 'error');
    } finally {
      setLoadingDetail(false);
    }
  }, [userId, kind, language, showToast]);

  useEffect(() => {
    if (userId) loadDetail();
  }, [userId, kind, loadDetail]);

  const handleExcel = async () => {
    if (!detail) return;
    setExporting(true);
    try {
      const excelUrl = detail.excelUrls?.[kind] ?? detail.excelUrls?.all;
      const result = await downloadUserStatisticsExcel(userId, kind, excelUrl, detail);
      showToast(
        t(
          result === 'api' ? 'Excel fayl yuklab olindi.' : 'Excel fayl yuklab olindi (mahalliy).',
          language
        ),
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast(t('Excel yuklab olishda xatolik.', language), 'error');
    } finally {
      setExporting(false);
    }
  };

  const surveys = detail?.soRovnomalar ?? [];

  return (
    <div className="admin-stat-user-tab">
      <div className="admin-stat-filter-bar ios-card p-4">
        <div className="admin-stat-filter-grid">
          <div>
            <label className="admin-stat-field-label">{t('Foydalanuvchi', language)}</label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="admin-stat-select w-full"
              disabled={loadingUsers}
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.ism} {u.yosh ? `(${u.yosh} yosh)` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="admin-stat-field-label">{t("So'rovnoma", language)}</label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as SurveyKind)}
              className="admin-stat-select w-full"
            >
              {SURVEY_KINDS.map((k) => (
                <option key={k} value={k}>
                  {SURVEY_KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              className="ios-btn ios-btn-primary ios-btn-sm w-full"
              onClick={handleExcel}
              disabled={!detail || exporting}
            >
              {exporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5" />
              )}
              Excel
            </button>
          </div>
        </div>
      </div>

      {loadingDetail ? (
        <div className="admin-stat-loading">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
          <span>{t('Yuklanmoqda...', language)}</span>
        </div>
      ) : detail ? (
        <>
          {source === 'fallback' && (
            <div className="admin-stat-info-banner ios-card p-3 mb-2 text-xs text-amber-800 bg-amber-50 border border-amber-200">
              {t('Backend user endpoint deploy qilinmagan. Javoblar mahalliy hisoblandi.', language)}
            </div>
          )}

          <div className="ios-card p-4 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-indigo-500" />
              <strong>{detail.foydalanuvchi.ism}</strong>
            </div>
            <p className="text-xs text-slate-500">
              {detail.foydalanuvchi.jins && `${detail.foydalanuvchi.jins} · `}
              {detail.foydalanuvchi.yosh && `${detail.foydalanuvchi.yosh} yosh · `}
              {detail.foydalanuvchi.shaharTuman}
            </p>
          </div>

          {surveys.length > 0 ? (
            surveys.map((survey, surveyIdx) => (
              <div key={survey.responseId ?? surveyIdx}>
              <div className="admin-stat-ai-banner ios-card p-4 mb-3">
                <div className="flex flex-wrap gap-4 text-sm">
                  <span>
                    {t('Xavf', language)}:{' '}
                    <strong className={zoneClass(survey.zona)}>
                      {survey.riskFoizi ?? '—'}% ({survey.zona ?? '—'})
                    </strong>
                  </span>
                  {survey.yaratilganSana && (
                    <span className="text-slate-500">{survey.yaratilganSana.slice(0, 10)}</span>
                  )}
                </div>
                {survey.klinikXulosa && (
                  <p className="text-sm mt-2 text-slate-700">{survey.klinikXulosa}</p>
                )}
              </div>

              {survey.boLimlar.map((section) => (
                <div key={section.nomi} className="ios-card overflow-hidden mb-3">
                  <div className="admin-stat-section-head">{section.nomi}</div>
                  <div className="admin-stat-q-table-wrap">
                    <table className="admin-stat-q-table">
                      <thead>
                        <tr>
                          <th>№</th>
                          <th>{t('Savol', language)}</th>
                          <th>{t('Javob', language)}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.javoblar.map((item, idx) => (
                          <tr key={`${item.id}-${idx}`}>
                            <td className="admin-stat-q-num">{item.id}</td>
                            <td>{t(item.text, language)}</td>
                            <td>{t(item.javob, language)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              </div>
            ))
          ) : (
            <div className="admin-stat-empty ios-card p-6">
              {t("Ushbu so'rovnoma bo'yicha javob topilmadi.", language)}
            </div>
          )}
        </>
      ) : (
        <div className="admin-stat-empty ios-card p-6">
          {t('Foydalanuvchini tanlang.', language)}
        </div>
      )}
    </div>
  );
}
