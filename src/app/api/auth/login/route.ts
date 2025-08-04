import { NextRequest, NextResponse } from 'next/server';
import { validateCredentials, generateToken, COOKIE_OPTIONS } from '@/lib/auth';
import { LoginCredentials, AuthResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: LoginCredentials = await request.json();
    
    // Validate request body
    if (!body.username || !body.password) {
      return NextResponse.json<AuthResponse>(
        { success: false, message: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Validate credentials
    const user = await validateCredentials(body);
    
    // Generate JWT token
    const token = generateToken(user);
    
    // Create response
    const response = NextResponse.json<AuthResponse>({
      success: true,
      user,
      message: 'Login successful'
    });

    // Set httpOnly cookie
    response.cookies.set(
      COOKIE_OPTIONS.name,
      token,
      COOKIE_OPTIONS.options
    );

    return response;

  } catch (error: any) {
    console.error('Login error:', error);
    
    return NextResponse.json<AuthResponse>(
      { 
        success: false, 
        message: error.message || 'Login failed' 
      },
      { status: 401 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Method not allowed' },
    { status: 405 }
  );
}