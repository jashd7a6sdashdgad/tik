# Gemini API Setup Guide

This guide will help you set up the Gemini API for AI image generation in the Mahboob Personal Assistant.

## Quick Setup

### 1. Get Your Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the API key

### 2. Configure the API Key

You have two options:

#### Option A: Environment Variable (Recommended for Development)
1. Copy `.env.local.example` to `.env.local`
2. Replace `your_gemini_api_key_here` with your actual API key
3. Restart the development server

#### Option B: UI Settings (User-Friendly)
1. Go to `/image-generation` page
2. Click on the "API Settings" tab
3. Paste your API key and save

## Features

- **Real-time Image Generation**: Uses Google's Gemini API for AI image generation
- **Multiple Styles**: Photorealistic, artistic, cartoon, sketch, and abstract styles
- **Flexible Aspect Ratios**: 1:1, 16:9, 9:16, 4:3, and 3:4
- **Quality Options**: Draft, standard, and high quality
- **Template Library**: Pre-built prompts for different categories
- **Image History**: Local storage of generated images
- **Photo Album Integration**: Direct navigation to photo management

## Current Implementation

### API Integration Status
- ✅ Google Generative AI SDK installed
- ✅ API key management (environment + localStorage)
- ✅ UI for API key configuration
- ✅ Fallback to demo mode when no API key is provided
- ⚠️ **Note**: Image generation currently uses placeholders as Gemini's image generation capabilities are limited in the current API

### Image Generation Flow
1. **With API Key**: Uses Google Generative AI SDK (currently with placeholders)
2. **Without API Key**: Uses demo placeholders for testing UI

## File Structure

```
src/
├── lib/
│   └── geminiImageGeneration.ts     # Main service with Gemini API integration
├── components/
│   ├── ImageGeneration.tsx          # Image generation UI
│   ├── ApiKeySettings.tsx           # API key configuration
│   └── ui/
│       └── alert.tsx               # Alert component
├── app/(protected)/
│   └── image-generation/
│       └── page.tsx                # Main image generation page
└── .env.local.example              # Environment configuration template
```

## API Costs & Limits

- Check [Google AI Pricing](https://ai.google.dev/pricing) for current rates
- API usage may incur charges based on your usage
- Consider setting up usage alerts in Google Cloud Console

## Troubleshooting

### Common Issues

1. **"API key not configured" error**
   - Ensure your API key is properly set in environment variables or UI settings
   - Check that the key is valid and not expired

2. **Images showing as placeholders**
   - This is normal - Gemini's image generation is limited in the current API
   - The system is ready for when full image generation becomes available

3. **"Failed to generate image" error**
   - Check your internet connection
   - Verify your API key is valid
   - Check Google AI Studio for any API status issues

### Getting Help

- Visit [Google AI Documentation](https://ai.google.dev/docs)
- Check the browser console for detailed error messages
- Ensure you have sufficient API quota

## Future Enhancements

When Gemini's image generation capabilities are fully available:
- Replace placeholder generation with real image generation
- Add more advanced image editing features
- Implement image-to-image generation
- Add batch processing capabilities

## Security Notes

- API keys are stored locally in the browser
- Never commit API keys to version control
- Keep your API keys secure and don't share them
- Consider using environment variables for production deployments