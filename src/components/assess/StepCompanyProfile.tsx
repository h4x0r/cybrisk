'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { INDUSTRY_AVG_COST } from '@/lib/lookup-tables';
import type {
  AssessmentInputs,
  Industry,
  RevenueBand,
  EmployeeCount,
  Geography,
} from '@/lib/types';

interface StepProps {
  data: Partial<AssessmentInputs>;
  onUpdate: (data: Partial<AssessmentInputs>) => void;
}

const INDUSTRY_LABELS: Record<Industry, string> = {
  healthcare: 'Healthcare',
  financial: 'Financial',
  pharmaceuticals: 'Pharmaceuticals',
  technology: 'Technology',
  energy: 'Energy',
  industrial: 'Industrial',
  services: 'Services',
  retail: 'Retail',
  education: 'Education',
  entertainment: 'Entertainment',
  communications: 'Communications',
  consumer: 'Consumer',
  media: 'Media',
  research: 'Research',
  transportation: 'Transportation',
  hospitality: 'Hospitality',
  public_sector: 'Public Sector',
};

const REVENUE_LABELS: Record<RevenueBand, string> = {
  under_50m: '<$50M',
  '50m_250m': '$50-250M',
  '250m_1b': '$250M-1B',
  '1b_5b': '$1B-5B',
  over_5b: '$5B+',
};

const EMPLOYEE_LABELS: Record<EmployeeCount, string> = {
  under_250: '<250',
  '250_1000': '250-1,000',
  '1000_5000': '1,000-5,000',
  '5000_25000': '5,000-25,000',
  over_25000: '25,000+',
};

const GEOGRAPHY_LABELS: Record<Geography, string> = {
  us: 'US',
  uk: 'UK',
  eu: 'EU',
  hk: 'Hong Kong',
  sg: 'Singapore',
  other: 'Other',
};

const selectTriggerClass =
  'w-full bg-transparent text-[#f0f4ff] border-[rgba(0,180,255,0.2)] hover:border-[rgba(0,180,255,0.4)] focus:ring-[rgba(0,180,255,0.3)] [&_svg]:text-[#4a6080]';
const selectContentClass =
  'bg-[#0a0f24] border-[rgba(0,180,255,0.2)] text-[#f0f4ff]';
const selectItemClass =
  'focus:bg-[rgba(0,180,255,0.1)] focus:text-[#00d4ff] text-[#c0d0e8]';

export default function StepCompanyProfile({ data, onUpdate }: StepProps) {
  const company = data.company ?? {
    industry: '' as Industry,
    revenueBand: '' as RevenueBand,
    employees: '' as EmployeeCount,
    geography: '' as Geography,
  };

  const update = (field: string, value: string) => {
    onUpdate({
      company: {
        ...company,
        [field]: value,
      } as AssessmentInputs['company'],
    });
  };

  const industries = Object.keys(INDUSTRY_AVG_COST) as Industry[];

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2
          className="text-xl font-semibold text-[#f0f4ff] mb-1"
          style={{ fontFamily: 'var(--font-playfair)' }}
        >
          Company Profile
        </h2>
        <p
          className="text-sm"
          style={{ fontFamily: 'var(--font-geist-mono)', color: '#4a6080' }}
        >
          // baseline parameters for risk calibration
        </p>
      </div>

      {/* Organization Name (optional) */}
      <div className="space-y-2">
        <label
          className="text-xs uppercase tracking-wider"
          style={{ fontFamily: 'var(--font-geist-mono)', color: '#6888aa' }}
        >
          Organization Name <span style={{ color: '#4a6080' }}>(optional)</span>
        </label>
        <input
          type="text"
          value={company.organizationName ?? ''}
          onChange={(e) => update('organizationName', e.target.value)}
          placeholder="e.g. Acme Corp"
          className="w-full px-3 py-2 rounded-md text-sm bg-transparent text-[#f0f4ff] border border-[rgba(0,180,255,0.2)] hover:border-[rgba(0,180,255,0.4)] focus:outline-none focus:ring-1 focus:ring-[rgba(0,180,255,0.3)] placeholder:text-[#4a6080]"
          style={{ fontFamily: 'var(--font-geist-mono)' }}
        />
      </div>

      {/* Industry */}
      <div className="space-y-2">
        <label
          className="text-xs uppercase tracking-wider"
          style={{ fontFamily: 'var(--font-geist-mono)', color: '#6888aa' }}
        >
          Industry
        </label>
        <Select
          value={company.industry || undefined}
          onValueChange={(v) => update('industry', v)}
        >
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue placeholder="Select industry" />
          </SelectTrigger>
          <SelectContent className={selectContentClass}>
            {industries.map((key) => (
              <SelectItem key={key} value={key} className={selectItemClass}>
                {INDUSTRY_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Revenue Band */}
      <div className="space-y-2">
        <label
          className="text-xs uppercase tracking-wider"
          style={{ fontFamily: 'var(--font-geist-mono)', color: '#6888aa' }}
        >
          Annual Revenue
        </label>
        <Select
          value={company.revenueBand || undefined}
          onValueChange={(v) => update('revenueBand', v)}
        >
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue placeholder="Select revenue band" />
          </SelectTrigger>
          <SelectContent className={selectContentClass}>
            {(Object.keys(REVENUE_LABELS) as RevenueBand[]).map((key) => (
              <SelectItem key={key} value={key} className={selectItemClass}>
                {REVENUE_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Employee Count */}
      <div className="space-y-2">
        <label
          className="text-xs uppercase tracking-wider"
          style={{ fontFamily: 'var(--font-geist-mono)', color: '#6888aa' }}
        >
          Employee Count
        </label>
        <Select
          value={company.employees || undefined}
          onValueChange={(v) => update('employees', v)}
        >
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue placeholder="Select employee count" />
          </SelectTrigger>
          <SelectContent className={selectContentClass}>
            {(Object.keys(EMPLOYEE_LABELS) as EmployeeCount[]).map((key) => (
              <SelectItem key={key} value={key} className={selectItemClass}>
                {EMPLOYEE_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Geography */}
      <div className="space-y-2">
        <label
          className="text-xs uppercase tracking-wider"
          style={{ fontFamily: 'var(--font-geist-mono)', color: '#6888aa' }}
        >
          Primary Geography
        </label>
        <Select
          value={company.geography || undefined}
          onValueChange={(v) => update('geography', v)}
        >
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue placeholder="Select geography" />
          </SelectTrigger>
          <SelectContent className={selectContentClass}>
            {(Object.keys(GEOGRAPHY_LABELS) as Geography[]).map((key) => (
              <SelectItem key={key} value={key} className={selectItemClass}>
                {GEOGRAPHY_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
