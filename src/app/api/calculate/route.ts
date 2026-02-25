import { NextRequest, NextResponse } from 'next/server';
import { simulate } from '@/lib/monte-carlo';
import type { AssessmentInputs } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as AssessmentInputs;

    // Basic validation: check required fields exist
    if (!body.company?.industry || !body.data?.dataTypes || !body.controls || !body.threats) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    const results = simulate(body);

    // Don't send rawLosses to client (10K numbers is too much)
    const { rawLosses, ...clientResults } = results;

    return NextResponse.json(clientResults);
  } catch (error) {
    return NextResponse.json(
      { error: 'Simulation failed' },
      { status: 500 },
    );
  }
}
