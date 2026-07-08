import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Pencil, Save, Search } from 'lucide-react';
import type { AnketaQuestion } from '../../types';
import {
  fetchAnketaSchemaAdmin,
  saveAnketaSchema,
  updateAnketaQuestion,
} from '../../lib/anketaAdminApi';
import { t, type AppLanguage } from '../../lib/lang';
import { useToast } from '../ui/Toast';

interface AdminAnketaEditorProps {
  language?: AppLanguage;
}

export default function AdminAnketaEditor({ language = 'lotin' }: AdminAnketaEditorProps) {
  const { showToast } = useToast();
  const [questions, setQuestions] = useState<AnketaQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<{
    text: string;
    section: string;
    optionsText: string;
    description: string;
  }>({ text: '', section: '', optionsText: '', description: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const schema = await fetchAnketaSchemaAdmin();
      setQuestions(schema.questions);
      if (schema.questions.length > 0 && selectedId == null) {
        setSelectedId(schema.questions[0].id);
      }
    } catch (err) {
      console.error(err);
      showToast(t('Anketa savollarini yuklashda xatolik.', language), 'error');
    } finally {
      setLoading(false);
    }
  }, [language, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = questions.find((q) => q.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) return;
    setDraft({
      text: selected.text,
      section: selected.section,
      optionsText: selected.options.join('\n'),
      description: selected.description ?? '',
    });
  }, [selected]);

  const filtered = questions.filter((q) => {
    const qText = search.trim().toLowerCase();
    if (!qText) return true;
    return (
      String(q.id).includes(qText) ||
      q.text.toLowerCase().includes(qText) ||
      q.section.toLowerCase().includes(qText)
    );
  });

  const handleSaveQuestion = async () => {
    if (!selected) return;
    setSavingId(selected.id);
    try {
      const options = draft.optionsText
        .split('\n')
        .map((o) => o.trim())
        .filter(Boolean);
      const updated = await updateAnketaQuestion(selected.id, {
        text: draft.text.trim(),
        section: draft.section.trim(),
        options,
        description: draft.description.trim() || null,
      });
      setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
      showToast(t('Savol saqlandi.', language), 'success');
    } catch (err) {
      console.error(err);
      showToast(
        t(
          'Saqlashda xatolik. Mahalliy server ishlayotganini tekshiring yoki API deploy qiling.',
          language
        ),
        'error'
      );
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveAll = async () => {
    setSavingId(-1);
    try {
      const schema = await saveAnketaSchema({
        version: '2025',
        title: 'Anketa',
        totalQuestions: questions.length,
        questions,
      });
      setQuestions(schema.questions);
      showToast(t('Barcha savollar saqlandi.', language), 'success');
    } catch (err) {
      console.error(err);
      showToast(t('Anketani saqlashda xatolik.', language), 'error');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="admin-stat-loading">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
        <span>{t('Yuklanmoqda...', language)}</span>
      </div>
    );
  }

  return (
    <div className="admin-anketa-editor">
      <div className="admin-anketa-toolbar ios-card p-4 mb-3 flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
            <Pencil className="w-4 h-4 text-indigo-500" />
            {t('Anketa matnini tahrirlash', language)}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {t('Savol matni, bo\'lim va javob variantlarini o\'zgartiring.', language)}
          </p>
        </div>
        <button
          type="button"
          className="ios-btn ios-btn-secondary ios-btn-sm"
          onClick={() => void handleSaveAll()}
          disabled={savingId === -1}
        >
          {savingId === -1 ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          {t('Barchasini saqlash', language)}
        </button>
      </div>

      <div className="admin-anketa-layout">
        <div className="admin-anketa-list ios-card p-3">
          <div className="admin-stat-search-wrap mb-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('Savol qidirish...', language)}
              className="admin-stat-search w-full"
            />
          </div>
          <div className="admin-anketa-list-scroll">
            {filtered.map((q) => (
              <button
                key={q.id}
                type="button"
                className={`admin-anketa-list-item ${selectedId === q.id ? 'active' : ''}`}
                onClick={() => setSelectedId(q.id)}
              >
                <span className="admin-anketa-list-id">#{q.id}</span>
                <span className="admin-anketa-list-text">{q.text}</span>
              </button>
            ))}
          </div>
        </div>

        {selected ? (
          <div className="admin-anketa-form ios-card p-4 space-y-3">
            <p className="text-xs text-slate-500">
              #{selected.id} · {selected.type} · {selected.section}
            </p>
            <div>
              <label className="admin-stat-field-label">{t('Savol matni', language)}</label>
              <textarea
                rows={3}
                value={draft.text}
                onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
                className="admin-stat-search w-full"
              />
            </div>
            <div>
              <label className="admin-stat-field-label">{t('Bo\'lim', language)}</label>
              <input
                type="text"
                value={draft.section}
                onChange={(e) => setDraft((d) => ({ ...d, section: e.target.value }))}
                className="admin-stat-search w-full"
              />
            </div>
            <div>
              <label className="admin-stat-field-label">
                {t('Javob variantlari (har qator — bitta variant)', language)}
              </label>
              <textarea
                rows={6}
                value={draft.optionsText}
                onChange={(e) => setDraft((d) => ({ ...d, optionsText: e.target.value }))}
                className="admin-stat-search w-full font-mono text-xs"
                disabled={selected.options.length === 0 && selected.type === 'text'}
              />
            </div>
            <div>
              <label className="admin-stat-field-label">{t('Izoh (ixtiyoriy)', language)}</label>
              <input
                type="text"
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                className="admin-stat-search w-full"
              />
            </div>
            <button
              type="button"
              className="ios-btn ios-btn-primary ios-btn-sm"
              onClick={() => void handleSaveQuestion()}
              disabled={savingId === selected.id}
            >
              {savingId === selected.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {t('Saqlash', language)}
            </button>
          </div>
        ) : (
          <div className="admin-stat-empty ios-card p-6">{t('Savol tanlang.', language)}</div>
        )}
      </div>
    </div>
  );
}
