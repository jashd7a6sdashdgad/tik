import { cookies } from 'next/headers';

export async function getGoogleAccessToken() {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get('google_access_token')?.value;
  const refreshToken = cookieStore.get('google_refresh_token')?.value;

  // If no access token, return null
  if (!accessToken && !refreshToken) return null;

  // Test token validity
  const check = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + accessToken);
  if (check.ok) return accessToken;

  // If invalid, try refresh
  if (refreshToken) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!res.ok) throw new Error('Failed to refresh token');
    const data = await res.json();
    accessToken = data.access_token;

    // Update cookie (with type guard)
    if (accessToken) {
        cookieStore.set('google_access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: data.expires_in || 3600
      });
    }

    return accessToken;
  }

  return null;
}
