import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  Filter,
  Loader2,
  RefreshCw,
  Upload,
  User,
} from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { t, type AppLanguage } from '../../lib/lang';
import {
  downloadStatisticsExcel,
  fetchAdminStatistics,
  fetchQuestionStatistics,
  SURVEY_KIND_LABELS,
  type FastApiAdminStatistics,
  type QuestionnaireStatistics,
  type SurveyKind,
  type SurveyZoneStats,
} from '../../lib/adminStatisticsApi';
import { useToast } from '../ui/Toast';
import AdminStatExcelTab from './AdminStatExcelTab';
import AdminStatSearchTab from './AdminStatSearchTab';
import AdminStatUserTab from './AdminStatUserTab';

const ZONE_COLORS = {
  yashil: '#22c55e',
  sariq: '#eab308',
  qizil: '#ef4444',
};

const SURVEY_KINDS: SurveyKind[] = ['anketa', 'student', 'pedagog'];

type MainStatTab = 'general' | 'user' | 'search' | 'excel';

interface FastApiStatisticsPanelProps {
  language?: AppLanguage;
  initialSurveys?: FastApiAdminStatistics;
}

function surveyPieData(zones: SurveyZoneStats['zones'] | undefined, language: AppLanguage) {
  if (!zones) return [];
  return [
    { name: t('Yashil', language), value: zones.yashil, key: 'yashil' },
    { name: t('Sariq', language), value: zones.sariq, key: 'sariq' },
    { name: t('Qizil', language), value: zones.qizil, key: 'qizil' },
  ].filter((d) => d.value > 0);
}

function OverviewCard({
  title,
  data,
  language,
}: {
  title: string;
  data?: SurveyZoneStats;
  language: AppLanguage;
}) {
  const zones = data?.zones;
  const chartData = surveyPieData(zones, language);

  return (
    <div className="ios-card p-4 admin-stat-overview-card">
      <h3 className="admin-stat-chart-title">{title}</h3>
      <p className="text-3xl font-black text-slate-800">{data?.total ?? 0}</p>
      <p className="text-xs text-slate-500 mb-2">{t('Jami javoblar', language)}</p>
      {zones && (
        <p className="text-[10px] text-slate-500 mb-2">
          <span className="text-emerald-600">{zones.yashil}</span>
          {' / '}
          <span className="text-amber-600">{zones.sariq}</span>
          {' / '}
          <span className="text-red-600">{zones.qizil}</span>
        </p>
      )}
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={140}>
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} label>
              {chartData.map((entry) => (
                <Cell key={entry.key} fill={ZONE_COLORS[entry.key as keyof typeof ZONE_COLORS]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-xs text-slate-400">{t("Ma'lumot yo'q", language)}</p>
      )}
    </div>
  );
}

function QuestionDistributionTable({
  data,
  language,
}: {
  data: QuestionnaireStatistics;
  language: AppLanguage;
}) {
  if (data.jamiJavoblar === 0) {
    return (
      <div className="admin-stat-empty ios-card p-6">
        {t("Hozircha javoblar yo'q", language)}
      </div>
    );
  }

  return (
    <div className="admin-stat-q-sections">
      {data.boLimlar.map((section) => (
        <div key={section.nomi} className="ios-card overflow-hidden">
          <div className="admin-stat-section-head">{section.nomi}</div>
          <div className="admin-stat-q-table-wrap">
            <table className="admin-stat-q-table">
              <thead>
                <tr>
                  <th>{t("Ko'rsatkich", language)}</th>
                  <th>{t('Javob', language)}</th>
                  <th>{t('soni (n)', language)}</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {section.savollar.map((question) => {
                  const rows = question.taqsimot.length > 0
                    ? question.taqsimot
                    : [{ javob: '—', soni: 0, foiz: 0 }];

                  return rows.map((row, idx) => (
                    <tr key={`${question.id}-${idx}-${row.javob}`}>
                      {idx === 0 && (
                        <td rowSpan={rows.length} className="admin-stat-q-indicator">
                          <span className="admin-stat-qid">#{question.id}</span>
                          {t(question.text, language)}
                          {question.type === 'matrix_row' && (
                            <span className="admin-stat-qtype-badge">matrix</span>
                          )}
                        </td>
                      )}
                      <td>{t(row.javob, language)}</td>
                      <td className="admin-stat-q-num">{row.soni}</td>
                      <td className="admin-stat-q-num">{row.foiz.toFixed(1)}%</td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FastApiStatisticsPanel({
  language = 'lotin',
  initialSurveys,
}: FastApiStatisticsPanelProps) {
  const { showToast } = useToast();
  const [mainTab, setMainTab] = useState<MainStatTab>('general');
  const [surveys, setSurveys] = useState<FastApiAdminStatistics>(initialSurveys ?? {});
  const [kind, setKind] = useState<SurveyKind>('anketa');
  const [questionStats, setQuestionStats] = useState<QuestionnaireStatistics | null>(null);
  const [statsSource, setStatsSource] = useState<'api' | 'fallback' | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(!initialSurveys);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [exporting, setExporting] = useState(false);

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const result = await fetchAdminStatistics();
      setSurveys(result.surveys ?? {});
    } catch (err) {
      console.error('Overview stats error:', err);
      showToast(t("Umumiy statistikani yuklashda xatolik.", language), 'error');
    } finally {
      setLoadingOverview(false);
    }
  }, [language, showToast]);

  const loadQuestions = useCallback(async () => {
    setLoadingQuestions(true);
    try {
      const result = await fetchQuestionStatistics(kind);
      setQuestionStats(result.data);
      setStatsSource(result.source);
    } catch (err) {
      console.error('Question stats error:', err);
      setQuestionStats(null);
      setStatsSource(null);
      showToast(t("Savol statistikasini yuklashda xatolik.", language), 'error');
    } finally {
      setLoadingQuestions(false);
    }
  }, [kind, language, showToast]);

  useEffect(() => {
    if (initialSurveys) return;
    loadOverview();
  }, [initialSurveys, loadOverview]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const handleRefresh = () => {
    loadOverview();
    loadQuestions();
  };

  const handleExcel = async () => {
    if (!questionStats) return;
    setExporting(true);
    try {
      const source = await downloadStatisticsExcel(kind, questionStats);
      const msg =
        source === 'api'
          ? t('Excel fayl yuklab olindi.', language)
          : t('Excel fayl yuklab olindi (mahalliy hisoblash).', language);
      showToast(msg, 'success');
    } catch (err) {
      console.error('Excel export error:', err);
      showToast(t('Excel yuklab olishda xatolik.', language), 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="admin-stat-root" id="admin-statistics-export">
      <div className="admin-stat-main-tabs">
        {([
          ['general', t('Umumiy statistika', language), BarChart3],
          ['user', t('Foydalanuvchi', language), User],
          ['search', t('Filter qidiruv', language), Filter],
          ['excel', t('Excel tahlil', language), Upload],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            className={`admin-stat-main-tab ${mainTab === id ? 'active' : ''}`}
            onClick={() => setMainTab(id)}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {mainTab === 'user' && <AdminStatUserTab language={language} />}

      {mainTab === 'search' && <AdminStatSearchTab language={language} />}

      {mainTab === 'excel' && <AdminStatExcelTab language={language} />}

      {mainTab === 'general' && (
        <>
      {loadingOverview && !surveys.anketa && !surveys.student && !surveys.pedagog ? (
        <div className="admin-stat-loading">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          <span>{t('Statistika yuklanmoqda...', language)}</span>
        </div>
      ) : (
        <div className="admin-stat-charts-grid admin-stat-overview-grid">
          <OverviewCard
            title={t('Anketa 2025', language)}
            data={surveys.anketa}
            language={language}
          />
          <OverviewCard
            title={t("Talaba so'rovnomasi", language)}
            data={surveys.student}
            language={language}
          />
          <OverviewCard
            title={t("Pedagog so'rovnomasi", language)}
            data={surveys.pedagog}
            language={language}
          />
        </div>
      )}

      <div className="admin-stat-toolbar">
        <div className="admin-stat-tabs">
          {SURVEY_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              className={`admin-stat-tab ${kind === k ? 'active' : ''}`}
              onClick={() => setKind(k)}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              {t(SURVEY_KIND_LABELS[k], language)}
            </button>
          ))}
        </div>

        <div className="admin-stat-actions">
          <button
            type="button"
            className="ios-btn ios-btn-secondary ios-btn-sm"
            onClick={handleRefresh}
            disabled={loadingOverview || loadingQuestions}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loadingOverview || loadingQuestions ? 'animate-spin' : ''}`}
            />
            {t('Yangilash', language)}
          </button>
          <button
            type="button"
            className="ios-btn ios-btn-primary ios-btn-sm"
            onClick={handleExcel}
            disabled={exporting}
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

      {loadingQuestions ? (
        <div className="admin-stat-loading">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
          <span>{t('Savollar statistikasi yuklanmoqda...', language)}</span>
        </div>
      ) : questionStats ? (
        <>
          {statsSource === 'fallback' && (
            <div className="admin-stat-info-banner ios-card p-3 mb-2 text-xs text-amber-800 bg-amber-50 border border-amber-200">
              {t(
                "Backend /questions endpoint hali deploy qilinmagan. Statistika mavjud javoblardan hisoblandi.",
                language
              )}
            </div>
          )}
          <div className="admin-stat-meta-banner ios-card p-3">
            <strong>{questionStats.title}</strong>
            <span className="text-slate-500">
              {' · '}
              {t('Versiya', language)} {questionStats.version}
              {' · '}
              {t('Jami javoblar', language)}: {questionStats.jamiJavoblar}
            </span>
          </div>
          <QuestionDistributionTable data={questionStats} language={language} />
        </>
      ) : (
        <div className="admin-stat-empty ios-card p-6">
          {t("Savol statistikasi mavjud emas yoki API hali tayyor emas.", language)}
        </div>
      )}
        </>
      )}
    </div>
  );
}
