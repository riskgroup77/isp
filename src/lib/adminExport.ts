import * as XLSX from 'xlsx';
import type { AdminStatisticsPayload, QuestionnaireStatistics, StatisticsSearchResponse, SurveyKind, UserStatisticsDetail } from './adminStatisticsApi';
import type { FastApiAdminStatistics } from './adminStatisticsApi';
import type { SafeUserProfile } from './auth';

function fmtPct(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `${v.toFixed(1)}%`;
}

function fmtN(v: number | undefined): string {
  return v !== undefined ? String(v) : '—';
}

function todaySlug(): string {
  return new Date().toISOString().slice(0, 10);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function writeWorkbook(wb: XLSX.WorkBook, filename: string): void {
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, filename);
}

function safeSheetName(name: string): string {
  return name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31);
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

function buildFastApiOverviewHtml(surveys: FastApiAdminStatistics): string {
  const rows = [
    ['Anketa 2025', surveys.anketa],
    ['Talaba so\'rovnomasi', surveys.student],
    ['Pedagog so\'rovnomasi', surveys.pedagog],
  ]
    .map(([title, data]) => {
      const d = data as FastApiAdminStatistics['anketa'];
      if (!d) return '';
      return `
        <tr>
          <td>${title}</td>
          <td align="center"><b>${d.total}</b></td>
          <td align="center">${d.zones.yashil}</td>
          <td align="center">${d.zones.sariq}</td>
          <td align="center">${d.zones.qizil}</td>
        </tr>`;
    })
    .join('');

  return `
    <h2>So'rovnomalar bo'yicha statistika</h2>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:12px;">
      <tr style="background:#f1f5f9;">
        <th>So'rovnoma</th><th>Jami</th><th>Yashil</th><th>Sariq</th><th>Qizil</th>
      </tr>
      ${rows}
    </table>
  `;
}

export function buildAdminReportHtml(
  stats: AdminStatisticsPayload,
  sections: {
    overview?: boolean;
    epidemiology?: boolean;
    questions?: boolean;
  } = { overview: true, epidemiology: true, questions: true }
): string {
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

export function buildFastApiReportHtml(surveys: FastApiAdminStatistics): string {
  return `
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"><title>Admin statistika hisoboti</title></head>
    <body style="font-family:Arial,sans-serif;padding:24px;color:#0f172a;">
      <h1>Intellektual Salomatlik — So'rovnoma statistikasi</h1>
      <p>Sana: ${new Date().toLocaleString('uz-UZ')}</p>
      ${buildFastApiOverviewHtml(surveys)}
    </body></html>
  `;
}

export function downloadAdminReportWord(stats: AdminStatisticsPayload): void {
  const html = buildAdminReportHtml(stats);
  const blob = new Blob(['\ufeff', html], {
    type: 'application/msword;charset=utf-8',
  });
  triggerDownload(blob, `admin-statistika-${todaySlug()}.doc`);
}

export function downloadFastApiAdminWord(surveys: FastApiAdminStatistics): void {
  const html = buildFastApiReportHtml(surveys);
  const blob = new Blob(['\ufeff', html], {
    type: 'application/msword;charset=utf-8',
  });
  triggerDownload(blob, `admin-so-rovnoma-statistika-${todaySlug()}.doc`);
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

export function printFastApiAdminReport(surveys: FastApiAdminStatistics): void {
  const html = buildFastApiReportHtml(surveys);
  const win = window.open('', '_blank', 'width=1024,height=768');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 400);
}

function overviewSheetData(stats: AdminStatisticsPayload): unknown[][] {
  const o = stats.overview;
  const r = stats.riskDistribution;
  return [
    ['Ko\'rsatkich', 'Qiymat'],
    ['Hisobot sanasi', new Date(stats.generatedAt).toLocaleString('uz-UZ')],
    ['Jami foydalanuvchilar', o.totalUsers],
    ['Bemorlar', o.totalPatients],
    ['Shifokorlar', o.totalDoctors],
    ['Adminlar', o.totalAdmins],
    ['Tasdiqlanmagan shifokorlar', o.unverifiedDoctors],
    ['Anketa javoblari', o.totalAnketaResponses],
    ['Noyob respondentlar', o.uniqueRespondents],
    ['O\'rtacha javoblar soni', o.avgAnsweredCount],
    ['O\'rtacha xavf foizi (%)', o.avgRiskFoizi ?? ''],
    ['To\'ldirish darajasi (%)', o.completionRate],
    ['Yashil zona', r.yashil],
    ['Sariq zona', r.sariq],
    ['Qizil zona', r.qizil],
    ['Noma\'lum zona', r.unknown],
  ];
}

function monthlySheetData(stats: AdminStatisticsPayload): unknown[][] {
  return [
    ['Oy', 'Topshirishlar soni'],
    ...stats.submissionsByMonth.map((row) => [row.month, row.count]),
  ];
}

function epidemiologySheetData(stats: AdminStatisticsPayload): unknown[][] {
  const header = [
    'Ko\'rsatkich',
    'Platforma Shahar Σ (%)',
    'Platforma Shahar Σ n',
    'Platforma Shahar erkak (%)',
    'Platforma Shahar ayol (%)',
    'Platforma Qishloq Σ (%)',
    'Platforma Qishloq Σ n',
    'Platforma Qishloq erkak (%)',
    'Platforma Qishloq ayol (%)',
    'Platforma Jami Σ (%)',
    'Platforma Jami Σ n',
    'Platforma Jami erkak (%)',
    'Platforma Jami ayol (%)',
    'Etalon Novosibirsk Σ (%)',
    'Etalon Novosibirsk erkak (%)',
    'Etalon Novosibirsk ayol (%)',
    'Etalon Boshqa shahar Σ (%)',
    'Etalon Boshqa shahar erkak (%)',
    'Etalon Boshqa shahar ayol (%)',
    'Etalon Qishloq Σ (%)',
    'Etalon Qishloq erkak (%)',
    'Etalon Qishloq ayol (%)',
  ];

  const rows = stats.epidemiology.indicators.map((ind) => [
    ind.label,
    ind.platform.shahar.sigma.value ?? '',
    ind.platform.shahar.sigma.n,
    ind.platform.shahar.erkak.value ?? '',
    ind.platform.shahar.ayol.value ?? '',
    ind.platform.qishloq.sigma.value ?? '',
    ind.platform.qishloq.sigma.n,
    ind.platform.qishloq.erkak.value ?? '',
    ind.platform.qishloq.ayol.value ?? '',
    ind.platform.jami.sigma.value ?? '',
    ind.platform.jami.sigma.n,
    ind.platform.jami.erkak.value ?? '',
    ind.platform.jami.ayol.value ?? '',
    ind.reference.novosibirsk.sigma ?? '',
    ind.reference.novosibirsk.erkak ?? '',
    ind.reference.novosibirsk.ayol ?? '',
    ind.reference.boshqaShaharlar.sigma ?? '',
    ind.reference.boshqaShaharlar.erkak ?? '',
    ind.reference.boshqaShaharlar.ayol ?? '',
    ind.reference.qishloq.sigma ?? '',
    ind.reference.qishloq.erkak ?? '',
    ind.reference.qishloq.ayol ?? '',
  ]);

  return [header, ...rows];
}

function questionsSummarySheetData(stats: AdminStatisticsPayload): unknown[][] {
  const header = ['Savol ID', 'Savol matni', 'Bo\'lim', 'Tur', 'Javoblar soni'];
  const rows = stats.questionStats
    .filter((q) => q.responseCount > 0)
    .map((q) => [q.id, q.text, q.section, q.type, q.responseCount]);
  return [header, ...rows];
}

function questionOptionsSheetData(stats: AdminStatisticsPayload): unknown[][] {
  const header = ['Savol ID', 'Savol matni', 'Variant', 'Soni', 'Foiz (%)'];
  const rows: unknown[][] = [];

  for (const q of stats.questionStats) {
    for (const opt of q.options) {
      if (opt.count <= 0) continue;
      rows.push([q.id, q.text, opt.label, opt.count, opt.percent]);
    }
  }

  return [header, ...rows];
}

function fastApiSurveysSheetData(surveys: FastApiAdminStatistics): unknown[][] {
  const header = ['So\'rovnoma', 'Jami javoblar', 'Yashil zona', 'Sariq zona', 'Qizil zona'];
  const items: [string, FastApiAdminStatistics['anketa']][] = [
    ['Anketa 2025', surveys.anketa],
    ['Talaba so\'rovnomasi', surveys.student],
    ['Pedagog so\'rovnomasi', surveys.pedagog],
  ];

  const rows = items.map(([title, data]) => [
    title,
    data?.total ?? 0,
    data?.zones.yashil ?? 0,
    data?.zones.sariq ?? 0,
    data?.zones.qizil ?? 0,
  ]);

  return [header, ...rows];
}

export function downloadAdminReportExcel(stats: AdminStatisticsPayload): void {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(overviewSheetData(stats)),
    safeSheetName('Umumiy')
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(monthlySheetData(stats)),
    safeSheetName('Oylar')
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(epidemiologySheetData(stats)),
    safeSheetName('Epidemiologiya')
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(questionsSummarySheetData(stats)),
    safeSheetName('Savollar')
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(questionOptionsSheetData(stats)),
    safeSheetName('Savol variantlari')
  );

  writeWorkbook(wb, `admin-statistika-${todaySlug()}.xlsx`);
}

export function downloadFastApiAdminExcel(surveys: FastApiAdminStatistics): void {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(fastApiSurveysSheetData(surveys)),
    safeSheetName('So\'rovnomalar')
  );
  writeWorkbook(wb, `admin-so-rovnoma-statistika-${todaySlug()}.xlsx`);
}

export function downloadQuestionStatisticsExcel(data: QuestionnaireStatistics): void {
  const header = ['Bo\'lim', 'Savol ID', 'Ko\'rsatkich', 'Tur', 'Javob', 'Soni (n)', 'Foiz (%)'];
  const rows: unknown[][] = [header];

  for (const section of data.boLimlar) {
    for (const question of section.savollar) {
      const dist = question.taqsimot.length > 0
        ? question.taqsimot
        : [{ javob: '—', soni: 0, foiz: 0 }];

      for (const row of dist) {
        rows.push([
          section.nomi,
          question.id,
          question.text,
          question.type,
          row.javob,
          row.soni,
          row.foiz,
        ]);
      }
    }
  }

  const summary = [
    [],
    ['Xulosa'],
    ['So\'rovnoma', data.title],
    ['Versiya', data.version],
    ['Jami javoblar', data.jamiJavoblar],
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([...rows, ...summary]),
    safeSheetName('Statistika')
  );
  writeWorkbook(wb, `${data.kind}_statistika.xlsx`);
}

export function downloadUsersExcel(users: SafeUserProfile[]): void {
  const header = [
    'ID',
    'Login',
    'Ism',
    'Rol',
    'Shahar/Tuman',
    'Yosh',
    'Jins',
    'Mutaxassislik',
    'Shifoxona',
    'Tasdiqlangan',
    'Ro\'yxat sanasi',
  ];
  const rows = users.map((u) => [
    u.id,
    u.login,
    u.ism,
    u.rol,
    u.shaharTuman ?? '',
    u.yosh ?? '',
    u.jins ?? '',
    u.mutaxassislik ?? '',
    u.shifoxona ?? '',
    u.rol === 'shifokor' ? (u.tasdiqlangan ? 'Ha' : 'Yo\'q') : '',
    u.yaratilganSana,
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([header, ...rows]),
    safeSheetName('Foydalanuvchilar')
  );
  writeWorkbook(wb, `foydalanuvchilar-${todaySlug()}.xlsx`);
}

export function downloadUserStatisticsExcel(
  data: UserStatisticsDetail,
  kind: SurveyKind
): void {
  const header = ['№', 'Bo\'lim', 'Savol ID', 'Savol', 'Javob'];
  const rows: unknown[][] = [header];
  let num = 1;

  for (const survey of data.soRovnomalar) {
    rows.push([]);
    rows.push(['Xavf foizi', survey.riskFoizi ?? '—', 'Zona', survey.zona ?? '—']);
    rows.push(['Klinik xulosa', survey.klinikXulosa ?? '—']);
    for (const section of survey.boLimlar) {
      for (const item of section.javoblar) {
        rows.push([num++, section.nomi, item.id, item.text, item.javob]);
      }
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Foydalanuvchi', data.foydalanuvchi.ism],
      ['Login', data.foydalanuvchi.login ?? ''],
      ['Yosh', data.foydalanuvchi.yosh ?? ''],
      ['Jins', data.foydalanuvchi.jins ?? ''],
      [],
      ...rows,
    ]),
    safeSheetName('Javoblar')
  );
  writeWorkbook(wb, `${kind}_${data.foydalanuvchi.id}_statistika.xlsx`);
}

export function downloadSearchStatisticsExcel(
  data: StatisticsSearchResponse,
  kind: SurveyKind
): void {
  const header = ['FISH', 'Xavf %', 'Zona', 'Klinik xulosa', 'Yosh', 'Jins'];
  const rows = data.natijalar.map((item) => [
    item.fish ?? '—',
    item.riskFoizi ?? '—',
    item.zona ?? '—',
    item.klinikXulosa ?? '—',
    item.foydalanuvchi?.yosh ?? '—',
    item.foydalanuvchi?.jins ?? '—',
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Jami natijalar', data.jami],
      [],
      header,
      ...rows,
    ]),
    safeSheetName('Qidiruv')
  );
  writeWorkbook(wb, `${kind}_qidiruv_statistika.xlsx`);
}
