'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, X, Minimize2, Maximize2, Send, Phone, Video } from 'lucide-react';

interface MessengerWidgetProps {
  pageId?: string;
  minimized?: boolean;
  className?: string;
}

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
}

export default function MessengerWidget({ 
  pageId = "196199373900228", 
  minimized = true,
  className = "" 
}: MessengerWidgetProps) {
  const [isOpen, setIsOpen] = useState(!minimized);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Mock chat messages
  const mockMessages: ChatMessage[] = [
    {
      id: '1',
      text: 'Hello! Welcome to Mahboob Agents. How can I help you today?',
      sender: 'agent',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      status: 'read'
    },
    {
      id: '2',
      text: 'Hi! I\'m interested in your AI services.',
      sender: 'user',
      timestamp: new Date(Date.now() - 3 * 60 * 1000),
      status: 'read'
    },
    {
      id: '3',
      text: 'Great! I\'d be happy to tell you about our AI-powered personal assistant services. We offer custom solutions for businesses and individuals.',
      sender: 'agent',
      timestamp: new Date(Date.now() - 2 * 60 * 1000),
      status: 'read'
    }
  ];

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages(mockMessages);
    }
  }, [isOpen]);

  useEffect(() => {
    // Load Facebook Messenger Plugin
    if (typeof window !== 'undefined' && isOpen) {
      // Initialize Facebook SDK
      if (!(window as any).FB) {
        const script = document.createElement('script');
        script.async = true;
        script.defer = true;
        script.crossOrigin = 'anonymous';
        script.src = 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v18.0';
        document.head.appendChild(script);

        (window as any).fbAsyncInit = function() {
          (window as any).FB.init({
            appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID,
            xfbml: true,
            version: 'v18.0'
          });
        };
      }
    }
  }, [isOpen]);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message: ChatMessage = {
        id: Date.now().toString(),
        text: newMessage,
        sender: 'user',
        timestamp: new Date(),
        status: 'sent'
      };
      
      setMessages(prev => [...prev, message]);
      setNewMessage('');
      
      // Simulate agent typing
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const agentResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: 'Thanks for your message! I\'ll get back to you shortly.',
          sender: 'agent',
          timestamp: new Date(),
          status: 'sent'
        };
        setMessages(prev => [...prev, agentResponse]);
      }, 2000);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
        {/* Notification badge */}
        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          3
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <Card className={`w-80 h-96 shadow-xl transition-all duration-300 ${isMinimized ? 'h-12' : 'h-96'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-blue-600 text-white rounded-t-lg">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-sm">Mahboob Agents</h3>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-gray-400'}`} />
                <span className="text-xs">{isOnline ? 'Online' : 'Away'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-blue-700 h-8 w-8 p-0"
              onClick={() => window.open(`tel:+96895060007`, '_blank')}
            >
              <Phone className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-blue-700 h-8 w-8 p-0"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-blue-700 h-8 w-8 p-0"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <CardContent className="p-0 h-64 overflow-y-auto bg-gray-50">
              <div className="p-3 space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs p-2 rounded-lg ${
                        message.sender === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-black border'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className={`text-xs ${
                          message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {formatTime(message.timestamp)}
                        </span>
                        {message.sender === 'user' && (
                          <span className={`text-xs ${
                            message.status === 'read' ? 'text-blue-200' : 'text-blue-100'
                          }`}>
                            {message.status === 'read' ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white text-black border p-2 rounded-lg">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>

            {/* Input */}
            <div className="p-3 border-t bg-white rounded-b-lg">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="rounded-full w-8 h-8 p-0 bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Quick Actions */}
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => setNewMessage('I need help with AI services')}
                  className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-full text-black"
                >
                  AI Services
                </button>
                <button
                  onClick={() => setNewMessage('Tell me about pricing')}
                  className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-full text-black"
                >
                  Pricing
                </button>
                <button
                  onClick={() => setNewMessage('Book a consultation')}
                  className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-full text-black"
                >
                  Consultation
                </button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Alternative: Facebook Messenger Plugin (for production) */}
      <div className="hidden">
        <div
          className="fb-messengermessageus"
          data-messenger-app-id={process.env.NEXT_PUBLIC_FACEBOOK_APP_ID}
          data-page-id={pageId}
          data-color="blue"
          data-size="large"
        />
      </div>
    </div>
  );
}