# YouTube OAuth2 Migration Guide

## Overview
YouTube API integration has been migrated from API Key authentication to OAuth2 for better security and access to more features.

## Changes Made

### 1. Updated YouTube API Route (`/src/app/api/youtube/route.ts`)
- **Before**: Used `YOUTUBE_API_KEY` and `YOUTUBE_CHANNEL_ID` environment variables
- **After**: Uses Google OAuth2 tokens from cookies (`google_access_token`, `google_refresh_token`)
- **Benefits**: 
  - Access to user's own YouTube channel data
  - Can perform actions like commenting and liking videos
  - Better security with token-based authentication
  - No need to manage API quotas separately

### 2. Updated Environment Validation (`/src/lib/env-validation.ts`)
- **Removed**: `YOUTUBE_API_KEY` and `YOUTUBE_CHANNEL_ID` validation
- **Added**: Google OAuth validation (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`)
- **Note**: YouTube access is now handled through Google OAuth2 scopes

### 3. Enhanced Error Handling
- Added OAuth-specific error detection
- Better error messages for token expiration
- Guidance for re-authentication when tokens are invalid

## Required Environment Variables

### Remove These (No Longer Needed)
```env
YOUTUBE_API_KEY=  # Remove this
YOUTUBE_CHANNEL_ID=  # Remove this
```

### Ensure These Are Set
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret  
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
```

## Google Cloud Console Setup

### 1. Enable APIs
- YouTube Data API v3
- Google Calendar API  
- Gmail API
- Google Sheets API

### 2. OAuth2 Scopes
The following scopes are already configured in `/src/lib/google.ts`:
```javascript
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/contacts',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/youtube.readonly',  // For reading YouTube data
  'https://www.googleapis.com/auth/youtube'           // For YouTube actions
];
```

## User Authentication Flow

### 1. Initial Authentication
Users must authenticate with Google via `/api/google/auth` to access YouTube features.

### 2. Token Management
- Access tokens are stored in `google_access_token` cookie
- Refresh tokens are stored in `google_refresh_token` cookie
- Tokens are automatically refreshed when they expire

### 3. YouTube API Access
Once authenticated, users can:
- View their channel statistics
- Get their recent videos
- Search YouTube videos
- Comment on videos (requires write permissions)
- Like/dislike videos (requires write permissions)

## API Endpoints

### YouTube Channel Stats
```http
GET /api/youtube?action=channel_stats
```
Returns the authenticated user's YouTube channel information.

### Recent Videos
```http
GET /api/youtube?action=videos&maxResults=10
```
Returns the user's recent YouTube videos.

### Search Videos
```http
GET /api/youtube?action=search&q=search_term
```
Searches YouTube for videos matching the query.

### Test Connection
```http
GET /api/youtube?action=connect
```
Tests the YouTube API connection and returns basic channel info.

## Error Handling

### Common Error Responses

#### Authentication Required
```json
{
  "success": false,
  "message": "Google authentication required for YouTube API access.",
  "error": "YOUTUBE_OAUTH_REQUIRED",
  "help": "Please authenticate with Google first via /api/google/auth"
}
```

#### Token Expired
```json
{
  "success": false,
  "message": "YouTube OAuth authentication failed: Access token expired.",
  "error": "YOUTUBE_OAUTH_INVALID",
  "help": "Re-authenticate via /api/google/auth to refresh your tokens"
}
```

#### Quota Exceeded
```json
{
  "success": false,
  "message": "YouTube API quota exceeded.",
  "error": "YOUTUBE_QUOTA_EXCEEDED",
  "help": "Check quota usage in Google Cloud Console"
}
```

## Voice Commands

The following voice commands now work with OAuth2:

- "Show my YouTube stats"
- "How many YouTube videos do I have"
- "What's my YouTube view count"
- "Show my analytics" (includes YouTube data)

## Migration Steps for Existing Users

1. **Remove old environment variables** from `.env.local`:
   ```bash
   # Remove these lines
   YOUTUBE_API_KEY=...
   YOUTUBE_CHANNEL_ID=...
   ```

2. **Ensure Google OAuth is configured**:
   ```bash
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
   ```

3. **Restart the development server**:
   ```bash
   npm run dev
   ```

4. **Re-authenticate with Google**:
   - Visit `/api/google/auth`
   - Grant permissions for YouTube access
   - Complete the OAuth flow

5. **Test YouTube integration**:
   - Visit the tracking page
   - Use voice commands for YouTube data
   - Check the browser console for any errors

## Benefits of OAuth2 Migration

### Security
- No more API keys in environment variables
- Token-based authentication with automatic refresh
- User-specific access to their own YouTube data

### Functionality  
- Can now perform write operations (comments, likes)
- Access to user's private channel data
- Better integration with Google's ecosystem

### User Experience
- Seamless integration with existing Google authentication
- Real-time data from user's actual YouTube channel
- More accurate analytics and statistics

## Troubleshooting

### Issue: "Google authentication required"
**Solution**: User needs to authenticate via `/api/google/auth`

### Issue: "Access token expired"  
**Solution**: Re-authenticate or implement automatic token refresh

### Issue: "Insufficient permissions"
**Solution**: Ensure YouTube scopes are included in OAuth consent screen

### Issue: YouTube data shows as unavailable
**Solution**: Check that user has a YouTube channel associated with their Google account

## Testing

To test the OAuth2 integration:

1. **Authentication Test**:
   ```bash
   curl -b "session_cookie=..." http://localhost:3000/api/youtube?action=connect
   ```

2. **Channel Stats Test**:
   ```bash
   curl -b "session_cookie=..." http://localhost:3000/api/youtube?action=channel_stats
   ```

3. **Analytics Integration Test**:
   ```bash
   curl -b "session_cookie=..." http://localhost:3000/api/analytics/tracking
   ```

The migration is complete and YouTube integration now uses secure OAuth2 authentication!