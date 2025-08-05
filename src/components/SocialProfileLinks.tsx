'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';
import { 
  Facebook, 
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Globe,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Share2,
  Copy,
  CheckCircle,
  Edit3,
  Plus,
  Trash2
} from 'lucide-react';

interface SocialProfile {
  id: string;
  platform: string;
  name: string;
  username: string;
  url: string;
  followers?: number;
  verified?: boolean;
  description?: string;
  avatar?: string;
  isActive: boolean;
}

interface SocialProfileLinksProps {
  className?: string;
}

export default function SocialProfileLinks({ className = '' }: SocialProfileLinksProps) {
  const { language } = useSettings();
  const t = useTranslation(language);
  const [profiles, setProfiles] = useState<SocialProfile[]>([]);
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Mock social profiles for Mahboob Agents
  const mockProfiles: SocialProfile[] = [
    {
      id: '1',
      platform: 'facebook',
      name: 'Mahboob Agents',
      username: 'mahboobagents',
      url: 'https://facebook.com/mahboobagents',
      followers: 1250,
      verified: true,
      description: 'AI-powered personal assistant services',
      avatar: '/api/placeholder/50/50',
      isActive: true
    },
    {
      id: '2',
      platform: 'instagram',
      name: 'Mahboob Agents',
      username: '@mahboobagents',
      url: 'https://instagram.com/mahboobagents',
      followers: 890,
      verified: false,
      description: 'Innovation in AI & Personal Assistance',
      avatar: '/api/placeholder/50/50',
      isActive: true
    },
    {
      id: '3',
      platform: 'linkedin',
      name: 'Mahboob Agents',
      username: 'mahboob-agents',
      url: 'https://linkedin.com/company/mahboob-agents',
      followers: 650,
      verified: true,
      description: 'Professional AI Solutions',
      isActive: true
    },
    {
      id: '4',
      platform: 'twitter',
      name: 'Mahboob Agents',
      username: '@mahboobagents',
      url: 'https://twitter.com/mahboobagents',
      followers: 420,
      verified: false,
      description: 'Latest updates on AI technology',
      isActive: true
    },
    {
      id: '5',
      platform: 'youtube',
      name: 'Mahboob Agents',
      username: 'mahboobagents',
      url: 'https://youtube.com/@mahboobagents',
      followers: 320,
      verified: false,
      description: 'AI tutorials and demos',
      isActive: true
    },
    {
      id: '6',
      platform: 'website',
      name: 'Official Website',
      username: 'mahboobagents.fun',
      url: 'https://mahboobagents.fun',
      description: 'Main website with services and contact info',
      isActive: true
    }
  ];

  useEffect(() => {
    setProfiles(mockProfiles);
  }, []);

  const getPlatformIcon = (platform: string, size: string = 'h-5 w-5') => {
    const className = size;
    switch (platform) {
      case 'facebook': return <Facebook className={`${className} text-blue-600`} />;
      case 'instagram': return <Instagram className={`${className} text-pink-600`} />;
      case 'twitter': return <Twitter className={`${className} text-sky-500`} />;
      case 'linkedin': return <Linkedin className={`${className} text-blue-700`} />;
      case 'youtube': return <Youtube className={`${className} text-red-600`} />;
      case 'website': return <Globe className={`${className} text-green-600`} />;
      default: return <Share2 className={`${className} text-gray-600`} />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'facebook': return 'border-blue-200 bg-blue-50';
      case 'instagram': return 'border-pink-200 bg-pink-50';
      case 'twitter': return 'border-sky-200 bg-sky-50';
      case 'linkedin': return 'border-blue-200 bg-blue-50';
      case 'youtube': return 'border-red-200 bg-red-50';
      case 'website': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const copyToClipboard = async (url: string, profileId: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(profileId);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const shareProfile = (profile: SocialProfile) => {
    if (navigator.share) {
      navigator.share({
        title: `${profile.name} on ${profile.platform}`,
        text: profile.description || `Check out ${profile.name} on ${profile.platform}`,
        url: profile.url,
      });
    } else {
      copyToClipboard(profile.url, profile.id);
    }
  };

  const formatFollowers = (count?: number): string => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const generateQRCode = (url: string) => {
    // Generate QR code for the profile URL
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
    return qrCodeUrl;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Social Profiles Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-black">
            <Share2 className="h-5 w-5" />
            Social Media Profiles & Cross-Linking
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Profile
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-black mb-6">
            Manage and cross-link all your social media profiles for maximum visibility and engagement.
          </p>

          {/* Active Profiles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.filter(p => p.isActive).map((profile) => (
              <Card key={profile.id} className={`${getPlatformColor(profile.platform)} border`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getPlatformIcon(profile.platform)}
                      <div>
                        <h4 className="font-medium text-black flex items-center gap-1">
                          {profile.name}
                          {profile.verified && (
                            <CheckCircle className="h-4 w-4 text-blue-600" />
                          )}
                        </h4>
                        <p className="text-sm text-black">{profile.username}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setEditingProfile(profile.id)}
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => shareProfile(profile)}
                      >
                        <Share2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {profile.description && (
                    <p className="text-xs text-black mb-3">{profile.description}</p>
                  )}

                  {profile.followers && (
                    <div className="flex items-center gap-4 mb-3 text-xs text-black">
                      <span>{formatFollowers(profile.followers)} followers</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8"
                      onClick={() => window.open(profile.url, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Visit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => copyToClipboard(profile.url, profile.id)}
                    >
                      {copiedUrl === profile.id ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cross-Linking Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="text-black">Cross-Linking Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bio Links */}
            <div className="space-y-4">
              <h4 className="font-medium text-black">Bio Links Generator</h4>
              <p className="text-sm text-black">
                Generate optimized bio links for your social media profiles.
              </p>
              <div className="space-y-2">
                <div className="p-3 bg-gray-50 rounded border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-black">🌐 mahboobagents.fun</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => copyToClipboard('https://mahboobagents.fun', 'bio-main')}
                    >
                      {copiedUrl === 'bio-main' ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-black">📧 AI Services & Contact</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => copyToClipboard('https://mahboobagents.fun/contact', 'bio-contact')}
                    >
                      {copiedUrl === 'bio-contact' ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-black">🤖 AI Personal Assistant Demo</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => copyToClipboard('https://mahboobagents.fun/demo', 'bio-demo')}
                    >
                      {copiedUrl === 'bio-demo' ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* QR Codes */}
            <div className="space-y-4">
              <h4 className="font-medium text-black">QR Code Generator</h4>
              <p className="text-sm text-black">
                Generate QR codes for easy sharing of your profiles.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 border rounded">
                  <img
                    src={generateQRCode('https://mahboobagents.fun')}
                    alt="Website QR Code"
                    className="w-16 h-16"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-black">Website QR Code</p>
                    <p className="text-xs text-black">mahboobagents.fun</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = generateQRCode('https://mahboobagents.fun');
                      link.download = 'mahboobagents-qr.png';
                      link.click();
                    }}
                  >
                    Download
                  </Button>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded">
                  <img
                    src={generateQRCode('https://facebook.com/mahboobagents')}
                    alt="Facebook QR Code"
                    className="w-16 h-16"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-black">Facebook QR Code</p>
                    <p className="text-xs text-black">facebook.com/mahboobagents</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = generateQRCode('https://facebook.com/mahboobagents');
                      link.download = 'mahboobagents-facebook-qr.png';
                      link.click();
                    }}
                  >
                    Download
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-black">Contact & Business Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded border border-blue-200">
              <Mail className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-black">Email</p>
                <p className="text-xs text-black">contact@mahboobagents.fun</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded border border-green-200">
              <Phone className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-black">Phone</p>
                <p className="text-xs text-black">+968 9506 0007</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded border border-orange-200">
              <MapPin className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-black">Location</p>
                <p className="text-xs text-black">Muscat, Oman</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded border border-purple-200">
              <Globe className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-black">Website</p>
                <p className="text-xs text-black">mahboobagents.fun</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Media Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-black">Social Media Bio Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded border">
              <h5 className="font-medium text-black mb-2">Professional Template</h5>
              <p className="text-sm text-black mb-2">
                🤖 AI-Powered Personal Assistant Services<br/>
                🌐 Innovative solutions for businesses & individuals<br/>
                📍 Based in Muscat, Oman<br/>
                🔗 mahboobagents.fun<br/>
                📧 contact@mahboobagents.fun
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(`🤖 AI-Powered Personal Assistant Services
🌐 Innovative solutions for businesses & individuals
📍 Based in Muscat, Oman
🔗 mahboobagents.fun
📧 contact@mahboobagents.fun`, 'template-1')}
              >
                {copiedUrl === 'template-1' ? 'Copied!' : 'Copy Template'}
              </Button>
            </div>

            <div className="p-4 bg-gray-50 rounded border">
              <h5 className="font-medium text-black mb-2">Casual Template</h5>
              <p className="text-sm text-black mb-2">
                Hey! 👋 I'm your AI assistant expert<br/>
                Making life easier with smart automation ✨<br/>
                Check out our services 👇<br/>
                🌐 mahboobagents.fun
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(`Hey! 👋 I'm your AI assistant expert
Making life easier with smart automation ✨
Check out our services 👇
🌐 mahboobagents.fun`, 'template-2')}
              >
                {copiedUrl === 'template-2' ? 'Copied!' : 'Copy Template'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}