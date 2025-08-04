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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
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
    
    const { videoId } = await params;
    
    // Get video analytics
    const video = await youtube.getVideoAnalytics(videoId);
    
    if (!video) {
      return NextResponse.json(
        { success: false, message: 'Video not found' },
        { status: 404 }
      );
    }
    
    // Format the response
    const formattedVideo = {
      id: video.id,
      title: video.snippet?.title,
      description: video.snippet?.description,
      publishedAt: video.snippet?.publishedAt,
      thumbnails: video.snippet?.thumbnails,
      statistics: {
        viewCount: parseInt(video.statistics?.viewCount || '0'),
        likeCount: parseInt(video.statistics?.likeCount || '0'),
        commentCount: parseInt(video.statistics?.commentCount || '0')
      }
    };
    
    return NextResponse.json({
      success: true,
      data: formattedVideo,
      message: 'Video analytics retrieved successfully'
    });
    
  } catch (error: any) {
    console.error('YouTube video GET error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to retrieve video analytics'
      },
      { status: error.message?.includes('authentication') ? 401 : 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
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
    
    const { videoId } = await params;
    const body = await request.json();
    
    // Update video metadata
    const updatedVideo = await youtube.updateVideo(videoId, body.snippet);
    
    return NextResponse.json({
      success: true,
      data: updatedVideo,
      message: 'Video updated successfully'
    });
    
  } catch (error: any) {
    console.error('YouTube video PUT error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to update video'
      },
      { status: error.message?.includes('authentication') ? 401 : 500 }
    );
  }
}