import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_OPTIONS } from '@/lib/auth';
import { getAuthenticatedClient, YouTube } from '@/lib/google';
import { google } from 'googleapis';

// Helper function to get Google auth from cookies
function getGoogleAuth(request: NextRequest) {
  const accessToken = request.cookies.get('google_access_token')?.value;
  const refreshToken = request.cookies.get('google_refresh_token')?.value;
  
  if (!accessToken) {
    throw new Error('Google authentication required. Please authenticate with Google first.');
  }
  
  return getAuthenticatedClient({
    access_token: accessToken,
    refresh_token: refreshToken
  });
}

// Helper function to check if YouTube API key is invalid
function isYouTubeKeyInvalid(errorMessage: string): boolean {
  return errorMessage.includes('API key not valid') ||
         errorMessage.includes('Invalid API key') ||
         errorMessage.includes('API_KEY_INVALID') ||
         errorMessage.includes('key not valid');
}

// Helper function to check if YouTube quota is exceeded
function isYouTubeQuotaExceeded(errorMessage: string): boolean {
  return errorMessage.includes('quota') ||
         errorMessage.includes('Quota exceeded') ||
         errorMessage.includes('QUOTA_EXCEEDED');
}

// Helper function to check if OAuth token is invalid
function isYouTubeOAuthInvalid(errorMessage: string): boolean {
  return errorMessage.includes('Invalid Credentials') ||
         errorMessage.includes('Request had invalid authentication credentials') ||
         errorMessage.includes('Access token expired') ||
         errorMessage.includes('invalid_grant');
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_OPTIONS.name)?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    
    // Get Google authentication
    let auth;
    try {
      auth = getGoogleAuth(request);
    } catch (authError: any) {
      console.error('🚨 YouTube OAuth authentication failed:', authError.message);
      return NextResponse.json({
        success: false,
        message: 'Google authentication required for YouTube API access.',
        error: 'YOUTUBE_OAUTH_REQUIRED',
        help: 'Please authenticate with Google first via /api/google/auth',
        details: {
          authError: authError.message,
          hasAccessToken: !!request.cookies.get('google_access_token')?.value,
          hasRefreshToken: !!request.cookies.get('google_refresh_token')?.value
        }
      }, { status: 401 });
    }
    
    const youtube = new YouTube(auth);

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'channel_stats';

    try {
      let data;
      
      switch (action) {
        case 'channel_stats':
          data = await youtube.getChannelInfo();
          if (data) {
            // Format the data to match expected structure
            data = {
              channelTitle: data.snippet?.title,
              subscriberCount: parseInt(data.statistics?.subscriberCount || 0),
              videoCount: parseInt(data.statistics?.videoCount || 0),
              viewCount: parseInt(data.statistics?.viewCount || 0),
              description: data.snippet?.description,
              publishedAt: data.snippet?.publishedAt,
              thumbnails: data.snippet?.thumbnails
            };
          }
          break;
        case 'videos':
          const maxResults = parseInt(searchParams.get('maxResults') || '10');
          const videos = await youtube.getRecentVideos(maxResults);
          data = videos.map((video: any) => ({
            videoId: video.id?.videoId || video.snippet?.resourceId?.videoId,
            title: video.snippet?.title,
            description: video.snippet?.description,
            publishedAt: video.snippet?.publishedAt,
            thumbnails: video.snippet?.thumbnails,
            channelTitle: video.snippet?.channelTitle,
            url: `https://www.youtube.com/watch?v=${video.id?.videoId || video.snippet?.resourceId?.videoId}`
          }));
          break;
        case 'search':
          const query = searchParams.get('q');
          if (!query) {
            return NextResponse.json({ 
              success: false, 
              message: 'Search query is required' 
            }, { status: 400 });
          }
          // For search, we'll use the basic Google API since the YouTube class doesn't have a search method
          data = await searchVideos(query, auth);
          break;
        case 'connect':
          // Test connection by getting channel info
          data = await youtube.getChannelInfo();
          if (data) {
            data = { connected: true, channelTitle: data.snippet?.title };
          }
          break;
        default:
          return NextResponse.json({ 
            success: false, 
            message: 'Invalid action. Available actions: channel_stats, videos, search, connect' 
          }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        data,
        message: `YouTube ${action} retrieved successfully`,
        userId: user.id,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('YouTube OAuth API error:', error);
      
      const errorMessage = error.message || error.toString();
      
      // Check for OAuth-specific errors
      if (isYouTubeOAuthInvalid(errorMessage)) {
        console.error('  🔑 YouTube OAuth token is INVALID or EXPIRED');
        return NextResponse.json({
          success: false,
          message: `YouTube OAuth authentication failed: ${errorMessage}. Please re-authenticate with Google.`,
          error: 'YOUTUBE_OAUTH_INVALID',
          help: 'Re-authenticate via /api/google/auth to refresh your tokens',
          details: { errorMessage, userId: user.id }
        }, { status: 401 });
      }
      
      if (isYouTubeQuotaExceeded(errorMessage)) {
        console.error('  📈 YouTube API quota exceeded');
        return NextResponse.json({
          success: false,
          message: `YouTube API quota exceeded: ${errorMessage}. Please check your quota usage in Google Cloud Console.`,
          error: 'YOUTUBE_QUOTA_EXCEEDED',
          help: 'Check quota usage in Google Cloud Console',
          details: { errorMessage, userId: user.id }
        }, { status: 429 });
      }
      
      return NextResponse.json({
        success: false,
        message: error.message || 'Failed to fetch YouTube data',
        error: 'YOUTUBE_API_ERROR',
        userId: user.id,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('YouTube route error:', error);
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
    
    // Get Google authentication
    let auth;
    try {
      auth = getGoogleAuth(request);
    } catch (authError: any) {
      console.error('🚨 YouTube OAuth authentication failed:', authError.message);
      return NextResponse.json({
        success: false,
        message: 'Google authentication required for YouTube API access.',
        error: 'YOUTUBE_OAUTH_REQUIRED',
        help: 'Please authenticate with Google first via /api/google/auth',
        details: {
          authError: authError.message,
          hasAccessToken: !!request.cookies.get('google_access_token')?.value,
          hasRefreshToken: !!request.cookies.get('google_refresh_token')?.value
        }
      }, { status: 401 });
    }
    
    const youtube = new YouTube(auth);

    const body = await request.json();
    const { action, ...params } = body;

    try {
      let data;
      
      switch (action) {
        case 'comment':
          if (!params.videoId || !params.text) {
            return NextResponse.json({ 
              success: false, 
              message: 'Video ID and comment text are required' 
            }, { status: 400 });
          }
          data = await addComment(params.videoId, params.text, auth);
          break;
        case 'like':
          if (!params.videoId) {
            return NextResponse.json({ 
              success: false, 
              message: 'Video ID is required' 
            }, { status: 400 });
          }
          data = await likeVideo(params.videoId, auth);
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
        message: `YouTube ${action} completed successfully`,
        userId: user.id,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('YouTube POST OAuth error:', error);
      
      const errorMessage = error.message || error.toString();
      
      // Check for OAuth-specific errors
      if (isYouTubeOAuthInvalid(errorMessage)) {
        console.error('  🔑 YouTube OAuth token is INVALID or EXPIRED');
        return NextResponse.json({
          success: false,
          message: `YouTube OAuth authentication failed: ${errorMessage}. Please re-authenticate with Google.`,
          error: 'YOUTUBE_OAUTH_INVALID',
          help: 'Re-authenticate via /api/google/auth to refresh your tokens',
          details: { errorMessage, userId: user.id }
        }, { status: 401 });
      }
      
      return NextResponse.json({
        success: false,
        message: error.message || 'Failed to perform YouTube action',
        error: 'YOUTUBE_API_ERROR',
        userId: user.id,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('YouTube POST route error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Internal server error'
    }, { status: error.message?.includes('Invalid token') ? 401 : 500 });
  }
}

// Helper function for search using OAuth2
async function searchVideos(query: string, auth: any) {
  const youtube = google.youtube({ version: 'v3', auth });
  
  const response = await (youtube.search.list as any)({
    part: 'snippet',
    q: query,
    maxResults: 10,
    type: 'video'
  });
  
  return response.data.items?.map((item: any) => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    description: item.snippet.description,
    publishedAt: item.snippet.publishedAt,
    channelTitle: item.snippet.channelTitle,
    thumbnails: item.snippet.thumbnails,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`
  })) || [];
}



// These functions now use OAuth2 and can actually perform actions
async function addComment(videoId: string, text: string, auth: any) {
  const youtube = google.youtube({ version: 'v3', auth });
  
  try {
    const response = await (youtube.commentThreads.insert as any)({
      part: ['snippet'],
      resource: {
        snippet: {
          videoId: videoId,
          topLevelComment: {
            snippet: {
              textOriginal: text
            }
          }
        }
      }
    });
    
    return {
      success: true,
      message: 'Comment added successfully',
      commentId: response.data.id,
      videoId,
      text
    };
  } catch (error: any) {
    throw new Error(`Failed to add comment: ${error.message}`);
  }
}

async function likeVideo(videoId: string, auth: any) {
  const youtube = google.youtube({ version: 'v3', auth });
  
  try {
    await youtube.videos.rate({
      id: videoId,
      rating: 'like'
    });
    
    return {
      success: true,
      message: 'Video liked successfully',
      videoId
    };
  } catch (error: any) {
    throw new Error(`Failed to like video: ${error.message}`);
  }
}