#!/usr/bin/env node

/**
 * Test script for YouTube OAuth2 integration
 * This script tests the YouTube API endpoints to ensure OAuth2 is working correctly
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:3000';
const TEST_COOKIE = 'your_session_cookie_here'; // Replace with actual session cookie

async function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    const { method = 'GET', headers = {}, body } = options;
    
    const requestOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': TEST_COOKIE,
        ...headers
      }
    };

    const req = http.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data),
            headers: res.headers
          });
        } catch (e) {
          reject(new Error(`Failed to parse JSON response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function testYouTubeOAuth2() {
  console.log('🔴 Testing YouTube OAuth2 Integration');
  console.log('=====================================\\n');

  const tests = [
    {
      name: 'Connection Test',
      path: '/api/youtube?action=connect',
      description: 'Tests basic YouTube API connection via OAuth2'
    },
    {
      name: 'Channel Stats',
      path: '/api/youtube?action=channel_stats',
      description: 'Retrieves authenticated user\\'s YouTube channel statistics'
    },
    {
      name: 'Recent Videos',
      path: '/api/youtube?action=videos&maxResults=5',
      description: 'Gets user\\'s recent YouTube videos'
    },
    {
      name: 'Video Search',
      path: '/api/youtube?action=search&q=test',
      description: 'Searches YouTube videos'
    },
    {
      name: 'Analytics Integration',
      path: '/api/analytics/tracking',
      description: 'Tests YouTube data in comprehensive analytics'
    }
  ];

  const results = [];

  for (const test of tests) {
    console.log(`\\n🧪 Running: ${test.name}`);
    console.log(`   ${test.description}`);
    console.log(`   Endpoint: ${test.path}`);
    
    try {
      const result = await makeRequest(test.path);
      
      if (result.status === 200 && result.data.success) {
        console.log(`   ✅ PASS - Status: ${result.status}`);
        
        // Log specific data for YouTube tests
        if (test.path.includes('/api/youtube')) {
          if (result.data.data) {
            console.log(`   📊 Data received: ${JSON.stringify(result.data.data, null, 2).substring(0, 200)}...`);
          }
        }
        
        results.push({ ...test, status: 'PASS', response: result });
      } else {
        console.log(`   ❌ FAIL - Status: ${result.status}`);
        console.log(`   Error: ${result.data.message || 'Unknown error'}`);
        
        if (result.data.error === 'YOUTUBE_OAUTH_REQUIRED') {
          console.log(`   💡 OAuth authentication required - authenticate via /api/google/auth`);
        }
        
        results.push({ ...test, status: 'FAIL', response: result });
      }
    } catch (error) {
      console.log(`   ❌ ERROR - ${error.message}`);
      results.push({ ...test, status: 'ERROR', error: error.message });
    }
  }

  // Summary
  console.log('\\n📋 Test Summary');
  console.log('================');
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const errors = results.filter(r => r.status === 'ERROR').length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Errors: ${errors}`);
  console.log(`📊 Total: ${results.length}`);

  if (failed > 0 || errors > 0) {
    console.log('\\n🔧 Common Issues and Solutions:');
    console.log('================================');
    console.log('1. Authentication Required:');
    console.log('   - Visit http://localhost:3000/api/google/auth');
    console.log('   - Complete Google OAuth flow');
    console.log('   - Ensure YouTube scopes are granted');
    console.log('');
    console.log('2. Token Expired:');
    console.log('   - Re-authenticate via /api/google/auth');
    console.log('   - Check token refresh logic');
    console.log('');
    console.log('3. Environment Configuration:');
    console.log('   - Ensure GOOGLE_CLIENT_ID is set');
    console.log('   - Ensure GOOGLE_CLIENT_SECRET is set');
    console.log('   - Ensure GOOGLE_REDIRECT_URI is set');
    console.log('');
    console.log('4. Google Cloud Console:');
    console.log('   - Enable YouTube Data API v3');
    console.log('   - Configure OAuth consent screen');
    console.log('   - Add appropriate redirect URIs');
  } else {
    console.log('\\n🎉 All tests passed! YouTube OAuth2 integration is working correctly.');
  }

  return results;
}

// Enhanced authentication test
async function testAuthentication() {
  console.log('\\n🔐 Testing Authentication Flow');
  console.log('===============================');
  
  try {
    // Test if user is authenticated
    const authTest = await makeRequest('/api/auth/me');
    
    if (authTest.status === 200) {
      console.log('✅ User is authenticated');
      console.log(`   User: ${authTest.data.user?.name || 'Unknown'}`);
    } else {
      console.log('❌ User is not authenticated');
      console.log('   Please log in first');
      return false;
    }
    
    // Test Google OAuth status
    const oauthTest = await makeRequest('/api/google/callback');
    console.log(`   Google OAuth status check: ${oauthTest.status}`);
    
    return true;
  } catch (error) {
    console.log(`❌ Authentication test failed: ${error.message}`);
    return false;
  }
}

// Main execution
async function main() {
  console.log('YouTube OAuth2 Integration Test Suite');
  console.log('=====================================');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}\\n`);

  // Check server is running
  try {
    await makeRequest('/api/auth/me');
    console.log('✅ Server is running');
  } catch (error) {
    console.log('❌ Server is not running or not accessible');
    console.log('   Please start the development server with: npm run dev');
    process.exit(1);
  }

  // Test authentication first
  const authOk = await testAuthentication();
  
  // Run YouTube tests
  await testYouTubeOAuth2();
  
  console.log('\\n🏁 Test suite completed');
}

// Handle command line arguments
if (process.argv.length > 2) {
  const cookie = process.argv[2];
  if (cookie.startsWith('session_cookie=') || cookie.includes('=')) {
    TEST_COOKIE = cookie;
    console.log('Using provided session cookie');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testYouTubeOAuth2, testAuthentication };