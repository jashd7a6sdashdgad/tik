# N8N Webhook URL Update

## Overview
The N8N webhook URL has been updated to the new Hostinger server endpoint.

## New Webhook URL
```
https://n8n.srv903406.hstgr.cloud/webhook/990e6a3a-6881-4ae3-a345-5d5ef28f5f58
```

## Files Updated

### 1. Environment Files
- **`.env.local`**: Updated with new webhook URL
- **`.env.production`**: Updated with new webhook URL  
- **`README.md`**: Updated example configuration

### 2. Environment Validation
- **`src/lib/env-validation.ts`**: Added N8N webhook URL validation
- **Added validation checks**:
  - URL format validation
  - Placeholder detection
  - Hostinger server recognition
  - Protocol validation (http/https)

### 3. YouTube Configuration Cleanup
- **Removed obsolete YouTube API key variables** from `.env.local`
- **Added comments** explaining OAuth2 migration
- **Updated environment validation** to remove YouTube API key checks

## Integration Points

### 1. Webhook Route (`/src/app/api/n8n/webhook/route.ts`)
- ✅ **Already configured** to use `N8N_WEBHOOK_URL` environment variable
- ✅ **No code changes needed** - uses environment variable
- ✅ **Proper error handling** for invalid/missing URLs
- ✅ **Authentication required** for webhook calls

### 2. Voice Recording Integration
- ✅ **Uses internal route** `/api/n8n/webhook` (not direct webhook)
- ✅ **No changes needed** - routes through application

### 3. Supported Webhook Types
The webhook supports the following data types:
- `chat` - Chat messages
- `shopping-list` - Shopping list items
- `expense` - Expense tracking
- `contact` - Contact management
- `hotel-expense` - Hotel expense tracking
- `diary` - Diary entries
- `calendar` - Calendar events
- `email` - Email actions
- `firecrawl` - Web scraping requests
- `voice_message` - Voice recordings (base64 encoded)
- `file_upload` - File uploads (base64 encoded)

## Testing

### 1. Test Script Created
- **File**: `test-webhook.js`
- **Features**:
  - Direct webhook testing
  - Application route testing
  - Configuration validation
  - Multiple payload types testing

### 2. Test Commands
```bash
# Basic test (requires session cookie)
node test-webhook.js

# Test with session cookie
node test-webhook.js "session_cookie=your_cookie_value"
```

### 3. Manual Testing
```bash
# Test via application route
curl -X POST http://localhost:3000/api/n8n/webhook \
  -H "Content-Type: application/json" \
  -H "Cookie: session_cookie=your_cookie" \
  -d '{
    "type": "chat",
    "action": "message", 
    "data": {
      "message": "Test message",
      "timestamp": "'$(date -Iseconds)'"
    }
  }'
```

## Environment Variable Configuration

### Development (`.env.local`)
```env
N8N_WEBHOOK_URL=https://n8n.srv903406.hstgr.cloud/webhook/990e6a3a-6881-4ae3-a345-5d5ef28f5f58
NEXT_PUBLIC_N8N_WEBHOOK_URL=/api/n8n/webhook
```

### Production (`.env.production`)
```env
N8N_WEBHOOK_URL=https://n8n.srv903406.hstgr.cloud/webhook/990e6a3a-6881-4ae3-a345-5d5ef28f5f58
```

## Error Handling

### 1. Configuration Errors
```json
{
  "success": true,
  "message": "N8n webhook URL not configured - webhook call skipped",
  "data": {
    "response": "N8n webhook not configured. Please set N8N_WEBHOOK_URL environment variable."
  }
}
```

### 2. Invalid URL Format
```json
{
  "success": true,
  "message": "N8n webhook URL invalid - webhook call skipped", 
  "data": {
    "response": "N8n webhook URL format is invalid. Please check N8N_WEBHOOK_URL environment variable."
  }
}
```

### 3. Authentication Required
```json
{
  "success": false,
  "message": "Authentication required"
}
```

### 4. Webhook Call Failed
```json
{
  "success": false,
  "message": "N8n webhook failed with status: 500"
}
```

## Security Considerations

### 1. Authentication Required
- ✅ **All webhook calls require authentication**
- ✅ **User context is added to payload**
- ✅ **Session validation on every request**

### 2. URL Validation
- ✅ **URL format validation**
- ✅ **Protocol validation (HTTPS recommended)**
- ✅ **Environment variable usage (no hardcoded URLs)**

### 3. Payload Enrichment
- ✅ **User ID added to all payloads**
- ✅ **Timestamp added to all payloads**
- ✅ **Request validation before sending**

## N8N Workflow Setup

### Expected Webhook Configuration in N8N
1. **HTTP Request Node**: Listen for POST requests
2. **Webhook URL**: `https://n8n.srv903406.hstgr.cloud/webhook/990e6a3a-6881-4ae3-a345-5d5ef28f5f58`
3. **Expected Headers**: `Content-Type: application/json`
4. **Expected Body Structure**:
   ```json
   {
     "type": "string",
     "action": "string", 
     "data": "object",
     "userId": "string",
     "timestamp": "ISO8601"
   }
   ```

### Response Format from N8N
The application expects N8N to return JSON with one of these fields:
- `response` - Main response text
- `message` - Alternative response text
- `text` - Text response
- `output` - Output response

## Monitoring and Debugging

### 1. Server Logs
```bash
# Check application logs for webhook calls
console.log('N8n webhook called, URL:', N8N_WEBHOOK_URL);
console.log('N8n workflow response:', n8nResult);
```

### 2. Environment Validation
```bash
# Check startup logs for webhook validation
🔗 N8N Webhook Configuration:
  N8N_WEBHOOK_URL: https://n8n.srv903406.hstgr.cloud/webhook/...
  ✅ N8N webhook URL is configured for Hostinger server
```

### 3. Browser Network Tab
- Monitor `/api/n8n/webhook` requests
- Check request/response payloads
- Verify authentication cookies

## Migration Checklist

- [x] **Update `.env.local`** with new webhook URL
- [x] **Update `.env.production`** with new webhook URL
- [x] **Update `README.md`** with new example URL
- [x] **Add environment validation** for webhook URL
- [x] **Clean up YouTube API key variables** (OAuth2 migration)
- [x] **Create test script** for webhook validation
- [x] **Document integration points** and usage
- [x] **Verify existing code compatibility** (no changes needed)

## Rollback Plan

If issues occur with the new webhook URL:

1. **Revert environment variables**:
   ```bash
   N8N_WEBHOOK_URL=old_webhook_url_here
   ```

2. **Restart application**:
   ```bash
   npm run dev  # Development
   # or restart production server
   ```

3. **Test functionality**:
   ```bash
   node test-webhook.js
   ```

The webhook URL update is complete and ready for testing!