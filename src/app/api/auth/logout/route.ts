import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_OPTIONS } from '@/lib/auth';
import { AuthResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json<AuthResponse>({
      success: true,
      message: 'Logout successful'
    });

    // Clear the auth cookie
    response.cookies.set(
      COOKIE_OPTIONS.name,
      '',
      {
        ...COOKIE_OPTIONS.options,
        maxAge: 0
      }
    );

    return response;

  } catch (error: any) {
    console.error('Logout error:', error);
    
    return NextResponse.json<AuthResponse>(
      { 
        success: false, 
        message: 'Logout failed' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Method not allowed' },
    { status: 405 }
  );
}