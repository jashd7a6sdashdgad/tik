'use client';

import { useState, useEffect } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import { 
  Mail,
  RefreshCw,
  ArrowLeft,
  Zap,
  Calendar,
  Clock,
  Bell
} from 'lucide-react';
import SmartSummaryEmailDashboard from '@/components/SmartSummaryEmailDashboard';
import { useRouter } from 'next/navigation';

export default function EmailSummaryPage() {
  const { language } = useSettings();
  const { t } = useTranslation(language);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRefresh = async () => {
    setLoading(true);
    try {
      // Refresh any cached data
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Modern Header Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 mb-8 hover:shadow-3xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
                <Mail className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  Smart Summary Email
                </h1>
                <p className="text-gray-600 font-medium mt-1">Automated daily or weekly email reports with your unread messages, expenses, weather, and tasks</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <Button onClick={handleRefresh} variant="outline" size="sm" disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </div>
        {/* Feature Introduction */}
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Stay Informed with Automated Email Summaries
              </h2>
              <p className="text-gray-700 mb-4">
                Get comprehensive daily or weekly email reports delivered right to your inbox. Each summary includes:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-gray-700">Unread messages & notifications</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-700">Top expenses & budget insights</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  <span className="text-sm text-gray-700">Weather forecast & task updates</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Clock className="h-4 w-4" />
                <span>Customizable schedule and content preferences</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard */}
        <SmartSummaryEmailDashboard onRefresh={handleRefresh} />
      </div>
    </div>
  );
}