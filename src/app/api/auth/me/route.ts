import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_OPTIONS } from '@/lib/auth';
import { AuthResponse } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_OPTIONS.name)?.value;
    
    if (!token) {
      return NextResponse.json<AuthResponse>(
        { success: false, message: 'No authentication token found' },
        { status: 401 }
      );
    }

    const user = verifyToken(token);
    
    return NextResponse.json<AuthResponse>({
      success: true,
      user,
      message: 'User authenticated'
    });

  } catch (error: any) {
    console.error('Auth verification error:', error);
    
    return NextResponse.json<AuthResponse>(
      { 
        success: false, 
        message: 'Invalid or expired token' 
      },
      { status: 401 }
    );
  }
}