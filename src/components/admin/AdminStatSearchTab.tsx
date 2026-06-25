import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, Loader2, MessageSquareText, Plus, Search, Trash2 } from 'lucide-react';
import { fetchAnketaQuestions } from '../../lib/anketaApi';
import {
  downloadSearchStatisticsExcel,
  searchStatistics,
  SURVEY_KIND_LABELS,
  type AnswerFilter,
  type StatisticsSearchResponse,
  type SurveyKind,
} from '../../lib/adminStatisticsApi';
import { t, type AppLanguage } from '../../lib/lang';
import { NL_SEARCH_EXAMPLES, parseNaturalLanguageQuery } from '../../lib/naturalLanguageSearch';
import { SEARCH_PRESETS } from '../../lib/statisticsFallback';
import { fetchSurveyQuestions } from '../../lib/surveyApi';
import type { AnketaQuestion } from '../../types';
import { useToast } from '../ui/Toast';

const SURVEY_KINDS: SurveyKind[] = ['anketa', 'student', 'pedagog'];

function zoneClass(zona: string | null): string {
  if (zona === 'yashil') return 'text-emerald-600';
  if (zona === 'qizil') return 'text-red-600';
  if (zona === 'sariq') return 'text-amber-600';
  return 'text-slate-600';
}

interface AdminStatSearchTabProps {
  language?: AppLanguage;
}

export default function AdminStatSearchTab({ language = 'lotin' }: AdminStatSearchTabProps) {
  const { showToast } = useToast();
  const [kind, setKind] = useState<SurveyKind>('anketa');
  const [questions, setQuestions] = useState<AnketaQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [filters, setFilters] = useState<AnswerFilter[]>([]);
  const [draftQuestionId, setDraftQuestionId] = useState<number>(1);
  const [draftJavob, setDraftJavob] = useState('');
  const [results, setResults] = useState<StatisticsSearchResponse | null>(null);
  const [source, setSource] = useState<'api' | 'fallback' | null>(null);
  const [searching, setSearching] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [commandText, setCommandText] = useState('');
  const [commandSummary, setCommandSummary] = useState<string | null>(null);

  const executeSearch = async (searchKind: SurveyKind, searchFilters: AnswerFilter[]) => {
    if (searchFilters.length === 0) {
      showToast(t('Kamida bitta filter qo\'shing.', language), 'error');
      return;
    }
    setSearching(true);
    try {
      const result = await searchStatistics(searchKind, searchFilters);
      setResults(result.data);
      setSource(result.source);
    } catch (err) {
      console.error(err);
      setResults(null);
      setSource(null);
      showToast(t('Qidiruvda xatolik.', language), 'error');
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    (async () => {
      setLoadingQuestions(true);
      try {
        const schema =
          kind === 'anketa'
            ? await fetchAnketaQuestions()
            : await fetchSurveyQuestions(kind);
        setQuestions(schema.questions);
        if (schema.questions.length > 0) {
          setDraftQuestionId(schema.questions[0].id);
        }
      } catch (err) {
        console.error(err);
        showToast(t('Savollarni yuklashda xatolik.', language), 'error');
      } finally {
        setLoadingQuestions(false);
      }
    })();
  }, [kind, language, showToast]);

  const selectedQuestion = questions.find((q) => q.id === draftQuestionId);
  const answerOptions =
    selectedQuestion?.type === 'single_choice' ||
    selectedQuestion?.type === 'single_choice_with_text' ||
    selectedQuestion?.type === 'multiple_choice'
      ? selectedQuestion.options
      : [];

  const addFilter = () => {
    if (!draftJavob.trim()) return;
    setFilters((prev) => {
      const without = prev.filter((f) => f.questionId !== draftQuestionId);
      return [...without, { questionId: draftQuestionId, javob: draftJavob.trim() }];
    });
    setDraftJavob('');
  };

  const removeFilter = (questionId: number) => {
    setFilters((prev) => prev.filter((f) => f.questionId !== questionId));
  };

  const applyPreset = async (presetFilters: AnswerFilter[], label: string) => {
    setKind('anketa');
    setFilters(presetFilters);
    setCommandSummary(label);
    await executeSearch('anketa', presetFilters);
  };

  const runSearch = async () => {
    await executeSearch(kind, filters);
  };

  const runCommandSearch = async () => {
    const parsed = parseNaturalLanguageQuery(commandText);
    if (!parsed.ok) {
      showToast(t(parsed.message, language), 'error');
      return;
    }
    setKind(parsed.kind);
    setFilters(parsed.filters);
    setCommandSummary(parsed.summary);
    await executeSearch(parsed.kind, parsed.filters);
  };

  const handleExcel = async () => {
    if (!results) return;
    setExporting(true);
    try {
      const result = await downloadSearchStatisticsExcel(
        results.excelUrl || undefined,
        kind,
        filters,
        results
      );
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

  return (
    <div className="admin-stat-search-tab">
      <div className="admin-stat-nl-command ios-card p-4 mb-3">
        <label className="admin-stat-field-label flex items-center gap-1.5 mb-2">
          <MessageSquareText className="w-3.5 h-3.5" />
          {t('Buyruq yozing (tabiiy til)', language)}
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={commandText}
            onChange={(e) => setCommandText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void runCommandSearch();
            }}
            className="admin-stat-search flex-1 min-w-[220px]"
            placeholder={t('Masalan: chekadigan erkaklar, yuqori glyukozali ayollar', language)}
          />
          <button
            type="button"
            className="ios-btn ios-btn-primary ios-btn-sm"
            onClick={() => void runCommandSearch()}
            disabled={searching || !commandText.trim()}
          >
            {searching ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            {t('Tahlil qilish', language)}
          </button>
        </div>
        <p className="text-[0.65rem] text-slate-500 mt-2">
          {t('Misol', language)}: {NL_SEARCH_EXAMPLES.join(' · ')}
        </p>
        {commandSummary && (
          <p className="text-xs text-indigo-700 mt-2">
            {t('Tushundim', language)}: <strong>{commandSummary}</strong>
          </p>
        )}
      </div>

      <div className="admin-stat-presets flex flex-wrap gap-2 mb-3">
        {SEARCH_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="ios-btn ios-btn-frost ios-btn-sm"
            onClick={() => void applyPreset(preset.filters, preset.label)}
            disabled={searching}
          >
            {t(preset.label, language)}
          </button>
        ))}
      </div>

      <div className="admin-stat-filter-bar ios-card p-4 mb-3">
        <div className="admin-stat-filter-grid">
          <div>
            <label className="admin-stat-field-label">{t("So'rovnoma", language)}</label>
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as SurveyKind);
                setFilters([]);
                setResults(null);
              }}
              className="admin-stat-select w-full"
            >
              {SURVEY_KINDS.map((k) => (
                <option key={k} value={k}>
                  {SURVEY_KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="admin-stat-field-label">{t('Savol', language)}</label>
            <select
              value={draftQuestionId}
              onChange={(e) => {
                setDraftQuestionId(Number(e.target.value));
                setDraftJavob('');
              }}
              className="admin-stat-select w-full"
              disabled={loadingQuestions}
            >
              {questions.map((q) => (
                <option key={q.id} value={q.id}>
                  #{q.id} — {q.text.slice(0, 60)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="admin-stat-field-label">{t('Javob', language)}</label>
            {answerOptions.length > 0 ? (
              <select
                value={draftJavob}
                onChange={(e) => setDraftJavob(e.target.value)}
                className="admin-stat-select w-full"
              >
                <option value="">{t('Tanlang...', language)}</option>
                {answerOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={draftJavob}
                onChange={(e) => setDraftJavob(e.target.value)}
                className="admin-stat-search w-full"
                placeholder={t('Javob matni...', language)}
              />
            )}
          </div>
          <div className="flex items-end gap-2">
            <button type="button" className="ios-btn ios-btn-secondary ios-btn-sm" onClick={addFilter}>
              <Plus className="w-3.5 h-3.5" />
              {t("Filter qo'shish", language)}
            </button>
            <button
              type="button"
              className="ios-btn ios-btn-primary ios-btn-sm"
              onClick={runSearch}
              disabled={searching || filters.length === 0}
            >
              {searching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              {t('Qidirish', language)}
            </button>
          </div>
        </div>

        {filters.length > 0 && (
          <div className="admin-stat-active-filters mt-3">
            {filters.map((f) => {
              const qText = questions.find((q) => q.id === f.questionId)?.text ?? `#${f.questionId}`;
              return (
                <span key={f.questionId} className="admin-stat-filter-chip">
                  <strong>#{f.questionId}</strong> {qText.slice(0, 40)} ={' '}
                  <em>{f.javob.startsWith('!') ? `≠ ${f.javob.slice(1)}` : f.javob}</em>
                  <button type="button" onClick={() => removeFilter(f.questionId)} aria-label="remove">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {results && (
        <>
          {source === 'fallback' && (
            <div className="admin-stat-info-banner ios-card p-3 mb-2 text-xs text-amber-800 bg-amber-50 border border-amber-200">
              {t('Backend search endpoint deploy qilinmagan. Natijalar mahalliy filtrdan.', language)}
            </div>
          )}

          <div className="admin-stat-toolbar mb-2">
            <p className="text-sm font-semibold">
              {t('Natijalar', language)}: {results.jami}
            </p>
            <button
              type="button"
              className="ios-btn ios-btn-primary ios-btn-sm"
              onClick={handleExcel}
              disabled={exporting || results.jami === 0}
            >
              {exporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5" />
              )}
              Excel
            </button>
          </div>

          {results.jami === 0 ? (
            <div className="admin-stat-empty ios-card p-6">
              {t('Mos javob topilmadi.', language)}
            </div>
          ) : (
            <div className="ios-card overflow-hidden">
              <div className="admin-stat-q-table-wrap">
                <table className="admin-stat-q-table">
                  <thead>
                    <tr>
                      <th>{t('F.I.Sh.', language)}</th>
                      <th>{t('Xavf %', language)}</th>
                      <th>{t('Zona', language)}</th>
                      <th>{t('Klinik xulosa', language)}</th>
                      <th>{t('Yosh', language)}</th>
                      <th>{t('Jins', language)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.natijalar.map((item) => (
                      <tr key={item.responseId}>
                        <td>{item.fish ?? '—'}</td>
                        <td className={`admin-stat-q-num ${zoneClass(item.zona)}`}>
                          {item.riskFoizi ?? '—'}%
                        </td>
                        <td className={zoneClass(item.zona)}>{item.zona ?? '—'}</td>
                        <td className="max-w-xs">{item.klinikXulosa ?? '—'}</td>
                        <td className="admin-stat-q-num">{item.foydalanuvchi?.yosh ?? '—'}</td>
                        <td>{item.foydalanuvchi?.jins ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
