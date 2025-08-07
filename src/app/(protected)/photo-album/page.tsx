'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  Grid,
  List,
  Calendar,
  Tag,
  Palette,
  SortAsc,
  SortDesc,
  Sparkles,
  Image,
  Share,
  Heart,
  Bookmark
} from 'lucide-react';
import { geminiImageService, ImageGenerationResponse } from '@/lib/geminiImageGeneration';

export default function PhotoAlbumPage() {
  const router = useRouter();
  const [images, setImages] = useState<ImageGenerationResponse[]>([]);
  const [filteredImages, setFilteredImages] = useState<ImageGenerationResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [styleFilter, setStyleFilter] = useState<string>('all');
  const [aspectRatioFilter, setAspectRatioFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'prompt'>('newest');
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadImages();
  }, []);

  useEffect(() => {
    filterAndSortImages();
  }, [images, searchQuery, styleFilter, aspectRatioFilter, sortBy]);

  const loadImages = () => {
    const history = geminiImageService.getHistory();
    setImages(history);
  };

  const filterAndSortImages = () => {
    let filtered = [...images];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(img => 
        img.prompt.toLowerCase().includes(query) ||
        img.style.toLowerCase().includes(query)
      );
    }

    // Filter by style
    if (styleFilter !== 'all') {
      filtered = filtered.filter(img => img.style === styleFilter);
    }

    // Filter by aspect ratio
    if (aspectRatioFilter !== 'all') {
      filtered = filtered.filter(img => img.aspectRatio === aspectRatioFilter);
    }

    // Filter only completed images
    filtered = filtered.filter(img => img.status === 'completed');

    // Sort images
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'prompt':
          return a.prompt.localeCompare(b.prompt);
        default:
          return 0;
      }
    });

    setFilteredImages(filtered);
  };

  const handleImageSelect = (id: string) => {
    const newSelection = new Set(selectedImages);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedImages(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedImages.size === filteredImages.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(filteredImages.map(img => img.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedImages.size === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedImages.size} selected images?`)) {
      for (const id of selectedImages) {
        await geminiImageService.deleteImage(id);
      }
      setSelectedImages(new Set());
      loadImages();
    }
  };

  const handleDownloadSelected = () => {
    selectedImages.forEach(id => {
      const image = images.find(img => img.id === id);
      if (image && image.status === 'completed') {
        const link = document.createElement('a');
        link.href = image.imageUrl;
        link.download = `generated-${image.prompt.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '-')}.jpg`;
        link.click();
      }
    });
  };

  const uniqueStyles = Array.from(new Set(images.map(img => img.style)));
  const uniqueAspectRatios = Array.from(new Set(images.map(img => img.aspectRatio)));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Modern Header Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 mb-8 hover:shadow-3xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl shadow-lg">
                <Image className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  Photo Album
                </h1>
                <p className="text-gray-600 font-medium mt-1">Your AI-generated image collection</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <Button 
                onClick={() => router.push('/image-generation')}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate New Image
              </Button>
            </div>
          </div>
        </div>
        {/* Stats and Filters */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* Stats */}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{images.length}</div>
                <div className="text-sm text-gray-500">Total Images</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{filteredImages.length}</div>
                <div className="text-sm text-gray-500">Showing</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{selectedImages.size}</div>
                <div className="text-sm text-gray-500">Selected</div>
              </div>
            </div>

            {/* Search and Controls */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search images..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 w-64"
                />
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? 'bg-blue-50' : ''}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <Card className="mt-4">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Style Filter */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Style</label>
                    <select
                      value={styleFilter}
                      onChange={(e) => setStyleFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="all">All Styles</option>
                      {uniqueStyles.map(style => (
                        <option key={style} value={style}>{style}</option>
                      ))}
                    </select>
                  </div>

                  {/* Aspect Ratio Filter */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Aspect Ratio</label>
                    <select
                      value={aspectRatioFilter}
                      onChange={(e) => setAspectRatioFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="all">All Ratios</option>
                      {uniqueAspectRatios.map(ratio => (
                        <option key={ratio} value={ratio}>{ratio}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sort By */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="prompt">Prompt A-Z</option>
                    </select>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <label className="block text-sm font-medium mb-2">Actions</label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAll}
                        className="text-xs"
                      >
                        {selectedImages.size === filteredImages.length ? 'Deselect All' : 'Select All'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Selection Actions */}
          {selectedImages.size > 0 && (
            <Card className="mt-4 border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800">
                    {selectedImages.size} image{selectedImages.size > 1 ? 's' : ''} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadSelected}
                      className="text-blue-600 border-blue-300 hover:bg-blue-100"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Selected
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteSelected}
                      className="text-red-600 border-red-300 hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Images Grid/List */}
        {filteredImages.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Image className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No images found</h3>
              <p className="text-gray-500 mb-4">
                {images.length === 0 
                  ? "You haven't generated any images yet"
                  : "No images match your current filters"
                }
              </p>
              <Button 
                onClick={() => router.push('/image-generation')}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Your First Image
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6' 
            : 'space-y-4'
          }>
            {filteredImages.map((image) => (
              <Card 
                key={image.id} 
                className={`overflow-hidden hover:shadow-lg transition-all cursor-pointer ${
                  selectedImages.has(image.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                } ${viewMode === 'list' ? 'flex' : ''}`}
                onClick={() => handleImageSelect(image.id)}
              >
                {viewMode === 'grid' ? (
                  <>
                    {/* Image */}
                    <div className="aspect-square bg-gray-100 relative">
                      <img
                        src={image.thumbnailUrl || image.imageUrl}
                        alt={image.prompt}
                        className="w-full h-full object-cover"
                      />
                      {selectedImages.has(image.id) && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {image.style}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {image.aspectRatio}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                        {image.prompt}
                      </p>
                      
                      <p className="text-xs text-gray-500">
                        {new Date(image.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <img
                      src={image.thumbnailUrl || image.imageUrl}
                      alt={image.prompt}
                      className="w-32 h-32 object-cover rounded-l-md"
                    />
                    <div className="flex flex-col justify-between p-4 flex-grow">
                      <p className="text-sm text-gray-800 font-semibold">{image.prompt}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {image.style}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {image.aspectRatio}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        Created: {new Date(image.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {selectedImages.has(image.id) && (
                      <div className="flex items-center pr-4">
                        <span className="text-blue-600 font-bold text-xl">✓</span>
                      </div>
                    )}
                  </>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
