// Environment variable validation and logging utility
// Next.js automatically loads environment variables from .env.local and .env files

interface EnvConfig {
  // Facebook
  FACEBOOK_PAGE_ACCESS_TOKEN?: string;
  FACEBOOK_PAGE_ID?: string;
  
  // Messenger (uses same Facebook credentials)
  MESSENGER_PAGE_ACCESS_TOKEN?: string;
  MESSENGER_PAGE_ID?: string;
  
  // Google OAuth (includes YouTube access)
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
  GOOGLE_REDIRECT_URI_SERVER?: string;
  
  // N8N Integration
  N8N_WEBHOOK_URL?: string;
  
  // Other
  JWT_SECRET?: string;
}

// Helper function to mask sensitive data for logging
function maskSensitiveData(value: string | undefined, showLength: number = 6): string {
  if (!value) return 'NOT_SET';
  if (value.length <= showLength) return '***';
  return `${value.substring(0, showLength)}...${value.substring(value.length - 3)}`;
}

// Validate and log environment variables
export function validateAndLogEnvVars(): EnvConfig {
  console.log('\n🔧 Environment Variables Validation');
  console.log('=====================================');
  
  const envVars: EnvConfig = {
    FACEBOOK_PAGE_ACCESS_TOKEN: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
    FACEBOOK_PAGE_ID: process.env.FACEBOOK_PAGE_ID,
    MESSENGER_PAGE_ACCESS_TOKEN: process.env.MESSENGER_PAGE_ACCESS_TOKEN,
    MESSENGER_PAGE_ID: process.env.MESSENGER_PAGE_ID,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
    GOOGLE_REDIRECT_URI_SERVER: process.env.GOOGLE_REDIRECT_URI_SERVER,
    N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL,
    JWT_SECRET: process.env.JWT_SECRET,
  };

  // Facebook validation
  console.log('\n📘 Facebook Configuration:');
  console.log(`  FACEBOOK_PAGE_ACCESS_TOKEN: ${maskSensitiveData(envVars.FACEBOOK_PAGE_ACCESS_TOKEN)}`);
  console.log(`  FACEBOOK_PAGE_ID: ${envVars.FACEBOOK_PAGE_ID || 'NOT_SET'}`);
  
  if (!envVars.FACEBOOK_PAGE_ACCESS_TOKEN) {
    console.warn('  ⚠️  Facebook access token is missing');
  } else if (envVars.FACEBOOK_PAGE_ACCESS_TOKEN.length < 100) {
    console.warn('  ⚠️  Facebook access token seems too short (might be invalid)');
  } else {
    console.log('  ✅ Facebook access token appears valid');
  }
  
  if (!envVars.FACEBOOK_PAGE_ID) {
    console.warn('  ⚠️  Facebook page ID is missing');
  } else {
    console.log('  ✅ Facebook page ID is set');
  }

  // Google OAuth validation (includes YouTube access)
  console.log('\n🔴 Google OAuth Configuration (includes YouTube):');
  console.log(`  GOOGLE_CLIENT_ID: ${maskSensitiveData(envVars.GOOGLE_CLIENT_ID, 12)}`);
  console.log(`  GOOGLE_CLIENT_SECRET: ${maskSensitiveData(envVars.GOOGLE_CLIENT_SECRET)}`);
  console.log(`  GOOGLE_REDIRECT_URI: ${envVars.GOOGLE_REDIRECT_URI || 'NOT_SET'}`);
  console.log(`  GOOGLE_REDIRECT_URI_SERVER: ${envVars.GOOGLE_REDIRECT_URI_SERVER || 'NOT_SET'}`);
  
  if (!envVars.GOOGLE_CLIENT_ID) {
    console.warn('  ⚠️  Google Client ID is missing');
  } else {
    console.log('  ✅ Google Client ID is set');
  }
  
  if (!envVars.GOOGLE_CLIENT_SECRET) {
    console.warn('  ⚠️  Google Client Secret is missing');
  } else {
    console.log('  ✅ Google Client Secret is set');
  }
  
  if (!envVars.GOOGLE_REDIRECT_URI) {
    console.warn('  ⚠️  Google Redirect URI is missing');
  } else {
    console.log('  ✅ Google Redirect URI is set');
  }
  
  if (envVars.GOOGLE_REDIRECT_URI_SERVER) {
    console.log('  ✅ Google Server Redirect URI is set for production/server deployment');
    if (envVars.GOOGLE_REDIRECT_URI_SERVER.includes('31.97.186.247')) {
      console.log('  🌐 Server redirect URI configured for IP: 31.97.186.247');
    }
  } else {
    console.log('  ℹ️  Google Server Redirect URI is not set (will use default GOOGLE_REDIRECT_URI)');
  }
  
  console.log('  ℹ️  YouTube access is now handled via Google OAuth2 with appropriate scopes');

  // N8N Integration validation
  console.log('\n🔗 N8N Webhook Configuration:');
  console.log(`  N8N_WEBHOOK_URL: ${envVars.N8N_WEBHOOK_URL || 'NOT_SET'}`);
  
  if (!envVars.N8N_WEBHOOK_URL) {
    console.warn('  ⚠️  N8N webhook URL is missing');
  } else if (envVars.N8N_WEBHOOK_URL.includes('your-n8n-webhook-url')) {
    console.warn('  ⚠️  N8N webhook URL is still using placeholder value');
  } else if (!envVars.N8N_WEBHOOK_URL.startsWith('http')) {
    console.warn('  ⚠️  N8N webhook URL should start with http:// or https://');
  } else if (envVars.N8N_WEBHOOK_URL.includes('n8n.srv903406.hstgr.cloud')) {
    console.log('  ✅ N8N webhook URL is configured for Hostinger server');
  } else {
    console.log('  ✅ N8N webhook URL is set');
  }

  // Other validation
  console.log('\n🔐 Other Configuration:');
  console.log(`  JWT_SECRET: ${maskSensitiveData(envVars.JWT_SECRET, 4)}`);
  
  if (!envVars.JWT_SECRET) {
    console.warn('  ⚠️  JWT secret is missing');
  } else {
    console.log('  ✅ JWT secret is set');
  }

  console.log('\n=====================================\n');
  
  return envVars;
}

// Test API connectivity
export async function testAPIConnectivity() {
  console.log('🧪 Testing API Connectivity');
  console.log('============================');
  
  const envVars = validateAndLogEnvVars();
  
  // Test Facebook API
  if (envVars.FACEBOOK_PAGE_ACCESS_TOKEN && envVars.FACEBOOK_PAGE_ID) {
    console.log('📘 Testing Facebook API...');
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${envVars.FACEBOOK_PAGE_ID}?fields=name&access_token=${envVars.FACEBOOK_PAGE_ACCESS_TOKEN}`
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log(`  ✅ Facebook API connected successfully - Page: ${data.name}`);
      } else {
        const errorData = await response.text();
        console.error(`  ❌ Facebook API error (${response.status}):`, errorData);
      }
    } catch (error) {
      console.error('  ❌ Facebook API connection failed:', error);
    }
  } else {
    console.log('  ⏭️  Skipping Facebook API test (credentials missing)');
  }

  // Test Google OAuth (YouTube will be tested when user authenticates)
  if (envVars.GOOGLE_CLIENT_ID && envVars.GOOGLE_CLIENT_SECRET) {
    console.log('\n🔴 Google OAuth Configuration:');
    console.log('  ✅ Google OAuth is properly configured');
    console.log('  ℹ️  YouTube API will be accessible after user authentication');
    console.log('  ℹ️  Users need to authenticate via /api/google/auth to access YouTube features');
  } else {
    console.log('  ⏭️  Skipping Google OAuth validation (credentials missing)');
    console.warn('  ⚠️  Without Google OAuth, YouTube features will not be available');
  }

  // Test N8N Webhook connectivity
  if (envVars.N8N_WEBHOOK_URL && !envVars.N8N_WEBHOOK_URL.includes('your-n8n-webhook-url')) {
    console.log('\n🔗 Testing N8N Webhook:');
    try {
      // Just validate the URL format - actual testing requires authentication
      new URL(envVars.N8N_WEBHOOK_URL);
      console.log('  ✅ N8N webhook URL format is valid');
      console.log('  ℹ️  Webhook connectivity will be tested when used');
      console.log(`  🌐 Target: ${envVars.N8N_WEBHOOK_URL.substring(0, 50)}...`);
    } catch (error) {
      console.error('  ❌ N8N webhook URL format is invalid:', (error as any).message);
    }
  } else {
    console.log('  ⏭️  Skipping N8N webhook test (URL not configured)');
  }
  
  console.log('============================\n');
}

// Export validated environment variables
export const ENV_VARS = validateAndLogEnvVars();