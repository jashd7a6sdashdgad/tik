'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Camera, Settings } from 'lucide-react';
import ImageGeneration from '@/components/ImageGeneration';
import ApiKeySettings from '@/components/ApiKeySettings';

export default function ImageGenerationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('generate');

  // Sync activeTab with URL param "tab"
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'settings' || tab === 'generate') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Update URL when tab changes (optional, keeps URL synced)
  useEffect(() => {
    router.replace(`/image-generation?tab=${activeTab}`);
  }, [activeTab, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Modern Header Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 mb-8 hover:shadow-3xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl shadow-lg">
                <Camera className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  AI Image Generation
                </h1>
                <p className="text-gray-600 font-medium mt-1">Create stunning images with AI technology</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="generate" className="flex items-center space-x-2">
              <Camera className="h-4 w-4" />
              <span>Generate Images</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>API Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate">
            <ImageGeneration />
          </TabsContent>

          <TabsContent value="settings">
            <div className="max-w-2xl mx-auto">
              <ApiKeySettings />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
