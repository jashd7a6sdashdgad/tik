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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
                  <Mail className="h-6 w-6" />
                  Smart Summary Email
                </h1>
                <p className="text-black">Automated daily or weekly email reports with your unread messages, expenses, weather, and tasks</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={handleRefresh} variant="outline" size="sm" disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      </main>
    </div>
  );
}