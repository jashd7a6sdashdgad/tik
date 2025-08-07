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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <h1 className="text-xl font-semibold">AI Image Generation</h1>
            <div style={{ width: 36 }} /> {/* Placeholder for spacing */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      </main>
    </div>
  );
}
