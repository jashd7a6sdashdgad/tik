'use client';

import CulturalSettings from '@/components/Islamic/CulturalSettings';
import VoiceAssistantWidget from '@/components/VoiceAssistantWidget';

export default function IslamicSettingsPage() {
  return (
    <>
      <CulturalSettings />
      <VoiceAssistantWidget 
        page="islamic-settings" 
        position="fixed"
        size="md"
      />
    </>
  );
}