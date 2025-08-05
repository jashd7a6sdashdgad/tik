'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';
import { 
  Camera, 
  Upload, 
  Download, 
  Trash2, 
  Search,
  Grid,
  List,
  Heart,
  Share2,
  Eye,
  Plus,
  Filter,
  Image as ImageIcon,
  Mic,
  Brain,
  Sparkles,
  Album,
  Copy,
  Zap,
  Tag,
  MapPin,
  Calendar,
  Users,
  Palette
} from 'lucide-react';
import Image from 'next/image';

import { PhotoIntelligence, PhotoMetadata } from '@/lib/photoIntelligence';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import PhotoDashboard from '@/components/PhotoDashboard';

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

interface SmartAlbum {
  id: string;
  name: string;
  description: string;
  photoCount: number;
  thumbnailUrl?: string;
  createdAt: Date;
  criteria: {
    type: 'event' | 'time' | 'people' | 'location' | 'theme';
    value: any;
  };
}

export default function PhotosPage() {
  const { language } = useSettings();
  const { t } = useTranslation(language);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoMetadata, setPhotoMetadata] = useState<PhotoMetadata[]>([]);
  const [filteredPhotos, setFilteredPhotos] = useState<Photo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [googleTokens, setGoogleTokens] = useState<any>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  
  // Smart photo features
  const [showAIFeatures, setShowAIFeatures] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [smartAlbums, setSmartAlbums] = useState<SmartAlbum[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<string[][]>([]);
  const [voiceSearchQuery, setVoiceSearchQuery] = useState('');
  
  // Initialize photo intelligence
  const photoIntelligence = new PhotoIntelligence();
  
  // Voice input for photo search
  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    resetTranscript, 
    isSupported 
  } = useVoiceInput();

  // Load Google Drive photos
  const loadPhotos = async () => {
    if (!googleTokens) {
      // Try to get tokens from localStorage or session
      const storedTokens = localStorage.getItem('google_tokens');
      if (storedTokens) {
        const tokens = JSON.parse(storedTokens);
        setGoogleTokens(tokens);
        await loadPhotosFromDrive(tokens);
      } else {
        setNeedsAuth(true);
        setIsLoading(false);
      }
      return;
    }
    
    await loadPhotosFromDrive(googleTokens);
  };

  const loadPhotosFromDrive = async (tokens: any) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/google/drive/photos', {
        method: 'GET',
        headers: {
          'x-google-tokens': JSON.stringify(tokens)
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.needsAuth) {
          setNeedsAuth(true);
          return;
        }
        throw new Error(data.error || 'Failed to load photos');
      }
      
      if (data.success) {
        const loadedPhotos = data.photos || [];
        setPhotos(loadedPhotos);
        
        // Convert to PhotoMetadata format (without AI analysis for now)
        try {
          const metadata = await convertPhotosToMetadata(loadedPhotos);
          setPhotoMetadata(metadata);
        } catch (error) {
          console.warn('Failed to convert photos to metadata:', error);
          // Continue without metadata conversion
        }
        
        console.log('📸 Loaded', loadedPhotos.length, 'photos from Google Drive');
      }
    } catch (error: any) {
      console.error('Failed to load photos:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize Google OAuth and load photos
  useEffect(() => {
    loadPhotos();
  }, [googleTokens]);

  // Handle OAuth success callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('google_auth') === 'success') {
      // Try to get tokens from cookies
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
      };

      const accessToken = getCookie('google_access_token');
      const refreshToken = getCookie('google_refresh_token');
      
      if (accessToken) {
        const tokens = {
          access_token: accessToken,
          refresh_token: refreshToken
        };
        
        // Store in localStorage for persistence
        localStorage.setItem('google_tokens', JSON.stringify(tokens));
        setGoogleTokens(tokens);
        setNeedsAuth(false);
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        console.log('✅ Google OAuth completed successfully');
      }
    }
    
    const authError = urlParams.get('error');
    if (authError) {
      setError(`Authentication failed: ${authError}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Reset Google Drive permissions and authentication
  const resetGoogleAuth = () => {
    // Clear all stored tokens and state
    localStorage.removeItem('google_tokens');
    
    // Clear cookies
    document.cookie = 'google_access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'google_refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    // Reset state
    setGoogleTokens(null);
    setNeedsAuth(true);
    setPhotos([]);
    setFilteredPhotos([]);
    setError(null);
    
    console.log('🔄 Google Drive permissions reset');
  };

  // Google OAuth authentication
  const handleGoogleAuth = async () => {
    try {
      const response = await fetch('/api/google/auth');
      const data = await response.json();
      
      if (data.success) {
        // Add photos page as redirect state
        const authUrlWithState = `${data.authUrl}&state=${encodeURIComponent('/photos')}`;
        
        // Redirect to OAuth instead of popup (better for mobile)
        window.location.href = authUrlWithState;
      }
    } catch (error: any) {
      console.error('OAuth error:', error);
      setError('Failed to authenticate with Google');
    }
  };

  // Convert photos to metadata format
  const convertPhotosToMetadata = async (photos: Photo[]): Promise<PhotoMetadata[]> => {
    return photos.map(photo => {
      try {
        return {
          id: photo.id || `photo_${Date.now()}_${Math.random()}`,
          name: photo.name || 'Unknown Photo',
          url: photo.webViewLink || '',
          thumbnailUrl: photo.thumbnailLink,
          size: photo.size ? parseInt(photo.size) : undefined,
          mimeType: photo.mimeType || 'image/jpeg',
          createdTime: new Date(photo.createdTime || Date.now()),
          modifiedTime: new Date(photo.modifiedTime || Date.now()),
          searchableText: (photo.name || '').toLowerCase()
        };
      } catch (error) {
        console.warn('Failed to convert photo to metadata:', photo, error);
        // Return a basic metadata object
        return {
          id: photo.id || `photo_${Date.now()}_${Math.random()}`,
          name: 'Unknown Photo',
          url: '',
          mimeType: 'image/jpeg',
          createdTime: new Date(),
          modifiedTime: new Date(),
          searchableText: ''
        };
      }
    });
  };
  
  // Handle voice search
  useEffect(() => {
    if (transcript && !isListening) {
      setVoiceSearchQuery(transcript);
      handleVoiceSearch(transcript);
      resetTranscript();
    }
  }, [transcript, isListening, resetTranscript]);
  
  const handleVoiceSearch = async (query: string) => {
    if (photoMetadata.length === 0) return;
    
    try {
      const results = await photoIntelligence.searchPhotosByVoice(photoMetadata, query);
      const resultIds = new Set(results.map(r => r.id));
      const filtered = photos.filter(photo => resultIds.has(photo.id));
      setFilteredPhotos(filtered);
      
      setSuccessMessage(`🎤 Found ${filtered.length} photos matching "${query}"`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Voice search error:', error);
      setError('Voice search failed');
    }
  };
  
  // Filter photos based on search term, voice search, and favorites
  useEffect(() => {
    let filtered = photos;
    
    if (searchTerm) {
      if (photoMetadata.length > 0) {
        // Use AI-enhanced search
        const searchResults = photoMetadata.filter(metadata => 
          metadata.searchableText?.includes(searchTerm.toLowerCase()) ||
          metadata.aiTags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
          metadata.textContent?.some(text => text.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        const resultIds = new Set(searchResults.map(r => r.id));
        filtered = filtered.filter(photo => resultIds.has(photo.id));
      } else {
        // Fallback to basic search
        filtered = filtered.filter(photo => 
          photo.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
    }
    
    if (showFavoritesOnly) {
      filtered = filtered.filter(photo => photo.isFavorite);
    }
    
    setFilteredPhotos(filtered);
  }, [photos, photoMetadata, searchTerm, showFavoritesOnly]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!googleTokens) {
      setError('Please authenticate with Google Drive first');
      return;
    }

    // Validate tokens
    if (!googleTokens.access_token) {
      console.error('❌ Missing access token:', googleTokens);
      setError('Invalid authentication tokens - please reset and reconnect');
      setNeedsAuth(true);
      return;
    }

    console.log('🔑 Using tokens:', {
      hasAccessToken: !!googleTokens.access_token,
      hasRefreshToken: !!googleTokens.refresh_token,
      accessTokenLength: googleTokens.access_token?.length
    });

    setIsUploading(true);
    
    try {
      for (const file of Array.from(files)) {
        if (file.type.startsWith('image/')) {
          console.log('📤 Uploading photo:', file.name);
          
          const formData = new FormData();
          formData.append('photo', file);
          
          const response = await fetch('/api/google/drive/photos', {
            method: 'POST',
            headers: {
              'x-google-tokens': JSON.stringify(googleTokens)
            },
            body: formData
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            if (data.needsAuth) {
              setNeedsAuth(true);
              return;
            }
            throw new Error(data.error || 'Failed to upload photo');
          }
          
          if (data.success) {
            console.log('✅ Photo uploaded successfully:', data.photo.name);
            // Add the new photo to the list
            setPhotos(prev => [data.photo, ...prev]);
            
            // Analyze the new photo with AI (non-blocking)
            if (data.photo) {
              analyzeNewPhoto(data.photo).catch(error => {
                console.warn('AI analysis failed for uploaded photo:', error);
                // Don't throw - just log the warning
              });
            }
            
            // Show success message briefly
            const successMsg = `📸 "${file.name}" uploaded to Google Drive!`;
            setSuccessMessage(successMsg);
            console.log('🎉', successMsg);
            
            // Clear success message after 3 seconds
            setTimeout(() => setSuccessMessage(null), 3000);
          } else {
            throw new Error(data.error || 'Upload failed');
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Frontend upload error:', error);
      const errorMessage = error.message || 'Failed to upload photos';
      setError(`Upload failed: ${errorMessage}`);
      
      // Show detailed error in console for debugging
      console.error('❌ Detailed error info:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // Analyze new photo with AI
  const analyzeNewPhoto = async (photo: Photo) => {
    if (!photo || !photo.id) {
      console.warn('Invalid photo data for AI analysis');
      return;
    }

    try {
      const metadata: PhotoMetadata = {
        id: photo.id,
        name: photo.name || 'Unknown',
        url: photo.webViewLink || '',
        thumbnailUrl: photo.thumbnailLink,
        size: photo.size ? parseInt(photo.size) : undefined,
        mimeType: photo.mimeType || 'image/jpeg',
        createdTime: new Date(photo.createdTime || Date.now()),
        modifiedTime: new Date(photo.modifiedTime || Date.now())
      };
      
      const analyzed = await photoIntelligence.analyzePhoto(metadata);
      setPhotoMetadata(prev => [analyzed, ...prev]);
      
      console.log('🤖 AI analysis completed for:', photo.name);
    } catch (error) {
      console.error('AI analysis failed for photo:', photo.name, error);
      // Add the basic metadata without AI analysis
      const basicMetadata: PhotoMetadata = {
        id: photo.id,
        name: photo.name || 'Unknown',
        url: photo.webViewLink || '',
        thumbnailUrl: photo.thumbnailLink,
        size: photo.size ? parseInt(photo.size) : undefined,
        mimeType: photo.mimeType || 'image/jpeg',
        createdTime: new Date(photo.createdTime || Date.now()),
        modifiedTime: new Date(photo.modifiedTime || Date.now()),
        searchableText: (photo.name || '').toLowerCase()
      };
      setPhotoMetadata(prev => [basicMetadata, ...prev]);
    }
  };
  
  // Generate smart albums
  const generateSmartAlbums = async () => {
    if (photoMetadata.length === 0) {
      setError('No photos analyzed yet. Please wait for AI analysis to complete.');
      return;
    }
    
    try {
      setIsAnalyzing(true);
      const albums = await photoIntelligence.createSmartAlbums(photoMetadata);
      setSmartAlbums(albums);
      setSuccessMessage(`🎨 Created ${albums.length} smart albums`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Smart album creation failed:', error);
      setError('Failed to create smart albums');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Detect duplicates
  const detectDuplicates = async () => {
    if (photoMetadata.length === 0) {
      setError('No photos analyzed yet. Please wait for AI analysis to complete.');
      return;
    }
    
    try {
      setIsAnalyzing(true);
      const duplicates = await photoIntelligence.detectDuplicates(photoMetadata);
      setDuplicateGroups(duplicates);
      setSuccessMessage(`🔍 Found ${duplicates.length} duplicate groups`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Duplicate detection failed:', error);
      setError('Failed to detect duplicates');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Batch analyze all photos
  const analyzeAllPhotos = async () => {
    if (photos.length === 0) return;
    
    try {
      setIsAnalyzing(true);
      const metadata = await convertPhotosToMetadata(photos);
      
      // Analyze each photo
      const analyzed = [];
      for (const meta of metadata) {
        try {
          const result = await photoIntelligence.analyzePhoto(meta);
          analyzed.push(result);
        } catch (error) {
          console.error(`Failed to analyze ${meta.name}:`, error);
          analyzed.push(meta); // Add unanalyzed version
        }
      }
      
      setPhotoMetadata(analyzed);
      setSuccessMessage(`🤖 AI analysis completed for ${analyzed.length} photos`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Batch analysis failed:', error);
      setError('Failed to analyze photos');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleFavorite = (photoId: string) => {
    // For now, just update locally - could implement Google Drive metadata later
    setPhotos(prev => 
      prev.map(photo => 
        photo.id === photoId 
          ? { ...photo, isFavorite: !photo.isFavorite }
          : photo
      )
    );
  };

  const deletePhoto = async (photoId: string) => {
    if (!googleTokens) {
      setError('Please authenticate with Google Drive first');
      return;
    }

    try {
      const response = await fetch(`/api/google/drive/photos?id=${photoId}`, {
        method: 'DELETE',
        headers: {
          'x-google-tokens': JSON.stringify(googleTokens)
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.needsAuth) {
          setNeedsAuth(true);
          return;
        }
        throw new Error(data.error || 'Failed to delete photo');
      }
      
      if (data.success) {
        // Remove from local state
        setPhotos(prev => prev.filter(photo => photo.id !== photoId));
        if (selectedPhoto?.id === photoId) {
          setSelectedPhoto(null);
        }
        console.log('✅ Photo deleted successfully');
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      setError(error.message || 'Failed to delete photo');
    }
  };

  const formatFileSize = (size: string | number | undefined) => {
    if (!size) return 'Unknown size';
    const bytes = typeof size === 'string' ? parseInt(size) : size;
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Photos Area */}
        <div className="flex-1">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-bold">{t('photos')}</h1>
              <p className="text-muted-foreground">{t('manageYourPhotoAlbum')}</p>
              {photos.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  📁 {photos.length} photos in "Mahboob Personal Assistant Photos" folder
                </p>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isLoading}
                className="gap-2"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {t('uploading')}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    {t('uploadPhotos')}
                  </>
                )}
              </Button>
              
              <Button 
                onClick={() => setShowAIFeatures(!showAIFeatures)}
                variant={showAIFeatures ? "secondary" : "outline"}
                className="gap-2"
                title="Toggle AI photo features"
              >
                <Brain className="h-4 w-4" />
                AI Features
              </Button>
              
              <Button 
                onClick={() => setShowDashboard(!showDashboard)}
                variant={showDashboard ? "secondary" : "outline"}
                className="gap-2"
                title="View photo intelligence dashboard"
              >
                <Sparkles className="h-4 w-4" />
                Dashboard
              </Button>
              
              <Button 
                onClick={loadPhotos}
                disabled={isLoading}
                variant="outline"
                className="gap-2"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                ) : (
                  '🔄'
                )}
                Refresh
              </Button>
              
              <Button 
                onClick={resetGoogleAuth}
                variant="outline"
                className="gap-2 text-orange-600 border-orange-200 hover:bg-orange-50"
                title="Reset Google Drive permissions"
              >
                🔓 Reset
              </Button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Photo Intelligence Dashboard */}
          {showDashboard && (
            <div className="mb-6">
              <PhotoDashboard 
                photos={photoMetadata}
                smartAlbums={smartAlbums}
                duplicateGroups={duplicateGroups}
                onRefresh={analyzeAllPhotos}
              />
            </div>
          )}

          {/* AI Smart Features Panel */}
          {showAIFeatures && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Smart Photo Features
                </CardTitle>
                <CardDescription>
                  AI-powered photo management and organization tools
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Button
                    onClick={analyzeAllPhotos}
                    disabled={isAnalyzing || photos.length === 0}
                    variant="outline"
                    className="gap-2"
                  >
                    {isAnalyzing ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    ) : (
                      <Brain className="h-4 w-4" />
                    )}
                    Analyze Photos
                  </Button>
                  
                  <Button
                    onClick={generateSmartAlbums}
                    disabled={isAnalyzing || photoMetadata.length === 0}
                    variant="outline"
                    className="gap-2"
                  >
                    <Album className="h-4 w-4" />
                    Smart Albums
                  </Button>
                  
                  <Button
                    onClick={detectDuplicates}
                    disabled={isAnalyzing || photoMetadata.length === 0}
                    variant="outline"
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Find Duplicates
                  </Button>
                  
                  <Button
                    onClick={isListening ? stopListening : startListening}
                    disabled={!isSupported || photoMetadata.length === 0}
                    variant={isListening ? "secondary" : "outline"}
                    className="gap-2"
                  >
                    <Mic className={`h-4 w-4 ${isListening ? 'text-red-500' : ''}`} />
                    Voice Search
                  </Button>
                </div>
                
                {/* Voice Search Status */}
                {isListening && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-800 text-sm flex items-center gap-2">
                      <Mic className="h-4 w-4 animate-pulse" />
                      Listening... Say something like "Show me photos from last vacation" or "Find pictures of food"
                    </p>
                  </div>
                )}
                
                {voiceSearchQuery && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 text-sm">
                      <strong>Voice Query:</strong> "{voiceSearchQuery}"
                    </p>
                  </div>
                )}
                
                {/* AI Analysis Status */}
                {photoMetadata.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    📊 {photoMetadata.length} photos analyzed with AI • {smartAlbums.length} smart albums • {duplicateGroups.length} duplicate groups
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Search and Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={photoMetadata.length > 0 ? "Search by name, tags, or AI-detected content..." : t('searchPhotos')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant={showFavoritesOnly ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    className="gap-2"
                  >
                    <Heart className={`h-4 w-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                    {t('favorites')}
                  </Button>
                  
                  <Button
                    variant={viewMode === 'grid' ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant={viewMode === 'list' ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="mb-6 border-red-200 bg-red-50">
              <CardContent className="p-4">
                <p className="text-red-800">❌ {error}</p>
                <Button 
                  onClick={() => setError(null)} 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                >
                  Dismiss
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Success Display */}
          {successMessage && (
            <Card className="mb-6 border-green-200 bg-green-50">
              <CardContent className="p-4">
                <p className="text-green-800">✅ {successMessage}</p>
              </CardContent>
            </Card>
          )}

          {/* Authentication Required */}
          {needsAuth && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Camera className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Connect to Google Drive</h3>
                <p className="text-muted-foreground text-center mb-4">
                  To manage your photos, please connect your Google Drive account.
                </p>
                <div className="flex gap-2">
                  <Button onClick={handleGoogleAuth} className="gap-2">
                    <Camera className="h-4 w-4" />
                    Connect Google Drive
                  </Button>
                  {/* Show reset button if there might be cached permissions */}
                  {(typeof window !== 'undefined' && localStorage.getItem('google_tokens')) && (
                    <Button onClick={resetGoogleAuth} variant="outline" className="gap-2">
                      🔄 Reset Permissions
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {isLoading && !needsAuth && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <h3 className="text-lg font-semibold mb-2">Loading Photos...</h3>
                <p className="text-muted-foreground">Fetching your photos from Google Drive</p>
              </CardContent>
            </Card>
          )}

          {/* Smart Albums Display */}
          {smartAlbums.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Album className="h-5 w-5" />
                  Smart Albums ({smartAlbums.length})
                </CardTitle>
                <CardDescription>
                  AI-generated photo collections based on content, events, and patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {smartAlbums.map((album) => (
                    <Card key={album.id} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg mb-3 flex items-center justify-center">
                          {album.thumbnailUrl ? (
                            <Image
                              src={album.thumbnailUrl}
                              alt={album.name}
                              width={200}
                              height={120}
                              className="object-cover rounded-lg"
                            />
                          ) : (
                            <div className="text-center">
                              <Album className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <span className="text-sm text-gray-500">{album.photoCount} photos</span>
                            </div>
                          )}
                        </div>
                        <h3 className="font-semibold text-sm mb-1">{album.name}</h3>
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{album.description}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{album.photoCount} photos</span>
                          <span className="flex items-center gap-1">
                            {album.criteria.type === 'event' && <Calendar className="h-3 w-3" />}
                            {album.criteria.type === 'people' && <Users className="h-3 w-3" />}
                            {album.criteria.type === 'location' && <MapPin className="h-3 w-3" />}
                            {album.criteria.type === 'theme' && <Palette className="h-3 w-3" />}
                            {album.criteria.type === 'time' && <Calendar className="h-3 w-3" />}
                            {album.criteria.type}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Duplicate Photos Display */}
          {duplicateGroups.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Copy className="h-5 w-5" />
                  Duplicate Photos ({duplicateGroups.length} groups)
                </CardTitle>
                <CardDescription>
                  Similar photos detected by AI analysis - review and remove duplicates to save space
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {duplicateGroups.slice(0, 5).map((group, groupIndex) => (
                    <div key={groupIndex} className="border rounded-lg p-4">
                      <h4 className="text-sm font-medium mb-2">Duplicate Group {groupIndex + 1}</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {group.map((photoId) => {
                          const photo = photos.find(p => p.id === photoId);
                          if (!photo) return null;
                          return (
                            <div key={photoId} className="relative aspect-square">
                              <Image
                                src={photo.thumbnailLink || photo.webViewLink || '/placeholder-image.png'}
                                alt={photo.name}
                                fill
                                className="object-cover rounded-lg"
                              />
                              <Button
                                size="sm"
                                variant="destructive"
                                className="absolute top-1 right-1 h-6 w-6 p-0"
                                onClick={() => deletePhoto(photoId)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {duplicateGroups.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center">
                      ... and {duplicateGroups.length - 5} more duplicate groups
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Photos Display */}
          {!needsAuth && !isLoading && filteredPhotos.length === 0 && !error ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('noPhotosFound')}</h3>
                <p className="text-muted-foreground text-center mb-4">{t('uploadPhotosToStart')}</p>
                <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t('addFirstPhoto')}
                </Button>
              </CardContent>
            </Card>
          ) : !needsAuth && !isLoading && filteredPhotos.length > 0 ? (
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" 
              : "space-y-4"
            }>
              {filteredPhotos.map((photo) => (
                <Card key={photo.id} className="group hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-0">
                    {viewMode === 'grid' ? (
                      <div className="relative aspect-square">
                        <Image
                          src={photo.thumbnailLink || photo.webViewLink || '/placeholder-image.png'}
                          alt={photo.name}
                          fill
                          className="object-cover rounded-t-lg"
                          onClick={() => setSelectedPhoto(photo)}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-t-lg">
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(photo.id);
                              }}
                            >
                              <Heart className={`h-3 w-3 ${photo.isFavorite ? 'fill-current text-red-500' : ''}`} />
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPhoto(photo);
                              }}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          {/* AI Tags Overlay */}
                          {(() => {
                            const metadata = photoMetadata.find(m => m.id === photo.id);
                            if (metadata?.aiTags && metadata.aiTags.length > 0) {
                              return (
                                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="flex flex-wrap gap-1">
                                    {metadata.aiTags.slice(0, 3).map((tag, idx) => (
                                      <span key={idx} className="bg-blue-500/80 text-white text-xs px-2 py-1 rounded-full">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3">
                          <p className="text-white text-sm font-medium truncate">{photo.name}</p>
                          <p className="text-white/70 text-xs">{formatFileSize(photo.size)} • {new Date(photo.createdTime).toLocaleDateString()}</p>
                          
                          {/* AI Confidence Indicator */}
                          {(() => {
                            const metadata = photoMetadata.find(m => m.id === photo.id);
                            if (metadata?.aiConfidence) {
                              return (
                                <div className="flex items-center gap-1 mt-1">
                                  <Brain className="h-3 w-3 text-blue-400" />
                                  <span className="text-white/70 text-xs">
                                    {Math.round(metadata.aiConfidence * 100)}% AI
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center p-4 gap-4">
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                          <Image
                            src={photo.thumbnailLink || photo.webViewLink || '/placeholder-image.png'}
                            alt={photo.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{photo.name}</h3>
                          <p className="text-sm text-muted-foreground">{photo.mimeType}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatFileSize(photo.size)} • {new Date(photo.createdTime).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleFavorite(photo.id)}
                          >
                            <Heart className={`h-4 w-4 ${photo.isFavorite ? 'fill-current text-red-500' : ''}`} />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedPhoto(photo)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deletePhoto(photo.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}
        </div>

        {/* Photo Details Sidebar */}
        {selectedPhoto && (
          <div className="w-full lg:w-80">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {t('photoDetails')}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPhoto(null)}
                  >
                    ✕
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative aspect-square rounded-lg overflow-hidden">
                  <Image
                    src={selectedPhoto.thumbnailLink || selectedPhoto.webViewLink || '/placeholder-image.png'}
                    alt={selectedPhoto.name}
                    fill
                    className="object-cover"
                  />
                </div>
                
                <div>
                  <h3 className="font-semibold">{selectedPhoto.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(selectedPhoto.size)} • {new Date(selectedPhoto.createdTime).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedPhoto.mimeType}
                  </p>
                  
                  {/* AI-Enhanced Metadata */}
                  {(() => {
                    const metadata = photoMetadata.find(m => m.id === selectedPhoto.id);
                    if (metadata) {
                      return (
                        <div className="mt-3 space-y-2">
                          {/* AI Tags */}
                          {metadata.aiTags && metadata.aiTags.length > 0 && (
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">AI Tags</label>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {metadata.aiTags.map((tag, idx) => (
                                  <span key={idx} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                    <Tag className="h-3 w-3 inline mr-1" />
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Detected Objects */}
                          {metadata.objects && metadata.objects.length > 0 && (
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">Objects Detected</label>
                              <div className="text-sm text-muted-foreground mt-1">
                                {metadata.objects.map(obj => obj.name).join(', ')}
                              </div>
                            </div>
                          )}
                          
                          {/* Faces */}
                          {metadata.faces && metadata.faces.length > 0 && (
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">People</label>
                              <div className="flex items-center gap-1 mt-1">
                                <Users className="h-3 w-3" />
                                <span className="text-sm text-muted-foreground">
                                  {metadata.faces.length} face(s) detected
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {/* Location */}
                          {metadata.location && (
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">Location</label>
                              <div className="flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3" />
                                <span className="text-sm text-muted-foreground">
                                  {metadata.location.city}, {metadata.location.country}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {/* Quality Score */}
                          {metadata.quality && (
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">Quality Score</label>
                              <div className="flex items-center gap-1 mt-1">
                                <Zap className="h-3 w-3" />
                                <span className="text-sm text-muted-foreground">
                                  {Math.round(metadata.quality.overall * 100)}%
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {/* AI Confidence */}
                          {metadata.aiConfidence && (
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">AI Analysis Confidence</label>
                              <div className="flex items-center gap-1 mt-1">
                                <Brain className="h-3 w-3" />
                                <span className="text-sm text-muted-foreground">
                                  {Math.round(metadata.aiConfidence * 100)}%
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div>
                  <label className="text-sm font-medium">Google Drive</label>
                  <p className="text-sm text-muted-foreground">
                    Created: {new Date(selectedPhoto.createdTime).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Modified: {new Date(selectedPhoto.modifiedTime).toLocaleString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleFavorite(selectedPhoto.id)}
                    className="flex-1"
                  >
                    <Heart className={`h-4 w-4 mr-2 ${selectedPhoto.isFavorite ? 'fill-current text-red-500' : ''}`} />
                    {selectedPhoto.isFavorite ? t('unfavorite') : t('addToFavorites')}
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    <Share2 className="h-4 w-4 mr-2" />
                    {t('share')}
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    {t('download')}
                  </Button>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deletePhoto(selectedPhoto.id)}
                  className="w-full text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('deletePhoto')}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}