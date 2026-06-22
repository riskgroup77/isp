import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Download,
  FileText,
  Loader2,
  PieChart as PieChartIcon,
  Printer,
  RefreshCw,
  Table2,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { t, type AppLanguage } from '../../lib/lang';
import {
  fetchAdminStatistics,
  type AdminStatisticsPayload,
  type AdminStatisticsResult,
  type FastApiAdminStatistics,
  type QuestionStatRow,
  type SurveyZoneStats,
} from '../../lib/adminStatisticsApi';
import { downloadAdminReportWord, printAdminReport } from '../../lib/adminExport';
import { useToast } from '../ui/Toast';

type StatsTab = 'overview' | 'epidemiology' | 'questions' | 'responses';

interface AdminStatisticsPanelProps {
  language?: AppLanguage;
}

const ZONE_COLORS = {
  yashil: '#10b981',
  sariq: '#f59e0b',
  qizil: '#ef4444',
  unknown: '#94a3b8',
};

const AGE_FILTERS = [
  { id: 'all', label: 'Barcha yosh' },
  { id: '20-29', label: '20–29 yosh' },
  { id: '30-39', label: '30–39 yosh' },
  { id: '40-49', label: '40–49 yosh' },
  { id: '50-59', label: '50–59 yosh' },
  { id: '60-plus', label: '60+ yosh' },
];

function surveyPieData(
  zones: SurveyZoneStats['zones'] | undefined,
  language: AppLanguage
) {
  if (!zones) return [];
  return [
    { name: t('Yashil zona', language), value: zones.yashil, key: 'yashil' },
    { name: t('Sariq zona', language), value: zones.sariq, key: 'sariq' },
    { name: t('Qizil zona', language), value: zones.qizil, key: 'qizil' },
  ].filter((d) => d.value > 0);
}

function SurveyZoneCard({
  title,
  data,
  language,
}: {
  title: string;
  data?: SurveyZoneStats;
  language: AppLanguage;
}) {
  const chartData = surveyPieData(data?.zones, language);
  return (
    <div className="ios-card p-4">
      <h3 className="admin-stat-chart-title">{title}</h3>
      <p className="text-2xl font-bold mb-2">{data?.total ?? 0}</p>
      <p className="text-xs text-slate-500 mb-3">{t("Jami javoblar", language)}</p>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
              {chartData.map((entry) => (
                <Cell key={entry.key} fill={ZONE_COLORS[entry.key as keyof typeof ZONE_COLORS]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-xs text-slate-400">{t('Ma\'lumot yo\'q', language)}</p>
      )}
    </div>
  );
}

function FastApiOverview({
  surveys,
  language,
}: {
  surveys: FastApiAdminStatistics;
  language: AppLanguage;
}) {
  return (
    <div className="admin-stat-section ios-stagger">
      <div className="admin-stat-charts-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <SurveyZoneCard title={t('Anketa 2025', language)} data={surveys.anketa} language={language} />
        <SurveyZoneCard title={t('Talaba so\'rovnomasi', language)} data={surveys.student} language={language} />
        <SurveyZoneCard title={t('Pedagog so\'rovnomasi', language)} data={surveys.pedagog} language={language} />
      </div>
    </div>
  );
}

function fmtPct(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return `${v.toFixed(1)}%`;
}

function QuestionStatCard({ q, language }: { q: QuestionStatRow; language: AppLanguage }) {
  const topOptions = q.options.filter((o) => o.count > 0).slice(0, 6);
  return (
    <div className="admin-stat-question-card">
      <div className="admin-stat-question-head">
        <span className="admin-stat-qid">#{q.id}</span>
        <span className="admin-stat-qtype">{q.type}</span>
      </div>
      <h4 className="admin-stat-question-title">{t(q.text, language)}</h4>
      <p className="admin-stat-question-meta">
        {t('Javoblar', language)}: <strong>{q.responseCount}</strong> · {q.section}
      </p>
      <div className="admin-stat-option-list">
        {topOptions.map((o, idx) => (
          <div key={`${q.id}-${idx}-${o.label}`} className="admin-stat-option-row">
            <div className="admin-stat-option-label">{t(o.label, language)}</div>
            <div className="admin-stat-option-bar-wrap">
              <div className="admin-stat-option-bar" style={{ width: `${Math.min(100, o.percent)}%` }} />
            </div>
            <div className="admin-stat-option-val">
              {o.count} ({o.percent}%)
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminStatisticsPanel({ language = 'lotin' }: AdminStatisticsPanelProps) {
  const { showToast } = useToast();
  const [statsResult, setStatsResult] = useState<AdminStatisticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<StatsTab>('overview');
  const [ageFilter, setAgeFilter] = useState('all');
  const [questionSearch, setQuestionSearch] = useState('');

  const stats = statsResult?.legacy ?? null;
  const isFastApi = statsResult?.source === 'fastapi';
  const fastApiSurveys = statsResult?.surveys;

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminStatistics(ageFilter);
      setStatsResult(data);
    } catch (err) {
      console.error('Admin statistics load error:', err);
      showToast(t("Statistikani yuklashda xatolik.", language), 'error');
    } finally {
      setLoading(false);
    }
  }, [ageFilter, language, showToast]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const riskChartData = useMemo(() => {
    if (!stats) return [];
    const r = stats.riskDistribution;
    return [
      { name: t('Yashil zona', language), value: r.yashil, key: 'yashil' },
      { name: t('Sariq zona', language), value: r.sariq, key: 'sariq' },
      { name: t('Qizil zona', language), value: r.qizil, key: 'qizil' },
      { name: t('Noma\'lum', language), value: r.unknown, key: 'unknown' },
    ].filter((d) => d.value > 0);
  }, [stats, language]);

  const monthChartData = useMemo(
    () => stats?.submissionsByMonth ?? [],
    [stats]
  );

  const filteredQuestions = useMemo(() => {
    if (!stats) return [];
    const q = questionSearch.trim().toLowerCase();
    return stats.questionStats
      .filter((item) => item.responseCount > 0)
      .filter((item) => !q || item.text.toLowerCase().includes(q) || String(item.id).includes(q))
      .sort((a, b) => b.responseCount - a.responseCount);
  }, [stats, questionSearch]);

  const handlePrint = () => {
    if (!stats) return;
    printAdminReport(stats);
  };

  const handleWord = () => {
    if (!stats) return;
    downloadAdminReportWord(stats);
    showToast(t('Word fayl yuklab olindi.', language), 'success');
  };

  if (loading && !statsResult) {
    return (
      <div className="admin-stat-loading">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
        <span>{t('Statistika yuklanmoqda...', language)}</span>
      </div>
    );
  }

  if (!statsResult) {
    return (
      <div className="admin-stat-empty">
        {t('Statistika mavjud emas.', language)}
      </div>
    );
  }

  if (isFastApi && !stats) {
    return (
      <div className="admin-stat-root" id="admin-statistics-export">
        <div className="admin-stat-toolbar">
          <div className="admin-stat-tabs">
            <button type="button" className="admin-stat-tab active">
              <BarChart3 className="w-3.5 h-3.5" />
              {t('Umumiy', language)}
            </button>
          </div>
          <div className="admin-stat-actions">
            <button type="button" className="ios-btn ios-btn-secondary ios-btn-sm" onClick={loadStats}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {t('Yangilash', language)}
            </button>
          </div>
        </div>
        <FastApiOverview surveys={fastApiSurveys ?? {}} language={language} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="admin-stat-empty">
        {t('Statistika mavjud emas.', language)}
      </div>
    );
  }

  const o = stats.overview;

  return (
    <div className="admin-stat-root" id="admin-statistics-export">
      <div className="admin-stat-toolbar">
        <div className="admin-stat-tabs">
          {([
            ['overview', t('Umumiy', language), BarChart3],
            ['epidemiology', t('Epidemiologiya', language), Table2],
            ['questions', t('Savollar', language), FileText],
            ['responses', t('Natijalar', language), PieChartIcon],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              className={`admin-stat-tab ${tab === id ? 'active' : ''}`}
              onClick={() => setTab(id)}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="admin-stat-actions">
          <select
            value={ageFilter}
            onChange={(e) => setAgeFilter(e.target.value)}
            className="admin-stat-select"
          >
            {AGE_FILTERS.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
          <button type="button" className="ios-btn ios-btn-secondary ios-btn-sm" onClick={loadStats}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {t('Yangilash', language)}
          </button>
          <button type="button" className="ios-btn ios-btn-secondary ios-btn-sm" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5" />
            PDF
          </button>
          <button type="button" className="ios-btn ios-btn-primary ios-btn-sm" onClick={handleWord}>
            <Download className="w-3.5 h-3.5" />
            Word
          </button>
        </div>
      </div>

      {tab === 'overview' && (
        <div className="admin-stat-section ios-stagger">
          <div className="admin-stat-kpi-grid">
            <div className="ios-card p-4"><span className="admin-stat-kpi-label">{t('Foydalanuvchilar', language)}</span><strong>{o.totalUsers}</strong></div>
            <div className="ios-card p-4"><span className="admin-stat-kpi-label">{t('Bemorlar', language)}</span><strong>{o.totalPatients}</strong></div>
            <div className="ios-card p-4"><span className="admin-stat-kpi-label">{t('Anketa javoblari', language)}</span><strong>{o.totalAnketaResponses}</strong></div>
            <div className="ios-card p-4"><span className="admin-stat-kpi-label">{t('Noyob respondentlar', language)}</span><strong>{o.uniqueRespondents}</strong></div>
            <div className="ios-card p-4"><span className="admin-stat-kpi-label">{t('O\'rtacha xavf', language)}</span><strong>{o.avgRiskFoizi ?? '—'}%</strong></div>
            <div className="ios-card p-4"><span className="admin-stat-kpi-label">{t('To\'ldirish', language)}</span><strong>{o.completionRate}%</strong></div>
          </div>

          <div className="admin-stat-charts-grid">
            <div className="ios-card p-4">
              <h3 className="admin-stat-chart-title">{t('Xavf zonasi taqsimoti', language)}</h3>
              <div className="admin-stat-chart-wrap">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={riskChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {riskChartData.map((entry) => (
                        <Cell key={entry.key} fill={ZONE_COLORS[entry.key as keyof typeof ZONE_COLORS]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="ios-card p-4">
              <h3 className="admin-stat-chart-title">{t('Anketa topshirishlar (oylar bo\'yicha)', language)}</h3>
              <div className="admin-stat-chart-wrap">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={monthChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'epidemiology' && (
        <div className="admin-stat-section">
          <div className="admin-stat-info-banner ios-card p-4 mb-4">
            <h3 className="font-bold text-sm">{stats.epidemiology.title}</h3>
            <p className="text-xs text-slate-500 mt-1">
              {t('Platforma ma\'lumotlari va etalon jadval (Novosibirsk, 20–29 yosh) solishtiruvi.', language)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">{stats.referenceMeta.source}</p>
          </div>

          <div className="ios-card overflow-x-auto">
            <table className="admin-epi-table">
              <thead>
                <tr>
                  <th rowSpan={2}>{t('Ko\'rsatkich', language)}</th>
                  <th colSpan={3}>{t('Platforma — Shahar', language)}</th>
                  <th colSpan={3}>{t('Platforma — Qishloq', language)}</th>
                  <th colSpan={3}>{t('Platforma — Jami', language)}</th>
                  <th colSpan={3}>{t('Etalon — Novosibirsk', language)}</th>
                  <th colSpan={3}>{t('Etalon — Boshqa sh.', language)}</th>
                  <th colSpan={3}>{t('Etalon — Qishloq', language)}</th>
                </tr>
                <tr>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <React.Fragment key={i}>
                      <th>Σ</th><th>m</th><th>j</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.epidemiology.indicators.map((ind) => (
                  <tr key={ind.id}>
                    <td className="admin-epi-label">{t(ind.label, language)}</td>
                    {(['shahar', 'qishloq', 'jami'] as const).map((region) => (
                      <React.Fragment key={region}>
                        <td>{fmtPct(ind.platform[region].sigma.value)}<small>n={ind.platform[region].sigma.n}</small></td>
                        <td>{fmtPct(ind.platform[region].erkak.value)}</td>
                        <td>{fmtPct(ind.platform[region].ayol.value)}</td>
                      </React.Fragment>
                    ))}
                    {(['novosibirsk', 'boshqaShaharlar', 'qishloq'] as const).map((refKey) => (
                      <React.Fragment key={refKey}>
                        <td>{fmtPct(ind.reference[refKey].sigma)}</td>
                        <td>{fmtPct(ind.reference[refKey].erkak)}</td>
                        <td>{fmtPct(ind.reference[refKey].ayol)}</td>
                      </React.Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'questions' && (
        <div className="admin-stat-section">
          <div className="admin-stat-question-toolbar">
            <input
              type="search"
              value={questionSearch}
              onChange={(e) => setQuestionSearch(e.target.value)}
              placeholder={t('Savol matni yoki raqami bo\'yicha qidirish...', language)}
              className="admin-stat-search"
            />
            <span className="text-xs text-slate-500">{filteredQuestions.length} ta savol</span>
          </div>
          <div className="admin-stat-question-grid">
            {filteredQuestions.map((q) => (
              <div key={q.id}>
                <QuestionStatCard q={q} language={language} />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'responses' && (
        <div className="admin-stat-section">
          <div className="admin-stat-kpi-grid">
            <div className="ios-card p-4"><span className="admin-stat-kpi-label">{t('Yashil zona', language)}</span><strong className="text-emerald-600">{stats.riskDistribution.yashil}</strong></div>
            <div className="ios-card p-4"><span className="admin-stat-kpi-label">{t('Sariq zona', language)}</span><strong className="text-amber-600">{stats.riskDistribution.sariq}</strong></div>
            <div className="ios-card p-4"><span className="admin-stat-kpi-label">{t('Qizil zona', language)}</span><strong className="text-red-600">{stats.riskDistribution.qizil}</strong></div>
            <div className="ios-card p-4"><span className="admin-stat-kpi-label">{t('O\'rtacha javoblar', language)}</span><strong>{o.avgAnsweredCount}</strong></div>
          </div>

          <div className="ios-card p-4 mt-4">
            <h3 className="admin-stat-chart-title">{t('Xavf zonasi — batafsil', language)}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={riskChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {riskChartData.map((entry) => (
                    <Cell key={entry.key} fill={ZONE_COLORS[entry.key as keyof typeof ZONE_COLORS]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
