import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google';

export async function GET(request: NextRequest) {
  try {
    const authUrl = getAuthUrl();
    
    return NextResponse.json({
      success: true,
      authUrl,
      message: 'Authorization URL generated successfully'
    });
  } catch (error: any) {
    console.error('Google auth URL generation error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to generate authorization URL'
      },
      { status: 500 }
    );
  }
}