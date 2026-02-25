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
  convertInchesToTwip,
  LevelFormat,
} from 'docx';
import { saveAs } from 'file-saver';
import type { AssessmentInputs, SimulationResults, Industry } from '@/lib/types';
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
function buildDocument(
  inputs: AssessmentInputs,
  results: SimulationResults,
): Document {
  const orgName =
    inputs.company.organizationName?.trim() || 'Organisation';
  const industry = INDUSTRY_NAMES[inputs.company.industry];
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const revenue = REVENUE_MIDPOINTS[inputs.company.revenueBand];

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
          dataCell('Regulatory Framework'),
          dataCell(
            REGULATORY_EXPOSURE[inputs.company.geography]?.framework ?? 'N/A',
          ),
        ],
      }),
      new TableRow({
        children: [
          dataCell('Max Regulatory Fine Exposure'),
          dataCell(
            fmtPct(
              REGULATORY_EXPOSURE[inputs.company.geography]?.maxPctRevenue ?? 0,
            ) + ' of revenue',
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
  const doc = buildDocument(inputs, results);
  const blob = await Packer.toBlob(doc);

  const orgSlug = (inputs.company.organizationName ?? 'org')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const dateSlug = new Date().toISOString().slice(0, 10);
  const filename = `cybrisk-${orgSlug}-${inputs.company.industry}-risk-assessment-${dateSlug}.docx`;

  saveAs(blob, filename);
}
