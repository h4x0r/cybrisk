import { createClient } from '@libsql/client';
import type { AssessmentInputs } from '@/lib/types';
import type { Currency } from '@/lib/currency';

// Singleton client — created once per process (safe for Vercel serverless)
let _client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!_client) {
    _client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _client;
}

export interface LeadData {
  id: string;
  email: string;
  geography: string;
  industry: string;
  revenue: string;
  answers: AssessmentInputs;
  aleMean: number;
  aleP95: number;
  currency: Currency;
}

export async function insertLead(lead: LeadData): Promise<void> {
  const client = getClient();
  await client.execute({
    sql: `INSERT INTO leads (id, email, geography, industry, revenue, answers, ale_mean, ale_p95, currency)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      lead.id,
      lead.email,
      lead.geography,
      lead.industry,
      lead.revenue,
      JSON.stringify(lead.answers),
      lead.aleMean,
      lead.aleP95,
      lead.currency,
    ],
  });
}
