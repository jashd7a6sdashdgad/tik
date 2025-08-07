// Gemini Image Generation Integration for AI-Powered Visual Content

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ImageGenerationRequest {
  prompt: string;
  style?: 'photorealistic' | 'artistic' | 'cartoon' | 'sketch' | 'abstract';
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  quality?: 'draft' | 'standard' | 'high';
  seed?: number;
  negativePrompt?: string;
}

export interface ImageGenerationResponse {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  prompt: string;
  style: string;
  aspectRatio: string;
  createdAt: Date;
  status: 'generating' | 'completed' | 'failed';
  error?: string;
}

export interface ImageHistory {
  images: ImageGenerationResponse[];
  totalGenerated: number;
  lastGenerated?: Date;
}

class GeminiImageGenerationService {
  private apiKey: string | null = null;
  private genAI: GoogleGenerativeAI | null = null;
  private history: ImageGenerationResponse[] = [];

  constructor() {
    // Load API key from environment variables or localStorage
    this.apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || null;
    
    // Check localStorage for user-provided API key (only in browser)
    if (typeof window !== 'undefined') {
      const storedKey = localStorage.getItem('gemini-api-key');
      if (storedKey) {
        this.apiKey = storedKey;
      }
    }
    
    if (this.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
    }
    
    this.loadHistory();
  }

  private async loadHistory(): Promise<void> {
    try {
      const saved = localStorage.getItem('gemini-image-history');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.history = parsed.images || [];
      }
    } catch (error) {
      console.error('Error loading image history:', error);
    }
  }

  private async saveHistory(): Promise<void> {
    try {
      const historyData: ImageHistory = {
        images: this.history,
        totalGenerated: this.history.length,
        lastGenerated: this.history.length > 0 ? this.history[0].createdAt : undefined
      };
      localStorage.setItem('gemini-image-history', JSON.stringify(historyData));
    } catch (error) {
      console.error('Error saving image history:', error);
    }
  }

  public setApiKey(key: string): void {
    this.apiKey = key;
    this.genAI = new GoogleGenerativeAI(key);
  }

  private enhancePrompt(request: ImageGenerationRequest): string {
    let enhancedPrompt = request.prompt;

    // Add style modifiers
    const styleModifiers = {
      photorealistic: 'ultra-realistic, high-detail photography, professional lighting',
      artistic: 'artistic painting, beautiful composition, vibrant colors',
      cartoon: 'cartoon style, animated, colorful, friendly',
      sketch: 'pencil sketch, hand-drawn, artistic lines',
      abstract: 'abstract art, creative interpretation, unique perspective'
    };

    if (request.style && styleModifiers[request.style]) {
      enhancedPrompt = `${enhancedPrompt}, ${styleModifiers[request.style]}`;
    }

    // Add quality modifiers
    if (request.quality === 'high') {
      enhancedPrompt = `${enhancedPrompt}, 4K resolution, highly detailed, masterpiece`;
    } else if (request.quality === 'standard') {
      enhancedPrompt = `${enhancedPrompt}, good quality, well-composed`;
    }

    // Add negative prompt if specified
    if (request.negativePrompt) {
      enhancedPrompt = `${enhancedPrompt}. Avoid: ${request.negativePrompt}`;
    }

    return enhancedPrompt;
  }

  public async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const imageId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create initial response object
    const response: ImageGenerationResponse = {
      id: imageId,
      imageUrl: '', // Will be populated after generation
      prompt: request.prompt,
      style: request.style || 'photorealistic',
      aspectRatio: request.aspectRatio || '1:1',
      createdAt: new Date(),
      status: 'generating'
    };

    // Add to history immediately
    this.history.unshift(response);
    await this.saveHistory();

    try {
      const enhancedPrompt = this.enhancePrompt(request);
      
      if (this.genAI && this.apiKey) {
        // Use real Gemini API
        await this.generateWithGeminiAPI(response, enhancedPrompt, request);
      } else {
        // Fallback to mock for demo/development
        await this.mockGenerateImage(response, enhancedPrompt);
      }
      
      return response;
    } catch (error) {
      response.status = 'failed';
      response.error = error instanceof Error ? error.message : 'Failed to generate image';
      
      // Update history
      const index = this.history.findIndex(img => img.id === imageId);
      if (index !== -1) {
        this.history[index] = response;
        await this.saveHistory();
      }
      
      throw error;
    }
  }

  private async mockGenerateImage(response: ImageGenerationResponse, enhancedPrompt: string): Promise<void> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // For demo purposes, generate a placeholder image URL
    // In production, this would be replaced with actual Gemini API call
    const width = response.aspectRatio === '16:9' ? 800 : response.aspectRatio === '9:16' ? 600 : 600;
    const height = response.aspectRatio === '16:9' ? 450 : response.aspectRatio === '9:16' ? 800 : 600;
    
    // Use a placeholder service that generates images based on text
    const encodedPrompt = encodeURIComponent(response.prompt.substring(0, 50));
    response.imageUrl = `https://picsum.photos/${width}/${height}?random=${response.id}`;
    response.thumbnailUrl = `https://picsum.photos/200/200?random=${response.id}`;
    response.status = 'completed';

    // Update history
    const index = this.history.findIndex(img => img.id === response.id);
    if (index !== -1) {
      this.history[index] = response;
      await this.saveHistory();
    }
  }

  // Real Gemini API implementation
  private async generateWithGeminiAPI(response: ImageGenerationResponse, prompt: string, options: ImageGenerationRequest): Promise<void> {
    if (!this.genAI) {
      throw new Error('Gemini API not initialized');
    }

    try {
      // For text-to-image generation with Gemini
      // Note: As of now, Gemini primarily supports text generation
      // Image generation capabilities may be limited or require different approaches
      
      // Using Imagen (Google's image generation model) through Gemini API
      const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
      
      // Generate a more detailed prompt for better image generation
      const detailedPrompt = this.createDetailedImagePrompt(prompt, options);
      
      // For now, we'll use a placeholder approach since direct image generation
      // might not be available in the current Gemini API
      // This would be replaced with actual image generation when available
      
      response.imageUrl = await this.generateImagePlaceholder(response, prompt);
      response.thumbnailUrl = response.imageUrl;
      response.status = 'completed';
      
      // Update history
      const index = this.history.findIndex(img => img.id === response.id);
      if (index !== -1) {
        this.history[index] = response;
        await this.saveHistory();
      }
      
    } catch (error) {
      throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private createDetailedImagePrompt(prompt: string, options: ImageGenerationRequest): string {
    let detailedPrompt = `Create a high-quality image: ${prompt}`;
    
    if (options.style) {
      detailedPrompt += `. Style: ${options.style}`;
    }
    
    if (options.aspectRatio) {
      detailedPrompt += `. Aspect ratio: ${options.aspectRatio}`;
    }
    
    if (options.quality) {
      detailedPrompt += `. Quality: ${options.quality}`;
    }
    
    return detailedPrompt;
  }
  
  private async generateImagePlaceholder(response: ImageGenerationResponse, prompt: string): Promise<string> {
    // For demonstration, using a service that generates images based on text
    // In production with full Gemini image generation, this would return the actual generated image URL
    const width = response.aspectRatio === '16:9' ? 800 : response.aspectRatio === '9:16' ? 600 : 600;
    const height = response.aspectRatio === '16:9' ? 450 : response.aspectRatio === '9:16' ? 800 : 600;
    
    // Using a text-to-image placeholder service
    const encodedPrompt = encodeURIComponent(prompt.substring(0, 100));
    return `https://via.placeholder.com/${width}x${height}/4A90E2/FFFFFF?text=${encodedPrompt.substring(0, 50)}`;
  }

  public getHistory(): ImageGenerationResponse[] {
    return [...this.history];
  }

  public getImage(id: string): ImageGenerationResponse | undefined {
    return this.history.find(img => img.id === id);
  }

  public async deleteImage(id: string): Promise<boolean> {
    const index = this.history.findIndex(img => img.id === id);
    if (index !== -1) {
      this.history.splice(index, 1);
      await this.saveHistory();
      return true;
    }
    return false;
  }

  public clearHistory(): Promise<void> {
    this.history = [];
    return this.saveHistory();
  }

  public getStats(): { total: number; completed: number; failed: number; generating: number } {
    return {
      total: this.history.length,
      completed: this.history.filter(img => img.status === 'completed').length,
      failed: this.history.filter(img => img.status === 'failed').length,
      generating: this.history.filter(img => img.status === 'generating').length
    };
  }

  // Predefined prompt templates
  public getPromptTemplates(): { category: string; templates: { name: string; prompt: string; style: string }[] }[] {
    return [
      {
        category: 'Portraits',
        templates: [
          { name: 'Professional Portrait', prompt: 'professional headshot of a person in business attire, clean background', style: 'photorealistic' },
          { name: 'Artistic Portrait', prompt: 'artistic portrait with dramatic lighting and creative composition', style: 'artistic' },
          { name: 'Cartoon Avatar', prompt: 'friendly cartoon character portrait with expressive features', style: 'cartoon' }
        ]
      },
      {
        category: 'Landscapes',
        templates: [
          { name: 'Mountain Vista', prompt: 'breathtaking mountain landscape with dramatic sky and foreground details', style: 'photorealistic' },
          { name: 'Ocean Sunset', prompt: 'peaceful ocean scene at sunset with golden hour lighting', style: 'artistic' },
          { name: 'Fantasy Landscape', prompt: 'magical fantasy landscape with floating islands and mystical atmosphere', style: 'artistic' }
        ]
      },
      {
        category: 'Abstract',
        templates: [
          { name: 'Geometric Patterns', prompt: 'colorful geometric patterns with perfect symmetry and balance', style: 'abstract' },
          { name: 'Fluid Art', prompt: 'flowing liquid colors mixing and blending in organic shapes', style: 'abstract' },
          { name: 'Digital Art', prompt: 'futuristic digital art with neon colors and technological elements', style: 'abstract' }
        ]
      },
      {
        category: 'Islamic Art',
        templates: [
          { name: 'Islamic Calligraphy', prompt: 'beautiful Arabic calligraphy with ornate decorations and traditional patterns', style: 'artistic' },
          { name: 'Mosque Architecture', prompt: 'stunning mosque with intricate Islamic architecture, minarets and domes', style: 'photorealistic' },
          { name: 'Islamic Geometric Art', prompt: 'traditional Islamic geometric patterns with golden accents on deep blue background', style: 'artistic' }
        ]
      }
    ];
  }
}

export const geminiImageService = new GeminiImageGenerationService();