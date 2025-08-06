'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface DriveImageProps {
  fileId: string;
  googleTokens: any;
  alt: string;
  fill?: boolean;
  className?: string;
  onClick?: () => void;
  onError?: (e: any) => void;
  width?: number;
  height?: number;
}

export default function DriveImage({ 
  fileId, 
  googleTokens,
  alt, 
  fill, 
  className, 
  onClick, 
  onError,
  width,
  height 
}: DriveImageProps) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      try {
        setIsLoading(true);
        setError(false);
        
        if (!googleTokens) {
          throw new Error('No Google tokens provided');
        }

        const response = await fetch(`/api/google/drive/image/${fileId}`, {
          headers: {
            'x-google-tokens': JSON.stringify(googleTokens)
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to load image: ${response.status}`);
        }

        // Convert response to blob and create object URL
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        setImageSrc(objectUrl);
        
      } catch (err) {
        console.warn('Failed to load Drive image:', err);
        setError(true);
        onError?.(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (fileId && googleTokens) {
      loadImage();
    }

    // Cleanup function to revoke object URL when component unmounts or fileId changes
    return () => {
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [fileId, googleTokens]);

  if (isLoading) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !imageSrc) {
    return (
      <Image
        src="/placeholder-image.svg"
        alt={alt}
        fill={fill}
        width={width}
        height={height}
        className={className}
        onClick={onClick}
      />
    );
  }

  return (
    <Image
      src={imageSrc}
      alt={alt}
      fill={fill}
      width={width}
      height={height}
      className={className}
      onClick={onClick}
      onError={(e) => {
        setError(true);
        onError?.(e);
      }}
    />
  );
}