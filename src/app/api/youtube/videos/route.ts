import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedClient, YouTube } from '@/lib/google';
import { verifyToken, COOKIE_OPTIONS } from '@/lib/auth';

// Helper function to get Google auth from cookies
function getGoogleAuth(request: NextRequest) {
  const accessToken = request.cookies.get('google_access_token')?.value;
  const refreshToken = request.cookies.get('google_refresh_token')?.value;
  
  if (!accessToken) {
    throw new Error('Google authentication required');
  }
  
  return getAuthenticatedClient({
    access_token: accessToken,
    refresh_token: refreshToken
  });
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
    
    verifyToken(token);
    
    // Get Google authentication
    const auth = getGoogleAuth(request);
    const youtube = new YouTube(auth);
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const maxResults = parseInt(searchParams.get('maxResults') || '10');
    
    // Get recent videos
    const videos = await youtube.getRecentVideos(maxResults);
    
    // Format the response
    const formattedVideos = videos.map((video: any) => ({
      id: video.id?.videoId || video.id,
      title: video.snippet?.title,
      description: video.snippet?.description,
      publishedAt: video.snippet?.publishedAt,
      thumbnails: video.snippet?.thumbnails,
      channelTitle: video.snippet?.channelTitle
    }));
    
    return NextResponse.json({
      success: true,
      data: formattedVideos,
      message: 'Videos retrieved successfully'
    });
    
  } catch (error: any) {
    console.error('YouTube videos GET error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to retrieve videos'
      },
      { status: error.message?.includes('authentication') ? 401 : 500 }
    );
  }
}