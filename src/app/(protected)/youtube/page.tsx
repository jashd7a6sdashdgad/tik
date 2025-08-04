'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';
import { Youtube, Play, Eye, ThumbsUp, MessageSquare, Upload, BarChart3, ExternalLink } from 'lucide-react';

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  published_at: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  duration: string;
}

export default function YouTubePage() {
  const { language } = useSettings();
  const { t } = useTranslation(language);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [channelStats, setChannelStats] = useState({
    subscribers: 0,
    totalViews: 0,
    totalVideos: 0,
    avgViewDuration: 0
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error' | 'config_missing'>('unknown');

  // Function to watch video on YouTube
  const watchVideo = (videoId: string) => {
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    window.open(youtubeUrl, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    fetchYouTubeData();
  }, []);

  const fetchYouTubeData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/youtube?action=channel_stats');
      const data = await response.json();
      
      if (data.success) {
        setIsConnected(true);
        setConnectionStatus('connected');
        setError(null);
        
        if (data.data) {
          setChannelStats({
            subscribers: data.data.subscriberCount || 0,
            totalViews: data.data.viewCount || 0,
            totalVideos: data.data.videoCount || 0,
            avgViewDuration: 4.2 // This would need to be calculated from analytics
          });
        }
        
        // Fetch recent videos
        const videosResponse = await fetch('/api/youtube?action=videos');
        if (videosResponse.ok) {
          const videosData = await videosResponse.json();
          if (videosData.success && videosData.data) {
            setVideos(videosData.data.map((video: any) => ({
              id: video.videoId,
              title: video.title,
              description: video.description,
              thumbnail: video.thumbnails?.default?.url || '',
              published_at: video.publishedAt,
              view_count: 0, // Would need additional API call for stats
              like_count: 0,
              comment_count: 0,
              duration: '0:00'
            })));
          }
        }
      } else {
        setIsConnected(false);
        setError(data.message);
        
        if (data.message?.includes('not configured') || data.message?.includes('API key')) {
          setConnectionStatus('config_missing');
        } else {
          setConnectionStatus('error');
        }
        
        // Use mock data as fallback
        setChannelStats({
          subscribers: 25400,
          totalViews: 1250000,
          totalVideos: 89,
          avgViewDuration: 4.2
        });
        
        setVideos([]);
      }
    } catch (error: any) {
      console.error('Error fetching YouTube data:', error);
      setIsConnected(false);
      setError(error.message || 'Failed to connect to YouTube');
      setConnectionStatus('error');
      
      // No fallback - service must be configured
      setChannelStats({
        subscribers: 0,
        totalViews: 0,
        totalVideos: 0,
        avgViewDuration: 0
      });
      
      setVideos([]);
    } finally {
      setIsLoading(false);
    }
  };

  const connectYouTube = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/youtube?action=connect');
      const data = await response.json();
      
      if (data.success) {
        setIsConnected(true);
        await fetchYouTubeData();
      } else {
        alert(t('settingsError') + ': ' + data.message);
      }
    } catch (error) {
      console.error('Error connecting to YouTube:', error);
      alert(t('settingsError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-black flex items-center">
              <Youtube className="h-8 w-8 mr-3 text-red-600" />
              {t('youtubeTitle')}
            </h1>
            <p className="text-black mt-2">{t('profileDescription')}</p>
          </div>
          
          <Button onClick={connectYouTube} disabled={isLoading}>
            <Youtube className="h-4 w-4 mr-2" />
            {isLoading ? t('loading') : isConnected ? t('refresh') : t('youtubeTitle')}
          </Button>
        </div>

        {/* Connection Status Banner */}
        {connectionStatus === 'config_missing' && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  <strong>{t('settings')}:</strong> {t('profileDescription')}
                </p>
              </div>
            </div>
          </div>
        )}

        {connectionStatus === 'error' && error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">
                  <strong>{t('settingsError')}:</strong> {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {connectionStatus === 'connected' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800">
                  <strong>{t('connected')}:</strong> {t('youtubeTitle')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Channel Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="palette-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">{t('contacts')}</p>
                  <p className="text-2xl font-bold text-primary">{channelStats.subscribers.toLocaleString()}</p>
                </div>
                <Play className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="palette-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">{t('overview')}</p>
                  <p className="text-2xl font-bold text-primary">{channelStats.totalViews.toLocaleString()}</p>
                </div>
                <Eye className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="palette-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">{t('events')}</p>
                  <p className="text-2xl font-bold text-primary">{channelStats.totalVideos}</p>
                </div>
                <Upload className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="palette-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">{t('analytics')}</p>
                  <p className="text-2xl font-bold text-primary">{channelStats.avgViewDuration}m</p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Videos */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center text-black">
                <Play className="h-5 w-5 mr-2" />
                {t('events')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {videos.map((video) => (
                  <div key={video.id} className="flex bg-muted rounded-lg overflow-hidden">
                    <div className="w-40 h-24 bg-gray-200 flex items-center justify-center flex-shrink-0 relative">
                      {video.thumbnail ? (
                        <img 
                          src={video.thumbnail} 
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Play className="h-8 w-8 text-gray-400" />
                      )}
                      {/* Play button overlay */}
                      <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                           onClick={() => watchVideo(video.id)}>
                        <Play className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-black mb-1">{video.title}</h4>
                          <p className="text-sm text-black mb-2 line-clamp-2">{video.description}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => watchVideo(video.id)}
                          className="ml-2 text-xs"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          {t('open')}
                        </Button>
                      </div>
                      <div className="flex items-center justify-between text-xs text-black">
                        <span>{new Date(video.published_at).toLocaleDateString()}</span>
                        <div className="flex space-x-4">
                          <span className="flex items-center">
                            <Eye className="h-3 w-3 mr-1" />
                            {video.view_count.toLocaleString()}
                          </span>
                          <span className="flex items-center">
                            <ThumbsUp className="h-3 w-3 mr-1" />
                            {video.like_count.toLocaleString()}
                          </span>
                          <span className="flex items-center">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            {video.comment_count}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-black">{t('quickActions')}</CardTitle>
              <CardDescription className="text-black">{t('profileDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full justify-start">
                <Upload className="h-4 w-4 mr-2" />
                {t('import')}
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                {t('analyticsTitle')}
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <MessageSquare className="h-4 w-4 mr-2" />
                {t('settings')}
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Play className="h-4 w-4 mr-2" />
                {t('create')}
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                {t('settings')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}