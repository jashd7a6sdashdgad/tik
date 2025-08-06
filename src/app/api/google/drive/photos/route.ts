import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedClient, GoogleDrive } from '@/lib/google';
import { getServerSession } from 'next-auth';

interface Photo {
  id: string;
  name: string;
  size?: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink: string;
  webContentLink?: string;
  thumbnailLink?: string;
  isFavorite?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    console.log('📸 Google Drive Photos API called');
    
    // Get user session/tokens (you'll need to implement session management)
    // For now, we'll assume tokens are stored in session or passed via headers
    const authHeader = request.headers.get('authorization');
    const sessionTokens = request.headers.get('x-google-tokens');
    
    if (!sessionTokens && !authHeader) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        needsAuth: true
      }, { status: 401 });
    }

    let tokens;
    try {
      tokens = sessionTokens ? JSON.parse(sessionTokens) : null;
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

    // Get or create photos folder
    const photosFolder = await drive.getOrCreatePhotosFolder();
    console.log('📁 Photos folder:', photosFolder.name, photosFolder.id);

    // Get photos from the folder
    const photos = await drive.listPhotos(photosFolder.id);
    console.log('📸 Found photos:', photos.length);

    // Transform photos to match our interface
    const transformedPhotos: Photo[] = photos.map(photo => ({
      id: photo.id,
      name: photo.name,
      size: photo.size,
      mimeType: photo.mimeType,
      createdTime: photo.createdTime,
      modifiedTime: photo.modifiedTime,
      webViewLink: photo.webViewLink,
      webContentLink: photo.webContentLink,
      thumbnailLink: photo.thumbnailLink,
      isFavorite: false // We can implement favorites later
    }));

    return NextResponse.json({
      success: true,
      photos: transformedPhotos,
      folder: {
        id: photosFolder.id,
        name: photosFolder.name,
        webViewLink: photosFolder.webViewLink
      }
    });

  } catch (error: any) {
    console.error('Google Drive Photos API error:', error);
    
    // Handle specific Google API errors
    if (error.message?.includes('invalid_grant') || error.message?.includes('unauthorized')) {
      return NextResponse.json({
        success: false,
        error: 'Authentication expired',
        needsAuth: true
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch photos from Google Drive',
      details: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📸 Google Drive Photo Upload API called');
    console.log('📋 Environment folder name:', process.env.GOOGLE_DRIVE_PHOTOS_FOLDER || 'Personal Assistant Photos');
    
    const formData = await request.formData();
    const file = formData.get('photo') as File;
    const sessionTokens = request.headers.get('x-google-tokens');
    
    console.log('📄 File info:', {
      name: file?.name,
      size: file?.size,
      type: file?.type
    });
    
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No photo file provided'
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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({
        success: false,
        error: 'File must be an image'
      }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log('📋 Buffer info:', {
      arrayBufferSize: arrayBuffer.byteLength,
      bufferSize: buffer.length,
      isValidBuffer: Buffer.isBuffer(buffer)
    });
    
    if (buffer.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'File is empty or corrupted'
      }, { status: 400 });
    }
    
    // Get authenticated Google client
    console.log('🔑 Token validation:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      tokenType: typeof tokens.access_token,
      accessTokenLength: tokens.access_token?.length,
      accessTokenPrefix: tokens.access_token?.substring(0, 20) + '...'
    });
    
    // Validate token format
    if (!tokens.access_token || typeof tokens.access_token !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Invalid access token format',
        needsAuth: true
      }, { status: 401 });
    }
    
    try {
      const auth = getAuthenticatedClient(tokens);
      const drive = new GoogleDrive(auth);
      
      // Test authentication before proceeding
      console.log('🔐 Testing Google Drive authentication...');
      await drive.listFiles('', 1); // Quick auth test
      console.log('✅ Google Drive authentication successful');
    } catch (authError: any) {
      console.error('❌ Authentication test failed:', authError.message);
      return NextResponse.json({
        success: false,
        error: 'Google Drive authentication failed - please reconnect',
        needsAuth: true,
        details: authError.message
      }, { status: 401 });
    }
    
    const auth = getAuthenticatedClient(tokens);
    const drive = new GoogleDrive(auth);

    // Get or create photos folder
    const photosFolder = await drive.getOrCreatePhotosFolder();
    
    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `photo-${timestamp}-${file.name}`;

    console.log('📤 Uploading photo:', fileName, 'Size:', buffer.length, 'Type:', file.type);
    console.log('📁 Target folder:', photosFolder.name, 'ID:', photosFolder.id);

    // Upload photo to Google Drive
    const uploadedPhoto = await drive.uploadPhoto(
      fileName,
      file.type,
      buffer,
      photosFolder.id
    );

    console.log('✅ Photo uploaded successfully:', {
      id: uploadedPhoto.id,
      name: uploadedPhoto.name,
      size: uploadedPhoto.size
    });

    // Transform response
    const photo: Photo = {
      id: uploadedPhoto.id,
      name: uploadedPhoto.name,
      size: uploadedPhoto.size,
      mimeType: uploadedPhoto.mimeType,
      createdTime: uploadedPhoto.createdTime,
      modifiedTime: uploadedPhoto.createdTime, // Same as created for new files
      webViewLink: uploadedPhoto.webViewLink,
      webContentLink: uploadedPhoto.webContentLink,
      thumbnailLink: uploadedPhoto.thumbnailLink,
      isFavorite: false
    };

    return NextResponse.json({
      success: true,
      photo,
      message: 'Photo uploaded successfully to Google Drive'
    });

  } catch (error: any) {
    console.error('❌ Google Drive Photo Upload error:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      status: error.status
    });
    
    if (error.message?.includes('invalid_grant') || error.message?.includes('unauthorized')) {
      return NextResponse.json({
        success: false,
        error: 'Authentication expired - please reset and reconnect',
        needsAuth: true,
        details: error.message
      }, { status: 401 });
    }

    // Handle specific Google API errors
    if (error.code === 'ENOTFOUND' || error.message?.includes('network')) {
      return NextResponse.json({
        success: false,
        error: 'Network error - check your internet connection',
        details: error.message
      }, { status: 503 });
    }

    if (error.message?.includes('quota') || error.message?.includes('limit')) {
      return NextResponse.json({
        success: false,
        error: 'Google Drive quota exceeded',
        details: error.message
      }, { status: 429 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to upload photo to Google Drive',
      details: error.message,
      errorType: error.constructor.name,
      code: error.code
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ Google Drive Photo Delete API called');
    
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('id');
    const sessionTokens = request.headers.get('x-google-tokens');
    
    if (!photoId) {
      return NextResponse.json({
        success: false,
        error: 'Photo ID is required'
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

    // Delete photo from Google Drive
    await drive.deleteFile(photoId);
    
    console.log('✅ Photo deleted successfully:', photoId);

    return NextResponse.json({
      success: true,
      message: 'Photo deleted successfully from Google Drive'
    });

  } catch (error: any) {
    console.error('Google Drive Photo Delete error:', error);
    
    if (error.message?.includes('invalid_grant') || error.message?.includes('unauthorized')) {
      return NextResponse.json({
        success: false,
        error: 'Authentication expired',
        needsAuth: true
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to delete photo from Google Drive',
      details: error.message
    }, { status: 500 });
  }
}