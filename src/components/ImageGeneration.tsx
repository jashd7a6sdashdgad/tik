'use client';

import React, { useState } from 'react';
import { geminiImageService } from '@/services/geminiImageService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/600?text=Image+Not+Available';

export default function ImageGeneration() {
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setLoading(true);
    setError('');
    setImageUrl('');

    try {
      const result = await (geminiImageService as any).generateImage({ prompt });
      console.log('Image generation result:', result);

      if (result.imageUrl && result.imageUrl.startsWith('http')) {
        setImageUrl(result.imageUrl);
      } else {
        setError('No valid image URL returned from generation service');
        setImageUrl(PLACEHOLDER_IMAGE);
      }
    } catch (err: any) {
      console.error('Error generating image:', err);
      setError(err.message || 'Failed to generate image');
      setImageUrl(PLACEHOLDER_IMAGE);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold">Generate Image</h1>

      <Input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter a prompt..."
        disabled={loading}
      />

      <Button onClick={handleGenerate} disabled={loading} className="w-full">
        {loading ? 'Generating...' : 'Generate'}
      </Button>

      {error && <p className="text-red-600">{error}</p>}

      {imageUrl && (
        <Card className="mt-4">
          <CardContent>
            <img
              src={imageUrl}
              alt={`Generated from: ${prompt}`}
              className="w-full rounded"
              onError={() => {
                setError('Failed to load generated image');
                setImageUrl(PLACEHOLDER_IMAGE);
                console.error('Image failed to load:', imageUrl);
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
