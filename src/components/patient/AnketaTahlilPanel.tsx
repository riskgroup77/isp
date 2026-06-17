import React from 'react';
import { Activity, AlertTriangle, Heart, Sparkles } from 'lucide-react';
import type { AnketaTahlil } from '../../types';
import { t, type AppLanguage } from '../../lib/lang';
import { normalizeAnketaTahlil } from '../../lib/anketaTahlil';

interface AnketaTahlilPanelProps {
  tahlil: AnketaTahlil;
  aiXato?: string | null;
  language?: AppLanguage;
}

function zoneLabel(zona: AnketaTahlil['zona'], language: AppLanguage) {
  if (zona === 'yashil') return t('Yashil zona — past xavf', language);
  if (zona === 'sariq') return t('Sariq zona — o\'rtacha xavf', language);
  return t('Qizil zona — yuqori xavf', language);
}

function zoneClass(zona: AnketaTahlil['zona']) {
  if (zona === 'yashil') return 'anketa-zone-yashil';
  if (zona === 'sariq') return 'anketa-zone-sariq';
  return 'anketa-zone-qizil';
}

export default function AnketaTahlilPanel({
  tahlil: rawTahlil,
  aiXato,
  language = 'lotin',
}: AnketaTahlilPanelProps) {
  const tahlil = normalizeAnketaTahlil(rawTahlil);
  if (!tahlil) {
    return (
      <div className="anketa-alert anketa-alert-error">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>{t('Tahlil natijasi formati noto\'g\'ri yoki to\'liq emas.', language)}</span>
      </div>
    );
  }

  const shaxsiy = tahlil.shaxsiyTavsiyalar;
  const kritikOmillar = shaxsiy.kritikOmillar ?? [];
  const ovqatlanish = shaxsiy.ovqatlanish ?? [];
  const jismoniyMashq = shaxsiy.jismoniyMashq ?? [];
  const tibbiyReja = shaxsiy.tibbiyReja ?? [];
  const kutilayotganEffekt = shaxsiy.kutilayotganEffekt ?? [];

  return (
    <div className="anketa-tahlil-root">
      <div className="anketa-tahlil-hero">
        <div className="anketa-tahlil-score">
          <div className={`anketa-tahlil-ring ${zoneClass(tahlil.zona)}`}>
            <span className="anketa-tahlil-pct">{tahlil.riskFoizi}%</span>
            <span className="anketa-tahlil-pct-label">{t('Xavf', language)}</span>
          </div>
          <div>
            <h4 className="anketa-tahlil-title">
              <Heart className="w-4 h-4 inline mr-1 text-red-500" />
              {t('Anketa tahlil natijasi', language)}
            </h4>
            <p className={`anketa-tahlil-zone ${zoneClass(tahlil.zona)}`}>
              {zoneLabel(tahlil.zona, language)}
            </p>
            {tahlil.tmiKategoriya && (
              <p className="anketa-tahlil-meta">
                TMI: {tahlil.tmi?.toFixed(1) ?? '—'} ({t(tahlil.tmiKategoriya, language)})
              </p>
            )}
          </div>
        </div>
      </div>

      {aiXato && (
        <div className="anketa-alert anketa-alert-warn">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            {t('AI tahlil vaqtincha ishlamadi. Bazaviy tahlil ko\'rsatilmoqda:', language)} {aiXato}
          </span>
        </div>
      )}

      {tahlil.klinikXulosa && (
        <div className="anketa-tahlil-block">
          <h5 className="anketa-tahlil-block-title">
            <Sparkles className="w-3.5 h-3.5" />
            {t('Klinik xulosa', language)}
          </h5>
          <p className="anketa-tahlil-text">{t(tahlil.klinikXulosa, language)}</p>
        </div>
      )}

      {kritikOmillar.length > 0 && (
        <div className="anketa-tahlil-block">
          <h5 className="anketa-tahlil-block-title">{t('Kritik omillar', language)}</h5>
          <ul className="anketa-tahlil-list">
            {kritikOmillar.map((item, index) => (
              <li key={`kritik-${index}-${item}`}>{t(item, language)}</li>
            ))}
          </ul>
        </div>
      )}

      {tahlil.faktorlar && tahlil.faktorlar.length > 0 && (
        <div className="anketa-tahlil-block">
          <h5 className="anketa-tahlil-block-title">
            <Activity className="w-3.5 h-3.5" />
            {t('Asosiy xavf omillari', language)}
          </h5>
          <div className="anketa-faktor-grid">
            {tahlil.faktorlar.slice(0, 5).map((f, index) => (
              <div key={`faktor-${index}-${f.tasirKuchi}-${f.nomi}`} className="anketa-faktor-card">
                <div className="anketa-faktor-head">
                  <span>{t(f.nomi, language)}</span>
                  <span className="anketa-faktor-score">{f.tasirKuchi.toFixed(1)}</span>
                </div>
                <p>{t(f.tafsilot, language)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(ovqatlanish.length > 0 || jismoniyMashq.length > 0 || tibbiyReja.length > 0) && (
        <div className="anketa-tahlil-columns">
          {ovqatlanish.length > 0 && (
            <div className="anketa-tahlil-block">
              <h5 className="anketa-tahlil-block-title">{t('Ovqatlanish', language)}</h5>
              <ul className="anketa-tahlil-list">
                {ovqatlanish.map((item, index) => (
                  <li key={`ovqat-${index}-${item}`}>{t(item, language)}</li>
                ))}
              </ul>
            </div>
          )}
          {jismoniyMashq.length > 0 && (
            <div className="anketa-tahlil-block">
              <h5 className="anketa-tahlil-block-title">{t('Jismoniy mashq', language)}</h5>
              <ul className="anketa-tahlil-list">
                {jismoniyMashq.map((item, index) => (
                  <li key={`mashq-${index}-${item}`}>{t(item, language)}</li>
                ))}
              </ul>
            </div>
          )}
          {tibbiyReja.length > 0 && (
            <div className="anketa-tahlil-block">
              <h5 className="anketa-tahlil-block-title">{t('Tibbiy reja', language)}</h5>
              <ul className="anketa-tahlil-list">
                {tibbiyReja.map((item, index) => (
                  <li key={`reja-${index}-${item}`}>{t(item, language)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {kutilayotganEffekt.length > 0 && (
        <div className="anketa-tahlil-block anketa-tahlil-effect">
          <h5 className="anketa-tahlil-block-title">{t('Kutilayotgan effekt', language)}</h5>
          {kutilayotganEffekt.map((e, index) => (
            <p key={`effekt-${index}-${e.ozgarish}-${e.kamayadiganXavf}`}>
              {t(e.ozgarish, language)} — <strong>-{e.kamayadiganXavf}%</strong> {t('xavf', language)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
