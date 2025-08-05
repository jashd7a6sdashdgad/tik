import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode } from '@/lib/google';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state'); // Can contain redirect info

    if (error) {
      const redirectPath = state || '/settings';
      return NextResponse.redirect(
        new URL(`${redirectPath}?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code) {
      const redirectPath = state || '/settings';
      return NextResponse.redirect(
        new URL(`${redirectPath}?error=No authorization code received`, request.url)
      );
    }

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);
    console.log('🔑 Google OAuth tokens received successfully');

    // Determine redirect path
    const redirectPath = state || '/settings';
    const redirectUrl = `${redirectPath}?google_auth=success`;
    
    // Create response with redirect
    const response = NextResponse.redirect(new URL(redirectUrl, request.url));

    // Set tokens in httpOnly cookies for security and cross-device access
    response.cookies.set('google_access_token', tokens.access_token || '', {
      httpOnly: false, // Allow client access for cross-device sync
      secure: false, // Allow HTTP for local network
      sameSite: 'lax', // More permissive for network access
      maxAge: tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : 3600,
      path: '/',
      domain: undefined // Allow subdomain access
    });

    if (tokens.refresh_token) {
      response.cookies.set('google_refresh_token', tokens.refresh_token, {
        httpOnly: false, // Allow client access for cross-device sync
        secure: false, // Allow HTTP for local network
        sameSite: 'lax', // More permissive for network access
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
        domain: undefined // Allow subdomain access
      });
    }

    return response;
  } catch (error: any) {
    console.error('Google callback error:', error);
    
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}