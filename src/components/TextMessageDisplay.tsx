'use client';

import React from 'react';
import { MessageSquare, User, Bot } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';

interface ChatMessage {
  id: string;
  type: 'sent' | 'received';
  messageType: 'voice' | 'text';
  content?: string;
  timestamp: string;
}

interface TextMessageDisplayProps {
  message: ChatMessage;
  className?: string;
}

export default function TextMessageDisplay({
  message,
  className = ''
}: TextMessageDisplayProps) {
  const { language, isRTL } = useSettings();
  const { t } = useTranslation(language);
  
  /**
   * Format timestamp for display
   */
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`text-message-display ${className}`}>
      <div
        className={`max-w-xs p-3 rounded-lg break-words ${
          message.type === 'sent'
            ? 'bg-blue-500 text-white ml-auto'
            : 'bg-gray-200 text-gray-800 mr-auto'
        }`}
      >
        {/* Message header */}
        <div className="flex items-center mb-2 space-x-2">
          <div className={`p-2 rounded-full ${
            message.type === 'sent' ? 'bg-blue-400' : 'bg-gray-300'
          }`}>
            {message.type === 'sent' ? (
              <User className="h-3 w-3" />
            ) : (
              <Bot className="h-3 w-3" />
            )}
          </div>
          <span className="text-xs opacity-75">
            {message.type === 'sent' ? t('you') : t('assistant')}
          </span>
        </div>

        {/* Message content */}
        <div className="mb-2">
          <p className="text-sm leading-relaxed">{message.content}</p>
        </div>

        {/* Timestamp */}
        <div className="text-xs opacity-50 mt-1 text-right">
          {formatTimestamp(message.timestamp)}
        </div>
      </div>
    </div>
  );
}