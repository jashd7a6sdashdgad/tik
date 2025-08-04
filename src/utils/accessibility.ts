/**
 * Accessibility utilities for blind users and screen reader support
 */

// Announce text to screen readers and TTS
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const ariaLiveRegion = document.getElementById(
    priority === 'assertive' ? 'aria-live-assertive' : 'aria-live-region'
  );
  
  if (ariaLiveRegion) {
    // Clear first to ensure re-announcement
    ariaLiveRegion.textContent = '';
    setTimeout(() => {
      ariaLiveRegion.textContent = message;
    }, 10);
  }
}

// Speak text using native browser TTS with language support
export function speakText(text: string, language: string = 'en', options: Partial<SpeechSynthesisUtterance> = {}) {
  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Enhanced settings for accessibility
  utterance.rate = 0.8; // Slower for better comprehension
  utterance.pitch = 1.0;
  utterance.volume = 1.0; // Full volume
  
  // Apply custom options
  Object.assign(utterance, options);
  
  // Set language and voice
  const voices = window.speechSynthesis.getVoices();
  let preferredVoice;
  
  if (language === 'ar') {
    preferredVoice = voices.find(voice => 
      voice.lang.startsWith('ar') || 
      voice.name.includes('Arabic')
    );
    utterance.lang = 'ar-SA';
  } else {
    preferredVoice = voices.find(voice => 
      voice.name.includes('Google') || 
      voice.name.includes('Microsoft') ||
      voice.lang.startsWith('en')
    );
    utterance.lang = 'en-US';
  }
  
  if (preferredVoice) {
    utterance.voice = preferredVoice;
    utterance.lang = preferredVoice.lang;
  }
  
  // Enhanced logging for debugging
  utterance.onstart = () => {
    console.log('🔊 Speaking:', text);
    announceToScreenReader(text, 'polite');
  };
  
  utterance.onend = () => {
    console.log('✅ Speech completed');
  };
  
  utterance.onerror = (error) => {
    console.error('❌ Speech error:', error);
    // Fallback to screen reader announcement
    announceToScreenReader(text, 'assertive');
  };
  
  window.speechSynthesis.speak(utterance);
}

// Navigate programmatically and announce
export function navigateAndAnnounce(path: string, pageName: string, language: string = 'en') {
  const message = language === 'ar' 
    ? `الانتقال إلى صفحة ${pageName}`
    : `Navigating to ${pageName} page`;
  
  speakText(message, language);
  announceToScreenReader(message, 'polite');
  
  // Navigate after announcement
  setTimeout(() => {
    window.location.href = path;
  }, 500);
}

// Describe page content for blind users
export function describePageContent(title: string, description: string, language: string = 'en') {
  const message = language === 'ar'
    ? `صفحة ${title}. ${description}`
    : `${title} page. ${description}`;
  
  speakText(message, language);
  announceToScreenReader(message, 'polite');
}

// Announce form validation errors
export function announceFormError(error: string, language: string = 'en') {
  const message = language === 'ar'
    ? `خطأ في النموذج: ${error}`
    : `Form error: ${error}`;
  
  speakText(message, language);
  announceToScreenReader(message, 'assertive');
}

// Announce successful actions
export function announceSuccess(message: string, language: string = 'en') {
  const announcement = language === 'ar'
    ? `تم بنجاح: ${message}`
    : `Success: ${message}`;
  
  speakText(announcement, language);
  announceToScreenReader(announcement, 'polite');
}

// Focus management for accessibility
export function focusElement(selector: string, announce = true, language: string = 'en') {
  const element = document.querySelector(selector) as HTMLElement;
  if (element) {
    element.focus();
    
    if (announce) {
      const message = language === 'ar'
        ? `التركيز على ${element.tagName.toLowerCase()}`
        : `Focused on ${element.tagName.toLowerCase()}`;
      
      announceToScreenReader(message, 'polite');
    }
  }
}

// Keyboard navigation helper
export function handleKeyboardNavigation(event: KeyboardEvent, callback: (direction: string) => void) {
  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault();
      callback('up');
      break;
    case 'ArrowDown':
      event.preventDefault();
      callback('down');
      break;
    case 'ArrowLeft':
      event.preventDefault();
      callback('left');
      break;
    case 'ArrowRight':
      event.preventDefault();
      callback('right');
      break;
    case 'Enter':
    case ' ':
      event.preventDefault();
      callback('select');
      break;
    case 'Escape':
      event.preventDefault();
      callback('escape');
      break;
  }
}

// Load voices and ensure they're available
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve([]);
      return;
    }

    let voices = window.speechSynthesis.getVoices();
    
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    window.speechSynthesis.onvoiceschanged = () => {
      voices = window.speechSynthesis.getVoices();
      resolve(voices);
    };
  });
}

// Check if speech synthesis is working
export function testSpeechSynthesis(language: string = 'en'): Promise<boolean> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve(false);
      return;
    }

    const testText = language === 'ar' ? 'اختبار' : 'test';
    const utterance = new SpeechSynthesisUtterance(testText);
    utterance.volume = 0; // Silent test
    
    utterance.onstart = () => resolve(true);
    utterance.onerror = () => resolve(false);
    
    setTimeout(() => resolve(false), 1000); // Timeout after 1 second
    
    window.speechSynthesis.speak(utterance);
  });
}