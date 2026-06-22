import type { AdminStatisticsPayload } from './adminStatisticsApi';

function fmtPct(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `${v.toFixed(1)}%`;
}

function fmtN(v: number | undefined): string {
  return v !== undefined ? String(v) : '—';
}

function buildOverviewHtml(stats: AdminStatisticsPayload): string {
  const o = stats.overview;
  const r = stats.riskDistribution;
  return `
    <h2>Umumiy ko'rsatkichlar</h2>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:12px;">
      <tr><td>Jami foydalanuvchilar</td><td><b>${o.totalUsers}</b></td></tr>
      <tr><td>Bemorlar</td><td><b>${o.totalPatients}</b></td></tr>
      <tr><td>Shifokorlar</td><td><b>${o.totalDoctors}</b></td></tr>
      <tr><td>Anketa javoblari</td><td><b>${o.totalAnketaResponses}</b></td></tr>
      <tr><td>Noyob respondentlar</td><td><b>${o.uniqueRespondents}</b></td></tr>
      <tr><td>O'rtacha javoblar soni</td><td><b>${o.avgAnsweredCount}</b></td></tr>
      <tr><td>O'rtacha xavf foizi</td><td><b>${o.avgRiskFoizi ?? '—'}%</b></td></tr>
      <tr><td>To'ldirish darajasi</td><td><b>${o.completionRate}%</b></td></tr>
      <tr><td>Yashil zona</td><td><b>${r.yashil}</b></td></tr>
      <tr><td>Sariq zona</td><td><b>${r.sariq}</b></td></tr>
      <tr><td>Qizil zona</td><td><b>${r.qizil}</b></td></tr>
    </table>
  `;
}

function buildEpidemiologyHtml(stats: AdminStatisticsPayload): string {
  const epi = stats.epidemiology;
  const ref = stats.referenceMeta;
  let rows = '';

  for (const ind of epi.indicators) {
    const pSh = ind.platform.shahar.sigma;
    const pQi = ind.platform.qishloq.sigma;
    const pJa = ind.platform.jami.sigma;
    const rNo = ind.reference.novosibirsk.sigma;
    const rBo = ind.reference.boshqaShaharlar.sigma;
    const rRu = ind.reference.qishloq.sigma;

    rows += `
      <tr>
        <td>${ind.label}</td>
        <td align="center">${fmtPct(pSh.value)}<br><small>n=${fmtN(pSh.n)}</small></td>
        <td align="center">${fmtPct(pQi.value)}<br><small>n=${fmtN(pQi.n)}</small></td>
        <td align="center">${fmtPct(pJa.value)}<br><small>n=${fmtN(pJa.n)}</small></td>
        <td align="center">${fmtPct(rNo)}</td>
        <td align="center">${fmtPct(rBo)}</td>
        <td align="center">${fmtPct(rRu)}</td>
      </tr>`;
  }

  return `
    <h2>${epi.title}</h2>
    <p><i>Platforma: ${epi.source}. Yosh guruhi filtri: ${epi.filterAgeGroup}. Etalon: ${ref.source}</i></p>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:11px;">
      <thead>
        <tr style="background:#f1f5f9;">
          <th rowspan="2">Ko'rsatkich</th>
          <th colspan="3">Platforma anketa (%)</th>
          <th colspan="3">Etalon ma'lumot — Novosibirsk (%)</th>
        </tr>
        <tr style="background:#f8fafc;">
          <th>Shahar</th><th>Qishloq</th><th>Jami</th>
          <th>Novosibirsk</th><th>Boshqa shaharlar</th><th>Qishloq</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildQuestionStatsHtml(stats: AdminStatisticsPayload, limit = 30): string {
  const top = stats.questionStats
    .filter((q) => q.responseCount > 0)
    .slice(0, limit);

  let blocks = '';
  for (const q of top) {
    const opts = q.options
      .filter((o) => o.count > 0)
      .slice(0, 8)
      .map((o) => `<tr><td>${o.label}</td><td align="center">${o.count}</td><td align="center">${o.percent}%</td></tr>`)
      .join('');
    blocks += `
      <h3>${q.id}. ${q.text}</h3>
      <p>Javoblar: ${q.responseCount} | Bo'lim: ${q.section}</p>
      <table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:11px;margin-bottom:16px;">
        <tr style="background:#f1f5f9;"><th>Variant</th><th>Soni</th><th>%</th></tr>
        ${opts}
      </table>`;
  }
  return `<h2>Savollar bo'yicha statistika (top ${limit})</h2>${blocks}`;
}

export function buildAdminReportHtml(stats: AdminStatisticsPayload, sections: {
  overview?: boolean;
  epidemiology?: boolean;
  questions?: boolean;
} = { overview: true, epidemiology: true, questions: true }): string {
  const parts: string[] = [];
  parts.push(`
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"><title>Admin statistika hisoboti</title></head><body style="font-family:Arial,sans-serif;padding:24px;color:#0f172a;">
    <h1>Intellektual Salomatlik — Admin statistika hisoboti</h1>
    <p>Sana: ${new Date(stats.generatedAt).toLocaleString('uz-UZ')}</p>
  `);
  if (sections.overview) parts.push(buildOverviewHtml(stats));
  if (sections.epidemiology) parts.push(buildEpidemiologyHtml(stats));
  if (sections.questions) parts.push(buildQuestionStatsHtml(stats));
  parts.push('</body></html>');
  return parts.join('\n');
}

export function downloadAdminReportWord(stats: AdminStatisticsPayload): void {
  const html = buildAdminReportHtml(stats);
  const blob = new Blob(['\ufeff', html], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `admin-statistika-${stats.generatedAt.slice(0, 10)}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

export function printAdminReport(stats: AdminStatisticsPayload): void {
  const html = buildAdminReportHtml(stats);
  const win = window.open('', '_blank', 'width=1024,height=768');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 400);
}
