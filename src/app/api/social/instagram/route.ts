import { NextRequest, NextResponse } from 'next/server';

const INSTAGRAM_API_URL = 'https://graph.instagram.com';
const FACEBOOK_API_URL = 'https://graph.facebook.com/v18.0';

interface InstagramMedia {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  permalink: string;
  caption?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
}

interface InstagramAccount {
  id: string;
  username: string;
  account_type: 'BUSINESS' | 'CREATOR' | 'PERSONAL';
  media_count: number;
  followers_count?: number;
  follows_count?: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'media';
  const limit = searchParams.get('limit') || '10';
  const accessToken = searchParams.get('access_token');

  if (!accessToken) {
    return NextResponse.json({
      success: false,
      error: 'Instagram access token required'
    }, { status: 400 });
  }

  try {
    let data;

    switch (action) {
      case 'media':
        data = await getInstagramMedia(accessToken, parseInt(limit));
        break;
      case 'account':
        data = await getInstagramAccount(accessToken);
        break;
      case 'insights':
        data = await getInstagramInsights(accessToken);
        break;
      case 'hashtags':
        const hashtag = searchParams.get('hashtag');
        if (!hashtag) {
          throw new Error('Hashtag parameter required');
        }
        data = await searchHashtag(accessToken, hashtag);
        break;
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Instagram API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch Instagram data'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { action, content, accessToken } = await request.json();

  if (!accessToken) {
    return NextResponse.json({
      success: false,
      error: 'Instagram access token required'
    }, { status: 400 });
  }

  try {
    let result;

    switch (action) {
      case 'create_media':
        result = await createInstagramMedia(accessToken, content);
        break;
      case 'publish_media':
        result = await publishInstagramMedia(accessToken, content.creation_id);
        break;
      case 'upload_photo':
        result = await uploadPhoto(accessToken, content);
        break;
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Instagram POST error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to perform Instagram action'
    }, { status: 500 });
  }
}

async function getInstagramMedia(accessToken: string, limit: number = 10) {
  // First get the Instagram Business Account ID
  const accountResponse = await fetch(
    `${INSTAGRAM_API_URL}/me?fields=id,username&access_token=${accessToken}`
  );
  
  if (!accountResponse.ok) {
    throw new Error(`Failed to get Instagram account: ${accountResponse.statusText}`);
  }
  
  const account = await accountResponse.json();
  const instagramAccountId = account.id;

  // Get media from the Instagram account
  const fields = 'id,media_type,media_url,permalink,caption,timestamp,like_count,comments_count';
  const mediaResponse = await fetch(
    `${INSTAGRAM_API_URL}/${instagramAccountId}/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`
  );

  if (!mediaResponse.ok) {
    throw new Error(`Failed to get Instagram media: ${mediaResponse.statusText}`);
  }

  const mediaData = await mediaResponse.json();

  return {
    account: {
      id: account.id,
      username: account.username
    },
    media: mediaData.data?.map((item: InstagramMedia) => ({
      id: item.id,
      type: item.media_type,
      url: item.media_url,
      permalink: item.permalink,
      caption: item.caption || '',
      timestamp: item.timestamp,
      likes: item.like_count || 0,
      comments: item.comments_count || 0,
      platform: 'instagram'
    })) || [],
    pagination: mediaData.paging
  };
}

async function getInstagramAccount(accessToken: string) {
  const fields = 'id,username,account_type,media_count,followers_count,follows_count';
  const response = await fetch(
    `${INSTAGRAM_API_URL}/me?fields=${fields}&access_token=${accessToken}`
  );

  if (!response.ok) {
    throw new Error(`Failed to get Instagram account: ${response.statusText}`);
  }

  const data: InstagramAccount = await response.json();

  return {
    id: data.id,
    username: data.username,
    account_type: data.account_type,
    media_count: data.media_count,
    followers: data.followers_count || 0,
    following: data.follows_count || 0,
    platform: 'instagram'
  };
}

async function getInstagramInsights(accessToken: string) {
  // Get Instagram Business Account ID
  const accountResponse = await fetch(
    `${INSTAGRAM_API_URL}/me?fields=id&access_token=${accessToken}`
  );
  
  if (!accountResponse.ok) {
    throw new Error(`Failed to get Instagram account: ${accountResponse.statusText}`);
  }
  
  const account = await accountResponse.json();
  const instagramAccountId = account.id;

  // Get account insights
  const metrics = ['follower_count', 'get_directions_clicks', 'phone_call_clicks', 'text_message_clicks', 'website_clicks'];
  const period = 'day';
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const until = new Date().toISOString().split('T')[0];

  const insightsResponse = await fetch(
    `${INSTAGRAM_API_URL}/${instagramAccountId}/insights?metric=${metrics.join(',')}&period=${period}&since=${since}&until=${until}&access_token=${accessToken}`
  );

  if (!insightsResponse.ok) {
    // If insights fail (requires business account), return basic data
    return {
      message: 'Insights require Instagram Business Account',
      account_id: instagramAccountId,
      platform: 'instagram'
    };
  }

  const insightsData = await insightsResponse.json();

  const insights: any = {};
  insightsData.data?.forEach((metric: any) => {
    const latestValue = metric.values?.[metric.values.length - 1];
    insights[metric.name] = {
      value: latestValue?.value || 0,
      end_time: latestValue?.end_time
    };
  });

  return {
    insights,
    period: `${since} to ${until}`,
    account_id: instagramAccountId,
    platform: 'instagram'
  };
}

async function searchHashtag(accessToken: string, hashtag: string) {
  // This requires additional permissions and is mainly for business accounts
  const response = await fetch(
    `${INSTAGRAM_API_URL}/ig_hashtag_search?user_id=me&q=${encodeURIComponent(hashtag)}&access_token=${accessToken}`
  );

  if (!response.ok) {
    throw new Error(`Failed to search hashtag: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    hashtag,
    results: data.data || [],
    platform: 'instagram'
  };
}

async function createInstagramMedia(accessToken: string, content: {
  image_url: string;
  caption?: string;
  location_id?: string;
}) {
  // Get Instagram Business Account ID
  const accountResponse = await fetch(
    `${INSTAGRAM_API_URL}/me?fields=id&access_token=${accessToken}`
  );
  
  if (!accountResponse.ok) {
    throw new Error(`Failed to get Instagram account: ${accountResponse.statusText}`);
  }
  
  const account = await accountResponse.json();
  const instagramAccountId = account.id;

  // Create media container
  const mediaData = {
    image_url: content.image_url,
    caption: content.caption || '',
    access_token: accessToken,
    ...(content.location_id && { location_id: content.location_id })
  };

  const response = await fetch(`${INSTAGRAM_API_URL}/${instagramAccountId}/media`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(mediaData)
  });

  if (!response.ok) {
    throw new Error(`Failed to create Instagram media: ${response.statusText}`);
  }

  const result = await response.json();
  return {
    creation_id: result.id,
    account_id: instagramAccountId,
    success: true,
    platform: 'instagram'
  };
}

async function publishInstagramMedia(accessToken: string, creationId: string) {
  // Get Instagram Business Account ID
  const accountResponse = await fetch(
    `${INSTAGRAM_API_URL}/me?fields=id&access_token=${accessToken}`
  );
  
  if (!accountResponse.ok) {
    throw new Error(`Failed to get Instagram account: ${accountResponse.statusText}`);
  }
  
  const account = await accountResponse.json();
  const instagramAccountId = account.id;

  // Publish the media
  const response = await fetch(`${INSTAGRAM_API_URL}/${instagramAccountId}/media_publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      creation_id: creationId,
      access_token: accessToken
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to publish Instagram media: ${response.statusText}`);
  }

  const result = await response.json();
  return {
    media_id: result.id,
    creation_id: creationId,
    success: true,
    platform: 'instagram'
  };
}

async function uploadPhoto(accessToken: string, content: {
  image_url: string;
  caption?: string;
  publish?: boolean;
}) {
  try {
    // Create media first
    const mediaResult = await createInstagramMedia(accessToken, {
      image_url: content.image_url,
      caption: content.caption
    });

    if (!content.publish) {
      return {
        creation_id: mediaResult.creation_id,
        status: 'created',
        message: 'Media created but not published',
        platform: 'instagram'
      };
    }

    // Publish immediately if requested
    const publishResult = await publishInstagramMedia(accessToken, mediaResult.creation_id);
    
    return {
      ...publishResult,
      status: 'published',
      message: 'Photo uploaded and published successfully'
    };

  } catch (error: any) {
    throw new Error(`Upload failed: ${error.message}`);
  }
}