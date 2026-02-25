'use client';

import type { AssessmentInputs, Industry, RevenueBand, EmployeeCount, Geography, DataType, ThreatType, IncidentHistory } from '@/lib/types';

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

const DATA_TYPE_LABELS: Record<DataType, string> = {
  customer_pii: 'Customer PII',
  employee_pii: 'Employee PII',
  payment_card: 'Payment Card (PCI)',
  health_records: 'Health Records (PHI)',
  ip: 'Intellectual Property',
  financial: 'Financial Records',
};

const THREAT_LABELS: Record<ThreatType, string> = {
  ransomware: 'Ransomware',
  bec_phishing: 'BEC/Phishing',
  insider_threat: 'Insider Threat',
  third_party: 'Third-Party',
  web_app_attack: 'Web App Attack',
  system_intrusion: 'System Intrusion',
  lost_stolen: 'Lost/Stolen Assets',
};

const INCIDENT_LABELS: Record<IncidentHistory, string> = {
  '0': 'None',
  '1': '1',
  '2_5': '2-5',
  '5_plus': '5+',
};

const CONTROL_LABELS: Record<string, string> = {
  securityTeam: 'Security Team/CISO',
  irPlan: 'Incident Response Plan',
  aiAutomation: 'AI/Automation Tools',
  mfa: 'MFA on Critical Systems',
  pentest: 'Regular Pen Testing',
  cyberInsurance: 'Cyber Insurance',
};

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span style={{ color: '#4a6080' }}>{label}</span>
      <span style={{ color: color ?? '#c0d0e8' }}>{value}</span>
    </div>
  );
}

function BoolRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span style={{ color: '#4a6080' }}>{label}</span>
      <span
        style={{
          color: value ? '#22c55e' : '#ef4444',
        }}
      >
        {value ? 'YES' : 'NO'}
      </span>
    </div>
  );
}

export default function StepReview({ data }: StepProps) {
  const company = data.company;
  const dataProfile = data.data;
  const controls = data.controls;
  const threats = data.threats;

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2
          className="text-xl font-semibold text-[#f0f4ff] mb-1"
          style={{ fontFamily: 'var(--font-playfair)' }}
        >
          Review & Calculate
        </h2>
        <p
          className="text-sm"
          style={{ fontFamily: 'var(--font-geist-mono)', color: '#4a6080' }}
        >
          // verify inputs before Monte Carlo simulation (N=100,000)
        </p>
      </div>

      {/* Terminal-style readout */}
      <div
        className="rounded-lg p-5 space-y-5 text-xs"
        style={{
          fontFamily: 'var(--font-geist-mono)',
          background: 'rgba(2,5,14,0.8)',
          border: '1px solid rgba(0,180,255,0.1)',
        }}
      >
        {/* COMPANY section */}
        <div>
          <div
            className="text-[10px] uppercase tracking-[0.2em] mb-2 pb-1"
            style={{
              color: '#00d4ff',
              borderBottom: '1px solid rgba(0,180,255,0.1)',
            }}
          >
            {'>'} COMPANY
          </div>
          {company?.organizationName && (
            <Row
              label="organization"
              value={company.organizationName}
              color="#f0f4ff"
            />
          )}
          {company?.industry && (
            <Row
              label="industry"
              value={INDUSTRY_LABELS[company.industry]}
              color="#00d4ff"
            />
          )}
          {company?.revenueBand && (
            <Row label="revenue" value={REVENUE_LABELS[company.revenueBand]} />
          )}
          {company?.employees && (
            <Row
              label="employees"
              value={EMPLOYEE_LABELS[company.employees]}
            />
          )}
          {company?.geography && (
            <Row
              label="geography"
              value={GEOGRAPHY_LABELS[company.geography]}
            />
          )}
        </div>

        {/* DATA section */}
        <div>
          <div
            className="text-[10px] uppercase tracking-[0.2em] mb-2 pb-1"
            style={{
              color: '#00d4ff',
              borderBottom: '1px solid rgba(0,180,255,0.1)',
            }}
          >
            {'>'} DATA
          </div>
          <Row
            label="data_types"
            value={
              (dataProfile?.dataTypes ?? [])
                .map((dt) => DATA_TYPE_LABELS[dt])
                .join(', ') || 'None'
            }
          />
          <Row
            label="records"
            value={(dataProfile?.recordCount ?? 100000).toLocaleString()}
          />
          <Row
            label="cloud_pct"
            value={`${dataProfile?.cloudPercentage ?? 50}%`}
          />
        </div>

        {/* CONTROLS section */}
        <div>
          <div
            className="text-[10px] uppercase tracking-[0.2em] mb-2 pb-1"
            style={{
              color: '#00d4ff',
              borderBottom: '1px solid rgba(0,180,255,0.1)',
            }}
          >
            {'>'} CONTROLS
          </div>
          {controls &&
            Object.entries(CONTROL_LABELS).map(([key, label]) => (
              <BoolRow
                key={key}
                label={label}
                value={controls[key as keyof typeof controls] ?? false}
              />
            ))}
        </div>

        {/* THREATS section */}
        <div>
          <div
            className="text-[10px] uppercase tracking-[0.2em] mb-2 pb-1"
            style={{
              color: '#00d4ff',
              borderBottom: '1px solid rgba(0,180,255,0.1)',
            }}
          >
            {'>'} THREATS
          </div>
          <Row
            label="top_concerns"
            value={
              (threats?.topConcerns ?? [])
                .map((t) => THREAT_LABELS[t])
                .join(', ') || 'None'
            }
          />
          <Row
            label="prev_incidents"
            value={INCIDENT_LABELS[threats?.previousIncidents ?? '0']}
          />
        </div>
      </div>

      {/* Simulation note */}
      <div
        className="text-center text-xs p-3 rounded-lg"
        style={{
          fontFamily: 'var(--font-geist-mono)',
          color: '#4a6080',
          background: 'rgba(0,180,255,0.03)',
          border: '1px solid rgba(0,180,255,0.06)',
        }}
      >
        Ready to run 100,000 Monte Carlo simulations using FAIR methodology
      </div>
    </div>
  );
}
