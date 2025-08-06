import { google } from 'googleapis';
import { Readable } from 'stream';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.metadata',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/contacts',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl',
  'https://www.googleapis.com/auth/youtube'
];

// Get the appropriate redirect URI based on environment
function getRedirectUri(request?: any) {
  // If accessing via server IP, use server redirect URI
  if (process.env.GOOGLE_REDIRECT_URI_SERVER && 
      (typeof window !== 'undefined' && window.location.hostname === '31.97.186.247')) {
    return process.env.GOOGLE_REDIRECT_URI_SERVER;
  }
  
  // Default to localhost for development
  return process.env.GOOGLE_REDIRECT_URI;
}

// Initialize OAuth2 client
export function getOAuth2Client(request?: any) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getRedirectUri(request)
  );
}

// Export the redirect URI for debugging/logging purposes
export function getCurrentRedirectUri(request?: any) {
  return getRedirectUri(request);
}

// Generate authorization URL
export function getAuthUrl() {
  const oauth2Client = getOAuth2Client();
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
}

// Exchange authorization code for tokens
export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// Set credentials and return authenticated client
export function getAuthenticatedClient(tokens: any) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials(tokens);
  
  // Add token refresh handler
  oauth2Client.on('tokens', (tokens) => {
    console.log('🔄 Google tokens refreshed automatically');
    if (tokens.refresh_token) {
      console.log('✅ New refresh token obtained');
    }
  });
  
  return oauth2Client;
}

// Google Calendar API
export class GoogleCalendar {
  private calendar: any;

  constructor(auth: any) {
    this.calendar = google.calendar({ version: 'v3', auth });
  }

  async listEvents(timeMin?: string, timeMax?: string, maxResults = 10) {
    const response = await this.calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin || new Date().toISOString(),
      timeMax,
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });
    return response.data.items;
  }

  async createEvent(event: any) {
    const response = await this.calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });
    return response.data;
  }

  async updateEvent(eventId: string, event: any) {
    const response = await this.calendar.events.update({
      calendarId: 'primary',
      eventId,
      resource: event,
    });
    return response.data;
  }

  async deleteEvent(eventId: string) {
    await this.calendar.events.delete({
      calendarId: 'primary',
      eventId,
    });
  }
}

// Gmail API
export class Gmail {
  private gmail: any;

  constructor(auth: any) {
    this.gmail = google.gmail({ version: 'v1', auth });
  }

  async listMessages(query = '', maxResults = 10) {
    return this.retryRequest(async () => {
      console.log(`📧 Gmail API: Listing messages with query: "${query}"`);
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults,
      });
      console.log(`✅ Gmail API: Found ${response.data.messages?.length || 0} messages`);
      return response.data.messages || [];
    }, 'listMessages');
  }

  async getMessage(messageId: string) {
    const response = await this.gmail.users.messages.get({
      userId: 'me',
      id: messageId,
    });
    return response.data;
  }

  async sendMessage(to: string, subject: string, body: string, html?: string) {
    const email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      html || body,
    ].join('\n');

    const base64Email = Buffer.from(email).toString('base64');
    
    const response = await this.gmail.users.messages.send({
      userId: 'me',
      resource: {
        raw: base64Email,
      },
    });
    return response.data;
  }

  async getUnreadCount() {
    const response = await this.gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread',
      maxResults: 1,
    });
    return response.data.resultSizeEstimate || 0;
  }

  async deleteMessage(messageId: string) {
    const response = await this.gmail.users.messages.delete({
      userId: 'me',
      id: messageId,
    });
    return response.data;
  }

  async createLabel(name: string) {
    return this.retryRequest(async () => {
      console.log(`🏷️ Gmail API: Creating label "${name}"`);
      const response = await this.gmail.users.labels.create({
        userId: 'me',
        resource: {
          name,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show'
        },
      });
      console.log(`✅ Gmail API: Label created with ID ${response.data.id}`);
      return response.data;
    }, 'createLabel');
  }

  async getLabels() {
    return this.retryRequest(async () => {
      console.log('🏷️ Gmail API: Getting labels list');
      const response = await this.gmail.users.labels.list({
        userId: 'me',
      });
      console.log(`✅ Gmail API: Found ${response.data.labels?.length || 0} labels`);
      return response.data.labels || [];
    }, 'getLabels');
  }

  // Retry logic for network issues
  private async retryRequest<T>(
    requestFn: () => Promise<T>, 
    operation: string, 
    maxRetries = 3, 
    delay = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error: any) {
        const isNetworkError = error.message?.includes('Premature close') || 
                              error.message?.includes('socket hang up') ||
                              error.message?.includes('ECONNRESET') ||
                              error.code === 'ECONNRESET';
        
        if (isNetworkError && attempt < maxRetries) {
          console.log(`⚠️ Network error in ${operation} (attempt ${attempt}/${maxRetries}): ${error.message}`);
          console.log(`🔄 Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
          continue;
        }
        
        console.error(`❌ Gmail API ${operation} error (final attempt):`, error.message);
        throw error;
      }
    }
    throw new Error(`Failed after ${maxRetries} attempts`);
  }

  async addLabelToMessage(messageId: string, labelIds: string[]) {
    const response = await this.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      resource: {
        addLabelIds: labelIds,
      },
    });
    return response.data;
  }

  async removeLabelFromMessage(messageId: string, labelIds: string[]) {
    const response = await this.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      resource: {
        removeLabelIds: labelIds,
      },
    });
    return response.data;
  }
}

// Google Sheets API
export class GoogleSheets {
  private sheets: any;

  constructor(auth: any) {
    this.sheets = google.sheets({ version: 'v4', auth });
  }

  async getSpreadsheet(spreadsheetId: string) {
    const response = await this.sheets.spreadsheets.get({
      spreadsheetId,
    });
    return response.data;
  }

  async getValues(spreadsheetId: string, range: string) {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    return response.data.values || [];
  }

  async updateValues(spreadsheetId: string, range: string, values: any[][]) {
    const response = await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: {
        values,
      },
    });
    return response.data;
  }

  async appendValues(spreadsheetId: string, range: string, values: any[][]) {
    const response = await this.sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: {
        values,
      },
    });
    return response.data;
  }

  async batchUpdate(spreadsheetId: string, requests: any[]) {
    const response = await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests,
      },
    });
    return response.data;
  }
}

// YouTube API
export class YouTube {
  private youtube: any;

  constructor(auth: any) {
    this.youtube = google.youtube({ version: 'v3', auth });
  }

  async getChannelInfo() {
    const response = await this.youtube.channels.list({
      part: ['snippet', 'statistics'],
      mine: true,
    });
    return response.data.items?.[0];
  }

  async getRecentVideos(maxResults = 10) {
    const response = await this.youtube.search.list({
      part: ['snippet'],
      forMine: true,
      type: 'video',
      order: 'date',
      maxResults,
    });
    return response.data.items || [];
  }

  async getVideoAnalytics(videoId: string) {
    // Note: This requires YouTube Analytics API
    // For now, return basic video details
    const response = await this.youtube.videos.list({
      part: ['statistics', 'snippet'],
      id: [videoId],
    });
    return response.data.items?.[0];
  }

  async updateVideo(videoId: string, snippet: any) {
    const response = await this.youtube.videos.update({
      part: ['snippet'],
      resource: {
        id: videoId,
        snippet,
      },
    });
    return response.data;
  }
}

// Google Drive API
export class GoogleDrive {
  private drive: any;

  constructor(auth: any) {
    this.drive = google.drive({ version: 'v3', auth });
  }

  async listFiles(query = '', maxResults = 100, orderBy = 'createdTime desc') {
    const response = await this.drive.files.list({
      q: query,
      pageSize: maxResults,
      fields: 'nextPageToken, files(id, name, size, mimeType, createdTime, modifiedTime, parents, webViewLink, webContentLink, thumbnailLink)',
      orderBy
    });
    return response.data.files || [];
  }

  async listPhotos(folderId?: string, maxResults = 100) {
    let query = "mimeType contains 'image/'";
    if (folderId) {
      query += ` and parents in '${folderId}'`;
    }
    return this.listFiles(query, maxResults);
  }

  async uploadPhoto(fileName: string, mimeType: string, buffer: Buffer, folderId?: string) {
    console.log('🚀 Starting Google Drive upload:', {
      fileName,
      mimeType,
      bufferSize: buffer.length,
      folderId
    });

    // Validate inputs
    if (!fileName || !fileName.trim()) {
      throw new Error('File name is required');
    }
    if (!mimeType || !mimeType.startsWith('image/')) {
      throw new Error('Invalid mime type - must be an image');
    }
    if (!buffer || buffer.length === 0) {
      throw new Error('File buffer is empty or invalid');
    }

    const fileMetadata: any = {
      name: fileName.trim(),
    };
    
    if (folderId) {
      fileMetadata.parents = [folderId];
    }

    // Convert buffer to readable stream for better compatibility
    const bufferStream = new Readable();
    bufferStream.push(buffer);
    bufferStream.push(null);

    const media = {
      mimeType,
      body: bufferStream,
    };

    console.log('📤 Calling Google Drive API with:', {
      metadata: fileMetadata,
      mediaType: mimeType,
      bodySize: buffer.length,
      hasParents: !!folderId
    });

    try {
      // Test auth first
      await this.drive.about.get({ fields: 'user' });
      console.log('✅ Google Drive authentication verified');

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, name, size, mimeType, createdTime, webViewLink, webContentLink, thumbnailLink',
        uploadType: 'multipart'
      });

      console.log('✅ Google Drive API response:', {
        id: response.data.id,
        name: response.data.name,
        size: response.data.size,
        mimeType: response.data.mimeType
      });

      return response.data;
    } catch (error: any) {
      console.error('❌ Google Drive API upload error:', {
        message: error.message,
        code: error.code,
        status: error.status,
        statusText: error.statusText,
        response: error.response?.data,
        config: error.config ? {
          method: error.config.method,
          url: error.config.url,
          headers: Object.keys(error.config.headers || {})
        } : undefined
      });

      // Provide more specific error messages
      if (error.code === 401 || error.message?.includes('unauthorized')) {
        throw new Error('Google Drive authentication failed - please reconnect your account');
      }
      if (error.code === 403) {
        throw new Error('Google Drive access denied - check permissions');
      }  
      if (error.code === 429) {
        throw new Error('Google Drive API rate limit exceeded - please try again later');
      }
      if (error.message?.includes('quota')) {
        throw new Error('Google Drive storage quota exceeded');
      }
      if (error.message?.includes('network') || error.code === 'ENOTFOUND') {
        throw new Error('Network error - check your internet connection');
      }

      throw new Error(`Google Drive upload failed: ${error.message}`);
    }
  }

  async deleteFile(fileId: string) {
    const response = await this.drive.files.delete({
      fileId,
    });
    return response.data;
  }

  async createFolder(name: string, parentId?: string) {
    const fileMetadata: any = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };
    
    if (parentId) {
      fileMetadata.parents = [parentId];
    }

    const response = await this.drive.files.create({
      resource: fileMetadata,
      fields: 'id, name, createdTime, webViewLink',
    });

    return response.data;
  }

  async getFileMetadata(fileId: string) {
    const response = await this.drive.files.get({
      fileId,
      fields: 'id, name, size, mimeType, createdTime, modifiedTime, parents, webViewLink, webContentLink, thumbnailLink',
    });
    return response.data;
  }

  async downloadFile(fileId: string) {
    const response = await this.drive.files.get({
      fileId,
      alt: 'media',
    });
    return response.data;
  }

  async updateFile(fileId: string, fileName?: string, buffer?: Buffer, mimeType?: string) {
    const fileMetadata: any = {};
    if (fileName) {
      fileMetadata.name = fileName;
    }

    const media = buffer ? {
      mimeType,
      body: buffer,
    } : undefined;

    const response = await this.drive.files.update({
      fileId,
      resource: fileMetadata,
      media,
      fields: 'id, name, size, mimeType, modifiedTime, webViewLink, webContentLink, thumbnailLink',
    });

    return response.data;
  }

  async shareFile(fileId: string, role = 'reader', type = 'anyone') {
    const response = await this.drive.permissions.create({
      fileId,
      resource: {
        role,
        type,
      },
    });
    return response.data;
  }

  async getFolderContents(folderId: string) {
    return this.listFiles(`parents in '${folderId}'`);
  }

  // Create or find the photos folder (configurable via environment)
  async getOrCreatePhotosFolder() {
    const folderName = process.env.GOOGLE_DRIVE_PHOTOS_FOLDER || 'Personal Assistant Photos';
    const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
    
    // Build search query
    let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder'`;
    if (parentFolderId) {
      query += ` and parents in '${parentFolderId}'`;
    }
    
    // First, try to find existing folder
    const existingFolders = await this.listFiles(query);
    
    if (existingFolders.length > 0) {
      console.log(`📁 Found existing photos folder: ${folderName}`);
      return existingFolders[0];
    }
    
    // Create new folder if it doesn't exist
    console.log(`📁 Creating new photos folder: ${folderName}`);
    return this.createFolder(folderName, parentFolderId);
  }
}

// Helper function to refresh tokens
export async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  
  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
}

// Get authenticated Google Sheets client using user OAuth tokens
export async function getGoogleSheetsClient(tokens?: any) {
  if (!tokens) {
    throw new Error('OAuth tokens required for Google Sheets access');
  }
  
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials(tokens);
  
  return google.sheets({ version: 'v4', auth: oauth2Client });
}