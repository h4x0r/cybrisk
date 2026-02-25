/**
 * CybRisk — Board-Ready DOCX Report Generator
 *
 * Generates a comprehensive cyber risk assessment report suitable for:
 * - Board presentations to request security budget from CFO/CEO
 * - Cyber insurance underwriting submissions
 * - Regulatory compliance documentation
 *
 * Uses the 'docx' npm package for client-side DOCX generation.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  ShadingType,
  PageBreak,
  Header,
  Footer,
  PageNumber,
  ExternalHyperlink,
  ImageRun,
  convertInchesToTwip,
  LevelFormat,
} from 'docx';
import { saveAs } from 'file-saver';
import type {
  AssessmentInputs,
  SimulationResults,
  Industry,
  DistributionBucket,
  ExceedancePoint,
} from '@/lib/types';
import {
  PER_RECORD_COST,
  INDUSTRY_AVG_COST,
  COST_MODIFIERS,
  getRegulatoryCoverage,
  TEF_BY_INDUSTRY,
  REVENUE_MIDPOINTS,
  EMPLOYEE_MULTIPLIERS,
} from '@/lib/lookup-tables';

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
function fmtDollar(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function fmtNumber(n: number): string {
  return n.toLocaleString('en-US');
}

const INDUSTRY_NAMES: Record<Industry, string> = {
  healthcare: 'Healthcare',
  financial: 'Financial Services',
  pharmaceuticals: 'Pharmaceuticals',
  technology: 'Technology',
  energy: 'Energy',
  industrial: 'Industrial',
  services: 'Professional Services',
  retail: 'Retail',
  education: 'Education',
  entertainment: 'Entertainment',
  communications: 'Communications',
  consumer: 'Consumer Products',
  media: 'Media',
  research: 'Research',
  transportation: 'Transportation',
  hospitality: 'Hospitality',
  public_sector: 'Public Sector',
};

const REVENUE_LABELS: Record<string, string> = {
  under_50m: '<$50M',
  '50m_250m': '$50M-$250M',
  '250m_1b': '$250M-$1B',
  '1b_5b': '$1B-$5B',
  over_5b: '$5B+',
};

const EMPLOYEE_LABELS: Record<string, string> = {
  under_250: '<250',
  '250_1000': '250-1,000',
  '1000_5000': '1,000-5,000',
  '5000_25000': '5,000-25,000',
  over_25000: '25,000+',
};

const GEO_LABELS: Record<string, string> = {
  us: 'United States',
  uk: 'United Kingdom',
  eu: 'European Union',
  hk: 'Hong Kong SAR',
  sg: 'Singapore',
  other: 'Other',
};

const DATA_TYPE_LABELS: Record<string, string> = {
  customer_pii: 'Customer PII',
  employee_pii: 'Employee PII',
  payment_card: 'Payment Card (PCI)',
  health_records: 'Health Records (PHI)',
  ip: 'Intellectual Property',
  financial: 'Financial Records',
};

const THREAT_LABELS: Record<string, string> = {
  ransomware: 'Ransomware',
  bec_phishing: 'BEC / Phishing',
  insider_threat: 'Insider Threat',
  third_party: 'Third-Party Breach',
  web_app_attack: 'Web Application Attack',
  system_intrusion: 'System Intrusion',
  lost_stolen: 'Lost / Stolen Assets',
};

// ---------------------------------------------------------------------------
// Shared style constants
// ---------------------------------------------------------------------------
const BRAND_NAVY = '0A1628';
const BRAND_CYAN = '00B4FF';
const BRAND_RED = 'EF4444';
const WHITE = 'FFFFFF';
const LIGHT_GRAY = 'F0F4FF';
const MID_GRAY = '8899BB';

const CELL_BORDER = {
  top: { style: BorderStyle.SINGLE, size: 1, color: 'D0D8E8' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D0D8E8' },
  left: { style: BorderStyle.SINGLE, size: 1, color: 'D0D8E8' },
  right: { style: BorderStyle.SINGLE, size: 1, color: 'D0D8E8' },
} as const;

// ---------------------------------------------------------------------------
// Chart rendering — Canvas 2D → PNG → Uint8Array for DOCX embedding
// ---------------------------------------------------------------------------
const CHART_W = 1200; // 2x retina
const CHART_H = 520;
const EMU_PER_INCH = 914400;
const CHART_WIDTH_EMU = 6 * EMU_PER_INCH; // 6 inches
const CHART_HEIGHT_EMU = 2.6 * EMU_PER_INCH; // proportional

function canvasToPngBytes(canvas: HTMLCanvasElement): Uint8Array {
  const dataUrl = canvas.toDataURL('image/png');
  const raw = atob(dataUrl.split(',')[1]);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function createCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = CHART_W;
  c.height = CHART_H;
  const ctx = c.getContext('2d')!;
  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, CHART_W, CHART_H);
  return [c, ctx];
}

function fmtAxisDollar(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

/**
 * Chart 1: Loss Distribution Histogram
 * Bar chart from distributionBuckets with ALE mean and P95 reference lines.
 */
function renderDistributionChart(
  buckets: DistributionBucket[],
  aleMean: number,
  p95: number,
): Uint8Array {
  const [canvas, ctx] = createCanvas();
  const pad = { top: 60, right: 40, bottom: 80, left: 90 };
  const plotW = CHART_W - pad.left - pad.right;
  const plotH = CHART_H - pad.top - pad.bottom;

  // Title
  ctx.font = 'bold 22px Calibri, Arial, sans-serif';
  ctx.fillStyle = '#0A1628';
  ctx.textAlign = 'center';
  ctx.fillText('Loss Distribution (10,000 Monte Carlo Simulations)', CHART_W / 2, 36);

  // Find max probability for Y axis
  const maxProb = Math.max(...buckets.map((b) => b.probability), 0.01);
  const yMax = Math.ceil(maxProb * 100) / 100; // round up to nearest 1%

  // Grid lines
  ctx.strokeStyle = '#E8ECF2';
  ctx.lineWidth = 1;
  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const y = pad.top + plotH - (i / yTicks) * plotH;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
    ctx.stroke();

    // Y axis labels
    const val = (yMax * i) / yTicks;
    ctx.font = '14px Calibri, Arial, sans-serif';
    ctx.fillStyle = '#8899BB';
    ctx.textAlign = 'right';
    ctx.fillText(`${(val * 100).toFixed(0)}%`, pad.left - 10, y + 5);
  }

  // Bars
  const barGap = 3;
  const barW = (plotW - barGap * buckets.length) / buckets.length;

  for (let i = 0; i < buckets.length; i++) {
    const b = buckets[i];
    const barH = (b.probability / yMax) * plotH;
    const x = pad.left + i * (barW + barGap);
    const y = pad.top + plotH - barH;

    // Gradient bar
    const grad = ctx.createLinearGradient(x, y, x, pad.top + plotH);
    grad.addColorStop(0, '#00B4FF');
    grad.addColorStop(1, '#0A1628');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, barW, barH);

    // X axis labels (every other bucket to avoid crowding)
    if (i % 2 === 0 || buckets.length <= 10) {
      ctx.save();
      ctx.translate(x + barW / 2, pad.top + plotH + 12);
      ctx.rotate(-Math.PI / 4);
      ctx.font = '11px Calibri, Arial, sans-serif';
      ctx.fillStyle = '#8899BB';
      ctx.textAlign = 'right';
      ctx.fillText(b.rangeLabel, 0, 0);
      ctx.restore();
    }
  }

  // Reference lines: ALE Mean
  const aleMinVal = buckets[0]?.minValue ?? 0;
  const aleMaxVal = buckets[buckets.length - 1]?.maxValue ?? 1;
  const aleRange = aleMaxVal - aleMinVal;

  function lossToX(loss: number): number {
    const frac = Math.max(0, Math.min(1, (loss - aleMinVal) / aleRange));
    return pad.left + frac * plotW;
  }

  // ALE Mean line
  const aleX = lossToX(aleMean);
  ctx.setLineDash([8, 4]);
  ctx.strokeStyle = '#EF4444';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(aleX, pad.top);
  ctx.lineTo(aleX, pad.top + plotH);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.font = 'bold 13px Calibri, Arial, sans-serif';
  ctx.fillStyle = '#EF4444';
  ctx.textAlign = 'left';
  ctx.fillText(`ALE: ${fmtAxisDollar(aleMean)}`, aleX + 6, pad.top + 16);

  // P95 line
  const p95X = lossToX(p95);
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = '#F97316';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p95X, pad.top);
  ctx.lineTo(p95X, pad.top + plotH);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.font = 'bold 13px Calibri, Arial, sans-serif';
  ctx.fillStyle = '#F97316';
  ctx.textAlign = 'left';
  ctx.fillText(`P95: ${fmtAxisDollar(p95)}`, p95X + 6, pad.top + 34);

  // Axes
  ctx.strokeStyle = '#0A1628';
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + plotH);
  ctx.lineTo(pad.left + plotW, pad.top + plotH);
  ctx.stroke();

  // Y axis title
  ctx.save();
  ctx.translate(20, pad.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = 'bold 14px Calibri, Arial, sans-serif';
  ctx.fillStyle = '#4A6080';
  ctx.textAlign = 'center';
  ctx.fillText('Probability', 0, 0);
  ctx.restore();

  // Footnote
  ctx.font = '11px Calibri, Arial, sans-serif';
  ctx.fillStyle = '#AABBCC';
  ctx.textAlign = 'center';
  ctx.fillText('FAIR Monte Carlo Simulation | N=10,000 | CybRisk', CHART_W / 2, CHART_H - 6);

  return canvasToPngBytes(canvas);
}

/**
 * Chart 2: Loss Exceedance Curve (complementary CDF)
 * Shows probability that annual losses exceed a given threshold.
 */
function renderExceedanceChart(
  curve: ExceedancePoint[],
  aleMean: number,
  p95: number,
  gordonLoeb: number,
): Uint8Array {
  const [canvas, ctx] = createCanvas();
  const pad = { top: 60, right: 40, bottom: 60, left: 90 };
  const plotW = CHART_W - pad.left - pad.right;
  const plotH = CHART_H - pad.top - pad.bottom;

  // Title
  ctx.font = 'bold 22px Calibri, Arial, sans-serif';
  ctx.fillStyle = '#0A1628';
  ctx.textAlign = 'center';
  ctx.fillText('Loss Exceedance Curve', CHART_W / 2, 36);

  // Data ranges
  const lossMax = curve.length > 0 ? curve[curve.length - 1].loss : 1;
  const lossMin = 0;

  function xPos(loss: number): number {
    return pad.left + (loss / lossMax) * plotW;
  }
  function yPos(prob: number): number {
    return pad.top + plotH - prob * plotH;
  }

  // Grid
  ctx.strokeStyle = '#E8ECF2';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + plotH - (i / 5) * plotH;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
    ctx.stroke();
    ctx.font = '14px Calibri, Arial, sans-serif';
    ctx.fillStyle = '#8899BB';
    ctx.textAlign = 'right';
    ctx.fillText(`${(i * 20)}%`, pad.left - 10, y + 5);
  }

  // X axis labels
  const xTicks = 5;
  for (let i = 0; i <= xTicks; i++) {
    const loss = (lossMax * i) / xTicks;
    const x = xPos(loss);
    ctx.font = '12px Calibri, Arial, sans-serif';
    ctx.fillStyle = '#8899BB';
    ctx.textAlign = 'center';
    ctx.fillText(fmtAxisDollar(loss), x, pad.top + plotH + 22);
  }

  // Area fill under curve
  if (curve.length > 1) {
    ctx.beginPath();
    ctx.moveTo(xPos(curve[0].loss), yPos(curve[0].probability));
    for (const pt of curve) {
      ctx.lineTo(xPos(pt.loss), yPos(pt.probability));
    }
    ctx.lineTo(xPos(curve[curve.length - 1].loss), yPos(0));
    ctx.lineTo(xPos(curve[0].loss), yPos(0));
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
    grad.addColorStop(0, 'rgba(0,180,255,0.25)');
    grad.addColorStop(1, 'rgba(10,22,40,0.05)');
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // Curve line
  if (curve.length > 1) {
    ctx.beginPath();
    ctx.moveTo(xPos(curve[0].loss), yPos(curve[0].probability));
    for (const pt of curve) {
      ctx.lineTo(xPos(pt.loss), yPos(pt.probability));
    }
    ctx.strokeStyle = '#00B4FF';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.stroke();
  }

  // Reference: ALE Mean
  ctx.setLineDash([8, 4]);
  ctx.strokeStyle = '#EF4444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(xPos(aleMean), pad.top);
  ctx.lineTo(xPos(aleMean), pad.top + plotH);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = 'bold 12px Calibri, Arial, sans-serif';
  ctx.fillStyle = '#EF4444';
  ctx.textAlign = 'left';
  ctx.fillText(`ALE ${fmtAxisDollar(aleMean)}`, xPos(aleMean) + 5, pad.top + 16);

  // Reference: P95
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = '#F97316';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(xPos(p95), pad.top);
  ctx.lineTo(xPos(p95), pad.top + plotH);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = 'bold 12px Calibri, Arial, sans-serif';
  ctx.fillStyle = '#F97316';
  ctx.textAlign = 'left';
  ctx.fillText(`PML\u2089\u2085 ${fmtAxisDollar(p95)}`, xPos(p95) + 5, pad.top + 34);

  // Reference: Gordon-Loeb optimal spend
  if (gordonLoeb > 0 && gordonLoeb < lossMax) {
    ctx.setLineDash([3, 5]);
    ctx.strokeStyle = '#22C55E';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(xPos(gordonLoeb), pad.top);
    ctx.lineTo(xPos(gordonLoeb), pad.top + plotH);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '11px Calibri, Arial, sans-serif';
    ctx.fillStyle = '#22C55E';
    ctx.textAlign = 'left';
    ctx.fillText(`GL Spend ${fmtAxisDollar(gordonLoeb)}`, xPos(gordonLoeb) + 5, pad.top + 52);
  }

  // Axes
  ctx.strokeStyle = '#0A1628';
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + plotH);
  ctx.lineTo(pad.left + plotW, pad.top + plotH);
  ctx.stroke();

  // Axis titles
  ctx.save();
  ctx.translate(20, pad.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = 'bold 14px Calibri, Arial, sans-serif';
  ctx.fillStyle = '#4A6080';
  ctx.textAlign = 'center';
  ctx.fillText('P(Loss > x)', 0, 0);
  ctx.restore();

  ctx.font = 'bold 14px Calibri, Arial, sans-serif';
  ctx.fillStyle = '#4A6080';
  ctx.textAlign = 'center';
  ctx.fillText('Annual Loss Threshold', pad.left + plotW / 2, pad.top + plotH + 48);

  return canvasToPngBytes(canvas);
}

/**
 * Chart 3: Industry Benchmark Comparison
 * Horizontal bar chart — your ALE vs industry median.
 */
function renderBenchmarkChart(
  yourAle: number,
  industryMedian: number,
  industryName: string,
): Uint8Array {
  const [canvas, ctx] = createCanvas();
  canvas.height = 380;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, CHART_W, 380);

  const pad = { top: 60, right: 80, bottom: 50, left: 260 };
  const plotW = CHART_W - pad.left - pad.right;
  const plotH = 380 - pad.top - pad.bottom;

  // Title
  ctx.font = 'bold 22px Calibri, Arial, sans-serif';
  ctx.fillStyle = '#0A1628';
  ctx.textAlign = 'center';
  ctx.fillText(`Risk Exposure vs ${industryName} Median`, CHART_W / 2, 36);

  const maxVal = Math.max(yourAle, industryMedian) * 1.25;
  const barH = 50;
  const gap = 40;

  // Grid
  for (let i = 0; i <= 4; i++) {
    const x = pad.left + (i / 4) * plotW;
    ctx.strokeStyle = '#E8ECF2';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, pad.top + plotH);
    ctx.stroke();
    ctx.font = '13px Calibri, Arial, sans-serif';
    ctx.fillStyle = '#8899BB';
    ctx.textAlign = 'center';
    ctx.fillText(fmtAxisDollar((maxVal * i) / 4), x, pad.top + plotH + 22);
  }

  // Bar: Your ALE
  const y1 = pad.top + (plotH / 2 - barH - gap / 2);
  const w1 = (yourAle / maxVal) * plotW;
  const grad1 = ctx.createLinearGradient(pad.left, y1, pad.left + w1, y1);
  grad1.addColorStop(0, '#0A1628');
  grad1.addColorStop(1, yourAle > industryMedian ? '#EF4444' : '#00B4FF');
  ctx.fillStyle = grad1;
  ctx.beginPath();
  ctx.roundRect(pad.left, y1, w1, barH, [0, 6, 6, 0]);
  ctx.fill();

  ctx.font = 'bold 15px Calibri, Arial, sans-serif';
  ctx.fillStyle = '#0A1628';
  ctx.textAlign = 'right';
  ctx.fillText('Your Estimated ALE', pad.left - 14, y1 + barH / 2 + 5);

  ctx.textAlign = 'left';
  ctx.fillStyle = yourAle > industryMedian ? '#EF4444' : '#00B4FF';
  ctx.fillText(fmtAxisDollar(yourAle), pad.left + w1 + 10, y1 + barH / 2 + 5);

  // Bar: Industry Median
  const y2 = pad.top + (plotH / 2 + gap / 2);
  const w2 = (industryMedian / maxVal) * plotW;
  const grad2 = ctx.createLinearGradient(pad.left, y2, pad.left + w2, y2);
  grad2.addColorStop(0, '#0A1628');
  grad2.addColorStop(1, '#8899BB');
  ctx.fillStyle = grad2;
  ctx.beginPath();
  ctx.roundRect(pad.left, y2, w2, barH, [0, 6, 6, 0]);
  ctx.fill();

  ctx.font = 'bold 15px Calibri, Arial, sans-serif';
  ctx.fillStyle = '#0A1628';
  ctx.textAlign = 'right';
  ctx.fillText(`${industryName} Median`, pad.left - 14, y2 + barH / 2 + 5);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#8899BB';
  ctx.fillText(fmtAxisDollar(industryMedian), pad.left + w2 + 10, y2 + barH / 2 + 5);

  // Variance annotation
  const pctDiff = ((yourAle - industryMedian) / industryMedian) * 100;
  const sign = pctDiff >= 0 ? '+' : '';
  ctx.font = 'bold 16px Calibri, Arial, sans-serif';
  ctx.fillStyle = pctDiff >= 0 ? '#EF4444' : '#22C55E';
  ctx.textAlign = 'center';
  ctx.fillText(
    `${sign}${pctDiff.toFixed(0)}% vs industry median`,
    pad.left + plotW / 2,
    pad.top + plotH + 42,
  );

  return canvasToPngBytes(canvas);
}

// ---------------------------------------------------------------------------
// Helper: create styled table cells
// ---------------------------------------------------------------------------
function headerCell(text: string, widthPct?: number): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: true,
            size: 18,
            color: WHITE,
            font: 'Calibri',
          }),
        ],
        spacing: { before: 60, after: 60 },
      }),
    ],
    shading: { type: ShadingType.SOLID, color: BRAND_NAVY },
    borders: CELL_BORDER,
    ...(widthPct
      ? { width: { size: widthPct, type: WidthType.PERCENTAGE } }
      : {}),
  });
}

function dataCell(
  text: string,
  opts?: { bold?: boolean; color?: string; shading?: string },
): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: opts?.bold ?? false,
            size: 18,
            color: opts?.color ?? '333333',
            font: 'Calibri',
          }),
        ],
        spacing: { before: 40, after: 40 },
      }),
    ],
    borders: CELL_BORDER,
    ...(opts?.shading
      ? { shading: { type: ShadingType.SOLID, color: opts.shading } }
      : {}),
  });
}

// ---------------------------------------------------------------------------
// Build the DOCX Document
// ---------------------------------------------------------------------------
interface ChartImages {
  distribution: Uint8Array;
  exceedance: Uint8Array;
  benchmark: Uint8Array;
}

function buildDocument(
  inputs: AssessmentInputs,
  results: SimulationResults,
  charts: ChartImages,
): Document {
  const orgName =
    inputs.company.organizationName?.trim() || 'Acme Corp';
  const industry = INDUSTRY_NAMES[inputs.company.industry];
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const revenue = REVENUE_MIDPOINTS[inputs.company.revenueBand];
  const regProfile = getRegulatoryCoverage(inputs.company.geography, inputs.company.industry);

  // Risk-to-investment ratio
  const ratio = results.gordonLoebSpend > 0
    ? (results.ale.mean / results.gordonLoebSpend).toFixed(1)
    : 'N/A';

  // ---------------------------------------------------------------------------
  // SECTIONS
  // ---------------------------------------------------------------------------

  // --- Cover Page ---
  const coverChildren: (Paragraph | Table)[] = [
    new Paragraph({ spacing: { before: 2400 } }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'CYBER RISK',
          bold: true,
          size: 72,
          color: BRAND_NAVY,
          font: 'Calibri',
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'ASSESSMENT REPORT',
          bold: true,
          size: 48,
          color: BRAND_CYAN,
          font: 'Calibri',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: orgName,
          size: 32,
          color: '555555',
          font: 'Calibri',
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${industry} | ${dateStr}`,
          size: 22,
          color: MID_GRAY,
          font: 'Calibri',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 1200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Quantitative risk analysis using FAIR methodology with 10,000 Monte Carlo simulations. ',
          size: 20,
          color: '666666',
          font: 'Calibri',
          italics: true,
        }),
        new TextRun({
          text: 'Generated by CybRisk.',
          size: 20,
          color: BRAND_CYAN,
          font: 'Calibri',
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new PageBreak()],
    }),
  ];

  // --- Executive Summary ---
  const execSummaryChildren: (Paragraph | Table)[] = [
    new Paragraph({
      text: 'Executive Summary',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `This report presents the results of a quantitative cyber risk assessment for ${orgName}, operating in the ${industry} sector. The analysis employs Factor Analysis of Information Risk (FAIR) methodology with 10,000 Monte Carlo simulations to estimate annualised loss exposure.`,
          size: 22,
          font: 'Calibri',
        }),
      ],
      spacing: { after: 200 },
    }),
  ];

  // Key metrics table
  const metricsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          headerCell('Metric', 50),
          headerCell('Value', 50),
        ],
      }),
      new TableRow({
        children: [
          dataCell('Annualised Loss Expectancy (ALE)'),
          dataCell(fmtDollar(results.ale.mean), { bold: true, color: BRAND_RED }),
        ],
      }),
      new TableRow({
        children: [
          dataCell('Probable Maximum Loss (95th percentile)'),
          dataCell(fmtDollar(results.ale.p95), { bold: true, color: BRAND_RED }),
        ],
      }),
      new TableRow({
        children: [
          dataCell('Median Loss'),
          dataCell(fmtDollar(results.ale.median)),
        ],
      }),
      new TableRow({
        children: [
          dataCell('10th Percentile (best case)'),
          dataCell(fmtDollar(results.ale.p10)),
        ],
      }),
      new TableRow({
        children: [
          dataCell('90th Percentile'),
          dataCell(fmtDollar(results.ale.p90)),
        ],
      }),
      new TableRow({
        children: [
          dataCell('Risk Rating'),
          dataCell(results.riskRating, {
            bold: true,
            color:
              results.riskRating === 'CRITICAL'
                ? BRAND_RED
                : results.riskRating === 'HIGH'
                  ? 'F97316'
                  : results.riskRating === 'MODERATE'
                    ? 'EAB308'
                    : '22C55E',
          }),
        ],
      }),
      new TableRow({
        children: [
          dataCell('Optimal Security Investment (Gordon-Loeb)'),
          dataCell(fmtDollar(results.gordonLoebSpend), {
            bold: true,
            color: BRAND_CYAN,
          }),
        ],
      }),
      new TableRow({
        children: [
          dataCell('Industry Benchmark (Median ALE)'),
          dataCell(fmtDollar(results.industryBenchmark.industryMedian)),
        ],
      }),
      new TableRow({
        children: [
          dataCell('Your Percentile Rank in Industry'),
          dataCell(`${results.industryBenchmark.percentileRank}th percentile`),
        ],
      }),
    ],
  });

  execSummaryChildren.push(metricsTable);

  // Budget justification paragraph
  execSummaryChildren.push(
    new Paragraph({ spacing: { before: 300 } }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Budget Justification: ',
          bold: true,
          size: 22,
          font: 'Calibri',
        }),
        new TextRun({
          text: `For every $1 invested in the recommended security programme (${fmtDollar(results.gordonLoebSpend)}), the organisation reduces ${ratio !== 'N/A' ? `$${ratio}` : ratio} in expected annual loss. `,
          size: 22,
          font: 'Calibri',
        }),
        new TextRun({
          text: `The Gordon-Loeb model indicates that optimal spending should not exceed 37% of the expected loss, capped at 5% of annual revenue.`,
          size: 22,
          font: 'Calibri',
          italics: true,
          color: '666666',
        }),
      ],
      spacing: { after: 200 },
    }),
  );

  // --- Charts: Distribution + Exceedance ---
  execSummaryChildren.push(
    new Paragraph({ spacing: { before: 300 } }),
    new Paragraph({
      text: 'Loss Distribution',
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new ImageRun({
          type: 'png',
          data: charts.distribution,
          transformation: {
            width: CHART_WIDTH_EMU,
            height: CHART_HEIGHT_EMU,
          },
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Figure 1: Probability distribution of annual losses across 10,000 simulated scenarios. Red dashed line indicates the mean ALE; orange dashed line marks the 95th percentile (probable maximum loss).',
          size: 18,
          color: MID_GRAY,
          font: 'Calibri',
          italics: true,
        }),
      ],
      spacing: { before: 60, after: 300 },
    }),
    new Paragraph({
      text: 'Loss Exceedance Curve',
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new ImageRun({
          type: 'png',
          data: charts.exceedance,
          transformation: {
            width: CHART_WIDTH_EMU,
            height: CHART_HEIGHT_EMU,
          },
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Figure 2: Complementary cumulative distribution function showing the probability that annual losses exceed a given threshold. Directly informs cyber insurance limit selection and risk appetite statements.',
          size: 18,
          color: MID_GRAY,
          font: 'Calibri',
          italics: true,
        }),
      ],
      spacing: { before: 60, after: 200 },
    }),
    new Paragraph({
      children: [new PageBreak()],
    }),
  );

  // --- Assessment Parameters ---
  const paramsChildren: (Paragraph | Table)[] = [
    new Paragraph({
      text: 'Assessment Parameters',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: 'Company Profile',
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 100 },
    }),
  ];

  const companyTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [headerCell('Parameter', 40), headerCell('Value', 60)],
      }),
      new TableRow({
        children: [
          dataCell('Organisation'),
          dataCell(orgName, { bold: true }),
        ],
      }),
      new TableRow({
        children: [
          dataCell('Industry'),
          dataCell(industry),
        ],
      }),
      new TableRow({
        children: [
          dataCell('Annual Revenue'),
          dataCell(REVENUE_LABELS[inputs.company.revenueBand] ?? 'N/A'),
        ],
      }),
      new TableRow({
        children: [
          dataCell('Employee Count'),
          dataCell(EMPLOYEE_LABELS[inputs.company.employees] ?? 'N/A'),
        ],
      }),
      new TableRow({
        children: [
          dataCell('Primary Geography'),
          dataCell(GEO_LABELS[inputs.company.geography] ?? 'N/A'),
        ],
      }),
      new TableRow({
        children: [
          dataCell('Applicable Frameworks'),
          dataCell(regProfile.frameworks.join(' + ')),
        ],
      }),
      new TableRow({
        children: [
          dataCell('Compound Regulatory Fine Exposure'),
          dataCell(
            fmtPct(regProfile.maxPctRevenue) + ' of revenue',
            {
              bold: true,
              color: regProfile.maxPctRevenue >= 0.04 ? BRAND_RED : undefined,
            },
          ),
        ],
      }),
    ],
  });
  paramsChildren.push(companyTable);

  // Data Profile
  paramsChildren.push(
    new Paragraph({
      text: 'Data Profile',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 100 },
    }),
  );

  const dataRows = [
    new TableRow({
      children: [headerCell('Parameter', 40), headerCell('Value', 60)],
    }),
    new TableRow({
      children: [
        dataCell('Total Records at Risk'),
        dataCell(fmtNumber(inputs.data.recordCount)),
      ],
    }),
    new TableRow({
      children: [
        dataCell('Cloud Percentage'),
        dataCell(`${inputs.data.cloudPercentage}%`),
      ],
    }),
    new TableRow({
      children: [
        dataCell('Data Types'),
        dataCell(
          inputs.data.dataTypes
            .map((dt) => DATA_TYPE_LABELS[dt] ?? dt)
            .join(', '),
        ),
      ],
    }),
  ];

  // Per-record cost breakdown
  for (const dt of inputs.data.dataTypes) {
    dataRows.push(
      new TableRow({
        children: [
          dataCell(`  Per-Record Cost: ${DATA_TYPE_LABELS[dt] ?? dt}`),
          dataCell(`$${PER_RECORD_COST[dt]}`),
        ],
      }),
    );
  }

  paramsChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: dataRows,
    }),
  );

  // Security Controls
  paramsChildren.push(
    new Paragraph({
      text: 'Security Controls',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 100 },
    }),
  );

  const controlEntries: [string, boolean, string][] = [
    ['Incident Response Plan', inputs.controls.irPlan, `${Math.round(COST_MODIFIERS.ir_plan * 100)}%`],
    ['AI / Automation Tools', inputs.controls.aiAutomation, `${Math.round(COST_MODIFIERS.ai_automation * 100)}%`],
    ['Dedicated Security Team / CISO', inputs.controls.securityTeam, `${Math.round(COST_MODIFIERS.security_team * 100)}%`],
    ['MFA on Critical Systems', inputs.controls.mfa, `${Math.round(COST_MODIFIERS.mfa * 100)}%`],
    ['Regular Penetration Testing', inputs.controls.pentest, `${Math.round(COST_MODIFIERS.pentest * 100)}%`],
    ['Cyber Insurance', inputs.controls.cyberInsurance, 'Risk transfer'],
  ];

  const controlRows = [
    new TableRow({
      children: [
        headerCell('Control', 45),
        headerCell('Active', 20),
        headerCell('Cost Impact', 35),
      ],
    }),
  ];

  for (const [label, active, impact] of controlEntries) {
    controlRows.push(
      new TableRow({
        children: [
          dataCell(label),
          dataCell(active ? 'YES' : 'NO', {
            bold: true,
            color: active ? '22C55E' : BRAND_RED,
          }),
          dataCell(active ? impact : '--', {
            color: active ? '22C55E' : MID_GRAY,
          }),
        ],
      }),
    );
  }

  paramsChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: controlRows,
    }),
  );

  // Threat Landscape
  paramsChildren.push(
    new Paragraph({
      text: 'Threat Landscape',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 100 },
    }),
  );

  const threatTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [headerCell('Parameter', 40), headerCell('Value', 60)],
      }),
      new TableRow({
        children: [
          dataCell('Top Concerns'),
          dataCell(
            inputs.threats.topConcerns
              .map((t) => THREAT_LABELS[t] ?? t)
              .join(', ') || 'None specified',
          ),
        ],
      }),
      new TableRow({
        children: [
          dataCell('Previous Incidents (3 yr)'),
          dataCell(
            inputs.threats.previousIncidents === '0'
              ? 'None'
              : inputs.threats.previousIncidents === '1'
                ? '1'
                : inputs.threats.previousIncidents === '2_5'
                  ? '2-5'
                  : '5+',
          ),
        ],
      }),
      new TableRow({
        children: [
          dataCell('TEF Baseline'),
          dataCell(
            `${TEF_BY_INDUSTRY[inputs.company.industry].mode.toFixed(2)} events/year (range: ${TEF_BY_INDUSTRY[inputs.company.industry].min.toFixed(2)}-${TEF_BY_INDUSTRY[inputs.company.industry].max.toFixed(1)})`,
          ),
        ],
      }),
      new TableRow({
        children: [
          dataCell('Attack Surface Multiplier'),
          dataCell(
            `${EMPLOYEE_MULTIPLIERS[inputs.company.employees]}x (${EMPLOYEE_LABELS[inputs.company.employees]} employees)`,
          ),
        ],
      }),
    ],
  });
  paramsChildren.push(threatTable);
  paramsChildren.push(new Paragraph({ children: [new PageBreak()] }));

  // --- Key Drivers & Recommendations ---
  const driversChildren: (Paragraph | Table)[] = [
    new Paragraph({
      text: 'Key Risk Drivers',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }),
  ];

  const driverRows = [
    new TableRow({
      children: [
        headerCell('Factor', 30),
        headerCell('Impact', 15),
        headerCell('Description', 55),
      ],
    }),
  ];

  for (const driver of results.keyDrivers) {
    driverRows.push(
      new TableRow({
        children: [
          dataCell(driver.factor, { bold: true }),
          dataCell(driver.impact, {
            bold: true,
            color:
              driver.impact === 'HIGH'
                ? BRAND_RED
                : driver.impact === 'MEDIUM'
                  ? 'F97316'
                  : '22C55E',
          }),
          dataCell(driver.description),
        ],
      }),
    );
  }

  driversChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: driverRows,
    }),
  );

  // Recommendations
  driversChildren.push(
    new Paragraph({
      text: 'Recommendations',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }),
  );

  for (let i = 0; i < results.recommendations.length; i++) {
    driversChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${i + 1}. ${results.recommendations[i]}`,
            size: 22,
            font: 'Calibri',
          }),
        ],
        spacing: { after: 120 },
      }),
    );
  }

  driversChildren.push(new Paragraph({ children: [new PageBreak()] }));

  // --- Industry Benchmark ---
  const benchChildren: (Paragraph | Table)[] = [
    new Paragraph({
      text: 'Industry Benchmark Comparison',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${orgName} ranks at the `,
          size: 22,
          font: 'Calibri',
        }),
        new TextRun({
          text: `${results.industryBenchmark.percentileRank}th percentile`,
          bold: true,
          size: 22,
          font: 'Calibri',
        }),
        new TextRun({
          text: ` within the ${industry} sector. A higher percentile indicates greater risk exposure relative to peers.`,
          size: 22,
          font: 'Calibri',
        }),
      ],
      spacing: { after: 200 },
    }),
  ];

  // Benchmark chart image
  const BENCH_HEIGHT_EMU = Math.round(1.9 * EMU_PER_INCH);
  benchChildren.push(
    new Paragraph({
      children: [
        new ImageRun({
          type: 'png',
          data: charts.benchmark,
          transformation: {
            width: CHART_WIDTH_EMU,
            height: BENCH_HEIGHT_EMU,
          },
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Figure 3: Comparison of estimated annualised loss expectancy against the industry median, derived from IBM Cost of a Data Breach Report 2025.',
          size: 18,
          color: MID_GRAY,
          font: 'Calibri',
          italics: true,
        }),
      ],
      spacing: { before: 60, after: 300 },
    }),
  );

  // Industry cost table (from IBM data)
  const industryRows = [
    new TableRow({
      children: [
        headerCell('Industry', 50),
        headerCell('Avg Breach Cost ($M)', 50),
      ],
    }),
  ];

  const sortedIndustries = (Object.entries(INDUSTRY_AVG_COST) as [Industry, number][])
    .sort((a, b) => b[1] - a[1]);

  for (const [key, cost] of sortedIndustries) {
    const isSelected = key === inputs.company.industry;
    industryRows.push(
      new TableRow({
        children: [
          dataCell(
            `${isSelected ? '\u25B6 ' : ''}${INDUSTRY_NAMES[key]}`,
            {
              bold: isSelected,
              color: isSelected ? BRAND_CYAN : '333333',
              shading: isSelected ? 'E8F4FD' : undefined,
            },
          ),
          dataCell(`$${cost.toFixed(2)}M`, {
            bold: isSelected,
            color: isSelected ? BRAND_CYAN : '333333',
            shading: isSelected ? 'E8F4FD' : undefined,
          }),
        ],
      }),
    );
  }

  benchChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: industryRows,
    }),
  );

  benchChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Source: IBM Cost of a Data Breach Report 2025',
          size: 18,
          color: MID_GRAY,
          font: 'Calibri',
          italics: true,
        }),
      ],
      spacing: { before: 100, after: 200 },
    }),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // --- Methodology ---
  const methodChildren: (Paragraph | Table)[] = [
    new Paragraph({
      text: 'Methodology & Algorithms',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'This analysis follows the Factor Analysis of Information Risk (FAIR) framework, the only international standard quantitative model for information security risk (OpenFAIR, The Open Group).',
          size: 22,
          font: 'Calibri',
        }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: 'Monte Carlo Simulation',
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: '10,000 independent trials were executed. Each trial samples:',
          size: 22,
          font: 'Calibri',
        }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: '1. Threat Event Frequency (TEF): ',
          bold: true,
          size: 22,
          font: 'Calibri',
        }),
        new TextRun({
          text: `Sampled from a PERT distribution calibrated to ${industry} (min=${TEF_BY_INDUSTRY[inputs.company.industry].min}, mode=${TEF_BY_INDUSTRY[inputs.company.industry].mode}, max=${TEF_BY_INDUSTRY[inputs.company.industry].max}).`,
          size: 22,
          font: 'Calibri',
        }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: '2. Vulnerability (V): ',
          bold: true,
          size: 22,
          font: 'Calibri',
        }),
        new TextRun({
          text: 'Base rate of 0.30 (DBIR), adjusted by active security controls. Each control applies a multiplicative modifier.',
          size: 22,
          font: 'Calibri',
        }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: '3. Loss Event Frequency (LEF): ',
          bold: true,
          size: 22,
          font: 'Calibri',
        }),
        new TextRun({
          text: 'LEF = TEF x V, representing the expected number of actual breaches per year.',
          size: 22,
          font: 'Calibri',
        }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: '4. Loss Magnitude (LM): ',
          bold: true,
          size: 22,
          font: 'Calibri',
        }),
        new TextRun({
          text: 'Primary loss sampled from log-normal distribution centred on per-record cost x record count. Secondary loss adds regulatory fines (beta-distributed) and response costs.',
          size: 22,
          font: 'Calibri',
        }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: '5. Annual Loss: ',
          bold: true,
          size: 22,
          font: 'Calibri',
        }),
        new TextRun({
          text: 'Sum of (LEF x LM) across all events in a trial year.',
          size: 22,
          font: 'Calibri',
        }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: 'Gordon-Loeb Model',
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Optimal security investment is calculated as min(0.37 x v x ALE, 5% x revenue). For ${orgName}, this yields ${fmtDollar(results.gordonLoebSpend)}, representing the point of diminishing returns on security spend.`,
          size: 22,
          font: 'Calibri',
        }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: 'Loss Exceedance Curve',
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'A 50-point interpolation of the complementary CDF, showing the probability that annual losses will exceed a given threshold. This curve directly informs cyber insurance limit selection.',
          size: 22,
          font: 'Calibri',
        }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  // --- Data Sources ---
  const sourcesChildren: (Paragraph | Table)[] = [
    new Paragraph({
      text: 'Data Sources & References',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }),
  ];

  const references = [
    ['IBM Security', 'Cost of a Data Breach Report 2025', 'Per-record costs, industry benchmarks, control effectiveness'],
    ['Verizon', 'Data Breach Investigations Report (DBIR) 2025', 'Attack pattern frequencies, threat event frequency calibration'],
    ['NetDiligence', 'Cyber Claims Study 2025', 'Claim severity distributions by revenue band'],
    ['The Open Group', 'OpenFAIR Standard (O-RA)', 'FAIR risk taxonomy and quantitative methodology'],
    ['Gordon & Loeb', 'Managing Cybersecurity Resources (2002)', 'Optimal security investment model (1/e coefficient)'],
    ['Regulatory', 'GDPR, UK GDPR, PDPO, PDPA, US State Laws', 'Maximum regulatory fine exposure by geography'],
  ];

  const refRows = [
    new TableRow({
      children: [
        headerCell('Source', 25),
        headerCell('Publication', 35),
        headerCell('Used For', 40),
      ],
    }),
  ];

  for (const [source, pub, usage] of references) {
    refRows.push(
      new TableRow({
        children: [
          dataCell(source, { bold: true }),
          dataCell(pub),
          dataCell(usage),
        ],
      }),
    );
  }

  sourcesChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: refRows,
    }),
  );

  sourcesChildren.push(new Paragraph({ children: [new PageBreak()] }));

  // --- Insurance Appendix ---
  const insuranceChildren: (Paragraph | Table)[] = [
    new Paragraph({
      text: 'Appendix: Cyber Insurance Underwriting Summary',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'This appendix provides key metrics in the format commonly requested by cyber insurance underwriters.',
          size: 22,
          font: 'Calibri',
          italics: true,
          color: '666666',
        }),
      ],
      spacing: { after: 200 },
    }),
  ];

  const insuranceTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [headerCell('Underwriting Metric', 50), headerCell('Value', 50)],
      }),
      new TableRow({
        children: [
          dataCell('Named Insured'),
          dataCell(orgName, { bold: true }),
        ],
      }),
      new TableRow({
        children: [
          dataCell('Industry Classification'),
          dataCell(industry),
        ],
      }),
      new TableRow({
        children: [
          dataCell('Annual Revenue'),
          dataCell(fmtDollar(revenue)),
        ],
      }),
      new TableRow({
        children: [
          dataCell('Records Under Management'),
          dataCell(fmtNumber(inputs.data.recordCount)),
        ],
      }),
      new TableRow({
        children: [
          dataCell('Estimated ALE'),
          dataCell(fmtDollar(results.ale.mean), { bold: true }),
        ],
      }),
      new TableRow({
        children: [
          dataCell('PML (95th Percentile)'),
          dataCell(fmtDollar(results.ale.p95), { bold: true, color: BRAND_RED }),
        ],
      }),
      new TableRow({
        children: [
          dataCell('Recommended Policy Limit'),
          dataCell(fmtDollar(results.ale.p95 * 1.1), { bold: true }),
        ],
      }),
      new TableRow({
        children: [
          dataCell('Risk Rating'),
          dataCell(results.riskRating, { bold: true }),
        ],
      }),
      new TableRow({
        children: [
          dataCell('IR Plan in Place'),
          dataCell(inputs.controls.irPlan ? 'Yes' : 'No'),
        ],
      }),
      new TableRow({
        children: [
          dataCell('MFA Deployed'),
          dataCell(inputs.controls.mfa ? 'Yes' : 'No'),
        ],
      }),
      new TableRow({
        children: [
          dataCell('Dedicated Security Team'),
          dataCell(inputs.controls.securityTeam ? 'Yes' : 'No'),
        ],
      }),
      new TableRow({
        children: [
          dataCell('Prior Incidents (3 yr)'),
          dataCell(
            inputs.threats.previousIncidents === '0'
              ? 'None'
              : inputs.threats.previousIncidents === '1'
                ? '1'
                : inputs.threats.previousIncidents === '2_5'
                  ? '2-5'
                  : '5+',
          ),
        ],
      }),
    ],
  });

  insuranceChildren.push(insuranceTable);

  // Disclaimer
  insuranceChildren.push(
    new Paragraph({ spacing: { before: 400 } }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Disclaimer: ',
          bold: true,
          size: 18,
          color: '999999',
          font: 'Calibri',
        }),
        new TextRun({
          text: 'This report is generated using publicly available actuarial data and statistical modelling. It does not constitute professional risk advisory, insurance, legal, or financial advice. Actual losses may differ materially from modelled estimates. Consult qualified professionals for binding decisions.',
          size: 18,
          color: '999999',
          font: 'Calibri',
          italics: true,
        }),
      ],
      spacing: { after: 200 },
    }),
  );

  // ---------------------------------------------------------------------------
  // Assemble Document
  // ---------------------------------------------------------------------------
  return new Document({
    creator: 'CybRisk',
    title: `Cyber Risk Assessment - ${orgName}`,
    description: `FAIR-based quantitative cyber risk assessment for ${orgName}`,
    numbering: {
      config: [
        {
          reference: 'numbered-list',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.LEFT,
            },
          ],
        },
      ],
    },
    styles: {
      default: {
        heading1: {
          run: {
            size: 32,
            bold: true,
            color: BRAND_NAVY,
            font: 'Calibri',
          },
          paragraph: {
            spacing: { before: 240, after: 120 },
          },
        },
        heading2: {
          run: {
            size: 26,
            bold: true,
            color: '333333',
            font: 'Calibri',
          },
          paragraph: {
            spacing: { before: 200, after: 80 },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `CybRisk | ${orgName} | ${dateStr}`,
                    size: 16,
                    color: MID_GRAY,
                    font: 'Calibri',
                  }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'CONFIDENTIAL | Generated by CybRisk (cybrisk.vercel.app) | Page ',
                    size: 16,
                    color: MID_GRAY,
                    font: 'Calibri',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: MID_GRAY,
                    font: 'Calibri',
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children: [
          ...coverChildren,
          ...execSummaryChildren,
          ...paramsChildren,
          ...driversChildren,
          ...benchChildren,
          ...methodChildren,
          ...sourcesChildren,
          ...insuranceChildren,
        ],
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function downloadReport(
  inputs: AssessmentInputs,
  results: SimulationResults,
): Promise<void> {
  // Pre-render charts on Canvas → PNG
  const charts: ChartImages = {
    distribution: renderDistributionChart(
      results.distributionBuckets,
      results.ale.mean,
      results.ale.p95,
    ),
    exceedance: renderExceedanceChart(
      results.exceedanceCurve,
      results.ale.mean,
      results.ale.p95,
      results.gordonLoebSpend,
    ),
    benchmark: renderBenchmarkChart(
      results.industryBenchmark.yourAle,
      results.industryBenchmark.industryMedian,
      INDUSTRY_NAMES[inputs.company.industry],
    ),
  };

  const doc = buildDocument(inputs, results, charts);
  const blob = await Packer.toBlob(doc);

  const orgSlug = (inputs.company.organizationName ?? 'acme-corp')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const dateSlug = new Date().toISOString().slice(0, 10);
  const filename = `cybrisk-${orgSlug}-${inputs.company.industry}-risk-assessment-${dateSlug}.docx`;

  saveAs(blob, filename);
}
