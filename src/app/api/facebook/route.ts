import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_OPTIONS } from '@/lib/auth';
import { ENV_VARS } from '@/lib/env-validation';

// Use validated environment variables
const FACEBOOK_PAGE_ACCESS_TOKEN = ENV_VARS.FACEBOOK_PAGE_ACCESS_TOKEN;
const FACEBOOK_PAGE_ID = ENV_VARS.FACEBOOK_PAGE_ID;
const FACEBOOK_API_URL = 'https://graph.facebook.com/v18.0';

// Helper function to check if token is expired
function isFacebookTokenExpired(errorMessage: string): boolean {
  return errorMessage.includes('Session has expired') || 
         errorMessage.includes('token has expired') ||
         errorMessage.includes('expired') ||
         errorMessage.includes('OAuthException');
}

// Helper function to check if token is invalid
function isFacebookTokenInvalid(errorMessage: string): boolean {
  return errorMessage.includes('Invalid OAuth access token') ||
         errorMessage.includes('Malformed access token') ||
         errorMessage.includes('Error validating access token');
}

interface FacebookPostRequest {
  action: 'post' | 'get_posts' | 'get_insights' | 'get_page_info' | 'test_token';
  message?: string;
  link?: string;
  scheduled_publish_time?: number;
  published?: boolean;
  limit?: number;
}

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const token = request.cookies.get(COOKIE_OPTIONS.name)?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const user = verifyToken(token);
    
    if (!FACEBOOK_PAGE_ACCESS_TOKEN || !FACEBOOK_PAGE_ID) {
      const tokenMask = FACEBOOK_PAGE_ACCESS_TOKEN ? 
        `${FACEBOOK_PAGE_ACCESS_TOKEN.substring(0, 6)}...${FACEBOOK_PAGE_ACCESS_TOKEN.substring(FACEBOOK_PAGE_ACCESS_TOKEN.length - 4)}` : 
        'NOT_SET';
      
      console.error('🚨 Facebook configuration missing:');
      console.error(`  Access Token: ${tokenMask} (Length: ${FACEBOOK_PAGE_ACCESS_TOKEN?.length || 0})`);
      console.error(`  Page ID: ${FACEBOOK_PAGE_ID || 'NOT_SET'}`);
      console.error('  Please check your .env.local file and ensure variables are properly set');
      
      return NextResponse.json({
        success: false, 
        message: 'Facebook API is not configured. Please set FACEBOOK_PAGE_ACCESS_TOKEN and FACEBOOK_PAGE_ID in your environment variables.',
        error: 'FACEBOOK_CONFIG_ERROR',
        help: 'Check your .env.local file and restart the server',
        details: {
          missingToken: !FACEBOOK_PAGE_ACCESS_TOKEN,
          missingPageId: !FACEBOOK_PAGE_ID,
          tokenLength: FACEBOOK_PAGE_ACCESS_TOKEN?.length || 0
        }
      }, { status: 500 });
    }
    
    const body: FacebookPostRequest = await request.json();
    console.log('Facebook API request:', body);
    
    // Validate required fields
    if (!body.action) {
      return NextResponse.json(
        { success: false, message: 'Action is required' },
        { status: 400 }
      );
    }
    
    let facebookResponse;
    
    switch (body.action) {
      case 'post':
        if (!body.message && !body.link) {
          return NextResponse.json(
            { success: false, message: 'Message or link is required for posting' },
            { status: 400 }
          );
        }
        
        const postData: any = {
          access_token: FACEBOOK_PAGE_ACCESS_TOKEN
        };
        
        if (body.message) postData.message = body.message;
        if (body.link) postData.link = body.link;
        if (body.scheduled_publish_time) {
          postData.scheduled_publish_time = body.scheduled_publish_time;
          postData.published = false;
        } else {
          postData.published = body.published !== false;
        }
        
        facebookResponse = await fetch(`${FACEBOOK_API_URL}/${FACEBOOK_PAGE_ID}/feed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(postData),
        });
        break;
        
      case 'get_posts':
        const limit = body.limit || 10;
        facebookResponse = await fetch(
          `${FACEBOOK_API_URL}/${FACEBOOK_PAGE_ID}/posts?limit=${limit}&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`
        );
        break;
        
      case 'get_insights':
        facebookResponse = await fetch(
          `${FACEBOOK_API_URL}/${FACEBOOK_PAGE_ID}/insights?metric=page_impressions,page_reach,page_likes&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`
        );
        break;
        
      case 'get_page_info':
        facebookResponse = await fetch(
          `${FACEBOOK_API_URL}/${FACEBOOK_PAGE_ID}?fields=name,likes,followers_count,about,website,phone&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`
        );
        break;
        
      case 'test_token':
        // Test the access token validity by getting basic page info
        console.log('🔍 Testing Facebook token validity...');
        console.log(`🔍 Page ID: ${FACEBOOK_PAGE_ID}`);
        console.log(`🔍 Token (first 20 chars): ${FACEBOOK_PAGE_ACCESS_TOKEN?.substring(0, 20)}...`);
        
        facebookResponse = await fetch(
          `${FACEBOOK_API_URL}/${FACEBOOK_PAGE_ID}?fields=id,name,access_token&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`
        );
        
        // Log the response for debugging
        const testResult = await facebookResponse.text();
        console.log('🔍 Facebook test response status:', facebookResponse.status);
        console.log('🔍 Facebook test response:', testResult);
        
        // Re-create response for further processing
        facebookResponse = new Response(testResult, {
          status: facebookResponse.status,
          statusText: facebookResponse.statusText,
          headers: facebookResponse.headers
        });
        break;
        
      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action. Use post, get_posts, get_insights, get_page_info, or test_token' },
          { status: 400 }
        );
    }
    
    if (!facebookResponse.ok) {
      const errorText = await facebookResponse.text();
      
      let errorDetail = errorText;
      let errorJson: any = null;
      
      try {
        errorJson = JSON.parse(errorText);
        errorDetail = errorJson?.error?.message || errorText;
      } catch (e) {
        // Use raw text if not JSON
      }
      
      const tokenMask = FACEBOOK_PAGE_ACCESS_TOKEN ? 
        `${FACEBOOK_PAGE_ACCESS_TOKEN.substring(0, 6)}...${FACEBOOK_PAGE_ACCESS_TOKEN.substring(FACEBOOK_PAGE_ACCESS_TOKEN.length - 4)}` : 
        'NOT_SET';
      
      console.error('🚨 Facebook API Error:');
      console.error(`  Status: ${facebookResponse.status}`);
      console.error(`  Error: ${errorDetail}`);
      console.error(`  Token: ${tokenMask}`);
      console.error(`  Page ID: ${FACEBOOK_PAGE_ID}`);
      
      // Check for specific error types
      if (isFacebookTokenExpired(errorDetail)) {
        console.error('  🕒 Facebook token has EXPIRED - please refresh your access token');
        return NextResponse.json({
          success: false,
          message: `Facebook token expired: ${errorDetail}. Please generate a new long-lived access token from Facebook Developer Console.`,
          error: 'FACEBOOK_TOKEN_EXPIRED',
          help: 'Go to Facebook Developer Console → Graph API Explorer → Generate new long-lived token',
          details: { errorDetail, tokenMask, pageId: FACEBOOK_PAGE_ID }
        }, { status: 401 });
      }
      
      if (isFacebookTokenInvalid(errorDetail)) {
        console.error('  🔑 Facebook token is INVALID - please check your access token');
        return NextResponse.json({
          success: false,
          message: `Facebook token invalid: ${errorDetail}. Please verify your FACEBOOK_PAGE_ACCESS_TOKEN is correct.`,
          error: 'FACEBOOK_TOKEN_INVALID',
          help: 'Verify your access token from Facebook Developer Console',
          details: { errorDetail, tokenMask, pageId: FACEBOOK_PAGE_ID }
        }, { status: 401 });
      }
      
      // Handle other status codes
      if (facebookResponse.status === 400) {
        console.error('  📋 Facebook API configuration error');
        return NextResponse.json({
          success: false,
          message: `Facebook API configuration error: ${errorDetail}. Please verify your page ID and token permissions.`,
          error: 'FACEBOOK_CONFIG_ERROR',
          help: 'Check your FACEBOOK_PAGE_ID and ensure your token has required permissions',
          details: { errorDetail, tokenMask, pageId: FACEBOOK_PAGE_ID }
        }, { status: 400 });
      }
      
      if (facebookResponse.status === 403) {
        console.error('  🚫 Facebook permission denied');
        return NextResponse.json({
          success: false,
          message: `Facebook permission denied: ${errorDetail}. Your token may not have sufficient permissions.`,
          error: 'FACEBOOK_PERMISSION_ERROR',
          help: 'Ensure your access token has pages_read_engagement and pages_manage_posts permissions',
          details: { errorDetail, tokenMask, pageId: FACEBOOK_PAGE_ID }
        }, { status: 403 });
      }
      
      // Generic error
      console.error('  ❌ Unexpected Facebook API error');
      throw new Error(`Facebook API failed with status: ${facebookResponse.status} - ${errorDetail}`);
    }
    
    const facebookResult = await facebookResponse.json();
    console.log('Facebook API response:', facebookResult);
    
    return NextResponse.json({
      success: true,
      data: facebookResult,
      message: `${body.action} completed successfully`,
      userId: user.id,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Facebook API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to process Facebook request'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify user authentication
    const token = request.cookies.get(COOKIE_OPTIONS.name)?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const user = verifyToken(token);
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'get_page_info';
    const limit = parseInt(searchParams.get('limit') || '10');
    
    if (!FACEBOOK_PAGE_ACCESS_TOKEN || !FACEBOOK_PAGE_ID) {
      const tokenMask = FACEBOOK_PAGE_ACCESS_TOKEN ? 
        `${FACEBOOK_PAGE_ACCESS_TOKEN.substring(0, 6)}...${FACEBOOK_PAGE_ACCESS_TOKEN.substring(FACEBOOK_PAGE_ACCESS_TOKEN.length - 4)}` : 
        'NOT_SET';
      
      console.error('🚨 Facebook GET configuration missing:');
      console.error(`  Access Token: ${tokenMask} (Length: ${FACEBOOK_PAGE_ACCESS_TOKEN?.length || 0})`);
      console.error(`  Page ID: ${FACEBOOK_PAGE_ID || 'NOT_SET'}`);
      console.error('  Please check your .env.local file and ensure variables are properly set');
      
      return NextResponse.json({
        success: false, 
        message: 'Facebook API is not configured. Please set FACEBOOK_PAGE_ACCESS_TOKEN and FACEBOOK_PAGE_ID in your environment variables.',
        error: 'FACEBOOK_CONFIG_ERROR',
        help: 'Check your .env.local file and restart the server',
        details: {
          missingToken: !FACEBOOK_PAGE_ACCESS_TOKEN,
          missingPageId: !FACEBOOK_PAGE_ID,
          tokenLength: FACEBOOK_PAGE_ACCESS_TOKEN?.length || 0
        }
      }, { status: 500 });
    }
    
    let facebookResponse;
    
    switch (action) {
      case 'posts':
      case 'get_posts':
        facebookResponse = await fetch(
          `${FACEBOOK_API_URL}/${FACEBOOK_PAGE_ID}/posts?limit=${limit}&fields=id,message,created_time,likes.summary(true),comments.summary(true),shares&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`
        );
        break;
        
      case 'insights':
      case 'get_insights':
        facebookResponse = await fetch(
          `${FACEBOOK_API_URL}/${FACEBOOK_PAGE_ID}/insights?metric=page_impressions,page_reach,page_likes&period=day&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`
        );
        break;
        
      case 'connect':
        // Test connection by getting page info
        facebookResponse = await fetch(
          `${FACEBOOK_API_URL}/${FACEBOOK_PAGE_ID}?fields=name,likes,followers_count,about&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`
        );
        break;
        
      case 'get_page_info':
      case 'page_info':
      default:
        facebookResponse = await fetch(
          `${FACEBOOK_API_URL}/${FACEBOOK_PAGE_ID}?fields=name,likes,followers_count,about,website,phone,picture&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`
        );
        break;
    }
    
    if (!facebookResponse.ok) {
      const errorText = await facebookResponse.text();
      
      let errorDetail = errorText;
      let errorJson: any = null;
      
      try {
        errorJson = JSON.parse(errorText);
        errorDetail = errorJson?.error?.message || errorText;
      } catch (e) {
        // Use raw text if not JSON
      }
      
      const tokenMask = FACEBOOK_PAGE_ACCESS_TOKEN ? 
        `${FACEBOOK_PAGE_ACCESS_TOKEN.substring(0, 6)}...${FACEBOOK_PAGE_ACCESS_TOKEN.substring(FACEBOOK_PAGE_ACCESS_TOKEN.length - 4)}` : 
        'NOT_SET';
      
      console.error('🚨 Facebook GET API Error:');
      console.error(`  Action: ${action}`);
      console.error(`  Status: ${facebookResponse.status}`);
      console.error(`  Error: ${errorDetail}`);
      console.error(`  Token: ${tokenMask}`);
      console.error(`  Page ID: ${FACEBOOK_PAGE_ID}`);
      
      // Check for specific error types
      if (isFacebookTokenExpired(errorDetail)) {
        console.error('  🕒 Facebook token has EXPIRED - please refresh your access token');
        return NextResponse.json({
          success: false,
          message: `Facebook token expired: ${errorDetail}. Please generate a new long-lived access token from Facebook Developer Console.`,
          error: 'FACEBOOK_TOKEN_EXPIRED',
          help: 'Go to Facebook Developer Console → Graph API Explorer → Generate new long-lived token',
          details: { action, errorDetail, tokenMask, pageId: FACEBOOK_PAGE_ID }
        }, { status: 401 });
      }
      
      if (isFacebookTokenInvalid(errorDetail)) {
        console.error('  🔑 Facebook token is INVALID - please check your access token');
        return NextResponse.json({
          success: false,
          message: `Facebook token invalid: ${errorDetail}. Please verify your FACEBOOK_PAGE_ACCESS_TOKEN is correct.`,
          error: 'FACEBOOK_TOKEN_INVALID',
          help: 'Verify your access token from Facebook Developer Console',
          details: { action, errorDetail, tokenMask, pageId: FACEBOOK_PAGE_ID }
        }, { status: 401 });
      }
      
      // Handle other status codes
      if (facebookResponse.status === 400) {
        console.error('  📋 Facebook API configuration error');
        return NextResponse.json({
          success: false,
          message: `Facebook API configuration error: ${errorDetail}. Please verify your page ID and token permissions.`,
          error: 'FACEBOOK_CONFIG_ERROR',
          help: 'Check your FACEBOOK_PAGE_ID and ensure your token has required permissions',
          details: { action, errorDetail, tokenMask, pageId: FACEBOOK_PAGE_ID }
        }, { status: 400 });
      }
      
      if (facebookResponse.status === 403) {
        console.error('  🚫 Facebook permission denied');
        return NextResponse.json({
          success: false,
          message: `Facebook permission denied: ${errorDetail}. Your token may not have sufficient permissions.`,
          error: 'FACEBOOK_PERMISSION_ERROR',
          help: 'Ensure your access token has pages_read_engagement and pages_manage_posts permissions',
          details: { action, errorDetail, tokenMask, pageId: FACEBOOK_PAGE_ID }
        }, { status: 403 });
      }
      
      // Generic error
      console.error('  ❌ Unexpected Facebook API error');
      throw new Error(`Facebook API failed with status: ${facebookResponse.status} - ${errorDetail}`);
    }
    
    const result = await facebookResponse.json();
    
    return NextResponse.json({
      success: true,
      data: result,
      message: `${action} completed successfully`
    });
    
  } catch (error: any) {
    console.error('Facebook GET error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to fetch Facebook data'
      },
      { status: 500 }
    );
  }
}