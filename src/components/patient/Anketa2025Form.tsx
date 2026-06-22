import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  Send,
} from 'lucide-react';
import type { AnketaAnswerValue, AnketaAnswers, AnketaQuestion, AnketaTahlil } from '../../types';
import type { SafeUserProfile } from '../../lib/auth';
import { t, type AppLanguage } from '../../lib/lang';
import {
  fetchAnketaQuestions,
  reanalyzeAnketa,
  submitAnketa,
  type AnketaSubmitPayload,
} from '../../lib/anketaApi';
import {
  fetchSurveyQuestions,
  reanalyzeSurvey,
  submitSurvey,
  SURVEY_LABELS,
  type SurveyKind,
} from '../../lib/surveyApi';
import { ApiError } from '../../lib/api';
import { extractTahlilFromSubmit } from '../../lib/anketaTahlil';
import AnketaTahlilPanel from './AnketaTahlilPanel';

const QUESTIONS_PER_STEP = 12;

type FormSurveyKind = 'anketa' | SurveyKind;

const STORAGE_KEYS: Record<FormSurveyKind, string> = {
  anketa: 'soglik_anketa_2025_draft',
  student: 'soglik_student_survey_draft',
  pedagog: 'soglik_pedagog_survey_draft',
};

interface Anketa2025FormProps {
  user: SafeUserProfile;
  language?: AppLanguage;
  onSubmitted?: () => void;
  surveyKind?: FormSurveyKind;
}

function chunkQuestions<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function isOtherOption(option: string): boolean {
  return /boshqa|ko[''`]rsating/i.test(option);
}

function countAnswered(answers: AnketaAnswers, total: number): number {
  const filled = Object.keys(answers).filter((key) => {
    const val = answers[key];
    if (val === undefined || val === null || val === '') return false;
    if (Array.isArray(val) && val.length === 0) return false;
    if (typeof val === 'object' && !Array.isArray(val)) {
      return Object.keys(val).length > 0;
    }
    return true;
  }).length;
  return filled;
}

function MatrixQuestion({
  question,
  value,
  onChange,
  language,
}: {
  question: AnketaQuestion;
  value: Record<string, string> | undefined;
  onChange: (val: Record<string, string>) => void;
  language: AppLanguage;
}) {
  const matrixValue = value ?? {};

  return (
    <div className="anketa-matrix-wrap">
      {question.description && (
        <p className="anketa-question-desc">{t(question.description, language)}</p>
      )}
      <div className="anketa-matrix-scroll">
        <table className="anketa-matrix-table">
          <thead>
            <tr>
              <th className="anketa-matrix-row-label" />
              {question.columns.map((col) => (
                <th key={col} className="anketa-matrix-col-head">
                  {t(col, language)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {question.rows.map((row) => (
              <tr key={row}>
                <td className="anketa-matrix-row-label">{t(row, language)}</td>
                {question.columns.map((col) => (
                  <td key={col} className="anketa-matrix-cell">
                    <label className="anketa-matrix-radio">
                      <input
                        type="radio"
                        name={`matrix-${question.id}-${row}`}
                        checked={matrixValue[row] === col}
                        onChange={() => onChange({ ...matrixValue, [row]: col })}
                      />
                      <span className="anketa-matrix-dot" />
                    </label>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QuestionField({
  question,
  value,
  onChange,
  language,
}: {
  question: AnketaQuestion;
  value: AnketaAnswerValue | undefined;
  onChange: (val: AnketaAnswerValue) => void;
  language: AppLanguage;
}) {
  const qId = String(question.id);

  if (question.type === 'text') {
    const textVal = typeof value === 'string' ? value : '';
    return (
      <input
        type="text"
        className="anketa-text-input"
        value={textVal}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('Javobingizni yozing...', language)}
      />
    );
  }

  if (question.type === 'matrix') {
    return (
      <MatrixQuestion
        question={question}
        value={typeof value === 'object' && !Array.isArray(value) ? value : undefined}
        onChange={onChange}
        language={language}
      />
    );
  }

  if (question.type === 'multiple_choice') {
    const selected = Array.isArray(value) ? value : [];
    const toggle = (opt: string) => {
      if (selected.includes(opt)) {
        onChange(selected.filter((o) => o !== opt));
      } else {
        onChange([...selected, opt]);
      }
    };
    return (
      <div className="anketa-options-grid">
        {question.options.map((opt) => (
          <label
            key={opt}
            className={`anketa-option-card ${selected.includes(opt) ? 'anketa-option-card-active' : ''}`}
          >
            <input
              type="checkbox"
              className="anketa-option-input"
              checked={selected.includes(opt)}
              onChange={() => toggle(opt)}
            />
            <span>{t(opt, language)}</span>
          </label>
        ))}
      </div>
    );
  }

  const selected = typeof value === 'string' ? value : '';
  const otherOption = question.options.find(isOtherOption);
  const showOtherInput = otherOption && selected === otherOption;

  return (
    <div className="anketa-options-grid">
      {question.options.map((opt) => (
        <label
          key={opt}
          className={`anketa-option-card ${selected === opt ? 'anketa-option-card-active' : ''}`}
        >
          <input
            type="radio"
            name={`q-${qId}`}
            className="anketa-option-input"
            checked={selected === opt}
            onChange={() => onChange(opt)}
          />
          <span>{t(opt, language)}</span>
        </label>
      ))}
      {showOtherInput && (
        <input
          type="text"
          className="anketa-other-input"
          placeholder={t("Batafsil yozing...", language)}
          value={selected.startsWith(otherOption!) ? '' : selected}
          onChange={(e) => onChange(`${otherOption}: ${e.target.value}`)}
        />
      )}
    </div>
  );
}

export default function Anketa2025Form({
  user,
  language = 'lotin',
  onSubmitted,
  surveyKind = 'anketa',
}: Anketa2025FormProps) {
  const storageKey = STORAGE_KEYS[surveyKind];
  const isAnketa = surveyKind === 'anketa';
  const surveyLabels = !isAnketa ? SURVEY_LABELS[surveyKind] : null;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tahlilResult, setTahlilResult] = useState<AnketaTahlil | null>(null);
  const [aiXato, setAiXato] = useState<string | null>(null);
  const [lastResponseId, setLastResponseId] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<{
    riskFoizi?: number;
    zona?: string;
    klinikXulosa?: string;
  } | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [schema, setSchema] = useState<Awaited<ReturnType<typeof fetchAnketaQuestions>> | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<AnketaAnswers>({});
  const [fish, setFish] = useState(user.ism ?? '');
  const [lavozim, setLavozim] = useState(
    surveyKind === 'student' ? 'Talaba' : surveyKind === 'pedagog' ? 'Pedagog' : ''
  );
  const [toldirilganSana, setToldirilganSana] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [izoh, setIzoh] = useState('');

  const loadDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        answers?: AnketaAnswers;
        fish?: string;
        lavozim?: string;
        toldirilganSana?: string;
        izoh?: string;
        step?: number;
      };
      if (parsed.answers) setAnswers(parsed.answers);
      if (parsed.fish) setFish(parsed.fish);
      if (parsed.lavozim) setLavozim(parsed.lavozim);
      if (parsed.toldirilganSana) setToldirilganSana(parsed.toldirilganSana);
      if (parsed.izoh) setIzoh(parsed.izoh);
      if (typeof parsed.step === 'number') setStep(parsed.step);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = isAnketa
          ? await fetchAnketaQuestions()
          : await fetchSurveyQuestions(surveyKind);
        if (!cancelled) {
          setSchema(data);
          loadDraft();
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Savollar yuklanmadi";
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadDraft, isAnketa, surveyKind]);

  useEffect(() => {
    if (!schema) return;
    localStorage.setItem(
      storageKey,
      JSON.stringify({ answers, fish, lavozim, toldirilganSana, izoh, step })
    );
  }, [answers, fish, lavozim, toldirilganSana, izoh, step, schema, storageKey]);

  const questionSteps = useMemo(
    () => (schema ? chunkQuestions(schema.questions, QUESTIONS_PER_STEP) : []),
    [schema]
  );

  const totalSteps = questionSteps.length + 1;
  const isMetaStep = step >= questionSteps.length;
  const currentQuestions = isMetaStep ? [] : questionSteps[step] ?? [];
  const answeredCount = schema ? countAnswered(answers, schema.totalQuestions) : 0;
  const progressPct = schema
    ? Math.round((answeredCount / schema.totalQuestions) * 100)
    : 0;

  const setAnswer = (id: number, value: AnketaAnswerValue) => {
    setAnswers((prev) => ({ ...prev, [String(id)]: value }));
  };

  const goNext = () => {
    setError(null);
    if (step < totalSteps - 1) setStep((s) => s + 1);
  };

  const goBack = () => {
    setError(null);
    if (step > 0) setStep((s) => s - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schema) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: AnketaSubmitPayload = {
        answers,
        fish: fish.trim(),
        lavozim: lavozim.trim(),
        toldirilganSana,
        izoh: izoh.trim() || undefined,
      };
      const result = isAnketa
        ? await submitAnketa(payload)
        : await submitSurvey(surveyKind, payload);
      const tahlil = extractTahlilFromSubmit(result.tahlil, result.response);
      setTahlilResult(tahlil);
      setAiXato(result.response.aiXato ?? (result.tahlil == null ? "AI tahlil vaqtincha mavjud emas" : null));
      setLastResponseId(result.response.id);
      setLastResponse({
        riskFoizi: result.response.riskFoizi,
        zona: result.response.zona,
        klinikXulosa: result.response.klinikXulosa,
      });
      setSuccess(result.message);
      setShowResults(true);
      localStorage.removeItem(storageKey);
      onSubmitted?.();
    } catch (err) {
      let msg = err instanceof Error ? err.message : "Yuborishda xatolik";
      if (err instanceof ApiError && err.status === 504) {
        msg =
          "Server vaqt tugadi (504). Anketa + AI tahlil backendda juda uzoq ishlayapti. API administratori proxy timeout ni oshirishi yoki tahlilni fon rejimida ishlatishi kerak.";
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReanalyze = async () => {
    if (!lastResponseId) return;
    setReanalyzing(true);
    setError(null);
    try {
      const result = isAnketa
        ? await reanalyzeAnketa(lastResponseId)
        : await reanalyzeSurvey(surveyKind, lastResponseId);
      const tahlil = extractTahlilFromSubmit(result.tahlil, result.response);
      setTahlilResult(tahlil);
      setAiXato(result.response.aiXato ?? null);
      setLastResponse({
        riskFoizi: result.response.riskFoizi,
        zona: result.response.zona,
        klinikXulosa: result.response.klinikXulosa,
      });
      setShowResults(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Qayta tahlilda xatolik");
    } finally {
      setReanalyzing(false);
    }
  };

  const handleNewAnketa = () => {
    setShowResults(false);
    setTahlilResult(null);
    setAiXato(null);
    setLastResponse(null);
    setSuccess(null);
    setStep(0);
    setAnswers({});
    setIzoh('');
  };

  if (loading) {
    return (
      <div className="anketa-loading">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--ios-accent)]" />
        <span>{t("So'rovnoma savollari yuklanmoqda...", language)}</span>
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="anketa-alert anketa-alert-error">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>{error || t("Anketa ma'lumotlari topilmadi.", language)}</span>
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="anketa-form-root">
        {success && (
          <div className="anketa-alert anketa-alert-success">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{t(success, language)}</span>
          </div>
        )}
        {tahlilResult ? (
          <AnketaTahlilPanel tahlil={tahlilResult} aiXato={aiXato} language={language} />
        ) : (
          <div className="anketa-tahlil-root">
            <div className="anketa-alert anketa-alert-warn">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                {t("AI tahlil vaqtincha mavjud emas. So'rovnoma saqlandi.", language)}
                {aiXato ? ` ${aiXato}` : ''}
              </span>
            </div>
            {lastResponse?.riskFoizi != null && (
              <div className="anketa-summary-box mt-3">
                <p>
                  {t('Bazaviy xavf', language)}: <strong>{lastResponse.riskFoizi}%</strong>
                  {lastResponse.zona ? ` (${lastResponse.zona})` : ''}
                </p>
                {lastResponse.klinikXulosa && (
                  <p className="text-sm mt-2">{lastResponse.klinikXulosa}</p>
                )}
              </div>
            )}
          </div>
        )}
        <div className="anketa-form-actions">
          <button type="button" onClick={handleNewAnketa} className="ios-btn ios-btn-frost ios-btn-sm">
            {t("Yangi so'rovnoma to'ldirish", language)}
          </button>
          {lastResponseId && (!tahlilResult || aiXato) && (
            <button
              type="button"
              onClick={handleReanalyze}
              disabled={reanalyzing}
              className="ios-btn ios-btn-primary ios-btn-sm"
            >
              {reanalyzing ? t('AI tahlil qilinmoqda...', language) : t('Qayta tahlil', language)}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="anketa-form-root">
      <div className="anketa-form-header">
        <div className="anketa-form-title-row">
          <ClipboardList className="w-5 h-5 text-[var(--ios-accent)] shrink-0" />
          <div>
            <h3 className="anketa-form-title">
              {t(surveyLabels?.title ?? schema.title ?? 'Anketa', language)}
            </h3>
            <p className="anketa-form-subtitle">
              {t(
                surveyLabels?.subtitle ?? "Umumiy sog'lom turmush tarzi so'rovnomasi",
                language
              )}{' '}
              — {schema.totalQuestions} {t('savol', language)}
            </p>
          </div>
        </div>

        <div className="anketa-progress-block">
          <div className="anketa-progress-meta">
            <span>{t("Javoblar", language)}: {answeredCount}/{schema.totalQuestions}</span>
            <span>{progressPct}%</span>
          </div>
          <div className="anketa-progress-bar">
            <div className="anketa-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div className="anketa-stepper">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <button
              key={i}
              type="button"
              className={`anketa-step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
              onClick={() => setStep(i)}
              aria-label={`${t("Bo'lim", language)} ${i + 1}`}
            />
          ))}
        </div>
        <p className="anketa-step-label">
          {isMetaStep
            ? t("Yakuniy ma'lumotlar", language)
            : `${t("Bo'lim", language)} ${step + 1} / ${questionSteps.length}`}
        </p>
      </div>

      {error && (
        <div className="anketa-alert anketa-alert-error">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{t(error, language)}</span>
        </div>
      )}

      {success && (
        <div className="anketa-alert anketa-alert-success">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{t(success, language)}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="anketa-form-body">
        {!isMetaStep && (
          <div className="anketa-questions-list">
            {currentQuestions.map((question) => (
              <div key={question.id} className="anketa-question-card">
                <div className="anketa-question-head">
                  <span className="anketa-question-num">{question.id}</span>
                  <div>
                    <p className="anketa-question-text">{t(question.text, language)}</p>
                    {question.description && question.type !== 'matrix' && (
                      <p className="anketa-question-desc">{t(question.description, language)}</p>
                    )}
                  </div>
                </div>
                <QuestionField
                  question={question}
                  value={answers[String(question.id)]}
                  onChange={(val) => setAnswer(question.id, val)}
                  language={language}
                />
              </div>
            ))}
          </div>
        )}

        {isMetaStep && (
          <div className="anketa-meta-panel space-y-3">
            <h4 className="anketa-meta-title">{t("Anketa yakuniy ma'lumotlari", language)}</h4>
            <div className="anketa-meta-grid">
              <div className="anketa-meta-field">
                <label>{t("F.I.Sh.", language)}</label>
                <input
                  type="text"
                  value={fish}
                  onChange={(e) => setFish(e.target.value)}
                  className="anketa-meta-input"
                  required
                />
              </div>
              <div className="anketa-meta-field">
                <label>{t("Lavozim", language)}</label>
                <input
                  type="text"
                  value={lavozim}
                  onChange={(e) => setLavozim(e.target.value)}
                  className="anketa-meta-input"
                  placeholder={t("Masalan: Talaba, Ishchi", language)}
                />
              </div>
              <div className="anketa-meta-field">
                <label>{t("To'ldirilgan sana", language)}</label>
                <input
                  type="date"
                  value={toldirilganSana}
                  onChange={(e) => setToldirilganSana(e.target.value)}
                  className="anketa-meta-input"
                  required
                />
              </div>
            </div>
            <div className="anketa-meta-field">
              <label>{t("Izoh (ixtiyoriy)", language)}</label>
              <textarea
                rows={3}
                value={izoh}
                onChange={(e) => setIzoh(e.target.value)}
                className="anketa-meta-input"
                placeholder={t("Qo'shimcha izoh...", language)}
              />
            </div>
            <div className="anketa-summary-box">
              <p>
                {t("Javob berilgan savollar", language)}: <strong>{answeredCount}</strong> / {schema.totalQuestions}
              </p>
            </div>
          </div>
        )}

        <div className="anketa-form-actions">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0 || submitting}
            className="ios-btn ios-btn-frost ios-btn-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            {t("Orqaga", language)}
          </button>

          {!isMetaStep ? (
            <button
              type="button"
              onClick={goNext}
              className="ios-btn ios-btn-primary ios-btn-sm"
            >
              {t("Keyingi", language)}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting || answeredCount === 0}
              className="ios-btn ios-btn-primary ios-btn-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("AI tahlil qilinmoqda, iltimos kuting...", language)}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {t("So'rovnomani yuborish", language)}
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
