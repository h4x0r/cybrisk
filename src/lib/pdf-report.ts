/**
 * CybRisk — Board-Ready PDF Report Generator
 *
 * Generates a comprehensive cyber risk assessment report suitable for:
 * - Board presentations to request security budget from CFO/CEO
 * - Cyber insurance underwriting submissions
 * - Regulatory compliance documentation
 *
 * Uses jsPDF for client-side PDF generation (no server dependency).
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AssessmentInputs, SimulationResults } from '@/lib/types';
import {
  PER_RECORD_COST,
  INDUSTRY_AVG_COST,
  COST_MODIFIERS,
  REGULATORY_EXPOSURE,
  TEF_BY_INDUSTRY,
  REVENUE_MIDPOINTS,
  EMPLOYEE_MULTIPLIERS,
} from '@/lib/lookup-tables';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BRAND = {
  primary: [0, 212, 255] as [number, number, number],    // Cyan
  dark: [6, 10, 24] as [number, number, number],          // Deep navy
  accent: [239, 68, 68] as [number, number, number],      // Crimson
  text: [30, 40, 60] as [number, number, number],         // Dark slate
  muted: [120, 140, 170] as [number, number, number],     // Grey-blue
  white: [255, 255, 255] as [number, number, number],
  green: [34, 197, 94] as [number, number, number],
};

const MARGIN = { left: 25, right: 25, top: 30, bottom: 35 };
const PAGE_WIDTH = 210; // A4 mm
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN.left - MARGIN.right;

// Footnote accumulator
let footnotes: { id: number; text: string; url?: string }[] = [];
let footnoteCounter = 0;

function addFootnote(text: string, url?: string): number {
  footnoteCounter++;
  footnotes.push({ id: footnoteCounter, text, url });
  return footnoteCounter;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
function fmtUSD(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function capitalize(s: string): string {
  return s
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function labelRevenue(band: string): string {
  const map: Record<string, string> = {
    under_50m: 'Under $50M',
    '50m_250m': '$50M - $250M',
    '250m_1b': '$250M - $1B',
    '1b_5b': '$1B - $5B',
    over_5b: 'Over $5B',
  };
  return map[band] || band;
}

function labelEmployees(band: string): string {
  const map: Record<string, string> = {
    under_250: 'Under 250',
    '250_1000': '250 - 1,000',
    '1000_5000': '1,000 - 5,000',
    '5000_25000': '5,000 - 25,000',
    over_25000: 'Over 25,000',
  };
  return map[band] || band;
}

function labelGeography(geo: string): string {
  const map: Record<string, string> = {
    us: 'United States',
    uk: 'United Kingdom',
    eu: 'European Union',
    hk: 'Hong Kong SAR',
    sg: 'Singapore',
    other: 'Other',
  };
  return map[geo] || geo;
}

function labelDataType(dt: string): string {
  const map: Record<string, string> = {
    customer_pii: 'Customer PII',
    employee_pii: 'Employee PII',
    payment_card: 'Payment Card Data',
    health_records: 'Health Records (PHI)',
    ip: 'Intellectual Property',
    financial: 'Financial Data',
  };
  return map[dt] || dt;
}

function labelThreat(t: string): string {
  const map: Record<string, string> = {
    ransomware: 'Ransomware',
    bec_phishing: 'BEC / Phishing',
    insider_threat: 'Insider Threat',
    third_party: 'Third-Party / Supply Chain',
    web_app_attack: 'Web Application Attack',
    system_intrusion: 'System Intrusion',
    lost_stolen: 'Lost / Stolen Devices',
  };
  return map[t] || t;
}

function labelIncidentHistory(h: string): string {
  const map: Record<string, string> = {
    '0': 'None',
    '1': '1 incident',
    '2_5': '2-5 incidents',
    '5_plus': '5+ incidents',
  };
  return map[h] || h;
}

function riskRatingColor(rating: string): [number, number, number] {
  switch (rating) {
    case 'LOW': return [34, 197, 94];
    case 'MODERATE': return [234, 179, 8];
    case 'HIGH': return [249, 115, 22];
    case 'CRITICAL': return [239, 68, 68];
    default: return BRAND.text;
  }
}

// ---------------------------------------------------------------------------
// Page helpers
// ---------------------------------------------------------------------------
function addPageHeader(doc: jsPDF, title: string) {
  const pageH = doc.internal.pageSize.getHeight();

  // Top rule
  doc.setDrawColor(...BRAND.primary);
  doc.setLineWidth(0.5);
  doc.line(MARGIN.left, 15, PAGE_WIDTH - MARGIN.right, 15);

  // Header text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.muted);
  doc.text('CYBRISK', MARGIN.left, 12);
  doc.text('CONFIDENTIAL', PAGE_WIDTH - MARGIN.right, 12, { align: 'right' });

  // Section title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...BRAND.text);
  doc.text(title, MARGIN.left, 26);

  // Footer
  const pageNum = doc.getNumberOfPages();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.muted);
  doc.text(
    `CybRisk Cyber Risk Assessment Report | Page ${pageNum}`,
    PAGE_WIDTH / 2,
    pageH - 12,
    { align: 'center' },
  );
  doc.setDrawColor(...BRAND.primary);
  doc.setLineWidth(0.3);
  doc.line(MARGIN.left, pageH - 16, PAGE_WIDTH - MARGIN.right, pageH - 16);
}

function ensureSpace(doc: jsPDF, needed: number, sectionTitle?: string): number {
  const pageH = doc.internal.pageSize.getHeight();
  const y = (doc as any).__currentY || MARGIN.top;

  if (y + needed > pageH - MARGIN.bottom) {
    doc.addPage();
    if (sectionTitle) addPageHeader(doc, sectionTitle);
    (doc as any).__currentY = MARGIN.top + 5;
    return (doc as any).__currentY;
  }
  return y;
}

function setY(doc: jsPDF, y: number) {
  (doc as any).__currentY = y;
}

function getY(doc: jsPDF): number {
  return (doc as any).__currentY || MARGIN.top;
}

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

function renderCoverPage(
  doc: jsPDF,
  inputs: AssessmentInputs,
  results: SimulationResults,
) {
  const pageH = doc.internal.pageSize.getHeight();

  // Background band
  doc.setFillColor(...BRAND.dark);
  doc.rect(0, 0, PAGE_WIDTH, 120, 'F');

  // Cyan accent line
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 120, PAGE_WIDTH, 2, 'F');

  // Logo area
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(...BRAND.primary);
  doc.text('CYBRISK', PAGE_WIDTH / 2, 50, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.white);
  doc.text('CYBER RISK POSTURE ASSESSMENT', PAGE_WIDTH / 2, 62, { align: 'center' });

  // Risk rating badge
  const rColor = riskRatingColor(results.riskRating);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...rColor);
  doc.text(`RISK RATING: ${results.riskRating}`, PAGE_WIDTH / 2, 85, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(180, 195, 220);
  doc.text(
    `Annualised Loss Expectancy: ${fmtUSD(results.ale.mean)}`,
    PAGE_WIDTH / 2,
    98,
    { align: 'center' },
  );

  // Company info
  let y = 140;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...BRAND.text);
  doc.text('PREPARED FOR', MARGIN.left, y);
  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Industry: ${capitalize(inputs.company.industry)}`, MARGIN.left, y); y += 7;
  doc.text(`Revenue Band: ${labelRevenue(inputs.company.revenueBand)}`, MARGIN.left, y); y += 7;
  doc.text(`Employees: ${labelEmployees(inputs.company.employees)}`, MARGIN.left, y); y += 7;
  doc.text(`Geography: ${labelGeography(inputs.company.geography)}`, MARGIN.left, y); y += 7;

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('REPORT DATE', MARGIN.left, y); y += 8;
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  }), MARGIN.left, y);

  // Confidentiality notice
  y = pageH - 55;
  doc.setDrawColor(...BRAND.accent);
  doc.setLineWidth(0.5);
  doc.line(MARGIN.left, y, PAGE_WIDTH - MARGIN.right, y);
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.accent);
  doc.text('CONFIDENTIAL', MARGIN.left, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.muted);
  doc.text(
    'This report contains proprietary risk analysis. Distribution is restricted to authorised personnel. ' +
    'The analysis herein is based on statistical modelling and should be used for informational and decision-support ' +
    'purposes only. It does not constitute financial, legal, or insurance advice.',
    MARGIN.left,
    y,
    { maxWidth: CONTENT_WIDTH },
  );
}

function renderExecutiveSummary(doc: jsPDF, inputs: AssessmentInputs, results: SimulationResults) {
  doc.addPage();
  addPageHeader(doc, 'EXECUTIVE SUMMARY');
  let y = MARGIN.top + 5;

  // Intro paragraph
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.text);
  const revenue = REVENUE_MIDPOINTS[inputs.company.revenueBand];
  const intro =
    `This report presents the results of a quantitative cyber risk assessment for a ` +
    `${capitalize(inputs.company.industry)} sector organisation with annual revenue in the ` +
    `${labelRevenue(inputs.company.revenueBand)} range, operating in ${labelGeography(inputs.company.geography)}. ` +
    `The analysis uses Monte Carlo simulation (10,000 iterations) based on the Open FAIR` +
    `\u00B9 model to estimate Annualised Loss Expectancy (ALE) and identify key risk drivers.`;
  const fnFair = addFootnote(
    'Open FAIR (Factor Analysis of Information Risk) — The Open Group Standard (O-RA), 2017',
    'https://www.opengroup.org/certifications/openfair',
  );
  doc.text(intro, MARGIN.left, y, { maxWidth: CONTENT_WIDTH });
  y += 30;

  // Key metrics box
  doc.setFillColor(240, 245, 255);
  doc.roundedRect(MARGIN.left, y, CONTENT_WIDTH, 52, 3, 3, 'F');
  doc.setDrawColor(...BRAND.primary);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN.left, y, CONTENT_WIDTH, 52, 3, 3, 'S');

  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.muted);
  doc.text('KEY FINANCIAL METRICS', MARGIN.left + 5, y);
  y += 10;

  // Metrics in 3 columns
  const col1 = MARGIN.left + 5;
  const col2 = MARGIN.left + 55;
  const col3 = MARGIN.left + 110;

  doc.setFontSize(8);
  doc.setTextColor(...BRAND.muted);
  doc.text('Annualised Loss Expectancy', col1, y);
  doc.text('Probable Maximum Loss (95th)', col2, y);
  doc.text('Optimal Security Investment', col3, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...BRAND.primary);
  doc.text(fmtUSD(results.ale.mean), col1, y);
  doc.setTextColor(...BRAND.accent);
  doc.text(fmtUSD(results.ale.p95), col2, y);
  doc.setTextColor(...BRAND.green);
  doc.text(fmtUSD(results.gordonLoebSpend), col3, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.muted);
  doc.text('FAIR Monte Carlo mean', col1, y);
  doc.text('Worst-case at 95% confidence', col2, y);
  doc.text('Gordon-Loeb model', col3, y);

  y += 15;
  setY(doc, y);

  // Risk rating explanation
  y = getY(doc) + 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.text);
  doc.text('Risk Rating Assessment', MARGIN.left, y);
  y += 7;

  const rColor = riskRatingColor(results.riskRating);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...rColor);
  doc.text(results.riskRating, MARGIN.left, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.text);
  const alePct = (results.ale.mean / revenue * 100).toFixed(2);
  doc.text(
    `  (ALE represents ${alePct}% of estimated annual revenue)`,
    MARGIN.left + doc.getTextWidth(results.riskRating) + 5,
    y,
  );
  y += 8;

  doc.setFontSize(8);
  doc.setTextColor(...BRAND.muted);
  const ratingScale =
    'Rating scale: LOW (<1% revenue) | MODERATE (1-3%) | HIGH (3-7%) | CRITICAL (>7%)';
  doc.text(ratingScale, MARGIN.left, y);
  y += 12;

  // ALE distribution table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.text);
  doc.text('Loss Distribution Statistics', MARGIN.left, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value', 'Description']],
    body: [
      ['Mean (ALE)', fmtUSD(results.ale.mean), 'Average expected annual loss across all simulated scenarios'],
      ['Median', fmtUSD(results.ale.median), '50th percentile — half of scenarios fall below this value'],
      ['10th Percentile', fmtUSD(results.ale.p10), 'Best-case scenario (10% chance of being lower)'],
      ['90th Percentile', fmtUSD(results.ale.p90), 'Severe scenario (10% chance of exceeding this)'],
      ['95th Percentile (PML)', fmtUSD(results.ale.p95), 'Probable Maximum Loss — key metric for insurance underwriting'],
      ['Gordon-Loeb Spend', fmtUSD(results.gordonLoebSpend), 'Economically optimal annual security investment'],
    ],
    theme: 'grid',
    headStyles: { fillColor: BRAND.dark, textColor: BRAND.primary, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: BRAND.text },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    margin: { left: MARGIN.left, right: MARGIN.right },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35 },
      1: { cellWidth: 30 },
    },
  });

  setY(doc, (doc as any).lastAutoTable.finalY + 10);

  // Industry benchmark
  y = getY(doc);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.text);
  doc.text('Industry Benchmark', MARGIN.left, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value']],
    body: [
      ['Your Estimated ALE', fmtUSD(results.industryBenchmark.yourAle)],
      [
        `${capitalize(inputs.company.industry)} Industry Median Breach Cost`,
        fmtUSD(results.industryBenchmark.industryMedian),
      ],
      ['Percentile Rank', `${results.industryBenchmark.percentileRank}th percentile`],
    ],
    theme: 'grid',
    headStyles: { fillColor: BRAND.dark, textColor: BRAND.primary, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: BRAND.text },
    margin: { left: MARGIN.left, right: MARGIN.right },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 70 },
    },
  });

  setY(doc, (doc as any).lastAutoTable.finalY + 5);
}

function renderInputParameters(doc: jsPDF, inputs: AssessmentInputs) {
  doc.addPage();
  addPageHeader(doc, 'ASSESSMENT PARAMETERS');
  let y = MARGIN.top + 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.text);
  doc.text(
    'The following parameters were used as inputs to the Monte Carlo simulation. All values were ' +
    'provided by the organisation during the assessment process.',
    MARGIN.left, y, { maxWidth: CONTENT_WIDTH },
  );
  y += 14;

  // Organisation Profile
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Organisation Profile', MARGIN.left, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    body: [
      ['Industry Sector', capitalize(inputs.company.industry)],
      ['Annual Revenue Band', labelRevenue(inputs.company.revenueBand)],
      ['Revenue Midpoint (for calculation)', fmtUSD(REVENUE_MIDPOINTS[inputs.company.revenueBand])],
      ['Employee Count', labelEmployees(inputs.company.employees)],
      ['Attack Surface Multiplier', `${EMPLOYEE_MULTIPLIERS[inputs.company.employees]}x`],
      ['Primary Geography', labelGeography(inputs.company.geography)],
      ['Regulatory Framework', REGULATORY_EXPOSURE[inputs.company.geography].framework],
      ['Max Regulatory Fine', fmtPct(REGULATORY_EXPOSURE[inputs.company.geography].maxPctRevenue) + ' of revenue'],
    ],
    theme: 'grid',
    bodyStyles: { fontSize: 8, textColor: BRAND.text },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    margin: { left: MARGIN.left, right: MARGIN.right },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55, textColor: BRAND.muted },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Data Profile
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.text);
  doc.text('Data Profile', MARGIN.left, y);
  y += 3;

  const dataRows = inputs.data.dataTypes.map((dt) => [
    labelDataType(dt),
    `$${PER_RECORD_COST[dt as keyof typeof PER_RECORD_COST]}/record`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Data Type at Risk', 'Per-Record Breach Cost']],
    body: dataRows,
    theme: 'grid',
    headStyles: { fillColor: BRAND.dark, textColor: BRAND.primary, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: BRAND.text },
    margin: { left: MARGIN.left, right: MARGIN.right },
  });

  y = (doc as any).lastAutoTable.finalY + 5;

  autoTable(doc, {
    startY: y,
    body: [
      ['Total Records at Risk', inputs.data.recordCount.toLocaleString()],
      ['Cloud Infrastructure', `${inputs.data.cloudPercentage}%`],
    ],
    theme: 'grid',
    bodyStyles: { fontSize: 8, textColor: BRAND.text },
    margin: { left: MARGIN.left, right: MARGIN.right },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55, textColor: BRAND.muted },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Security Controls
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.text);
  doc.text('Security Controls', MARGIN.left, y);
  y += 3;

  const controlLabels: Record<string, { label: string; modifier: string }> = {
    securityTeam: { label: 'Dedicated Security Team / vCISO', modifier: `${(COST_MODIFIERS.security_team * 100).toFixed(0)}%` },
    irPlan: { label: 'Incident Response Plan', modifier: `${(COST_MODIFIERS.ir_plan * 100).toFixed(0)}%` },
    aiAutomation: { label: 'AI / Automation in Security', modifier: `${(COST_MODIFIERS.ai_automation * 100).toFixed(0)}%` },
    mfa: { label: 'Multi-Factor Authentication', modifier: `${(COST_MODIFIERS.mfa * 100).toFixed(0)}%` },
    pentest: { label: 'Regular Penetration Testing', modifier: `${(COST_MODIFIERS.pentest * 100).toFixed(0)}%` },
    cyberInsurance: { label: 'Cyber Insurance Policy', modifier: '-50% secondary loss' },
  };

  const controlRows = Object.entries(inputs.controls).map(([key, enabled]) => {
    const ctrl = controlLabels[key];
    return [
      ctrl.label,
      enabled ? 'Yes' : 'No',
      ctrl.modifier,
      enabled ? 'Applied' : 'Not applied',
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['Control', 'Status', 'Cost Modifier', 'Effect']],
    body: controlRows,
    theme: 'grid',
    headStyles: { fillColor: BRAND.dark, textColor: BRAND.primary, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: BRAND.text },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    margin: { left: MARGIN.left, right: MARGIN.right },
    didParseCell: (data) => {
      if (data.column.index === 1 && data.section === 'body') {
        const val = data.cell.raw as string;
        if (val === 'Yes') {
          data.cell.styles.textColor = BRAND.green;
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = BRAND.accent;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Threat Landscape
  y = ensureSpace(doc, 50, 'ASSESSMENT PARAMETERS');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.text);
  doc.text('Threat Landscape', MARGIN.left, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    body: [
      ['Top Concerns', inputs.threats.topConcerns.map(labelThreat).join(', ')],
      ['Previous Incidents (3 years)', labelIncidentHistory(inputs.threats.previousIncidents)],
    ],
    theme: 'grid',
    bodyStyles: { fontSize: 8, textColor: BRAND.text },
    margin: { left: MARGIN.left, right: MARGIN.right },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55, textColor: BRAND.muted },
    },
  });

  setY(doc, (doc as any).lastAutoTable.finalY + 5);
}

function renderKeyDrivers(doc: jsPDF, results: SimulationResults) {
  doc.addPage();
  addPageHeader(doc, 'KEY RISK DRIVERS');
  let y = MARGIN.top + 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.text);
  doc.text(
    'The following factors were identified as the primary drivers of the organisation\'s cyber risk exposure. ' +
    'Each driver is ranked by its impact on the overall risk profile.',
    MARGIN.left, y, { maxWidth: CONTENT_WIDTH },
  );
  y += 14;

  const driverRows = results.keyDrivers.map((d) => [
    d.factor,
    d.impact,
    d.description,
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Risk Factor', 'Impact', 'Description']],
    body: driverRows,
    theme: 'grid',
    headStyles: { fillColor: BRAND.dark, textColor: BRAND.primary, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: BRAND.text },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    margin: { left: MARGIN.left, right: MARGIN.right },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 32 },
      1: { cellWidth: 18 },
    },
    didParseCell: (data) => {
      if (data.column.index === 1 && data.section === 'body') {
        const val = data.cell.raw as string;
        if (val === 'HIGH') data.cell.styles.textColor = BRAND.accent;
        else if (val === 'MEDIUM') data.cell.styles.textColor = [234, 179, 8];
        else data.cell.styles.textColor = BRAND.green;
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  setY(doc, (doc as any).lastAutoTable.finalY + 15);

  // Recommendations
  y = getY(doc);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...BRAND.text);
  doc.text('RECOMMENDATIONS', MARGIN.left, y);
  y += 3;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.text);
  doc.text(
    'Based on the risk analysis, the following actions are recommended in priority order:',
    MARGIN.left, y, { maxWidth: CONTENT_WIDTH },
  );
  y += 10;

  const recRows = results.recommendations.map((r, i) => [
    `${i + 1}`,
    r,
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Recommendation']],
    body: recRows,
    theme: 'grid',
    headStyles: { fillColor: BRAND.dark, textColor: BRAND.primary, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: BRAND.text },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    margin: { left: MARGIN.left, right: MARGIN.right },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
    },
  });

  setY(doc, (doc as any).lastAutoTable.finalY + 10);

  // Budget justification box
  y = ensureSpace(doc, 45, 'KEY RISK DRIVERS');
  y = getY(doc);
  doc.setFillColor(255, 245, 235);
  doc.setDrawColor(...BRAND.accent);
  doc.setLineWidth(0.5);
  doc.roundedRect(MARGIN.left, y, CONTENT_WIDTH, 38, 3, 3, 'FD');

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.accent);
  doc.text('BUDGET JUSTIFICATION', MARGIN.left + 5, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.text);
  const budgetText =
    `The Gordon-Loeb model indicates an optimal annual security investment of ${fmtUSD(results.gordonLoebSpend)}. ` +
    `This represents the point of maximum return on security spending — investment beyond this threshold ` +
    `yields diminishing marginal returns. Given a mean ALE of ${fmtUSD(results.ale.mean)} and a worst-case ` +
    `exposure of ${fmtUSD(results.ale.p95)} (95th percentile), the recommended investment provides a ` +
    `${(results.ale.mean / results.gordonLoebSpend).toFixed(1)}:1 risk-to-investment ratio.`;
  doc.text(budgetText, MARGIN.left + 5, y, { maxWidth: CONTENT_WIDTH - 10 });

  setY(doc, y + 28);
}

function renderMethodology(doc: jsPDF, inputs: AssessmentInputs) {
  doc.addPage();
  addPageHeader(doc, 'METHODOLOGY & ALGORITHMS');
  let y = MARGIN.top + 5;

  // FAIR Model
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.text);
  doc.text('1. Open FAIR Risk Quantification Framework', MARGIN.left, y);
  y += 7;

  const fnFair2 = addFootnote(
    'Freund, J. & Jones, J. (2015). Measuring and Managing Information Risk: A FAIR Approach. Butterworth-Heinemann.',
    'https://www.fairinstitute.org/',
  );
  const fnOpenGroup = addFootnote(
    'The Open Group. (2017). Open FAIR Risk Analysis (O-RA) Standard, C13G.',
    'https://publications.opengroup.org/c13g',
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.text);
  const fairText =
    `This assessment uses the Open FAIR (Factor Analysis of Information Risk) taxonomy\u00B2\u00B3 ` +
    `to decompose cyber risk into quantifiable components:\n\n` +
    `  Risk = Loss Event Frequency (LEF) \u00D7 Loss Magnitude (LM)\n` +
    `  LEF  = Threat Event Frequency (TEF) \u00D7 Vulnerability (Vuln)\n` +
    `  LM   = Primary Loss (PL) + Secondary Loss (SL)\n\n` +
    `Each component is modelled as a probability distribution and sampled via Monte Carlo simulation.`;
  doc.text(fairText, MARGIN.left, y, { maxWidth: CONTENT_WIDTH });
  y += 38;

  // Monte Carlo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('2. Monte Carlo Simulation', MARGIN.left, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const mcText =
    'The simulation executes 10,000 independent iterations. In each iteration:\n\n' +
    '  1. TEF is sampled from a PERT distribution calibrated to the organisation\'s industry\n' +
    '  2. Vulnerability is sampled from a PERT distribution adjusted by active security controls\n' +
    '  3. LEF = TEF \u00D7 Vuln determines whether a loss event occurs\n' +
    '  4. Primary Loss is computed from per-record costs \u00D7 log-normally sampled breach size\n' +
    '  5. Secondary Loss includes regulatory fines, litigation, reputation, and notification costs\n' +
    '  6. Annual Loss = LEF \u00D7 (PL + SL)\n\n' +
    'The resulting 10,000 loss values form the empirical loss distribution from which all ' +
    'statistics (mean, median, percentiles) are derived.';
  doc.text(mcText, MARGIN.left, y, { maxWidth: CONTENT_WIDTH });
  y += 45;

  // Distributions
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('3. Statistical Distributions Used', MARGIN.left, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    head: [['Distribution', 'Used For', 'Parameters']],
    body: [
      ['PERT (Beta)', 'TEF, Vulnerability, Secondary loss factors', 'min, mode, max; \u03BB=4 (standard shape)'],
      ['Log-Normal', 'Records compromised per incident', '\u03BC=ln(records\u00D70.1), \u03C3=1.0'],
      ['Beta (via Gamma)', 'PERT sampling kernel', 'Marsaglia-Tsang for Gamma, Ahrens-Dieter boost for shape<1'],
      ['Box-Muller Normal', 'Gaussian samples for log-normal', 'Standard normal N(0,1)'],
    ],
    theme: 'grid',
    headStyles: { fillColor: BRAND.dark, textColor: BRAND.primary, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: BRAND.text },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    margin: { left: MARGIN.left, right: MARGIN.right },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // TEF Parameters table
  y = ensureSpace(doc, 50, 'METHODOLOGY & ALGORITHMS');
  y = getY(doc);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.text);
  doc.text('4. Threat Event Frequency Parameters', MARGIN.left, y);
  y += 3;

  const fnDBIR = addFootnote(
    'Verizon. (2025). Data Breach Investigations Report (DBIR). Verizon Enterprise Solutions.',
    'https://www.verizon.com/business/resources/reports/dbir/',
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    `TEF parameters are calibrated from DBIR incident rates\u2074 by industry sector:`,
    MARGIN.left, y,
  );
  y += 5;

  const tef = TEF_BY_INDUSTRY[inputs.company.industry];
  autoTable(doc, {
    startY: y,
    head: [['Parameter', 'Value', 'Source']],
    body: [
      ['Industry', capitalize(inputs.company.industry), 'User input'],
      ['TEF Min (events/year)', tef.min.toString(), 'DBIR 2025 calibration'],
      ['TEF Mode (events/year)', tef.mode.toString(), 'DBIR 2025 calibration'],
      ['TEF Max (events/year)', tef.max.toString(), 'DBIR 2025 calibration'],
      ['Employee Multiplier', `${EMPLOYEE_MULTIPLIERS[inputs.company.employees]}x`, 'Attack surface scaling'],
    ],
    theme: 'grid',
    headStyles: { fillColor: BRAND.dark, textColor: BRAND.primary, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: BRAND.text },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    margin: { left: MARGIN.left, right: MARGIN.right },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45 },
      1: { cellWidth: 35 },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Gordon-Loeb
  y = ensureSpace(doc, 45, 'METHODOLOGY & ALGORITHMS');
  y = getY(doc);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.text);
  doc.text('5. Gordon-Loeb Optimal Security Investment Model', MARGIN.left, y);
  y += 7;

  const fnGL = addFootnote(
    'Gordon, L.A. & Loeb, M.P. (2002). "The Economics of Information Security Investment." ACM TISSEC, 5(4), 438-457.',
    'https://doi.org/10.1145/581271.581274',
  );
  const fnDeloitte = addFootnote(
    'Deloitte & IANS Research. (2024). "CISO Benchmark: Security Budget Analysis." 5% revenue cap benchmark.',
    'https://www.iansresearch.com/',
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const glText =
    `The Gordon-Loeb model\u2075 establishes that a firm\'s optimal security investment ` +
    `should not exceed (1/e) \u00D7 v \u00D7 L, where v is the vulnerability probability and ` +
    `L is the expected annual loss.\n\n` +
    `  Optimal Spend = min(0.37 \u00D7 vulnerability \u00D7 ALE, 5% \u00D7 revenue)\n\n` +
    `The 5% revenue cap reflects industry benchmarks for maximum security spend as a percentage of revenue\u2076. ` +
    `Investment beyond the optimal point yields diminishing marginal returns in risk reduction.`;
  doc.text(glText, MARGIN.left, y, { maxWidth: CONTENT_WIDTH });
  y += 35;

  // Vulnerability
  y = ensureSpace(doc, 45, 'METHODOLOGY & ALGORITHMS');
  y = getY(doc);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('6. Vulnerability Calculation', MARGIN.left, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const vulnText =
    `Base vulnerability rate is ${(0.30 * 100).toFixed(0)}% (calibrated from DBIR data — ` +
    `the proportion of threat events that result in confirmed breaches). This is adjusted ` +
    `multiplicatively by each active security control:\n\n` +
    `  IR Plan: ${(COST_MODIFIERS.ir_plan * 100).toFixed(0)}% | AI/Automation: ${(COST_MODIFIERS.ai_automation * 100).toFixed(0)}% | ` +
    `Security Team: ${(COST_MODIFIERS.security_team * 100).toFixed(0)}% | MFA: ${(COST_MODIFIERS.mfa * 100).toFixed(0)}% | ` +
    `Pen Testing: ${(COST_MODIFIERS.pentest * 100).toFixed(0)}%\n\n` +
    `The adjusted vulnerability is clamped to [1%, 99%] and sampled via PERT with ` +
    `min=0.5\u00D7adjusted, mode=adjusted, max=min(2\u00D7adjusted, 0.99).`;
  doc.text(vulnText, MARGIN.left, y, { maxWidth: CONTENT_WIDTH });

  setY(doc, y + 35);
}

function renderDataSources(doc: jsPDF, inputs: AssessmentInputs) {
  doc.addPage();
  addPageHeader(doc, 'DATA SOURCES & REFERENCES');
  let y = MARGIN.top + 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.text);
  doc.text(
    'All actuarial data, cost figures, and calibration parameters used in this assessment are derived from ' +
    'peer-reviewed research and authoritative industry reports. Sources are listed below with full citations.',
    MARGIN.left, y, { maxWidth: CONTENT_WIDTH },
  );
  y += 15;

  // Primary Data Sources
  const fnIBM = addFootnote(
    'IBM Security. (2025). "Cost of a Data Breach Report 2025." Ponemon Institute.',
    'https://www.ibm.com/reports/data-breach',
  );
  const fnNetDil = addFootnote(
    'NetDiligence. (2025). "Cyber Claims Study 2025." NetDiligence.',
    'https://netdiligence.com/cyber-claims-study/',
  );
  const fnDBIR2 = addFootnote(
    'Verizon. (2025). "Data Breach Investigations Report (DBIR) 2025."',
    'https://www.verizon.com/business/resources/reports/dbir/',
  );
  const fnArxiv = addFootnote(
    'Eling, M. & Jung, K. (2022). "Cyber risk and insurance: A review." arXiv:2202.10189.',
    'https://arxiv.org/abs/2202.10189',
  );

  autoTable(doc, {
    startY: y,
    head: [['Source', 'Data Used', 'Year']],
    body: [
      ['IBM Cost of a Data Breach Report', 'Per-record breach costs, industry average costs, security control modifiers', '2025'],
      ['Verizon DBIR', 'Attack pattern frequencies, threat event frequency calibration, base vulnerability rate', '2025'],
      ['NetDiligence Cyber Claims Study', 'Claim severity distributions, incident cost by revenue band', '2025'],
      ['Open FAIR Standard (The Open Group)', 'Risk decomposition taxonomy (TEF, Vuln, LEF, PL, SL)', '2017'],
      ['Gordon & Loeb (ACM TISSEC)', 'Optimal security investment model (1/e coefficient)', '2002'],
      ['Deloitte / IANS Research', 'Security spend as % of revenue benchmarks (5% cap)', '2024'],
      ['Eling & Jung (arXiv)', 'Cyber risk distribution modelling, extreme loss calibration', '2022'],
      ['GDPR / UK GDPR / PDPO / PDPA', 'Regulatory fine exposure by jurisdiction', 'Current'],
    ],
    theme: 'grid',
    headStyles: { fillColor: BRAND.dark, textColor: BRAND.primary, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: BRAND.text },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    margin: { left: MARGIN.left, right: MARGIN.right },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45 },
      2: { cellWidth: 15 },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 15;

  // Industry cost table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.text);
  doc.text('Industry Average Breach Costs (IBM 2025)', MARGIN.left, y);
  y += 3;

  const industryRows = Object.entries(INDUSTRY_AVG_COST)
    .sort(([, a], [, b]) => b - a)
    .map(([industry, cost]) => {
      const isSelected = industry === inputs.company.industry;
      return [
        isSelected ? `\u25B6 ${capitalize(industry)}` : capitalize(industry),
        `$${cost.toFixed(2)}M`,
      ];
    });

  autoTable(doc, {
    startY: y,
    head: [['Industry', 'Avg. Breach Cost (USD)']],
    body: industryRows,
    theme: 'grid',
    headStyles: { fillColor: BRAND.dark, textColor: BRAND.primary, fontSize: 7, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7, textColor: BRAND.text },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    margin: { left: MARGIN.left, right: MARGIN.right },
    columnStyles: {
      0: { cellWidth: 50 },
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const text = String(data.cell.raw);
        if (text.startsWith('\u25B6')) {
          data.cell.styles.textColor = BRAND.primary;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 15;

  // Per-record costs
  y = ensureSpace(doc, 50, 'DATA SOURCES & REFERENCES');
  y = getY(doc);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.text);
  doc.text('Per-Record Breach Costs by Data Type (IBM 2025)', MARGIN.left, y);
  y += 3;

  const recordRows = Object.entries(PER_RECORD_COST).map(([dt, cost]) => [
    labelDataType(dt),
    `$${cost}`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Data Type', 'Cost Per Record (USD)']],
    body: recordRows,
    theme: 'grid',
    headStyles: { fillColor: BRAND.dark, textColor: BRAND.primary, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: BRAND.text },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    margin: { left: MARGIN.left, right: MARGIN.right },
  });

  setY(doc, (doc as any).lastAutoTable.finalY + 10);
}

function renderFootnotes(doc: jsPDF) {
  doc.addPage();
  addPageHeader(doc, 'FOOTNOTES & REFERENCES');
  let y = MARGIN.top + 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.text);

  // Deduplicate footnotes by text
  const seen = new Map<string, number>();
  const uniqueFootnotes: typeof footnotes = [];
  for (const fn of footnotes) {
    if (!seen.has(fn.text)) {
      seen.set(fn.text, fn.id);
      uniqueFootnotes.push(fn);
    }
  }

  for (const fn of uniqueFootnotes) {
    y = ensureSpace(doc, 15, 'FOOTNOTES & REFERENCES');
    y = getY(doc);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.primary);
    doc.text(`[${fn.id}]`, MARGIN.left, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND.text);
    doc.text(fn.text, MARGIN.left + 10, y, { maxWidth: CONTENT_WIDTH - 10 });
    y += 5;

    if (fn.url) {
      doc.setTextColor(0, 100, 200);
      doc.textWithLink(fn.url, MARGIN.left + 10, y, { url: fn.url });
      y += 5;
    }

    y += 4;
    setY(doc, y);
  }

  // Disclaimer
  y = ensureSpace(doc, 40, 'FOOTNOTES & REFERENCES');
  y = getY(doc) + 10;

  doc.setDrawColor(...BRAND.muted);
  doc.setLineWidth(0.3);
  doc.line(MARGIN.left, y, PAGE_WIDTH - MARGIN.right, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.muted);
  doc.text('DISCLAIMER', MARGIN.left, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.text(
    'This report is generated using statistical modelling techniques and publicly available actuarial data. ' +
    'The results are estimates based on the parameters provided and should be used for informational and ' +
    'decision-support purposes only. Actual losses may vary significantly from modelled estimates. ' +
    'This report does not constitute financial, legal, or insurance advice. The authors and CybRisk accept ' +
    'no liability for decisions made based on this analysis. Organisations should consult qualified ' +
    'cyber security, legal, and insurance professionals for specific guidance.',
    MARGIN.left, y, { maxWidth: CONTENT_WIDTH },
  );

  setY(doc, y + 25);
}

function renderInsuranceAppendix(doc: jsPDF, inputs: AssessmentInputs, results: SimulationResults) {
  doc.addPage();
  addPageHeader(doc, 'APPENDIX: INSURANCE UNDERWRITING DATA');
  let y = MARGIN.top + 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.text);
  doc.text(
    'This appendix provides structured data specifically formatted for cyber insurance ' +
    'underwriting submissions. All values are derived from the Monte Carlo simulation.',
    MARGIN.left, y, { maxWidth: CONTENT_WIDTH },
  );
  y += 14;

  // Risk Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Risk Summary for Underwriting', MARGIN.left, y);
  y += 3;

  const revenue = REVENUE_MIDPOINTS[inputs.company.revenueBand];
  autoTable(doc, {
    startY: y,
    body: [
      ['Industry Sector', capitalize(inputs.company.industry)],
      ['Revenue Band', labelRevenue(inputs.company.revenueBand)],
      ['Total Records at Risk', inputs.data.recordCount.toLocaleString()],
      ['Data Types', inputs.data.dataTypes.map(labelDataType).join(', ')],
      ['Risk Rating', results.riskRating],
      ['ALE (Mean)', fmtUSD(results.ale.mean)],
      ['ALE (Median)', fmtUSD(results.ale.median)],
      ['ALE as % of Revenue', fmtPct(results.ale.mean / revenue)],
      ['PML (95th Percentile)', fmtUSD(results.ale.p95)],
      ['PML as % of Revenue', fmtPct(results.ale.p95 / revenue)],
      ['Active Security Controls', `${Object.values(inputs.controls).filter(Boolean).length} of 6`],
      ['Previous Incidents (3yr)', labelIncidentHistory(inputs.threats.previousIncidents)],
      ['Regulatory Framework', REGULATORY_EXPOSURE[inputs.company.geography].framework],
      ['Max Regulatory Fine', fmtPct(REGULATORY_EXPOSURE[inputs.company.geography].maxPctRevenue) + ' of revenue'],
    ],
    theme: 'grid',
    bodyStyles: { fontSize: 8, textColor: BRAND.text },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    margin: { left: MARGIN.left, right: MARGIN.right },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50, textColor: BRAND.muted },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Loss Exceedance
  y = ensureSpace(doc, 50, 'APPENDIX: INSURANCE UNDERWRITING DATA');
  y = getY(doc);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.text);
  doc.text('Loss Exceedance Probabilities', MARGIN.left, y);
  y += 3;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    'Probability of annual losses exceeding specified thresholds (for policy limit/deductible decisions):',
    MARGIN.left, y,
  );
  y += 7;

  // Pick key exceedance points
  const excPoints = results.exceedanceCurve;
  const keyThresholds = [0.9, 0.75, 0.5, 0.25, 0.1, 0.05, 0.01];
  const excRows: string[][] = [];
  for (const thresh of keyThresholds) {
    const closest = excPoints.reduce((prev, curr) =>
      Math.abs(curr.probability - thresh) < Math.abs(prev.probability - thresh) ? curr : prev,
    );
    if (closest) {
      excRows.push([
        fmtPct(closest.probability),
        fmtUSD(closest.loss),
      ]);
    }
  }

  autoTable(doc, {
    startY: y,
    head: [['Exceedance Probability', 'Loss Threshold']],
    body: excRows,
    theme: 'grid',
    headStyles: { fillColor: BRAND.dark, textColor: BRAND.primary, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: BRAND.text },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    margin: { left: MARGIN.left, right: MARGIN.right },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45 },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Loss Distribution Buckets
  y = ensureSpace(doc, 50, 'APPENDIX: INSURANCE UNDERWRITING DATA');
  y = getY(doc);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.text);
  doc.text('Loss Distribution', MARGIN.left, y);
  y += 3;

  const bucketRows = results.distributionBuckets.map((b) => [
    b.rangeLabel,
    fmtPct(b.probability),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Loss Range', 'Probability']],
    body: bucketRows,
    theme: 'grid',
    headStyles: { fillColor: BRAND.dark, textColor: BRAND.primary, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: BRAND.text },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    margin: { left: MARGIN.left, right: MARGIN.right },
  });

  setY(doc, (doc as any).lastAutoTable.finalY + 5);
}

// ---------------------------------------------------------------------------
// Main export function
// ---------------------------------------------------------------------------
export function generateReport(
  inputs: AssessmentInputs,
  results: SimulationResults,
): jsPDF {
  // Reset footnotes
  footnotes = [];
  footnoteCounter = 0;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Set default font
  doc.setFont('helvetica', 'normal');

  // 1. Cover page
  renderCoverPage(doc, inputs, results);

  // 2. Executive Summary
  renderExecutiveSummary(doc, inputs, results);

  // 3. Assessment Parameters
  renderInputParameters(doc, inputs);

  // 4. Key Drivers & Recommendations
  renderKeyDrivers(doc, results);

  // 5. Methodology
  renderMethodology(doc, inputs);

  // 6. Data Sources
  renderDataSources(doc, inputs);

  // 7. Insurance Appendix
  renderInsuranceAppendix(doc, inputs, results);

  // 8. Footnotes
  renderFootnotes(doc);

  return doc;
}

export function downloadReport(
  inputs: AssessmentInputs,
  results: SimulationResults,
) {
  const doc = generateReport(inputs, results);
  const dateStr = new Date().toISOString().split('T')[0];
  const industry = inputs.company.industry.replace(/_/g, '-');
  doc.save(`cybrisk-${industry}-risk-assessment-${dateStr}.pdf`);
}
