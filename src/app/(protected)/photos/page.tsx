'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';
import {
  Camera, Upload, Download, Trash2, Search, Grid, List, Heart, Share2,
  Eye, Plus, Filter, ImageIcon, Mic, Brain, Sparkles, Album, Copy, Zap,
  Tag, MapPin, Calendar, Users, Palette, X, XCircle
} from 'lucide-react';
import Image from 'next/image';
import PhotoDashboard from '@/components/PhotoDashboard';
import VoiceAssistantWidget from '@/components/VoiceAssistantWidget';

// --- Fix: Add the necessary imports for PhotoIntelligence and useVoiceInput ---
import { PhotoIntelligence } from '@/lib/photoIntelligence';
import { useVoiceInput } from '@/hooks/useVoiceInput';

// --- Interfaces ---
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

interface PhotoMetadata {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  createdTime: Date;
  modifiedTime: Date;
  searchableText?: string;
  aiTags?: string[];
  textContent?: string[];
  people?: string[];
}

// --- Helper Functions ---
const formatFileSize = (size: string | number | undefined) => {
  if (!size) return 'Unknown size';
  const bytes = typeof size === 'string' ? parseInt(size, 10) : size;
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

// --- DriveImage Component ---
const DriveImage = ({ photo, alt, className, quality = 85 }: { photo: Photo, alt: string, className?: string, quality?: number }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const src = photo.thumbnailLink || photo.webContentLink;

  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-gray-200 text-gray-400 ${className}`}>
        <ImageIcon className="h-8 w-8" />
      </div>
    );
  }

  const handleLoadingComplete = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  if (hasError) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-200 text-red-500 ${className}`}>
        <XCircle className="h-8 w-8" />
        <p className="text-xs mt-1 text-center text-gray-500">Failed to load</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
      <Image
        src={src}
        alt={alt}
        layout="fill"
        objectFit="cover"
        onLoadingComplete={handleLoadingComplete}
        onError={handleImageError}
        className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        quality={quality}
      />
    </div>
  );
};

// --- Main Component ---
export default function PhotosPage() {
  const { language } = useSettings();
  const { t } = useTranslation(language);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- State Management ---
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoMetadata, setPhotoMetadata] = useState<PhotoMetadata[]>([]);
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

  // Smart photo features state
  const [showAIFeatures, setShowAIFeatures] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [smartAlbums, setSmartAlbums] = useState<SmartAlbum[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<string[][]>([]);
  const [voiceSearchQuery, setVoiceSearchQuery] = useState('');

  // --- Hooks & Instances ---
  const photoIntelligence = useMemo(() => new PhotoIntelligence(), []);
  const {
    isListening, transcript, startListening, stopListening, resetTranscript, isSupported
  } = useVoiceInput();

  // --- Utility Functions ---
  const showNotification = useCallback((type: 'success' | 'error', message: string, duration = 4000) => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    if (type === 'success') {
      setSuccessMessage(message);
      setError(null);
    } else {
      setError(message);
      setSuccessMessage(null);
    }
    notificationTimeoutRef.current = setTimeout(() => {
      setSuccessMessage(null);
      setError(null);
    }, duration);
  }, []);

  // --- Data Fetching & Auth ---
  const loadPhotosFromDrive = useCallback(async (tokens: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/google/drive/photos', {
        headers: { 'x-google-tokens': JSON.stringify(tokens) }
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.needsAuth) setNeedsAuth(true);
        throw new Error(data.error || 'Failed to load photos');
      }
      if (data.success) {
        const loadedPhotos: Photo[] = data.photos || [];
        setPhotos(loadedPhotos);
        const metadata = loadedPhotos.map(photo => ({
          id: photo.id, name: photo.name, url: photo.webViewLink,
          thumbnailUrl: photo.thumbnailLink,
          size: photo.size ? parseInt(photo.size, 10) : undefined,
          mimeType: photo.mimeType, createdTime: new Date(photo.createdTime),
          modifiedTime: new Date(photo.modifiedTime),
          searchableText: (photo.name || '').toLowerCase()
        }));
        setPhotoMetadata(metadata);
        console.log('📸 Loaded', loadedPhotos.length, 'photos from Google Drive');
      }
    } catch (err: any) {
      console.error('Failed to load photos:', err);
      showNotification('error', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  const loadPhotos = useCallback(async () => {
    if (!googleTokens) {
      const storedTokens = localStorage.getItem('google_tokens');
      if (storedTokens) {
        const tokens = JSON.parse(storedTokens);
        setGoogleTokens(tokens);
      } else {
        setNeedsAuth(true);
        setIsLoading(false);
      }
      return;
    }
    await loadPhotosFromDrive(googleTokens);
  }, [googleTokens, loadPhotosFromDrive]);

  useEffect(() => {
    if (googleTokens) {
      loadPhotosFromDrive(googleTokens);
    }
  }, [googleTokens, loadPhotosFromDrive]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('google_auth') === 'success') {
      const accessToken = getCookie('google_access_token');
      const refreshToken = getCookie('google_refresh_token');
      if (accessToken) {
        const tokens = { access_token: accessToken, refresh_token: refreshToken };
        localStorage.setItem('google_tokens', JSON.stringify(tokens));
        setGoogleTokens(tokens);
        setNeedsAuth(false);
        window.history.replaceState({}, document.title, window.location.pathname);
        console.log('✅ Google OAuth completed successfully');
      }
    }
    const authError = urlParams.get('error');
    if (authError) {
      showNotification('error', `Authentication failed: ${authError}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    loadPhotos();
  }, [loadPhotos, showNotification]);

  const resetGoogleAuth = useCallback(() => {
    localStorage.removeItem('google_tokens');
    document.cookie = 'google_access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'google_refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    setGoogleTokens(null);
    setNeedsAuth(true);
    setPhotos([]);
    setError(null);
    console.log('🔄 Google Drive permissions reset');
  }, []);

  const handleGoogleAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/google/auth');
      const data = await response.json();
      if (data.success) {
        const authUrlWithState = `${data.authUrl}&state=${encodeURIComponent('/photos')}`;
        window.location.href = authUrlWithState;
      }
    } catch (err: any) {
      console.error('OAuth error:', err);
      showNotification('error', 'Failed to initiate authentication with Google.');
    }
  }, [showNotification]);

  // --- Photo Management ---
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    if (!googleTokens?.access_token) {
      showNotification('error', 'Authentication is required. Please connect your Google account.');
      setNeedsAuth(true);
      return;
    }

    setIsUploading(true);
    const uploadPromises = Array.from(files).map(async file => {
      try {
        if (!file.type.startsWith('image/')) throw new Error(`"${file.name}" is not an image.`);
        if (file.size > 50 * 1024 * 1024) throw new Error(`"${file.name}" is too large (max 50MB).`);

        const formData = new FormData();
        formData.append('photo', file);

        const response = await fetch('/api/google/drive/photos', {
          method: 'POST',
          headers: { 'x-google-tokens': JSON.stringify(googleTokens) },
          body: formData
        });

        const data = await response.json();
        if (!response.ok) {
          if (data.needsAuth) setNeedsAuth(true);
          throw new Error(data.error || `Failed to upload ${file.name}`);
        }
        return data.photo;
      } catch (err: any) {
        throw new Error(`Upload failed for ${file.name}: ${err.message}`);
      }
    });

    const results = await Promise.allSettled(uploadPromises);
    const successfulUploads: Photo[] = [];
    const failedUploads: string[] = [];

    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        successfulUploads.push(result.value);
      } else if (result.status === 'rejected') {
        failedUploads.push(result.reason.message);
      }
    });

    if (successfulUploads.length > 0) {
      setPhotos(prev => [...successfulUploads, ...prev]);
      showNotification('success', `Successfully uploaded ${successfulUploads.length} photo(s).`);
      successfulUploads.forEach(photo => analyzeNewPhoto(photo).catch(console.warn));
    }

    if (failedUploads.length > 0) {
      showNotification('error', `Failed to upload ${failedUploads.length} photo(s): ${failedUploads.join(', ')}`, 8000);
    }

    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [googleTokens, showNotification]);

  const deletePhoto = useCallback(async (photoId: string) => {
    if (!googleTokens) return showNotification('error', 'Please authenticate with Google Drive first.');

    const originalPhotos = photos;
    setPhotos(prev => prev.filter(p => p.id !== photoId));

    try {
      const response = await fetch(`/api/google/drive/photos?id=${photoId}`, {
        method: 'DELETE',
        headers: { 'x-google-tokens': JSON.stringify(googleTokens) }
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.needsAuth) setNeedsAuth(true);
        throw new Error(data.error || 'Failed to delete photo');
      }
      showNotification('success', 'Photo deleted successfully.');
      if (selectedPhoto?.id === photoId) setSelectedPhoto(null);
    } catch (err: any) {
      showNotification('error', err.message);
      setPhotos(originalPhotos);
    }
  }, [googleTokens, photos, selectedPhoto, showNotification]);

  const toggleFavorite = useCallback((photoId: string) => {
    setPhotos(prev =>
      prev.map(photo =>
        photo.id === photoId
          ? { ...photo, isFavorite: !photo.isFavorite }
          : photo
      )
    );
  }, []);

  // --- AI & Smart Features ---
  const analyzeNewPhoto = useCallback(async (photo: Photo) => {
    if (!photo?.id) return;
    try {
      const metadata: PhotoMetadata = {
        id: photo.id, name: photo.name, url: photo.webViewLink,
        mimeType: photo.mimeType, createdTime: new Date(photo.createdTime),
        modifiedTime: new Date(photo.modifiedTime)
      };
      const analyzed = await photoIntelligence.analyzePhoto(metadata);
      setPhotoMetadata(prev => [analyzed, ...prev.filter(p => p.id !== photo.id)]);
      console.log('🤖 AI analysis completed for:', photo.name);
    } catch (err) {
      console.error('AI analysis failed for photo:', photo.name, err);
      const basicMetadata: PhotoMetadata = {
        id: photo.id, name: photo.name, url: photo.webViewLink,
        mimeType: photo.mimeType, createdTime: new Date(photo.createdTime),
        modifiedTime: new Date(photo.modifiedTime),
        searchableText: (photo.name || '').toLowerCase()
      };
      setPhotoMetadata(prev => [basicMetadata, ...prev.filter(p => p.id !== photo.id)]);
    }
  }, [photoIntelligence]);

  const analyzeAllPhotos = useCallback(async () => {
    if (photos.length === 0) return;
    setIsAnalyzing(true);
    try {
      const metadataToAnalyze = photos.map(p => ({
        id: p.id, name: p.name, url: p.webViewLink, mimeType: p.mimeType,
        createdTime: new Date(p.createdTime), modifiedTime: new Date(p.modifiedTime)
      }));

      const analysisPromises = metadataToAnalyze.map(meta =>
        photoIntelligence.analyzePhoto(meta).catch(err => {
          console.error(`Failed to analyze ${meta.name}:`, err);
          return { ...meta, searchableText: (meta.name || '').toLowerCase() };
        })
      );

      const analyzedMetadata = await Promise.all(analysisPromises);

      setPhotoMetadata(analyzedMetadata);
      showNotification('success', `🤖 AI analysis completed for ${analyzedMetadata.length} photos`);
    } catch (err: any) {
      showNotification('error', 'Failed to complete batch analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [photos, photoIntelligence, showNotification]);

  const handleVoiceSearch = useCallback(async (query: string) => {
    if (photoMetadata.length === 0) return;
    try {
      const results = await photoIntelligence.searchPhotosByVoice(photoMetadata, query);
      const resultIds = new Set(results.map(r => r.id));

      const voiceFilteredPhotos = photos.filter(photo => resultIds.has(photo.id));

      setSearchTerm(`voice_query:"${query}"`);

      showNotification('success', `🎤 Found ${voiceFilteredPhotos.length} photos matching "${query}"`);
    } catch (err) {
      showNotification('error', 'Voice search failed');
    }
  }, [photoMetadata, photoIntelligence, photos, showNotification]);

  useEffect(() => {
    if (transcript && !isListening) {
      setVoiceSearchQuery(transcript);
      handleVoiceSearch(transcript);
      resetTranscript();
    }
  }, [transcript, isListening, resetTranscript, handleVoiceSearch]);

  // --- Memoized Derived State ---
  const filteredPhotos = useMemo(() => {
    let result = photos;

    if (showFavoritesOnly) {
      result = result.filter(photo => photo.isFavorite);
    }

    if (searchTerm) {
      if (searchTerm.startsWith('voice_query:')) {
        const lowercasedTerm = searchTerm.replace('voice_query:', '').replace(/"/g, '').toLowerCase();
        const searchResults = photoMetadata.filter(metadata =>
          metadata.searchableText?.includes(lowercasedTerm) ||
          metadata.aiTags?.some(tag => tag.toLowerCase().includes(lowercasedTerm)) ||
          metadata.textContent?.some(text => text.toLowerCase().includes(lowercasedTerm))
        );
        const resultIds = new Set(searchResults.map(r => r.id));
        result = result.filter(photo => resultIds.has(photo.id));
      } else {
        const lowercasedTerm = searchTerm.toLowerCase();
        if (photoMetadata.length > 0) {
          const searchResults = photoMetadata.filter(metadata =>
            metadata.searchableText?.includes(lowercasedTerm) ||
            metadata.aiTags?.some(tag => tag.toLowerCase().includes(lowercasedTerm)) ||
            metadata.textContent?.some(text => text.toLowerCase().includes(lowercasedTerm))
          );
          const resultIds = new Set(searchResults.map(r => r.id));
          result = result.filter(photo => resultIds.has(photo.id));
        } else {
          result = result.filter(photo => photo.name.toLowerCase().includes(lowercasedTerm));
        }
      }
    }

    return result;
  }, [photos, photoMetadata, searchTerm, showFavoritesOnly]);

  // --- Render ---
  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('photos')}</h1>
          <p className="text-muted-foreground">{t('manageYourPhotoAlbum')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading || isLoading} className="gap-2">
            {isUploading ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>{t('uploading')}</>
            ) : (
              <><Upload className="h-4 w-4" />{t('uploadPhotos')}</>
            )}
          </Button>
          <Button onClick={loadPhotos} disabled={isLoading} variant="outline" className="gap-2">
            {isLoading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div> : '🔄'}
            Refresh
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50 text-red-800">
          <CardContent className="p-4 flex justify-between items-center">
            <p>{error}</p>
            <Button variant="ghost" size="icon" onClick={() => setError(null)}><X className="h-4 w-4" /></Button>
          </CardContent>
        </Card>
      )}
      {successMessage && (
        <Card className="mb-6 border-green-200 bg-green-50 text-green-800">
          <CardContent className="p-4 flex justify-between items-center">
            <p>{successMessage}</p>
            <Button variant="ghost" size="icon" onClick={() => setSuccessMessage(null)}><X className="h-4 w-4" /></Button>
          </CardContent>
        </Card>
      )}

      {/* Auth Screen */}
      {needsAuth && (
        <Card className="my-10 text-center">
          <CardHeader>
            <CardTitle>Connect to Google Drive</CardTitle>
            <CardDescription>To manage your photos, you need to grant access to your Google Drive account.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleGoogleAuth} className="gap-2">
              <ImageIcon className="h-4 w-4" />
              Connect Google Drive
            </Button>
            <p className="text-xs text-muted-foreground mt-2">This will only access files created by this application.</p>
          </CardContent>
        </Card>
      )}

      {/* Main Content (when authenticated) */}
      {!needsAuth && (
        <>
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
                    <Heart className={`h-4 w-4 ${showFavoritesOnly ? 'fill-current text-red-500' : ''}`} />
                    {t('favorites')}
                  </Button>
                  <Button variant={viewMode === 'grid' ? "secondary" : "outline"} size="sm" onClick={() => setViewMode('grid')}>
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button variant={viewMode === 'list' ? "secondary" : "outline"} size="sm" onClick={() => setViewMode('list')}>
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Photo Grid/List */}
          {isLoading ? (
            <div className="text-center p-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading photos from Google Drive...</p>
            </div>
          ) : filteredPhotos.length > 0 ? (
            <>
              {viewMode === 'grid' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredPhotos.map((photo) => (
                    <Card key={photo.id} className="relative group overflow-hidden">
                      <div className="aspect-square bg-gray-100 flex items-center justify-center">
                        <DriveImage
                          photo={photo}
                          alt={photo.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          quality={75}
                        />
                      </div>
                      <div className="absolute top-2 right-2">
                        <Button
                          onClick={() => toggleFavorite(photo.id)}
                          variant="ghost"
                          size="icon"
                          className={`text-white hover:text-red-500 ${photo.isFavorite ? 'text-red-500' : ''}`}
                        >
                          <Heart className={`h-4 w-4 ${photo.isFavorite ? 'fill-current' : ''}`} />
                        </Button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                        <p className="text-sm font-medium text-white line-clamp-1">{photo.name}</p>
                        <p className="text-xs text-gray-300">{formatFileSize(photo.size)}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {viewMode === 'list' && (
                <div className="space-y-4">
                  {filteredPhotos.map((photo) => (
                    <Card key={photo.id}>
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                          <DriveImage
                            photo={photo}
                            alt={photo.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{photo.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(photo.size)} • {new Date(photo.createdTime).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Button
                            onClick={() => toggleFavorite(photo.id)}
                            variant="ghost"
                            size="icon"
                          >
                            <Heart className={`h-4 w-4 ${photo.isFavorite ? 'fill-current text-red-500' : ''}`} />
                          </Button>
                          <Button
                            onClick={() => deletePhoto(photo.id)}
                            variant="ghost"
                            size="icon"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center p-10 border-2 border-dashed rounded-lg">
              <h3 className="text-lg font-medium">No Photos Found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? "Try adjusting your search or filters." : "Upload your first photo to get started."}
              </p>
              <Button onClick={() => fileInputRef.current?.click()} className="mt-4 gap-2">
                <Upload className="h-4 w-4" />
                Upload a Photo
              </Button>
            </div>
          )}
        </>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Voice Assistant Widget */}
      <VoiceAssistantWidget 
        page="photos" 
        position="fixed"
        size="md"
      />
    </div>
  );
}