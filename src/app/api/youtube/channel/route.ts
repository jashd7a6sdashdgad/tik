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
    
    // Get channel information
    const channelInfo = await youtube.getChannelInfo();
    
    if (!channelInfo) {
      return NextResponse.json(
        { success: false, message: 'No YouTube channel found for this account' },
        { status: 404 }
      );
    }
    
    // Format the response
    const formattedChannel = {
      id: channelInfo.id,
      title: channelInfo.snippet?.title,
      description: channelInfo.snippet?.description,
      customUrl: channelInfo.snippet?.customUrl,
      publishedAt: channelInfo.snippet?.publishedAt,
      thumbnails: channelInfo.snippet?.thumbnails,
      statistics: {
        viewCount: parseInt(channelInfo.statistics?.viewCount || '0'),
        subscriberCount: parseInt(channelInfo.statistics?.subscriberCount || '0'),
        videoCount: parseInt(channelInfo.statistics?.videoCount || '0')
      }
    };
    
    return NextResponse.json({
      success: true,
      data: formattedChannel,
      message: 'Channel information retrieved successfully'
    });
    
  } catch (error: any) {
    console.error('YouTube channel GET error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to retrieve channel information'
      },
      { status: error.message?.includes('authentication') ? 401 : 500 }
    );
  }
}