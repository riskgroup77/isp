import React from 'react';
import { Activity } from 'lucide-react';
import type { DiseaseRiskPrognosis } from '../../lib/diseaseRiskPrognosis';
import { t, type AppLanguage } from '../../lib/lang';

function zoneClass(zona: DiseaseRiskPrognosis['zona']): string {
  if (zona === 'yashil') return 'disease-risk-yashil';
  if (zona === 'qizil') return 'disease-risk-qizil';
  return 'disease-risk-sariq';
}

interface DiseaseRiskPrognosisPanelProps {
  prognoses: DiseaseRiskPrognosis[];
  language?: AppLanguage;
  compact?: boolean;
}

export default function DiseaseRiskPrognosisPanel({
  prognoses,
  language = 'lotin',
  compact = false,
}: DiseaseRiskPrognosisPanelProps) {
  if (!prognoses.length) return null;

  return (
    <div className={`disease-risk-panel ${compact ? 'disease-risk-panel-compact' : ''}`}>
      <h5 className="disease-risk-title">
        <Activity className="w-3.5 h-3.5" />
        {t('Kasallik risk prognozlari', language)}
      </h5>
      <p className="disease-risk-subtitle">
        {t(
          "Har bir kasallik turi bo'yicha taxminiy rivojlanish xavfi (profilaktik baholash, tibbiy tashxis emas).",
          language
        )}
      </p>
      <div className="disease-risk-grid">
        {prognoses.map((item) => (
          <div key={item.id} className={`disease-risk-card ${zoneClass(item.zona)}`}>
            <div className="disease-risk-card-head">
              <span className="disease-risk-name">{t(item.nomi, language)}</span>
              <span className="disease-risk-pct">{item.xavfFoizi}%</span>
            </div>
            {!compact && item.izoh && (
              <p className="disease-risk-note">{t(item.izoh, language)}</p>
            )}
            <div className="disease-risk-bar">
              <div className="disease-risk-bar-fill" style={{ width: `${item.xavfFoizi}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
