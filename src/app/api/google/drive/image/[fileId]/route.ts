import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedClient, GoogleDrive } from '@/lib/google';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const { searchParams } = new URL(request.url);
    const tokensParam = searchParams.get('tokens');
    const sessionTokens = request.headers.get('x-google-tokens') || tokensParam;
    
    if (!fileId) {
      return NextResponse.json({
        success: false,
        error: 'File ID is required'
      }, { status: 400 });
    }

    if (!sessionTokens) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        needsAuth: true
      }, { status: 401 });
    }

    let tokens;
    try {
      tokens = JSON.parse(sessionTokens);
    } catch (error) {
      console.error('Failed to parse tokens:', error);
      return NextResponse.json({
        success: false,
        error: 'Invalid authentication tokens'
      }, { status: 401 });
    }

    // Get authenticated Google client
    const auth = getAuthenticatedClient(tokens);
    const drive = new GoogleDrive(auth);

    // Get file metadata to check if it exists and is an image
    const fileMetadata = await drive.getFileMetadata(fileId);
    
    if (!fileMetadata.mimeType?.startsWith('image/')) {
      return NextResponse.json({
        success: false,
        error: 'File is not an image'
      }, { status: 400 });
    }

    // Get the image data from Google Drive
    const imageBuffer = await drive.downloadFile(fileId);
    
    // Return the image with proper headers
    return new Response(imageBuffer, {
      headers: {
        'Content-Type': fileMetadata.mimeType,
        'Content-Length': imageBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'ETag': fileMetadata.modifiedTime || fileMetadata.createdTime,
      },
    });

  } catch (error: any) {
    console.error('Google Drive Image Proxy error:', error);
    
    if (error.message?.includes('invalid_grant') || error.message?.includes('unauthorized')) {
      return NextResponse.json({
        success: false,
        error: 'Authentication expired',
        needsAuth: true
      }, { status: 401 });
    }

    if (error.message?.includes('not found') || error.code === 404) {
      return NextResponse.json({
        success: false,
        error: 'Image not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch image from Google Drive',
      details: error.message
    }, { status: 500 });
  }
}