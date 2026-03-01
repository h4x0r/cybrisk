import { Resend } from 'resend';
import { insertLead } from '@/lib/turso';
import { generateReportBuffer } from '@/lib/docx-report';
import { FALLBACK_RATES } from '@/lib/currency';
import type { AssessmentInputs, SimulationResults } from '@/lib/types';
import type { Currency } from '@/lib/currency';

const resend = new Resend(process.env.RESEND_API_KEY);

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  const body = await req.json() as {
    email: string;
    inputs: AssessmentInputs;
    results: SimulationResults;
    currency: Currency;
    rates?: Record<Currency, number>;
    narrative?: string;
  };

  if (!body.email || !isValidEmail(body.email)) {
    return Response.json({ ok: false, error: 'Invalid email address' }, { status: 400 });
  }

  const rates = body.rates ?? FALLBACK_RATES;

  // 1. Generate DOCX
  let docxBuffer: Buffer;
  try {
    docxBuffer = await generateReportBuffer(
      body.inputs,
      body.results,
      body.currency,
      rates,
      body.narrative,
    );
  } catch (err) {
    console.error('DOCX generation failed:', err);
    return Response.json({ ok: false, error: 'Report generation failed' }, { status: 500 });
  }

  // 2. Send email via Resend
  try {
    await resend.emails.send({
      from: 'CybRisk <reports@cybrisk.ai>',
      to: body.email,
      bcc: process.env.REPORT_RECIPIENT_EMAIL ?? undefined,
      subject: `Your CybRisk Report — ${body.inputs.company.industry} · ${body.inputs.company.geography}`,
      text: `Your CybRisk assessment is attached.\n\nAnnual Loss Expectancy (mean): ${body.results.ale.mean.toLocaleString()} ${body.currency}\nRisk Rating: ${body.results.riskRating}\n\nCybRisk — https://cybrisk.vercel.app`,
      attachments: [
        {
          filename: 'CybRisk-Report.docx',
          content: docxBuffer,
        },
      ],
    });
  } catch (err) {
    console.error('Email send failed:', err);
    return Response.json({ ok: false, error: 'Email delivery failed' }, { status: 502 });
  }

  // 3. Insert lead into Turso
  try {
    await insertLead({
      id: crypto.randomUUID(),
      email: body.email,
      geography: body.inputs.company.geography,
      industry: body.inputs.company.industry,
      revenue: body.inputs.company.revenueBand,
      answers: body.inputs,
      aleMean: body.results.ale.mean,
      aleP95: body.results.ale.p95,
      currency: body.currency,
    });
  } catch (err) {
    // Lead capture failure is non-fatal — email already sent
    console.error('Lead insert failed:', err);
  }

  return Response.json({ ok: true });
}
