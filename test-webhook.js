#!/usr/bin/env node

/**
 * Test script for N8N Webhook Integration
 * This script tests the webhook endpoint with the new n8n server
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:3000';
const NEW_WEBHOOK_URL = 'https://n8n.srv903406.hstgr.cloud/webhook/990e6a3a-6881-4ae3-a345-5d5ef28f5f58';
const TEST_COOKIE = 'your_session_cookie_here'; // Replace with actual session cookie

async function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    const { method = 'POST', headers = {}, body } = options;
    
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
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers
          });
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

async function testDirectWebhook() {
  console.log('🔗 Testing Direct N8N Webhook');
  console.log('=============================');
  console.log(`Target: ${NEW_WEBHOOK_URL}\n`);
  
  const testPayload = {
    type: 'chat',
    action: 'message',
    data: {
      message: 'Test message from webhook integration test',
      timestamp: new Date().toISOString(),
      source: 'test-script'
    },
    userId: 'test-user',
    timestamp: new Date().toISOString()
  };
  
  try {
    // Make direct call to n8n webhook
    const response = await new Promise((resolve, reject) => {
      const url = new URL(NEW_WEBHOOK_URL);
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              data: JSON.parse(data || '{}'),
              headers: res.headers
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              data: data,
              headers: res.headers
            });
          }
        });
      });
      
      req.on('error', reject);
      req.write(JSON.stringify(testPayload));
      req.end();
    });
    
    console.log(`✅ Direct webhook test - Status: ${response.status}`);
    console.log(`📊 Response:`, JSON.stringify(response.data, null, 2));
    
    return response.status >= 200 && response.status < 300;
    
  } catch (error) {
    console.log(`❌ Direct webhook test failed: ${error.message}`);
    return false;
  }
}

async function testWebhookRoute() {
  console.log('\n🏗️ Testing Application Webhook Route');
  console.log('====================================');
  console.log(`Target: ${BASE_URL}/api/n8n/webhook\n`);
  
  const testPayloads = [
    {
      name: 'Chat Message',
      payload: {
        type: 'chat',
        action: 'message',
        data: {
          message: 'Test chat message via application route',
          timestamp: new Date().toISOString()
        }
      }
    },
    {
      name: 'Shopping List Item',
      payload: {
        type: 'shopping-list',
        action: 'create',
        data: {
          name: 'Test Item',
          quantity: 1,
          category: 'Test Category'
        }
      }
    },
    {
      name: 'Expense Entry',
      payload: {
        type: 'expense',
        action: 'create',
        data: {
          amount: 10.50,
          description: 'Test expense',
          category: 'Test'
        }
      }
    }
  ];
  
  const results = [];
  
  for (const test of testPayloads) {
    console.log(`\n🧪 Testing: ${test.name}`);
    
    try {
      const result = await makeRequest('/api/n8n/webhook', {
        method: 'POST',
        body: test.payload
      });
      
      if (result.status === 200 && result.data.success) {
        console.log(`   ✅ PASS - ${test.name}`);
        console.log(`   📝 Response: ${result.data.message}`);
        if (result.data.data && result.data.data.response) {
          console.log(`   🔄 N8N Response: ${result.data.data.response}`);
        }
        results.push({ ...test, status: 'PASS', response: result });
      } else {
        console.log(`   ❌ FAIL - ${test.name}`);
        console.log(`   Status: ${result.status}`);
        console.log(`   Error: ${result.data.message || result.data}`);
        results.push({ ...test, status: 'FAIL', response: result });
      }
    } catch (error) {
      console.log(`   ❌ ERROR - ${test.name}: ${error.message}`);
      results.push({ ...test, status: 'ERROR', error: error.message });
    }
  }
  
  return results;
}

async function testWebhookConfiguration() {
  console.log('\n⚙️ Testing Webhook Configuration');
  console.log('=================================');
  
  // Test environment variable loading
  console.log('📋 Checking environment configuration...');
  
  try {
    // Make a request to check if the webhook URL is configured
    const result = await makeRequest('/api/n8n/webhook', {
      method: 'POST',
      body: {
        type: 'chat',
        action: 'message',
        data: { message: 'config test' }
      }
    });
    
    if (result.data && result.data.message) {
      if (result.data.message.includes('not configured')) {
        console.log('❌ N8N webhook URL is not configured');
        console.log('   Please set N8N_WEBHOOK_URL environment variable');
        return false;
      } else if (result.data.message.includes('invalid')) {
        console.log('❌ N8N webhook URL format is invalid');
        return false;
      } else {
        console.log('✅ N8N webhook URL is properly configured');
        return true;
      }
    }
    
  } catch (error) {
    console.log(`❌ Configuration test failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('N8N Webhook Integration Test Suite');
  console.log('==================================');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`New Webhook URL: ${NEW_WEBHOOK_URL}\n`);

  // Check if server is running
  try {
    await makeRequest('/api/auth/me', { method: 'GET' });
    console.log('✅ Application server is running\n');
  } catch (error) {
    console.log('❌ Application server is not running or not accessible');
    console.log('   Please start the development server with: npm run dev');
    process.exit(1);
  }

  // Test configuration
  const configOk = await testWebhookConfiguration();
  
  if (!configOk) {
    console.log('\n🚨 Configuration Issues Detected');
    console.log('Please ensure N8N_WEBHOOK_URL is set in your environment variables:');
    console.log(`N8N_WEBHOOK_URL=${NEW_WEBHOOK_URL}`);
    return;
  }

  // Test direct webhook
  const directOk = await testDirectWebhook();
  
  // Test application route
  const routeResults = await testWebhookRoute();
  
  // Summary
  console.log('\n📋 Test Summary');
  console.log('================');
  
  const passed = routeResults.filter(r => r.status === 'PASS').length;
  const failed = routeResults.filter(r => r.status === 'FAIL').length;
  const errors = routeResults.filter(r => r.status === 'ERROR').length;
  
  console.log(`✅ Direct webhook test: ${directOk ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Route tests passed: ${passed}`);
  console.log(`❌ Route tests failed: ${failed}`);
  console.log(`⚠️  Route test errors: ${errors}`);
  console.log(`📊 Total route tests: ${routeResults.length}`);

  if (directOk && passed === routeResults.length) {
    console.log('\n🎉 All webhook tests passed! Integration is working correctly.');
    console.log(`\n📡 Webhook URL updated to: ${NEW_WEBHOOK_URL}`);
  } else {
    console.log('\n🔧 Some tests failed. Please check:');
    console.log('1. N8N server is accessible');
    console.log('2. Webhook URL is correct');
    console.log('3. Authentication cookies are valid');
    console.log('4. N8N workflow is properly configured');
  }
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

module.exports = { testDirectWebhook, testWebhookRoute, testWebhookConfiguration };