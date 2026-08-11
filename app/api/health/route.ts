import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'SADPF API (SSP-DF)',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
