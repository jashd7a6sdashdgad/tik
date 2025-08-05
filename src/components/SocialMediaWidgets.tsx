'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';
import { 
  Facebook, 
  Instagram, 
  MessageCircle, 
  Share2, 
  ExternalLink,
  Heart,
  MessageSquare,
  Users,
  TrendingUp,
  Eye,
  Calendar
} from 'lucide-react';

interface SocialPost {
  id: string;
  platform: 'facebook' | 'instagram';
  content: string;
  image?: string;
  likes: number;
  comments: number;
  shares: number;
  timestamp: Date;
  link: string;
}

interface SocialStats {
  facebook: {
    followers: number;
    posts: number;
    engagement: number;
    reach: number;
  };
  instagram: {
    followers: number;
    posts: number;
    likes: number;
    comments: number;
  };
}

interface SocialMediaWidgetsProps {
  className?: string;
}

export default function SocialMediaWidgets({ className = '' }: SocialMediaWidgetsProps) {
  const { language } = useSettings();
  const t = useTranslation(language);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [stats, setStats] = useState<SocialStats>({
    facebook: { followers: 1250, posts: 45, engagement: 8.5, reach: 15000 },
    instagram: { followers: 980, posts: 32, likes: 2340, comments: 156 }
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'stats' | 'engagement'>('feed');

  // Mock social media posts data
  const mockPosts: SocialPost[] = [
    {
      id: '1',
      platform: 'facebook',
      content: 'Excited to announce our new AI-powered personal assistant features! 🚀 #AI #Innovation #PersonalAssistant',
      image: '/api/placeholder/300/200',
      likes: 125,
      comments: 18,
      shares: 32,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      link: 'https://facebook.com/mahboobagents'
    },
    {
      id: '2',
      platform: 'instagram',
      content: 'Behind the scenes: Building the future of personal assistance 💡 #TechLife #Development',
      image: '/api/placeholder/300/300',
      likes: 89,
      comments: 12,
      shares: 0,
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      link: 'https://instagram.com/mahboobagents'
    },
    {
      id: '3',
      platform: 'facebook',
      content: 'New blog post: "How AI is Transforming Personal Productivity" - Link in bio! 📖',
      likes: 76,
      comments: 9,
      shares: 15,
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      link: 'https://facebook.com/mahboobagents'
    }
  ];

  useEffect(() => {
    setPosts(mockPosts);
  }, []);

  const loadSocialFeed = async () => {
    setLoading(true);
    try {
      // In production, this would fetch from actual social media APIs
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPosts(mockPosts);
    } catch (error) {
      console.error('Error loading social feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else {
      return 'Just now';
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'facebook': return <Facebook className="h-4 w-4 text-blue-600" />;
      case 'instagram': return <Instagram className="h-4 w-4 text-pink-600" />;
      default: return <Share2 className="h-4 w-4" />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'facebook': return 'border-blue-200 bg-blue-50';
      case 'instagram': return 'border-pink-200 bg-pink-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Social Media Feed Widget */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-black">
            <Share2 className="h-5 w-5" />
            Social Media Feed
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'feed' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('feed')}
            >
              Feed
            </Button>
            <Button
              variant={activeTab === 'stats' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('stats')}
            >
              Stats
            </Button>
            <Button
              variant={activeTab === 'engagement' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('engagement')}
            >
              Engagement
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === 'feed' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-black">Latest posts from your social media</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadSocialFeed}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {posts.map((post) => (
                  <Card key={post.id} className={`${getPlatformColor(post.platform)} border`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {getPlatformIcon(post.platform)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-black capitalize">
                              {post.platform}
                            </span>
                            <span className="text-xs text-black">
                              {formatTimeAgo(post.timestamp)}
                            </span>
                          </div>
                          
                          <p className="text-sm text-black mb-3 leading-relaxed">
                            {post.content}
                          </p>
                          
                          {post.image && (
                            <div className="mb-3">
                              <img 
                                src={post.image} 
                                alt="Social media post" 
                                className="rounded-lg max-w-full h-32 object-cover"
                              />
                            </div>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-black">
                            <div className="flex items-center gap-1">
                              <Heart className="h-3 w-3" />
                              {post.likes}
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {post.comments}
                            </div>
                            {post.shares > 0 && (
                              <div className="flex items-center gap-1">
                                <Share2 className="h-3 w-3" />
                                {post.shares}
                              </div>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-auto h-6 px-2"
                              onClick={() => window.open(post.link, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Facebook Stats */}
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Facebook className="h-5 w-5 text-blue-600" />
                      <h3 className="font-medium text-black">Facebook</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-black">Followers</span>
                        <span className="font-medium text-black">{stats.facebook.followers.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-black">Posts</span>
                        <span className="font-medium text-black">{stats.facebook.posts}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-black">Engagement Rate</span>
                        <span className="font-medium text-green-600">{stats.facebook.engagement}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-black">Monthly Reach</span>
                        <span className="font-medium text-black">{stats.facebook.reach.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Instagram Stats */}
                <Card className="border-pink-200 bg-pink-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Instagram className="h-5 w-5 text-pink-600" />
                      <h3 className="font-medium text-black">Instagram</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-black">Followers</span>
                        <span className="font-medium text-black">{stats.instagram.followers.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-black">Posts</span>
                        <span className="font-medium text-black">{stats.instagram.posts}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-black">Total Likes</span>
                        <span className="font-medium text-black">{stats.instagram.likes.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-black">Comments</span>
                        <span className="font-medium text-black">{stats.instagram.comments}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Combined Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-black">Overall Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <p className="text-2xl font-bold text-black">
                        {(stats.facebook.followers + stats.instagram.followers).toLocaleString()}
                      </p>
                      <p className="text-sm text-black">Total Followers</p>
                    </div>
                    <div className="text-center">
                      <Share2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <p className="text-2xl font-bold text-black">
                        {stats.facebook.posts + stats.instagram.posts}
                      </p>
                      <p className="text-sm text-black">Total Posts</p>
                    </div>
                    <div className="text-center">
                      <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                      <p className="text-2xl font-bold text-black">
                        {((stats.facebook.engagement + (stats.instagram.likes / stats.instagram.followers * 100)) / 2).toFixed(1)}%
                      </p>
                      <p className="text-sm text-black">Avg Engagement</p>
                    </div>
                    <div className="text-center">
                      <Eye className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                      <p className="text-2xl font-bold text-black">
                        {stats.facebook.reach.toLocaleString()}
                      </p>
                      <p className="text-sm text-black">Monthly Reach</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'engagement' && (
            <div className="space-y-4">
              <h3 className="font-medium text-black">Recent Engagement Activity</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <Facebook className="h-4 w-4 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm text-black">New followers gained on Facebook</p>
                    <p className="text-xs text-black">+15 followers in the last 24 hours</p>
                  </div>
                  <span className="text-sm font-medium text-green-600">+15</span>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-pink-50 rounded-lg border border-pink-200">
                  <Instagram className="h-4 w-4 text-pink-600" />
                  <div className="flex-1">
                    <p className="text-sm text-black">High engagement on latest Instagram post</p>
                    <p className="text-xs text-black">89 likes, 12 comments in 5 hours</p>
                  </div>
                  <span className="text-sm font-medium text-green-600">12.3%</span>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <MessageCircle className="h-4 w-4 text-gray-600" />
                  <div className="flex-1">
                    <p className="text-sm text-black">New messages and mentions</p>
                    <p className="text-xs text-black">5 new messages, 3 mentions today</p>
                  </div>
                  <span className="text-sm font-medium text-blue-600">8 new</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-black">Social Media Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="flex items-center gap-2 h-auto p-3"
              onClick={() => window.open('https://facebook.com/mahboobagents', '_blank')}
            >
              <Facebook className="h-4 w-4 text-blue-600" />
              <span className="text-sm">Visit Facebook</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex items-center gap-2 h-auto p-3"
              onClick={() => window.open('https://instagram.com/mahboobagents', '_blank')}
            >
              <Instagram className="h-4 w-4 text-pink-600" />
              <span className="text-sm">Visit Instagram</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex items-center gap-2 h-auto p-3"
              onClick={() => window.open('https://mahboobagents.fun', '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
              <span className="text-sm">Visit Website</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex items-center gap-2 h-auto p-3"
              onClick={loadSocialFeed}
            >
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Analytics</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}