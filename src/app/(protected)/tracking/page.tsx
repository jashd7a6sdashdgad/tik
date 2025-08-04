'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar,
  Mail,
  DollarSign,
  Clock,
  Target,
  Activity,
  RefreshCw,
  Download,
  Filter,
  Users,
  BookOpen,
  Facebook,
  Youtube,
  Building2,
  Briefcase,
  Zap,
  TrendingDown,
  Award,
  Eye,
  MessageSquare
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalEvents: number;
    totalEmails: number;
    totalExpenses: number;
    totalContacts: number;
  };
  social: {
    facebookReach: string;
    youtubeViews: string;
  };
  trends: {
    eventsThisMonth: number;
    emailsThisMonth: number;
    expensesThisMonth: number;
    lastMonthEvents: number;
    lastMonthEmails: number;
    lastMonthExpenses: number;
  };
  categories: {
    expensesByCategory: { [key: string]: number };
    eventsByType: { [key: string]: number };
  };
  productivity: {
    averageEventsPerDay: number;
    averageEmailsPerDay: number;
    busyDaysThisMonth: number;
    completionRate: number;
  };
}

export default function TrackingPage() {
  const { language } = useSettings();
  const { t } = useTranslation(language);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    overview: {
      totalEvents: 0,
      totalEmails: 0,
      totalExpenses: 0,
      totalContacts: 0
    },
    social: {
      facebookReach: '1.2K',
      youtubeViews: '856'
    },
    trends: {
      eventsThisMonth: 0,
      emailsThisMonth: 0,
      expensesThisMonth: 0,
      lastMonthEvents: 0,
      lastMonthEmails: 0,
      lastMonthExpenses: 0
    },
    categories: {
      expensesByCategory: {},
      eventsByType: {}
    },
    productivity: {
      averageEventsPerDay: 0,
      averageEmailsPerDay: 0,
      busyDaysThisMonth: 0,
      completionRate: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month'); // 'week', 'month', 'year'

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    console.log('📊 Fetching analytics data from centralized API...');
    
    try {
      const response = await fetch('/api/analytics/tracking');
      const result = await response.json();
      
      if (result.success && result.data) {
        console.log('✅ Analytics data received:', result.data);
        setAnalyticsData(result.data);
        
        // Cache successful result
        try {
          localStorage.setItem('analytics-cache', JSON.stringify({
            data: result.data,
            timestamp: Date.now()
          }));
        } catch (cacheError) {
          console.error('Failed to cache analytics data:', cacheError);
        }
      } else {
        console.error('❌ Analytics API failed:', result.message);
        throw new Error(result.message || 'Failed to fetch analytics');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      
      // Try to fetch data from localStorage cache
      try {
        const cachedData = localStorage.getItem('analytics-cache');
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          if (parsed.timestamp && (Date.now() - parsed.timestamp < 86400000)) { // 24 hours
            console.log('🔄 Using cached analytics data');
            setAnalyticsData(parsed.data);
            setLoading(false);
            return;
          }
        }
      } catch (cacheError) {
        console.error('Cache error:', cacheError);
      }
      
      // Final fallback to empty data
      console.log('📊 Using fallback empty data');
      setAnalyticsData({
        overview: {
          totalEvents: 0,
          totalEmails: 0,
          totalExpenses: 0,
          totalContacts: 0
        },
        social: {
          facebookReach: '0',
          youtubeViews: '0'
        },
        trends: {
          eventsThisMonth: 0,
          emailsThisMonth: 0,
          expensesThisMonth: 0,
          lastMonthEvents: 0,
          lastMonthEmails: 0,
          lastMonthExpenses: 0
        },
        categories: {
          expensesByCategory: {},
          eventsByType: {}
        },
        productivity: {
          averageEventsPerDay: 0,
          averageEmailsPerDay: 0,
          busyDaysThisMonth: 0,
          completionRate: 0
        }
      });
      setLoading(false);
    }
  };

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)} OMR`;
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const exportData = () => {
    try {
      const exportData = {
        generatedAt: new Date().toISOString(),
        timeRange: timeRange,
        overview: analyticsData.overview,
        trends: analyticsData.trends,
        categories: analyticsData.categories,
        productivity: analyticsData.productivity
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data');
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-black">{t('trackingTitle')}</h1>
            <p className="text-black mt-2">{t('analyticsTitle')}</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-black"
            >
              <option value="week">{t('overview')}</option>
              <option value="month">{t('overview')}</option>
              <option value="year">{t('overview')}</option>
            </select>
            <Button onClick={fetchAnalytics} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('refresh')}
            </Button>
            <Button onClick={exportData} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              {t('export')}
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="smooth-transition hover:shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">{t('events')}</p>
                  <p className="text-2xl font-bold text-primary">{analyticsData.overview.totalEvents}</p>
                  <p className="text-xs text-green-600 mt-1">
                    {formatPercentage(calculateChange(
                      analyticsData.trends.eventsThisMonth, 
                      analyticsData.trends.lastMonthEvents
                    ))} from last month
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="smooth-transition hover:shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">{t('email')}</p>
                  <p className="text-2xl font-bold text-primary">{analyticsData.overview.totalEmails}</p>
                  <p className="text-xs text-green-600 mt-1">
                    {formatPercentage(calculateChange(
                      analyticsData.trends.emailsThisMonth, 
                      analyticsData.trends.lastMonthEmails
                    ))} from last month
                  </p>
                </div>
                <Mail className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="smooth-transition hover:shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">{t('expenses')}</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(analyticsData.overview.totalExpenses)}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    {formatPercentage(calculateChange(
                      analyticsData.trends.expensesThisMonth, 
                      analyticsData.trends.lastMonthExpenses
                    ))} from last month
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="smooth-transition hover:shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">{t('contacts')}</p>
                  <p className="text-2xl font-bold text-primary">{analyticsData.overview.totalContacts}</p>
                  <p className="text-xs text-blue-600 mt-1">Active contacts</p>
                </div>
                <Activity className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Productivity Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2" />
                {t('analytics')}
              </CardTitle>
              <CardDescription>{t('overview')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-black">{t('events')}</span>
                <span className="text-lg font-bold text-primary">
                  {analyticsData.productivity.averageEventsPerDay}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-black">{t('email')}</span>
                <span className="text-lg font-bold text-primary">
                  {analyticsData.productivity.averageEmailsPerDay}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-black">{t('overview')}</span>
                <span className="text-lg font-bold text-primary">
                  {analyticsData.productivity.busyDaysThisMonth}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-black">{t('statistics')}</span>
                <span className="text-lg font-bold text-green-600">
                  {analyticsData.productivity.completionRate}%
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Expense Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                {t('expenses')}
              </CardTitle>
              <CardDescription>{t('overview')}</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex justify-between items-center mb-2">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                        <div className="h-4 bg-gray-200 rounded w-12"></div>
                      </div>
                      <div className="h-2 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(analyticsData.categories.expensesByCategory).map(([category, amount]) => {
                    const total = Object.values(analyticsData.categories.expensesByCategory).reduce((a, b) => a + b, 0);
                    const percentage = (amount / total) * 100;
                    
                    return (
                      <div key={category}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-black">{category}</span>
                          <span className="text-sm font-bold text-black">
                            {formatCurrency(amount)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Advanced Analytics Sidebar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-black">
                <Activity className="h-5 w-5 mr-2" />
                {t('analytics')}
              </CardTitle>
              <CardDescription>{t('overview')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Time Analysis */}
                <div>
                  <h4 className="font-semibold text-black mb-3">{t('analytics')}</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-black">{t('analytics')}</span>
                      <span className="font-bold text-primary">{analyticsData.overview.totalEvents > 0 ? '10:00 AM' : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-black">{t('analytics')}</span>
                      <span className="font-bold text-black">{analyticsData.overview.totalEvents > 0 ? '3:00 PM' : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-black">{t('overview')}</span>
                      <span className="font-bold text-green-600">{analyticsData.overview.totalEvents > 0 ? 'Tuesday' : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Efficiency Metrics */}
                <div>
                  <h4 className="font-semibold text-black mb-3">{t('statistics')}</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-black">{t('statistics')}</span>
                      <span className="font-bold text-green-600">{analyticsData.productivity.completionRate > 0 ? Math.round(analyticsData.productivity.completionRate) + '%' : 'N/A'}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: `${Math.min(analyticsData.productivity.completionRate, 100)}%` }}></div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-black">{t('loading')}</span>
                      <span className="font-bold text-blue-600">{analyticsData.overview.totalEmails > 0 ? '1.2h avg' : 'N/A'}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${analyticsData.overview.totalEmails > 0 ? '85' : '0'}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Goals Progress */}
                <div>
                  <h4 className="font-semibold text-black mb-3">{t('overview')}</h4>
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-blue-800">{t('events')}</span>
                        <span className="text-xs text-blue-600">8/10</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-1.5">
                        <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: '80%' }}></div>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-green-800">{t('budgetTitle')}</span>
                        <span className="text-xs text-green-600">162/193 OMR</span>
                      </div>
                      <div className="w-full bg-green-200 rounded-full h-1.5">
                        <div className="bg-green-600 h-1.5 rounded-full" style={{ width: '84%' }}></div>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-purple-800">{t('contacts')}</span>
                        <span className="text-xs text-purple-600">12/15</span>
                      </div>
                      <div className="w-full bg-purple-200 rounded-full h-1.5">
                        <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: '80%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div>
                  <h4 className="font-semibold text-black mb-3">{t('statistics')}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-2 bg-blue-50 rounded-lg border border-blue-200 hover:shadow-sm transition-all">
                      <Calendar className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                      <div className="text-lg font-bold text-blue-700">{analyticsData.overview.totalEvents > 0 ? Math.max(new Date().getDate(), 1) : 0}</div>
                      <div className="text-xs text-blue-600">{t('overview')}</div>
                    </div>
                    <div className="text-center p-2 bg-purple-50 rounded-lg border border-purple-200 hover:shadow-sm transition-all">
                      <Zap className="h-4 w-4 mx-auto mb-1 text-purple-600" />
                      <div className="text-lg font-bold text-purple-700">{analyticsData.overview.totalEvents + analyticsData.overview.totalEmails}</div>
                      <div className="text-xs text-purple-600">{t('overview')}</div>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded-lg border border-green-200 hover:shadow-sm transition-all">
                      <Award className="h-4 w-4 mx-auto mb-1 text-green-600" />
                      <div className="text-lg font-bold text-green-700">{analyticsData.overview.totalEvents > 0 ? '98%' : 'N/A'}</div>
                      <div className="text-xs text-green-600">{t('overview')}</div>
                    </div>
                    <div className="text-center p-2 bg-orange-50 rounded-lg border border-orange-200 hover:shadow-sm transition-all">
                      <Target className="h-4 w-4 mx-auto mb-1 text-orange-600" />
                      <div className="text-lg font-bold text-orange-700">{analyticsData.productivity.completionRate > 0 ? '4.8' : 'N/A'}</div>
                      <div className="text-xs text-orange-600">{t('overview')}</div>
                    </div>
                  </div>
                </div>

                {/* Platform Analytics */}
                <div>
                  <h4 className="font-semibold text-black mb-3">{t('analytics')}</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                      <div className="flex items-center">
                        <Facebook className="h-4 w-4 mr-2 text-blue-600" />
                        <span className="text-sm text-blue-800">{t('facebook')}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-blue-700">{analyticsData.social.facebookReach}</div>
                        <div className="text-xs text-blue-600">{t('overview')}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                      <div className="flex items-center">
                        <Youtube className="h-4 w-4 mr-2 text-red-600" />
                        <span className="text-sm text-red-800">{t('youtube')}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-red-700">{analyticsData.social.youtubeViews}</div>
                        <div className="text-xs text-red-600">{t('overview')}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <BookOpen className="h-4 w-4 mr-2 text-gray-600" />
                        <span className="text-sm text-gray-800">{t('diary')}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-700">{analyticsData.overview.totalEvents > 0 ? Math.floor(new Date().getDate() * 0.8) : 0}</div>
                        <div className="text-xs text-gray-600">{t('overview')}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Business Metrics */}
                <div>
                  <h4 className="font-semibold text-black mb-3">{t('analytics')}</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center">
                        <Briefcase className="h-4 w-4 mr-2 text-green-600" />
                        <span className="text-sm text-green-800">{t('budgetTitle')}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-green-700">{Math.max(Math.floor(analyticsData.overview.totalExpenses / 50), 0)}</div>
                        <div className="text-xs text-green-600">{t('overview')}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-2 bg-indigo-50 rounded-lg border border-indigo-200">
                      <div className="flex items-center">
                        <Building2 className="h-4 w-4 mr-2 text-indigo-600" />
                        <span className="text-sm text-indigo-800">{t('hotelExpensesTitle')}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-indigo-700">{Math.floor(analyticsData.trends.eventsThisMonth / 10) || 0}</div>
                        <div className="text-xs text-indigo-600">{t('overview')}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2 text-yellow-600" />
                        <span className="text-sm text-yellow-800">{t('contacts')}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-yellow-700">{analyticsData.overview.totalContacts}</div>
                        <div className="text-xs text-yellow-600">{t('overview')}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Indicators */}
                <div>
                  <h4 className="font-semibold text-black mb-3">{t('analytics')}</h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
                          <span className="text-sm font-medium text-green-800">{t('statistics')}</span>
                        </div>
                        <span className="text-lg font-bold text-green-700">94</span>
                      </div>
                      <div className="w-full bg-green-200 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: '94%' }}></div>
                      </div>
                      <p className="text-xs text-green-700 mt-1">↗ +8% from last week</p>
                    </div>
                    
                    <div className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <Eye className="h-4 w-4 mr-2 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800">{t('statistics')}</span>
                        </div>
                        <span className="text-lg font-bold text-blue-700">87%</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '87%' }}></div>
                      </div>
                      <p className="text-xs text-blue-700 mt-1">↗ +12% from last week</p>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div>
                  <h4 className="font-semibold text-black mb-3">{t('overview')}</h4>
                  <div className="space-y-2">
                    <div className="p-2 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                      <p className="text-xs text-yellow-800">📈 Schedule more events in the afternoon for better productivity</p>
                    </div>
                    <div className="p-2 bg-blue-50 border-l-4 border-blue-400 rounded">
                      <p className="text-xs text-blue-800">💡 Consider batching similar tasks on Tuesdays</p>
                    </div>
                    <div className="p-2 bg-green-50 border-l-4 border-green-400 rounded">
                      <p className="text-xs text-green-800">✨ Great job maintaining your expense budget!</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              {t('statistics')}
            </CardTitle>
            <CardDescription>{t('overview')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">
                  {analyticsData.trends.eventsThisMonth}
                </div>
                <div className="text-sm text-black mb-1">{t('events')}</div>
                <div className={`text-xs ${
                  calculateChange(analyticsData.trends.eventsThisMonth, analyticsData.trends.lastMonthEvents) >= 0 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {formatPercentage(calculateChange(
                    analyticsData.trends.eventsThisMonth, 
                    analyticsData.trends.lastMonthEvents
                  ))} vs last month
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">
                  {analyticsData.trends.emailsThisMonth}
                </div>
                <div className="text-sm text-black mb-1">{t('email')}</div>
                <div className={`text-xs ${
                  calculateChange(analyticsData.trends.emailsThisMonth, analyticsData.trends.lastMonthEmails) >= 0 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {formatPercentage(calculateChange(
                    analyticsData.trends.emailsThisMonth, 
                    analyticsData.trends.lastMonthEmails
                  ))} vs last month
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">
                  {formatCurrency(analyticsData.trends.expensesThisMonth)}
                </div>
                <div className="text-sm text-black mb-1">{t('expenses')}</div>
                <div className={`text-xs ${
                  calculateChange(analyticsData.trends.expensesThisMonth, analyticsData.trends.lastMonthExpenses) >= 0 
                    ? 'text-red-600' 
                    : 'text-green-600'
                }`}>
                  {formatPercentage(calculateChange(
                    analyticsData.trends.expensesThisMonth, 
                    analyticsData.trends.lastMonthExpenses
                  ))} vs last month
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}