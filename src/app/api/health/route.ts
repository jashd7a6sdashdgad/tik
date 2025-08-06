import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'Personal Assistant API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    features: {
      expenses: true,
      notes: true,
      bookmarks: true,
      extension: true
    }
  });
}