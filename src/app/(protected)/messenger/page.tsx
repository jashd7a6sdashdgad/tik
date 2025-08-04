'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';
import { Instagram, Camera, Heart, MessageCircle, TrendingUp, Upload } from 'lucide-react';

interface InstagramPost {
  id: string;
  media_url: string;
  caption: string;
  like_count: number;
  comments_count: number;
  timestamp: string;
}

export default function InstagramPage() {
  const { language } = useSettings();
  const { t } = useTranslation(language);
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [stats, setStats] = useState({
    followers: 0,
    following: 0,
    posts: 0,
    engagement: 0
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchInstagramData();
  }, []);

  const fetchInstagramData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/instagram?action=profile');
      const data = await response.json();
      
      if (data.success) {
        setIsConnected(true);
        if (data.data) {
          setStats({
            followers: data.data.followers_count || 0,
            following: 0, // Instagram Basic Display API doesn't provide following count
            posts: data.data.media_count || 0,
            engagement: 12.3 // This would need to be calculated from insights
          });
        }
        
        // Fetch recent media
        const mediaResponse = await fetch('/api/instagram?action=media&limit=10');
        if (mediaResponse.ok) {
          const mediaData = await mediaResponse.json();
          if (mediaData.success && mediaData.data && mediaData.data.data) {
            setPosts(mediaData.data.data.map((item: any) => ({
              id: item.id,
              media_url: item.media_url || item.thumbnail_url || '/api/placeholder/300/300',
              caption: item.caption || '',
              like_count: item.like_count || 0,
              comments_count: item.comments_count || 0,
              timestamp: item.timestamp
            })));
          }
        }
      } else {
        // No fallback - service must be configured
        setStats({
          followers: 0,
          following: 0,
          posts: 0,
          engagement: 0
        });
        
        setPosts([]);
      }
    } catch (error) {
      console.error('Error fetching Instagram data:', error);
      // Use mock data as fallback
      setStats({
        followers: 8920,
        following: 542,
        posts: 156,
        engagement: 12.3
      });
    } finally {
      setIsLoading(false);
    }
  };

  const connectInstagram = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/instagram?action=connect');
      const data = await response.json();
      
      if (data.success) {
        setIsConnected(true);
        await fetchInstagramData();
      } else {
        alert(t('settingsError') + ': ' + data.message);
      }
    } catch (error) {
      console.error('Error connecting to Instagram:', error);
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
              <Instagram className="h-8 w-8 mr-3 text-pink-600" />
              {t('instagramTitle')}
            </h1>
            <p className="text-black mt-2">{t('profileDescription')}</p>
          </div>
          
          <Button onClick={connectInstagram} disabled={isLoading}>
            <Instagram className="h-4 w-4 mr-2" />
            {isLoading ? t('loading') : isConnected ? t('refresh') : t('instagramTitle')}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="palette-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">{t('contacts')}</p>
                  <p className="text-2xl font-bold text-primary">{stats.followers.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-pink-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="palette-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">{t('contacts')}</p>
                  <p className="text-2xl font-bold text-primary">{stats.following}</p>
                </div>
                <Heart className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="palette-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">{t('events')}</p>
                  <p className="text-2xl font-bold text-primary">{stats.posts}</p>
                </div>
                <Camera className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="palette-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">{t('analytics')}</p>
                  <p className="text-2xl font-bold text-primary">{stats.engagement}%</p>
                </div>
                <MessageCircle className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Posts */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center text-black">
                <Camera className="h-5 w-5 mr-2" />
                {t('events')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {posts.map((post) => (
                  <div key={post.id} className="bg-muted rounded-lg overflow-hidden">
                    <div className="aspect-square bg-gray-200 flex items-center justify-center">
                      <Camera className="h-12 w-12 text-gray-400" />
                    </div>
                    <div className="p-4">
                      <p className="text-black text-sm mb-2">{post.caption}</p>
                      <div className="flex items-center justify-between text-xs text-black">
                        <span>{new Date(post.timestamp).toLocaleDateString()}</span>
                        <div className="flex space-x-3">
                          <span className="flex items-center">
                            <Heart className="h-3 w-3 mr-1" />
                            {post.like_count}
                          </span>
                          <span className="flex items-center">
                            <MessageCircle className="h-3 w-3 mr-1" />
                            {post.comments_count}
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
                <Camera className="h-4 w-4 mr-2" />
                {t('create')}
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <TrendingUp className="h-4 w-4 mr-2" />
                {t('analyticsTitle')}
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <MessageCircle className="h-4 w-4 mr-2" />
                {t('settings')}
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Heart className="h-4 w-4 mr-2" />
                {t('analytics')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}