'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Key, ExternalLink, Save, Trash2 } from 'lucide-react';
import { geminiImageService } from '@/services/geminiImageService';  // Confirm this path

export default function ApiKeySettings() {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);

  useEffect(() => {
    const existingKey = localStorage.getItem('gemini-api-key');
    if (existingKey) {
      setHasExistingKey(true);
      setApiKey(existingKey);
      geminiImageService.setApiKey(existingKey);
    }
  }, []);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem('gemini-api-key', apiKey.trim());
      geminiImageService.setApiKey(apiKey.trim());
      setHasExistingKey(true);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const handleClear = () => {
    localStorage.removeItem('gemini-api-key');
    setApiKey('');
    setHasExistingKey(false);
    setSaved(false);
    geminiImageService.setApiKey(''); // clear key in service too
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Key className="h-5 w-5" />
          <span>Gemini API Configuration</span>
        </CardTitle>
        <CardDescription>
          Configure your Google Gemini API key to enable AI image generation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {saved && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              API key saved successfully! You can now use AI image generation.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="apiKey">Gemini API Key</Label>
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Input
                id="apiKey"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter your Gemini API key..."
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!apiKey.trim()}
              size="sm"
              aria-label="Save API key"
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            {hasExistingKey && (
              <Button
                type="button"
                onClick={handleClear}
                variant="outline"
                size="sm"
                aria-label="Clear API key"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900">How to get your Gemini API key:</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>Visit Google AI Studio</li>
            <li>Sign in with your Google account</li>
            <li>Create a new API key</li>
            <li>Copy and paste it above</li>
          </ol>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => window.open('https://makersuite.google.com/app/apikey', '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Get API Key from Google AI Studio
          </Button>
        </div>

        <div className="space-y-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="font-medium text-amber-900">Important Notes:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-amber-800">
            <li>Your API key is stored locally in your browser</li>
            <li>Keep your API key secure and don't share it</li>
            <li>API usage may incur charges based on Google's pricing</li>
            <li>Some features may be limited by API capabilities</li>
          </ul>
        </div>

        {!apiKey && (
          <Alert>
            <AlertDescription>
              Without an API key, the image generation will use placeholder images for demonstration purposes.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
