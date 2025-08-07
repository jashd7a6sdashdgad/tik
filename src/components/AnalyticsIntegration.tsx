'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/contexts/SettingsContext';
import { 
  BarChart3, 
  TrendingUp, 
  Eye, 
  Users, 
  MousePointer, 
  Activity,
  Globe2,
  Smartphone,
  Monitor,
  RefreshCw,
  ExternalLink,
  Calendar,
  Target
} from 'lucide-react';

interface AnalyticsData {
  pageViews: number;
  uniqueVisitors: number;
  bounceRate: number;
  avgSessionDuration: string;
  topPages: Array<{
    page: string;
    views: number;
    percentage: number;
  }>;
  traffic: Array<{
    source: string;
    visitors: number;
    percentage: number;
  }>;
  devices: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  demographics: {
    countries: Array<{
      country: string;
      visitors: number;
      percentage: number;
    }>;
  };
  socialMedia: {
    facebook: {
      clicks: number;
      impressions: number;
      engagement: number;
    };
    instagram: {
      clicks: number;
      impressions: number;
      engagement: number;
    };
  };
}

interface AnalyticsIntegrationProps {
  className?: string;
}

export default function AnalyticsIntegration({ className = '' }: AnalyticsIntegrationProps) {
  const { language } = useSettings();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'traffic' | 'social' | 'conversions'>('overview');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  // Mock analytics data
  const mockAnalytics: AnalyticsData = {
    pageViews: 15420,
    uniqueVisitors: 8900,
    bounceRate: 42.5,
    avgSessionDuration: '2m 34s',
    topPages: [
      { page: '/services', views: 3420, percentage: 22.2 },
      { page: '/about', views: 2890, percentage: 18.7 },
      { page: '/', views: 2650, percentage: 17.2 },
      { page: '/contact', views: 1890, percentage: 12.3 },
      { page: '/blog', views: 1420, percentage: 9.2 }
    ],
    traffic: [
      { source: 'Direct', visitors: 3560, percentage: 40.0 },
      { source: 'Google Search', visitors: 2670, percentage: 30.0 },
      { source: 'Social Media', visitors: 1780, percentage: 20.0 },
      { source: 'Referrals', visitors: 890, percentage: 10.0 }
    ],
    devices: {
      desktop: 5340,
      mobile: 2780,
      tablet: 780
    },
    demographics: {
      countries: [
        { country: 'Oman', visitors: 4450, percentage: 50.0 },
        { country: 'UAE', visitors: 1780, percentage: 20.0 },
        { country: 'Saudi Arabia', visitors: 1335, percentage: 15.0 },
        { country: 'Kuwait', visitors: 890, percentage: 10.0 },
        { country: 'Others', visitors: 445, percentage: 5.0 }
      ]
    },
    socialMedia: {
      facebook: {
        clicks: 1250,
        impressions: 15600,
        engagement: 8.0
      },
      instagram: {
        clicks: 890,
        impressions: 12300,  
        engagement: 7.2
      }
    }
  };

  useEffect(() => {
    // Initialize Facebook Pixel
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID) {
      initializeFacebookPixel();
    }

    // Initialize Google Analytics
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
      initializeGoogleAnalytics();
    }

    // Load mock data
    setAnalytics(mockAnalytics);
  }, []);

  const initializeFacebookPixel = () => {
    const pixelId = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
    if (!pixelId) return;

    // Facebook Pixel Code
    (function(f: any, b, e, v, n: any, t: any, s: any) {
      if (f.fbq) return;
      n = f.fbq = function(...args: any[]) {
        n.callMethod ? n.callMethod(...args) : n.queue.push(args);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js', {}, {}, {});

    (window as any).fbq('init', pixelId);
    (window as any).fbq('track', 'PageView');
  };

  const initializeGoogleAnalytics = () => {
    const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    if (!measurementId) return;

    // Google Analytics Code
    const script1 = document.createElement('script');
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script1);

    const script2 = document.createElement('script');
    script2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${measurementId}');
    `;
    document.head.appendChild(script2);
  };

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // In production, this would fetch real analytics data
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackEvent = (eventName: string, parameters?: any) => {
    // Google Analytics tracking
    if ((window as any).gtag) {
      (window as any).gtag('event', eventName, parameters);
    }

    // Facebook Pixel tracking
    if ((window as any).fbq) {
      (window as any).fbq('track', eventName, parameters);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getTimeRangeLabel = (range: string): string => {
    switch (range) {
      case '7d': return 'Last 7 days';
      case '30d': return 'Last 30 days';
      case '90d': return 'Last 90 days';
      default: return 'Last 30 days';
    }
  };

  if (!analytics) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-black">Loading analytics data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Analytics Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-black">
            <BarChart3 className="h-5 w-5" />
            Website Analytics & Tracking
          </CardTitle>
          <div className="flex gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
              className="px-3 py-1 border rounded text-sm text-black"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={loadAnalytics}
              disabled={loading}
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6 border-b">
            {[
              { id: 'overview', label: 'Overview', icon: Eye },
              { id: 'traffic', label: 'Traffic', icon: TrendingUp },
              { id: 'social', label: 'Social Media', icon: Users },
              { id: 'conversions', label: 'Conversions', icon: Target }
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab.id as any)}
                className="flex items-center gap-2"
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4 text-center">
                    <Eye className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <p className="text-2xl font-bold text-black">{formatNumber(analytics.pageViews)}</p>
                    <p className="text-sm text-black">Page Views</p>
                    <p className="text-xs text-green-600 mt-1">+12.5% vs last period</p>
                  </CardContent>
                </Card>

                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4 text-center">
                    <Users className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <p className="text-2xl font-bold text-black">{formatNumber(analytics.uniqueVisitors)}</p>
                    <p className="text-sm text-black">Unique Visitors</p>
                    <p className="text-xs text-green-600 mt-1">+8.3% vs last period</p>
                  </CardContent>
                </Card>

                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="p-4 text-center">
                    <MousePointer className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                    <p className="text-2xl font-bold text-black">{analytics.bounceRate}%</p>
                    <p className="text-sm text-black">Bounce Rate</p>
                    <p className="text-xs text-red-600 mt-1">+2.1% vs last period</p>
                  </CardContent>
                </Card>

                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-4 text-center">
                    <Activity className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                    <p className="text-2xl font-bold text-black">{analytics.avgSessionDuration}</p>
                    <p className="text-sm text-black">Avg. Session</p>
                    <p className="text-xs text-green-600 mt-1">+5.7% vs last period</p>
                  </CardContent>
                </Card>
              </div>

              {/* Top Pages */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-black">Top Pages</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.topPages.map((page, index) => (
                      <div key={page.page} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </span>
                          <span className="text-black font-medium">{page.page}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${page.percentage}%` }}
                            />
                          </div>
                          <span className="text-black font-medium w-16 text-right">{formatNumber(page.views)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'traffic' && (
            <div className="space-y-6">
              {/* Traffic Sources */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-black">Traffic Sources</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.traffic.map((source) => (
                      <div key={source.source} className="flex items-center justify-between">
                        <span className="text-black font-medium">{source.source}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-gray-200 rounded-full h-3">
                            <div 
                              className="bg-green-600 h-3 rounded-full" 
                              style={{ width: `${source.percentage}%` }}
                            />
                          </div>
                          <span className="text-black font-medium w-20 text-right">
                            {formatNumber(source.visitors)} ({source.percentage}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Device Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-black">Device Types</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4 text-blue-600" />
                          <span className="text-black">Desktop</span>
                        </div>
                        <span className="text-black font-medium">{formatNumber(analytics.devices.desktop)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4 text-green-600" />
                          <span className="text-black">Mobile</span>
                        </div>
                        <span className="text-black font-medium">{formatNumber(analytics.devices.mobile)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Globe2 className="h-4 w-4 text-orange-600" />
                          <span className="text-black">Tablet</span>
                        </div>
                        <span className="text-black font-medium">{formatNumber(analytics.devices.tablet)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-black">Top Countries</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analytics.demographics.countries.slice(0, 4).map((country) => (
                        <div key={country.country} className="flex items-center justify-between">
                          <span className="text-black">{country.country}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${country.percentage}%` }}
                              />
                            </div>
                            <span className="text-black font-medium w-12 text-right">
                              {country.percentage}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'social' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-black">
                      <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">f</span>
                      </div>
                      Facebook Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-black">Clicks</span>
                        <span className="font-medium text-black">{formatNumber(analytics.socialMedia.facebook.clicks)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black">Impressions</span>
                        <span className="font-medium text-black">{formatNumber(analytics.socialMedia.facebook.impressions)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black">Engagement Rate</span>
                        <span className="font-medium text-green-600">{analytics.socialMedia.facebook.engagement}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-pink-50 border-pink-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-black">
                      <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-pink-600 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">i</span>
                      </div>
                      Instagram Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-black">Clicks</span>
                        <span className="font-medium text-black">{formatNumber(analytics.socialMedia.instagram.clicks)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black">Impressions</span>
                        <span className="font-medium text-black">{formatNumber(analytics.socialMedia.instagram.impressions)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black">Engagement Rate</span>
                        <span className="font-medium text-green-600">{analytics.socialMedia.instagram.engagement}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'conversions' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-black">Conversion Tracking</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="font-medium text-green-800 mb-2">Contact Form Submissions</h4>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold text-black">127</p>
                          <p className="text-xs text-black">This Month</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-green-600">12.3%</p>
                          <p className="text-xs text-black">Conversion Rate</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-blue-600">€890</p>
                          <p className="text-xs text-black">Est. Value</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-800 mb-2">Service Inquiries</h4>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold text-black">89</p>
                          <p className="text-xs text-black">This Month</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-green-600">8.7%</p>
                          <p className="text-xs text-black">Conversion Rate</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-blue-600">€1,240</p>
                          <p className="text-xs text-black">Est. Value</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-black">Analytics Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="flex items-center gap-2 h-auto p-3"
              onClick={() => {
                trackEvent('view_analytics_dashboard');
                window.open('https://analytics.google.com', '_blank');
              }}
            >
              <BarChart3 className="h-4 w-4" />
              <span className="text-sm">Google Analytics</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex items-center gap-2 h-auto p-3"
              onClick={() => {
                trackEvent('view_facebook_insights');
                window.open('https://business.facebook.com/insights', '_blank');
              }}
            >
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Facebook Insights</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex items-center gap-2 h-auto p-3"
              onClick={() => {
                trackEvent('view_search_console');
                window.open('https://search.google.com/search-console', '_blank');
              }}
            >
              <Globe2 className="h-4 w-4" />
              <span className="text-sm">Search Console</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex items-center gap-2 h-auto p-3"
              onClick={() => window.open('https://mahboobagents.fun', '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
              <span className="text-sm">Visit Website</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}