'use client';

import AccessibilitySettings from '@/components/AccessibilitySettings';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';
import { Shield, Settings } from 'lucide-react';

export default function AccessibilityPage() {
  const { language } = useSettings();
  const { t } = useTranslation(language);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Modern Header Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 mb-8 hover:shadow-3xl transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl shadow-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Accessibility Settings
              </h1>
              <p className="text-gray-600 font-medium mt-1">Configure accessibility preferences and features</p>
            </div>
          </div>
        </div>

        <AccessibilitySettings />
      </div>
    </div>
  );
}