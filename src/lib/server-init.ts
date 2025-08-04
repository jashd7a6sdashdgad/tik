// Server initialization with environment validation
import { validateAndLogEnvVars, testAPIConnectivity } from './env-validation';

// Flag to track if initialization has been done
let isInitialized = false;

export async function initializeServer() {
  if (isInitialized) return;
  
  console.log('\n🚀 Initializing Personal Assistant Server');
  console.log('=========================================');
  
  try {
    // Validate environment variables
    validateAndLogEnvVars();
    
    // Test API connectivity (optional - can be disabled in production)
    if (process.env.NODE_ENV !== 'production') {
      console.log('🧪 Testing API connectivity (development mode)...');
      await testAPIConnectivity();
    } else {
      console.log('⏭️  Skipping API connectivity tests (production mode)');
    }
    
    console.log('✅ Server initialization completed successfully');
    isInitialized = true;
    
  } catch (error) {
    console.error('❌ Server initialization failed:', error);
    console.error('⚠️  Some features may not work correctly');
    // Don't throw - allow server to start even with configuration issues
  }
  
  console.log('=========================================\n');
}

// Initialize on import (for API routes)
if (typeof window === 'undefined') {
  initializeServer().catch(console.error);
}