// src/services/geminiImageService.ts

class GeminiImageService {
  private apiKey: string = '';

  setApiKey(key: string) {
    this.apiKey = key;
    // Optionally, set the key for API calls here
    // For example, update fetch headers or config
  }

  getApiKey() {
    return this.apiKey;
  }

  // Add more methods to call Gemini API for image generation here
}

export const geminiImageService = new GeminiImageService();
