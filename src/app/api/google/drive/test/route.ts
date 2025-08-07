// Google Drive Connection Test Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedClient, GoogleDrive } from '@/lib/google';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Google Drive Test API called');
    
    const sessionTokens = request.headers.get('x-google-tokens');
    
    if (!sessionTokens) {
      return NextResponse.json({
        success: false,
        error: 'No authentication tokens provided',
        step: 'token_check'
      }, { status: 401 });
    }

    let tokens;
    try {
      tokens = JSON.parse(sessionTokens);
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to parse authentication tokens',
        step: 'token_parse'
      }, { status: 400 });
    }

    // Step 1: Check token structure
    const tokenCheck = {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      accessTokenType: typeof tokens.access_token,
      accessTokenLength: tokens.access_token?.length,
      accessTokenValid: tokens.access_token && typeof tokens.access_token === 'string' && tokens.access_token.length > 20
    };
    
    console.log('🔑 Token check:', tokenCheck);

    if (!tokenCheck.accessTokenValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid access token format',
        step: 'token_validation',
        details: tokenCheck
      }, { status: 401 });
    }

    // Step 2: Test authentication
    let auth;
    try {
      auth = getAuthenticatedClient(tokens);
      console.log('✅ OAuth client created successfully');
    } catch (authError: any) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create authenticated client',
        step: 'auth_client_creation',
        details: authError.message
      }, { status: 500 });
    }

    // Step 3: Test basic Google Drive connection
    let driveTest;
    try {
      const drive = new GoogleDrive(auth);
      
      // Test 1: Get user info
      const aboutResponse = await (drive as any).drive.about.get({ fields: 'user' });
      console.log('✅ User info retrieved:', aboutResponse.data.user);
      
      // Test 2: List a few files
      const filesResponse = await drive.listFiles('', 5);
      console.log('✅ Files listed:', filesResponse.length);
      
      driveTest = {
        userInfo: aboutResponse.data.user,
        fileCount: filesResponse.length,
        canAccessDrive: true
      };
      
    } catch (driveError: any) {
      console.error('❌ Drive test failed:', driveError);
      return NextResponse.json({
        success: false,
        error: 'Google Drive access failed',
        step: 'drive_access',
        details: {
          message: driveError.message,
          code: driveError.code,
          status: driveError.status
        }
      }, { status: 403 });
    }

    // Step 4: Test photos folder access
    let folderTest;
    try {
      const drive = new GoogleDrive(auth);
      const photosFolder = await drive.getOrCreatePhotosFolder();
      console.log('✅ Photos folder accessed/created:', photosFolder.name);
      
      folderTest = {
        folderId: photosFolder.id,
        folderName: photosFolder.name,
        folderWebViewLink: photosFolder.webViewLink
      };
      
    } catch (folderError: any) {
      console.error('❌ Folder test failed:', folderError);
      return NextResponse.json({
        success: false,
        error: 'Photos folder access failed',
        step: 'folder_access',
        details: {
          message: folderError.message,
          code: folderError.code
        }
      }, { status: 500 });
    }

    // Step 5: Test file upload capabilities (create a tiny test file)
    let uploadTest;
    try {
      const drive = new GoogleDrive(auth);
      const testBuffer = Buffer.from('Test file content for upload verification');
      const testFileName = `test-upload-${Date.now()}.txt`;
      
      const uploadResult = await (drive as any).drive.files.create({
        resource: {
          name: testFileName,
          parents: [folderTest.folderId]
        },
        media: {
          mimeType: 'text/plain',
          body: testBuffer
        },
        fields: 'id, name, size'
      });
      
      console.log('✅ Test file uploaded:', uploadResult.data);
      
      // Clean up - delete the test file
      await drive.deleteFile(uploadResult.data.id);
      console.log('✅ Test file cleaned up');
      
      uploadTest = {
        canUpload: true,
        testFileId: uploadResult.data.id,
        testFileSize: uploadResult.data.size
      };
      
    } catch (uploadError: any) {
      console.error('❌ Upload test failed:', uploadError);
      uploadTest = {
        canUpload: false,
        error: uploadError.message,
        code: uploadError.code,
        status: uploadError.status
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Google Drive connection test completed',
      tests: {
        tokenCheck,
        driveTest,
        folderTest,
        uploadTest
      },
      environment: {
        nodeVersion: process.version,
        hasGoogleCredentials: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        photosFolder: process.env.GOOGLE_DRIVE_PHOTOS_FOLDER || 'Personal Assistant Photos'
      }
    });

  } catch (error: any) {
    console.error('❌ Google Drive test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Test failed with unexpected error',
      step: 'unknown',
      details: {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5)
      }
    }, { status: 500 });
  }
}