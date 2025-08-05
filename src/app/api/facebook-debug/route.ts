import { NextRequest, NextResponse } from 'next/server';

const FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const FACEBOOK_API_URL = 'https://graph.facebook.com/v18.0';

export async function GET(request: NextRequest) {
  console.log('🔍 Facebook Debug Test Started');
  
  // Check if credentials are set
  if (!FACEBOOK_PAGE_ACCESS_TOKEN || !FACEBOOK_PAGE_ID) {
    return NextResponse.json({
      success: false,
      error: 'Missing Facebook credentials',
      details: {
        hasToken: !!FACEBOOK_PAGE_ACCESS_TOKEN,
        hasPageId: !!FACEBOOK_PAGE_ID,
        tokenLength: FACEBOOK_PAGE_ACCESS_TOKEN?.length || 0
      }
    });
  }

  console.log(`🔍 Using Page ID: ${FACEBOOK_PAGE_ID}`);
  console.log(`🔍 Token length: ${FACEBOOK_PAGE_ACCESS_TOKEN.length}`);
  console.log(`🔍 Token preview: ${FACEBOOK_PAGE_ACCESS_TOKEN.substring(0, 20)}...`);

  const tests: any[] = [];

  // Test 1: Get page basic info
  try {
    console.log('🔍 Test 1: Getting page basic info...');
    const pageResponse = await fetch(
      `${FACEBOOK_API_URL}/${FACEBOOK_PAGE_ID}?fields=id,name,access_token&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`
    );
    
    const pageData = await pageResponse.text();
    console.log(`🔍 Page response status: ${pageResponse.status}`);
    console.log(`🔍 Page response: ${pageData}`);
    
    tests.push({
      test: 'Page Basic Info',
      status: pageResponse.status,
      success: pageResponse.ok,
      data: pageResponse.ok ? JSON.parse(pageData) : pageData
    });
  } catch (error: any) {
    console.error('❌ Page info test failed:', error);
    tests.push({
      test: 'Page Basic Info',
      success: false,
      error: error.message
    });
  }

  // Test 2: Get page posts
  try {
    console.log('🔍 Test 2: Getting page posts...');
    const postsResponse = await fetch(
      `${FACEBOOK_API_URL}/${FACEBOOK_PAGE_ID}/posts?limit=1&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`
    );
    
    const postsData = await postsResponse.text();
    console.log(`🔍 Posts response status: ${postsResponse.status}`);
    console.log(`🔍 Posts response: ${postsData}`);
    
    tests.push({
      test: 'Page Posts',
      status: postsResponse.status,
      success: postsResponse.ok,
      data: postsResponse.ok ? JSON.parse(postsData) : postsData
    });
  } catch (error: any) {
    console.error('❌ Posts test failed:', error);
    tests.push({
      test: 'Page Posts',
      success: false,
      error: error.message
    });
  }

  // Test 3: Token debug
  try {
    console.log('🔍 Test 3: Debugging access token...');
    const debugResponse = await fetch(
      `${FACEBOOK_API_URL}/debug_token?input_token=${FACEBOOK_PAGE_ACCESS_TOKEN}&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`
    );
    
    const debugData = await debugResponse.text();
    console.log(`🔍 Debug response status: ${debugResponse.status}`);
    console.log(`🔍 Debug response: ${debugData}`);
    
    tests.push({
      test: 'Token Debug',
      status: debugResponse.status,
      success: debugResponse.ok,
      data: debugResponse.ok ? JSON.parse(debugData) : debugData
    });
  } catch (error: any) {
    console.error('❌ Token debug test failed:', error);
    tests.push({
      test: 'Token Debug',
      success: false,
      error: error.message
    });
  }

  // Test 4: Get page insights (requires manage_pages permission)
  try {
    console.log('🔍 Test 4: Getting page insights...');
    const insightsResponse = await fetch(
      `${FACEBOOK_API_URL}/${FACEBOOK_PAGE_ID}/insights?metric=page_impressions&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`
    );
    
    const insightsData = await insightsResponse.text();
    console.log(`🔍 Insights response status: ${insightsResponse.status}`);
    console.log(`🔍 Insights response: ${insightsData}`);
    
    tests.push({
      test: 'Page Insights',
      status: insightsResponse.status,
      success: insightsResponse.ok,
      data: insightsResponse.ok ? JSON.parse(insightsData) : insightsData
    });
  } catch (error: any) {
    console.error('❌ Insights test failed:', error);
    tests.push({
      test: 'Page Insights',
      success: false,
      error: error.message
    });
  }

  const successfulTests = tests.filter(test => test.success).length;
  const totalTests = tests.length;

  console.log(`🔍 Facebook Debug Complete: ${successfulTests}/${totalTests} tests passed`);

  return NextResponse.json({
    success: successfulTests > 0,
    summary: `${successfulTests}/${totalTests} tests passed`,
    credentials: {
      pageId: FACEBOOK_PAGE_ID,
      tokenLength: FACEBOOK_PAGE_ACCESS_TOKEN.length,
      tokenPreview: FACEBOOK_PAGE_ACCESS_TOKEN.substring(0, 20) + '...'
    },
    tests: tests
  });
}