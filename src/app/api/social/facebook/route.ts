import { NextRequest, NextResponse } from 'next/server';

const FACEBOOK_API_URL = 'https://graph.facebook.com/v18.0';
const PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

interface FacebookPost {
  id: string;
  message?: string;
  story?: string;
  created_time: string;
  likes?: {
    summary: {
      total_count: number;
    };
  };
  comments?: {
    summary: {
      total_count: number;
    };
  };
  shares?: {
    count: number;
  };
  full_picture?: string;
  permalink_url?: string;
}

interface FacebookPageInfo {
  id: string;
  name: string;
  followers_count?: number;
  fan_count?: number;
  posts?: {
    data: FacebookPost[];
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'feed';
  const limit = searchParams.get('limit') || '10';

  if (!PAGE_ID || !ACCESS_TOKEN) {
    return NextResponse.json({
      success: false,
      error: 'Facebook credentials not configured'
    }, { status: 400 });
  }

  try {
    let data;

    switch (action) {
      case 'feed':
        data = await getFacebookFeed(parseInt(limit));
        break;
      case 'page_info':
        data = await getPageInfo();
        break;
      case 'insights':
        data = await getPageInsights();
        break;
      case 'posts':
        data = await getRecentPosts(parseInt(limit));
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
    console.error('Facebook API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch Facebook data'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { action, content } = await request.json();

  if (!PAGE_ID || !ACCESS_TOKEN) {
    return NextResponse.json({
      success: false,
      error: 'Facebook credentials not configured'
    }, { status: 400 });
  }

  try {
    let result;

    switch (action) {
      case 'create_post':
        result = await createFacebookPost(content);
        break;
      case 'schedule_post':
        result = await schedulePost(content);
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
    console.error('Facebook POST error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to perform Facebook action'
    }, { status: 500 });
  }
}

async function getFacebookFeed(limit: number = 10) {
  const fields = 'id,message,story,created_time,likes.summary(true),comments.summary(true),shares,full_picture,permalink_url';
  const url = `${FACEBOOK_API_URL}/${PAGE_ID}/posts?fields=${fields}&limit=${limit}&access_token=${ACCESS_TOKEN}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Facebook API error: ${response.statusText}`);
  }

  const data = await response.json();
  
  return {
    posts: data.data?.map((post: FacebookPost) => ({
      id: post.id,
      content: post.message || post.story || '',
      created_time: post.created_time,
      likes: post.likes?.summary?.total_count || 0,
      comments: post.comments?.summary?.total_count || 0,
      shares: post.shares?.count || 0,
      image: post.full_picture,
      link: post.permalink_url,
      platform: 'facebook'
    })) || [],
    pagination: data.paging
  };
}

async function getPageInfo() {
  const fields = 'id,name,followers_count,fan_count,posts{id,message,created_time,likes.summary(true)}';
  const url = `${FACEBOOK_API_URL}/${PAGE_ID}?fields=${fields}&access_token=${ACCESS_TOKEN}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Facebook API error: ${response.statusText}`);
  }

  const data: FacebookPageInfo = await response.json();
  
  return {
    id: data.id,
    name: data.name,
    followers: data.followers_count || data.fan_count || 0,
    posts_count: data.posts?.data?.length || 0,
    platform: 'facebook'
  };
}

async function getPageInsights() {
  const metrics = [
    'page_fans',
    'page_fan_adds',
    'page_impressions',
    'page_engaged_users',
    'page_post_engagements',
    'page_posts_impressions'
  ];
  
  const period = 'day';
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 7 days ago
  const until = new Date().toISOString().split('T')[0]; // today
  
  const url = `${FACEBOOK_API_URL}/${PAGE_ID}/insights?metric=${metrics.join(',')}&period=${period}&since=${since}&until=${until}&access_token=${ACCESS_TOKEN}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Facebook Insights API error: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Process insights data
  const insights: any = {};
  data.data?.forEach((metric: any) => {
    const latestValue = metric.values?.[metric.values.length - 1];
    insights[metric.name] = {
      value: latestValue?.value || 0,
      end_time: latestValue?.end_time
    };
  });

  return {
    insights,
    period: `${since} to ${until}`,
    platform: 'facebook'
  };
}

async function getRecentPosts(limit: number = 10) {
  const fields = 'id,message,story,created_time,likes.summary(true),comments.summary(true),shares,attachments{media,url},permalink_url';
  const url = `${FACEBOOK_API_URL}/${PAGE_ID}/posts?fields=${fields}&limit=${limit}&access_token=${ACCESS_TOKEN}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Facebook API error: ${response.statusText}`);
  }

  const data = await response.json();
  
  return data.data?.map((post: any) => ({
    id: post.id,
    content: post.message || post.story || '',
    created_time: post.created_time,
    engagement: {
      likes: post.likes?.summary?.total_count || 0,
      comments: post.comments?.summary?.total_count || 0,
      shares: post.shares?.count || 0
    },
    media: post.attachments?.data?.[0]?.media || null,
    link: post.permalink_url,
    platform: 'facebook'
  })) || [];
}

async function createFacebookPost(content: {
  message: string;
  link?: string;
  published?: boolean;
}) {
  const postData = {
    message: content.message,
    access_token: ACCESS_TOKEN,
    published: content.published !== false,
    ...(content.link && { link: content.link })
  };

  const response = await fetch(`${FACEBOOK_API_URL}/${PAGE_ID}/feed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(postData)
  });

  if (!response.ok) {
    throw new Error(`Failed to create Facebook post: ${response.statusText}`);
  }

  const result = await response.json();
  return {
    id: result.id,
    success: true,
    platform: 'facebook'
  };
}

async function schedulePost(content: {
  message: string;
  scheduled_publish_time: number;
  link?: string;
}) {
  const postData = {
    message: content.message,
    access_token: ACCESS_TOKEN,
    published: false,
    scheduled_publish_time: content.scheduled_publish_time,
    ...(content.link && { link: content.link })
  };

  const response = await fetch(`${FACEBOOK_API_URL}/${PAGE_ID}/feed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(postData)
  });

  if (!response.ok) {
    throw new Error(`Failed to schedule Facebook post: ${response.statusText}`);
  }

  const result = await response.json();
  return {
    id: result.id,
    scheduled_time: new Date(content.scheduled_publish_time * 1000).toISOString(),
    success: true,
    platform: 'facebook'
  };
}