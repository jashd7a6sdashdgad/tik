import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_OPTIONS } from '@/lib/auth';

const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const INSTAGRAM_USER_ID = process.env.INSTAGRAM_USER_ID;
const INSTAGRAM_API_URL = 'https://graph.instagram.com';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_OPTIONS.name)?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    
    if (!INSTAGRAM_ACCESS_TOKEN || !INSTAGRAM_USER_ID) {
      return NextResponse.json({ 
        success: false, 
        message: 'Instagram credentials not configured' 
      }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'profile';

    try {
      let data;
      
      switch (action) {
        case 'profile':
          data = await getProfile();
          break;
        case 'media':
          const limit = searchParams.get('limit') || '25';
          data = await getMedia(limit);
          break;
        case 'insights':
          data = await getInsights();
          break;
        case 'connect':
          // Test connection by getting profile info
          data = await getProfile();
          break;
        default:
          return NextResponse.json({ 
            success: false, 
            message: 'Invalid action' 
          }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        data,
        message: `Instagram ${action} retrieved successfully`,
        userId: user.id,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Instagram API error:', error);
      return NextResponse.json({
        success: false,
        message: error.message || 'Failed to fetch Instagram data',
        userId: user.id,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Instagram route error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Internal server error'
    }, { status: error.message?.includes('Invalid token') ? 401 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_OPTIONS.name)?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    
    if (!INSTAGRAM_ACCESS_TOKEN || !INSTAGRAM_USER_ID) {
      return NextResponse.json({ 
        success: false, 
        message: 'Instagram credentials not configured' 
      }, { status: 500 });
    }

    const body = await request.json();
    const { action, ...params } = body;

    try {
      let data;
      
      switch (action) {
        case 'create_media':
          if (!params.image_url || !params.caption) {
            return NextResponse.json({ 
              success: false, 
              message: 'Image URL and caption are required' 
            }, { status: 400 });
          }
          data = await createMedia(params.image_url, params.caption);
          break;
        case 'publish_media':
          if (!params.creation_id) {
            return NextResponse.json({ 
              success: false, 
              message: 'Creation ID is required' 
            }, { status: 400 });
          }
          data = await publishMedia(params.creation_id);
          break;
        default:
          return NextResponse.json({ 
            success: false, 
            message: 'Invalid action' 
          }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        data,
        message: `Instagram ${action} completed successfully`,
        userId: user.id,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Instagram POST error:', error);
      return NextResponse.json({
        success: false,
        message: error.message || 'Failed to perform Instagram action',
        userId: user.id,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Instagram POST route error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Internal server error'
    }, { status: error.message?.includes('Invalid token') ? 401 : 500 });
  }
}

// Helper functions for Instagram API calls
async function getProfile() {
  const response = await fetch(
    `${INSTAGRAM_API_URL}/${INSTAGRAM_USER_ID}?fields=id,username,account_type,media_count,followers_count&access_token=${INSTAGRAM_ACCESS_TOKEN}`
  );
  
  if (!response.ok) {
    throw new Error(`Instagram API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data;
}

async function getMedia(limit: string) {
  const response = await fetch(
    `${INSTAGRAM_API_URL}/${INSTAGRAM_USER_ID}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=${limit}&access_token=${INSTAGRAM_ACCESS_TOKEN}`
  );
  
  if (!response.ok) {
    throw new Error(`Instagram API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data;
}

async function getInsights() {
  const response = await fetch(
    `${INSTAGRAM_API_URL}/${INSTAGRAM_USER_ID}/insights?metric=impressions,reach,profile_views&period=day&access_token=${INSTAGRAM_ACCESS_TOKEN}`
  );
  
  if (!response.ok) {
    throw new Error(`Instagram API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data;
}

async function createMedia(imageUrl: string, caption: string) {
  const response = await fetch(
    `${INSTAGRAM_API_URL}/${INSTAGRAM_USER_ID}/media`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        caption: caption,
        access_token: INSTAGRAM_ACCESS_TOKEN
      }),
    }
  );
  
  if (!response.ok) {
    throw new Error(`Instagram API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data;
}

async function publishMedia(creationId: string) {
  const response = await fetch(
    `${INSTAGRAM_API_URL}/${INSTAGRAM_USER_ID}/media_publish`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: INSTAGRAM_ACCESS_TOKEN
      }),
    }
  );
  
  if (!response.ok) {
    throw new Error(`Instagram API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data;
}