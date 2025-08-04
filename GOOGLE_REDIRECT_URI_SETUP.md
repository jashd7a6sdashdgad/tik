# Google OAuth2 Redirect URI Configuration

## Overview
This document explains how to configure Google OAuth2 redirect URIs for both local development and production deployment on server IP `31.97.186.247`.

## Environment Variables

### Local Development (.env.local)
```env
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
GOOGLE_REDIRECT_URI_SERVER=http://31.97.186.247/api/google/callback
```

### Production (.env.production)
```env
GOOGLE_REDIRECT_URI=http://31.97.186.247/api/google/callback
GOOGLE_REDIRECT_URI_SERVER=http://31.97.186.247/api/google/callback
```

## Environment-Aware Redirect URI Logic

The application automatically selects the appropriate redirect URI based on the environment:

1. **Development Mode**: Uses `GOOGLE_REDIRECT_URI` (localhost)
2. **Production Mode**: Uses `GOOGLE_REDIRECT_URI_SERVER` if available, falls back to `GOOGLE_REDIRECT_URI`
3. **Server Override**: If `GOOGLE_REDIRECT_URI_SERVER` is set, it takes priority regardless of environment

## Google Cloud Console Setup

### Required Redirect URIs

Add both URLs to your Google Cloud Console OAuth2 credentials:

1. **Development**: `http://localhost:3000/api/google/callback`
2. **Production**: `http://31.97.186.247/api/google/callback`

### Steps to Configure

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Click your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, add:
   - `http://localhost:3000/api/google/callback`
   - `http://31.97.186.247/api/google/callback`
5. Click **Save**

## Code Implementation

### Dynamic Redirect URI Selection

The `src/lib/google.ts` file contains logic to automatically select the correct redirect URI:

```typescript
// Get the appropriate redirect URI based on environment
function getRedirectUri() {
  // In production or when GOOGLE_REDIRECT_URI_SERVER is set, use server URI
  if (process.env.NODE_ENV === 'production' || process.env.GOOGLE_REDIRECT_URI_SERVER) {
    return process.env.GOOGLE_REDIRECT_URI_SERVER || process.env.GOOGLE_REDIRECT_URI;
  }
  // Otherwise use the default local URI
  return process.env.GOOGLE_REDIRECT_URI;
}
```

### Debugging Helper

Use `getCurrentRedirectUri()` to see which redirect URI is being used:

```typescript
import { getCurrentRedirectUri } from '@/lib/google';

console.log('Current redirect URI:', getCurrentRedirectUri());
```

## Authentication Flow

### Local Development
1. User visits `/api/google/auth`
2. Redirected to Google OAuth with `http://localhost:3000/api/google/callback`
3. After authorization, Google redirects to `http://localhost:3000/api/google/callback`
4. Tokens are stored in cookies and user is redirected to `/settings`

### Production Deployment
1. User visits `/api/google/auth`
2. Redirected to Google OAuth with `http://31.97.186.247/api/google/callback`
3. After authorization, Google redirects to `http://31.97.186.247/api/google/callback`
4. Tokens are stored in cookies and user is redirected to `/settings`

## Environment Validation

The application validates redirect URI configuration on startup:

```
🔴 Google OAuth Configuration (includes YouTube):
  GOOGLE_CLIENT_ID: 573350886841...
  GOOGLE_CLIENT_SECRET: GOCSPX...
  GOOGLE_REDIRECT_URI: http://localhost:3000/api/google/callback
  GOOGLE_REDIRECT_URI_SERVER: http://31.97.186.247/api/google/callback
  ✅ Google Client ID is set
  ✅ Google Client Secret is set
  ✅ Google Redirect URI is set
  ✅ Google Server Redirect URI is set for production/server deployment
  🌐 Server redirect URI configured for IP: 31.97.186.247
```

## Testing

### Test Local Configuration
```bash
# Start development server
npm run dev

# Visit the auth URL
curl http://localhost:3000/api/google/auth
```

### Test Production Configuration
```bash
# Set environment to production
NODE_ENV=production npm start

# Visit the auth URL
curl http://31.97.186.247/api/google/auth
```

## Troubleshooting

### Common Issues

#### "redirect_uri_mismatch" Error
- **Cause**: The redirect URI in the request doesn't match any authorized URIs in Google Cloud Console
- **Solution**: Ensure both `http://localhost:3000/api/google/callback` and `http://31.97.186.247/api/google/callback` are added to your OAuth credentials

#### Wrong Redirect URI Selected
- **Check Environment**: Verify `NODE_ENV` and `GOOGLE_REDIRECT_URI_SERVER` values
- **Debug Output**: Use `getCurrentRedirectUri()` to see which URI is being used
- **Environment Variables**: Ensure `.env.local` and `.env.production` are properly configured

#### HTTPS vs HTTP
- **Development**: Uses HTTP for localhost
- **Production**: Uses HTTP for IP address (HTTPS requires domain and SSL certificate)
- **Future**: When adding a domain, update to HTTPS

## Migration Notes

### From Previous Configuration

The old configuration used:
```env
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google  # Wrong path
```

New configuration fixes the path and adds server support:
```env
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback  # Correct path
GOOGLE_REDIRECT_URI_SERVER=http://31.97.186.247/api/google/callback  # Server support
```

### Required Actions

1. ✅ Update environment variables in `.env.local` and `.env.production`
2. ✅ Add both redirect URIs to Google Cloud Console
3. ✅ Update Google OAuth client to use environment-aware redirect URI selection
4. ✅ Add environment validation for new variables
5. ⚠️  Test authentication flow in both environments

## Security Considerations

### Local Development
- Uses HTTP for localhost (acceptable for development)
- Tokens stored in httpOnly cookies with `secure: false`

### Production
- Consider upgrading to HTTPS when domain is available
- Tokens stored in httpOnly cookies with `secure: true` for HTTPS
- IP-based OAuth is less secure than domain-based but functional

### Future Improvements
- Add domain name and SSL certificate for HTTPS
- Implement token encryption for additional security
- Add rate limiting for OAuth endpoints

## Summary

The application now supports dual redirect URI configuration:
- **Development**: `http://localhost:3000/api/google/callback`
- **Production**: `http://31.97.186.247/api/google/callback`

The redirect URI is automatically selected based on environment, providing seamless OAuth2 authentication for both development and production deployments.