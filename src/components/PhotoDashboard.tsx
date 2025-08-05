'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Camera,
  Eye,
  TrendingUp,
  TrendingDown,
  Calendar,
  MapPin,
  Users,
  Palette,
  Tag,
  Zap,
  Brain,
  Album,
  Copy,
  Sparkles,
  BarChart3,
  PieChart
} from 'lucide-react';
import { PhotoMetadata } from '@/lib/photoIntelligence';

interface PhotoDashboardProps {
  photos: PhotoMetadata[];
  smartAlbums: any[];
  duplicateGroups: string[][];
  onRefresh?: () => void;
}

interface PhotoInsight {
  type: 'storage' | 'quality' | 'organization' | 'activity' | 'suggestion';
  title: string;
  description: string;
  value?: string | number;
  trend?: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
  color: string;
  actionable?: boolean;
  action?: () => void;
}

export default function PhotoDashboard({ photos, smartAlbums, duplicateGroups, onRefresh }: PhotoDashboardProps) {
  const [insights, setInsights] = useState<PhotoInsight[]>([]);
  const [stats, setStats] = useState({
    totalPhotos: 0,
    totalSize: 0,
    analyzed: 0,
    qualityScore: 0,
    duplicates: 0,
    albumsCreated: 0
  });

  useEffect(() => {
    generateInsights();
    calculateStats();
  }, [photos, smartAlbums, duplicateGroups]);

  const calculateStats = () => {
    const totalPhotos = photos.length;
    const analyzed = photos.filter(p => p.aiTags && p.aiTags.length > 0).length;
    const totalSize = photos.reduce((sum, p) => sum + (p.size || 0), 0);
    const qualityScore = photos.length > 0 
      ? photos.reduce((sum, p) => sum + (p.quality?.overall || 0.7), 0) / photos.length 
      : 0;
    const duplicates = duplicateGroups.reduce((sum, group) => sum + group.length, 0);

    setStats({
      totalPhotos,
      totalSize,
      analyzed,
      qualityScore,
      duplicates,
      albumsCreated: smartAlbums.length
    });
  };

  const generateInsights = () => {
    const newInsights: PhotoInsight[] = [];

    // Storage insights
    const totalSize = photos.reduce((sum, p) => sum + (p.size || 0), 0);
    const avgSize = totalSize / (photos.length || 1);
    
    newInsights.push({
      type: 'storage',
      title: 'Storage Usage',
      description: `${formatFileSize(totalSize)} across ${photos.length} photos`,
      value: formatFileSize(avgSize),
      icon: <Camera className="h-4 w-4" />,
      color: 'bg-blue-500'
    });

    // Quality insights
    const qualityScores = photos.filter(p => p.quality?.overall).map(p => p.quality!.overall);
    if (qualityScores.length > 0) {
      const avgQuality = qualityScores.reduce((sum, q) => sum + q, 0) / qualityScores.length;
      const lowQualityCount = qualityScores.filter(q => q < 0.5).length;
      
      newInsights.push({
        type: 'quality',
        title: 'Photo Quality',
        description: `Average quality score: ${Math.round(avgQuality * 100)}%`,
        value: lowQualityCount > 0 ? `${lowQualityCount} low quality` : 'Good quality',
        trend: avgQuality > 0.7 ? 'up' : avgQuality < 0.5 ? 'down' : 'stable',
        icon: <Eye className="h-4 w-4" />,
        color: avgQuality > 0.7 ? 'bg-green-500' : 'bg-yellow-500'
      });
    }

    // AI Analysis insights
    const analyzedCount = photos.filter(p => p.aiTags && p.aiTags.length > 0).length;
    const analysisProgress = photos.length > 0 ? (analyzedCount / photos.length) * 100 : 0;
    
    newInsights.push({
      type: 'activity',
      title: 'AI Analysis',
      description: `${analyzedCount} of ${photos.length} photos analyzed`,
      value: `${Math.round(analysisProgress)}%`,
      icon: <Brain className="h-4 w-4" />,
      color: 'bg-purple-500',
      actionable: analysisProgress < 100,
      action: onRefresh
    });

    // Organization insights
    if (smartAlbums.length > 0) {
      newInsights.push({
        type: 'organization',
        title: 'Smart Albums',
        description: `${smartAlbums.length} AI-generated albums created`,
        value: 'Well organized',
        icon: <Album className="h-4 w-4" />,
        color: 'bg-indigo-500'
      });
    }

    // Duplicate detection
    if (duplicateGroups.length > 0) {
      const duplicateCount = duplicateGroups.reduce((sum, group) => sum + group.length, 0);
      const potentialSavings = duplicateCount * avgSize * 0.8; // Estimate 80% of duplicates
      
      newInsights.push({
        type: 'suggestion',
        title: 'Duplicates Found',
        description: `${duplicateGroups.length} groups with ${duplicateCount} duplicate photos`,
        value: `Save ${formatFileSize(potentialSavings)}`,
        icon: <Copy className="h-4 w-4" />,
        color: 'bg-orange-500',
        actionable: true
      });
    }

    // Tagging insights
    const taggedPhotos = photos.filter(p => p.aiTags && p.aiTags.length > 0);
    if (taggedPhotos.length > 0) {
      const allTags = taggedPhotos.flatMap(p => p.aiTags || []);
      const uniqueTags = [...new Set(allTags)];
      
      newInsights.push({
        type: 'organization',
        title: 'Content Tags',
        description: `${uniqueTags.length} unique tags across your photos`,
        value: 'Searchable',
        icon: <Tag className="h-4 w-4" />,
        color: 'bg-teal-500'
      });
    }

    // Face detection insights
    const faceCounts = photos.filter(p => p.faces && p.faces.length > 0);
    if (faceCounts.length > 0) {
      const totalFaces = faceCounts.reduce((sum, p) => sum + (p.faces?.length || 0), 0);
      
      newInsights.push({
        type: 'activity',
        title: 'People Detected',
        description: `${totalFaces} faces found in ${faceCounts.length} photos`,
        value: 'Face recognition active',
        icon: <Users className="h-4 w-4" />,
        color: 'bg-pink-500'
      });
    }

    // Location insights
    const geoTaggedPhotos = photos.filter(p => p.location);
    if (geoTaggedPhotos.length > 0) {
      const uniqueLocations = [...new Set(geoTaggedPhotos.map(p => 
        `${p.location?.city}, ${p.location?.country}`
      ))];
      
      newInsights.push({
        type: 'activity',
        title: 'Locations',
        description: `Photos from ${uniqueLocations.length} different locations`,
        value: 'Geo-tagged',
        icon: <MapPin className="h-4 w-4" />,
        color: 'bg-red-500'
      });
    }

    setInsights(newInsights);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-blue-500" />
            Photo Intelligence Dashboard
          </h2>
          <p className="text-muted-foreground">
            AI-powered insights and analytics for your photo collection
          </p>
        </div>
        {onRefresh && (
          <Button onClick={onRefresh} variant="outline">
            <Brain className="h-4 w-4 mr-2" />
            Refresh Analysis
          </Button>
        )}
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Photos</p>
                <p className="text-2xl font-bold">{stats.totalPhotos}</p>
              </div>
              <Camera className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">AI Analyzed</p>
                <p className="text-2xl font-bold">{stats.analyzed}</p>
                <Progress 
                  value={stats.totalPhotos > 0 ? (stats.analyzed / stats.totalPhotos) * 100 : 0} 
                  className="mt-2" 
                />
              </div>
              <Brain className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Quality Score</p>
                <p className="text-2xl font-bold">{Math.round(stats.qualityScore * 100)}%</p>
              </div>
              <Eye className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Smart Albums</p>
                <p className="text-2xl font-bold">{stats.albumsCreated}</p>
              </div>
              <Album className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((insight, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-2 rounded-lg ${insight.color} text-white`}>
                      {insight.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold">{insight.title}</h3>
                      {insight.trend && getTrendIcon(insight.trend)}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {insight.description}
                  </p>
                  {insight.value && (
                    <Badge variant="secondary">{insight.value}</Badge>
                  )}
                </div>
                {insight.actionable && insight.action && (
                  <Button size="sm" variant="outline" onClick={insight.action}>
                    <Zap className="h-3 w-3 mr-1" />
                    Act
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analysis Progress */}
      {stats.totalPhotos > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Analysis Progress
            </CardTitle>
            <CardDescription>
              Track the progress of AI analysis across your photo collection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Photos Analyzed</span>
                  <span>{stats.analyzed} / {stats.totalPhotos}</span>
                </div>
                <Progress value={(stats.analyzed / stats.totalPhotos) * 100} />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-500">{smartAlbums.length}</p>
                  <p className="text-sm text-muted-foreground">Smart Albums</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-500">{duplicateGroups.length}</p>
                  <p className="text-sm text-muted-foreground">Duplicate Groups</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-500">
                    {photos.filter(p => p.faces && p.faces.length > 0).length}
                  </p>
                  <p className="text-sm text-muted-foreground">With Faces</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-500">
                    {photos.filter(p => p.location).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Geo-tagged</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}