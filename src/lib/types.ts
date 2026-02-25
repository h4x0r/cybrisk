// Industry — 17 industries from IBM Cost of a Data Breach 2025
export type Industry =
  | 'healthcare'
  | 'financial'
  | 'pharmaceuticals'
  | 'technology'
  | 'energy'
  | 'industrial'
  | 'services'
  | 'retail'
  | 'education'
  | 'entertainment'
  | 'communications'
  | 'consumer'
  | 'media'
  | 'research'
  | 'transportation'
  | 'hospitality'
  | 'public_sector';

export type RevenueBand =
  | 'under_50m'
  | '50m_250m'
  | '250m_1b'
  | '1b_5b'
  | 'over_5b';

export type EmployeeCount =
  | 'under_250'
  | '250_1000'
  | '1000_5000'
  | '5000_25000'
  | 'over_25000';

export type Geography = 'us' | 'uk' | 'eu' | 'hk' | 'sg' | 'other';

export type DataType =
  | 'customer_pii'
  | 'employee_pii'
  | 'payment_card'
  | 'health_records'
  | 'ip'
  | 'financial';

export type ThreatType =
  | 'ransomware'
  | 'bec_phishing'
  | 'insider_threat'
  | 'third_party'
  | 'web_app_attack'
  | 'system_intrusion'
  | 'lost_stolen';

export type IncidentHistory = '0' | '1' | '2_5' | '5_plus';

export type RiskRating = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface CompanyProfile {
  organizationName?: string;
  industry: Industry;
  revenueBand: RevenueBand;
  employees: EmployeeCount;
  geography: Geography;
}

export interface DataProfile {
  dataTypes: DataType[];
  recordCount: number;
  cloudPercentage: number;
}

export interface SecurityControls {
  securityTeam: boolean;
  irPlan: boolean;
  aiAutomation: boolean;
  mfa: boolean;
  pentest: boolean;
  cyberInsurance: boolean;
}

export interface ThreatLandscape {
  topConcerns: ThreatType[]; // max 3
  previousIncidents: IncidentHistory;
}

export interface AssessmentInputs {
  company: CompanyProfile;
  data: DataProfile;
  controls: SecurityControls;
  threats: ThreatLandscape;
}

export interface DistributionBucket {
  rangeLabel: string;
  minValue: number;
  maxValue: number;
  probability: number;
}

export interface ExceedancePoint {
  loss: number;
  probability: number;
}

export interface KeyDriver {
  factor: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
}

export interface SimulationResults {
  ale: {
    mean: number;
    median: number;
    p10: number;
    p90: number;
    p95: number;
  };
  gordonLoebSpend: number;
  riskRating: RiskRating;
  industryBenchmark: {
    yourAle: number;
    industryMedian: number;
    percentileRank: number;
  };
  distributionBuckets: DistributionBucket[];
  exceedanceCurve: ExceedancePoint[];
  keyDrivers: KeyDriver[];
  recommendations: string[];
  rawLosses: number[];
}
