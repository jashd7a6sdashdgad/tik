# N8N Voice Assistant Integration Setup

This document explains how to configure N8N to work with the Voice Assistant feature.

## 🎯 Overview

The voice assistant now integrates with N8N webhooks to:
- Send voice messages and text to N8N for AI processing
- Receive intelligent responses from your N8N workflows
- Get binary audio files back from N8N for voice responses

## 🔧 Environment Configuration

Add this to your `.env.local` file:

```bash
# N8N Voice Assistant Webhook
N8N_VOICE_ASSISTANT_WEBHOOK_URL=https://your-n8n-instance.com/webhook/voice-assistant
```

## 📡 N8N Webhook Setup

### 1. Create Webhook Node
Create a new workflow in N8N with a **Webhook** node:

**Webhook Configuration:**
- **HTTP Method:** POST
- **Path:** `/voice-assistant`
- **Authentication:** None (or add as needed)
- **Response Mode:** Respond to Webhook

### 2. Expected Input Payload

Your N8N webhook will receive this JSON payload:

```json
{
  "message": "Hello, how are you?",
  "language": "en",
  "conversationHistory": "User: Hi\nAssistant: Hello! How can I help?",
  "audioBase64": null,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "sessionId": "voice_assistant_1705312200000"
}
```

### 3. Processing Nodes

Add these nodes to process the voice message:

#### A) **OpenAI Node** (for AI responses)
```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {
      "role": "system", 
      "content": "You are a helpful voice assistant. Respond naturally and concisely."
    },
    {
      "role": "user",
      "content": "{{$json.message}}"
    }
  ],
  "max_tokens": 150,
  "temperature": 0.7
}
```

#### B) **Text-to-Speech Node** (Optional - for audio responses)
You can use:
- **ElevenLabs** (high quality, paid)
- **Azure Cognitive Services** (good quality)
- **Google Cloud Text-to-Speech** (reliable)
- **OpenAI TTS** (good quality, simple)

Example ElevenLabs setup:
```json
{
  "text": "{{$json.choices[0].message.content}}",
  "voice_id": "21m00Tcm4TlvDq8ikWAM",
  "model_id": "eleven_monolingual_v1"
}
```

### 4. Required Response Format

Your N8N workflow MUST return this JSON structure:

```json
{
  "success": true,
  "response": "Hello! I'm doing great, thank you for asking. How can I help you today?",
  "audioBase64": "UklGRjzZAABXQVZFZm10IBAAAAABAAEAT...", // Optional: base64 encoded audio
  "error": null
}
```

### 5. Complete N8N Workflow Example

```
[Webhook] → [OpenAI] → [Text-to-Speech] → [Respond to Webhook]
```

**Respond to Webhook Node Body:**
```json
{
  "success": true,
  "response": "{{$node.OpenAI.json.choices[0].message.content}}",
  "audioBase64": "{{$node.TextToSpeech.json.audioBase64}}"
}
```

## 🎵 Audio Response Setup

### Option 1: ElevenLabs Integration
```json
{
  "text": "{{$json.response}}",
  "voice_id": "21m00Tcm4TlvDq8ikWAM",
  "model_id": "eleven_multilingual_v2",
  "voice_settings": {
    "stability": 0.5,
    "similarity_boost": 0.8
  }
}
```

### Option 2: OpenAI TTS
```json
{
  "model": "tts-1",
  "input": "{{$json.response}}",
  "voice": "alloy",
  "response_format": "mp3"
}
```

### Option 3: Azure Cognitive Services
```json
{
  "text": "{{$json.response}}",
  "lang": "{{$json.language === 'ar' ? 'ar-SA' : 'en-US'}}",
  "voice": "{{$json.language === 'ar' ? 'ar-SA-HamedNeural' : 'en-US-JennyNeural'}}"
}
```

## 🌐 Language Support

The webhook receives a `language` parameter:
- `"en"` for English
- `"ar"` for Arabic

Configure your TTS accordingly:

```javascript
// In N8N Code node
const language = $input.first().json.language;
const voiceId = language === 'ar' ? 'arabic-voice-id' : 'english-voice-id';

return {
  voiceId: voiceId,
  text: $input.first().json.response
};
```

## 🔄 Fallback Handling

If your N8N webhook is unavailable, the system will:
1. Try to connect to N8N webhook
2. If it fails, use local fallback responses
3. Show a warning message to the user

## 🧪 Testing

1. **Set up your N8N webhook URL** in `.env.local`
2. **Test with simple message** like "Hello"
3. **Check N8N execution logs** for incoming requests
4. **Verify response format** matches expected structure

## 📝 Example N8N Workflow JSON

```json
{
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "voice-assistant",
        "responseMode": "responseNode",
        "responseData": "allEntries"
      },
      "type": "n8n-nodes-base.webhook",
      "name": "Webhook"
    },
    {
      "parameters": {
        "model": "gpt-3.5-turbo",
        "messages": {
          "messageValues": [
            {
              "role": "system",
              "content": "You are a helpful voice assistant. Respond naturally and keep responses under 50 words."
            },
            {
              "role": "user", 
              "content": "={{$json.message}}"
            }
          ]
        }
      },
      "type": "@n8n/n8n-nodes-langchain.openAi",
      "name": "OpenAI"
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": {
          "success": true,
          "response": "={{$node.OpenAI.json.choices[0].message.content}}",
          "audioBase64": null
        }
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "name": "Respond to Webhook"
    }
  ]
}
```

## 🚀 Ready to Use!

Once configured, your voice assistant will:
1. ✅ Send messages to your N8N webhook
2. ✅ Process them with AI
3. ✅ Return intelligent responses
4. ✅ Play binary audio files if provided
5. ✅ Fall back gracefully if N8N is unavailable

Your voice assistant is now powered by your custom N8N workflows! 🎉