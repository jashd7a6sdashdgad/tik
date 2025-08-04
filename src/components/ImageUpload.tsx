'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Upload, X, Check, AlertCircle } from 'lucide-react';

interface ImageUploadProps {
  onImageSelected: (imageData: string, mimeType: string, fileName: string) => void;
  onError?: (error: string) => void;
  onClose: () => void;
  maxSizeMB?: number;
}

export default function ImageUpload({ 
  onImageSelected, 
  onError, 
  onClose,
  maxSizeMB = 5 
}: ImageUploadProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Supported image formats
  const supportedFormats = ['image/png', 'image/jpeg', 'image/webp'];

  /**
   * Start camera capture
   */
  const startCamera = useCallback(async () => {
    try {
      setIsCapturing(true);
      
      // Request camera access with high quality settings
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          facingMode: 'environment' // Prefer back camera on mobile
        }
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Camera access error:', error);
      onError?.('Failed to access camera. Please check permissions.');
      setIsCapturing(false);
    }
  }, [onError]);

  /**
   * Stop camera
   */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  }, []);

  /**
   * Capture photo from camera
   */
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to high-quality PNG
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const fileName = `camera_capture_${Date.now()}.png`;
          setSelectedFile(new File([blob], fileName, { type: 'image/png' }));
          setPreviewImage(canvas.toDataURL('image/png', 1.0));
        }
      },
      'image/png',
      1.0 // Maximum quality
    );

    stopCamera();
  }, [stopCamera]);

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!supportedFormats.includes(file.type)) {
      onError?.('Please select a PNG, JPEG, or WebP image file.');
      return;
    }

    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      onError?.(`File size must be less than ${maxSizeMB}MB.`);
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, [maxSizeMB, onError]);

  /**
   * Convert image to optimized format and base64
   */
  const processImage = useCallback(async (file: File): Promise<{ base64: string; mimeType: string; fileName: string }> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate optimal dimensions (max 1920x1080 while maintaining aspect ratio)
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;
          if (width > height) {
            width = maxWidth;
            height = width / aspectRatio;
          } else {
            height = maxHeight;
            width = height * aspectRatio;
          }
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress image
        ctx?.drawImage(img, 0, 0, width, height);

        // Determine optimal format
        let outputFormat = 'image/png';
        let quality = 1.0;

        if (file.type === 'image/jpeg') {
          outputFormat = 'image/jpeg';
          quality = 0.9; // High quality JPEG
        } else if (file.type === 'image/webp') {
          outputFormat = 'image/webp';
          quality = 0.9; // High quality WebP
        }

        // Convert to base64
        const base64 = canvas.toDataURL(outputFormat, quality);
        
        // Generate filename with proper extension
        const extension = outputFormat.split('/')[1];
        const fileName = `expense_image_${Date.now()}.${extension}`;

        resolve({
          base64,
          mimeType: outputFormat,
          fileName
        });
      };

      img.onerror = () => reject(new Error('Failed to process image'));
      img.src = URL.createObjectURL(file);
    });
  }, []);

  /**
   * Confirm and send image
   */
  const confirmImage = useCallback(async () => {
    if (!selectedFile) return;

    setProcessing(true);
    try {
      const { base64, mimeType, fileName } = await processImage(selectedFile);
      onImageSelected(base64, mimeType, fileName);
      onClose();
    } catch (error) {
      console.error('Image processing error:', error);
      onError?.('Failed to process image. Please try again.');
    } finally {
      setProcessing(false);
    }
  }, [selectedFile, processImage, onImageSelected, onClose, onError]);

  /**
   * Reset selection
   */
  const resetSelection = useCallback(() => {
    setSelectedFile(null);
    setPreviewImage(null);
    stopCamera();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [stopCamera]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-black">Add Receipt Image</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Camera View */}
          {isCapturing && (
            <div className="mb-4">
              <video
                ref={videoRef}
                className="w-full rounded-lg bg-black"
                style={{ maxHeight: '300px' }}
                autoPlay
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex justify-center space-x-2 mt-3">
                <Button onClick={capturePhoto} className="bg-blue-600 hover:bg-blue-700">
                  <Camera className="h-4 w-4 mr-2" />
                  Capture
                </Button>
                <Button variant="outline" onClick={stopCamera}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Preview */}
          {previewImage && !isCapturing && (
            <div className="mb-4">
              <img
                src={previewImage}
                alt="Preview"
                className="w-full rounded-lg"
                style={{ maxHeight: '300px', objectFit: 'contain' }}
              />
              <div className="flex justify-center space-x-2 mt-3">
                <Button 
                  onClick={confirmImage} 
                  disabled={processing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {processing ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  {processing ? 'Processing...' : 'Use This Image'}
                </Button>
                <Button variant="outline" onClick={resetSelection}>
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Options */}
          {!isCapturing && !previewImage && (
            <div className="space-y-3">
              <Button
                onClick={startCamera}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Camera className="h-4 w-4 mr-2" />
                Take Photo
              </Button>

              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose from Gallery
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="text-xs text-gray-500 text-center mt-3">
                <div className="flex items-center justify-center mb-1">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Supported formats
                </div>
                PNG, JPEG, WebP • Max {maxSizeMB}MB
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}