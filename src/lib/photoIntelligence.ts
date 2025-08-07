// AI-Powered Photo Intelligence System with Analysis and Tagging

export interface PhotoMetadata {
  id: string;
  name: string;
  url: string;
  thumbnailUrl?: string;
  size?: number;
  mimeType: string;
  createdTime: Date;
  modifiedTime: Date;
  // AI-enhanced properties
  aiTags?: string[];
  faces?: FaceDetection[];
  objects?: ObjectDetection[];
  scenes?: SceneDetection[];
  colors?: ColorAnalysis;
  textContent?: string[];
  location?: LocationData;
  quality?: QualityAnalysis;
  duplicateGroup?: string;
  similarPhotos?: string[];
  albumSuggestions?: string[];
  searchableText?: string;
  aiConfidence?: number;
  processedAt?: Date;
}

export interface FaceDetection {
  confidence: number;
  boundingBox: BoundingBox;
  personId?: string;
  personName?: string;
  age?: AgeRange;
  gender?: string;
  emotion?: EmotionAnalysis;
  landmarks?: FaceLandmark[];
}

export interface ObjectDetection {
  name: string;
  confidence: number;
  boundingBox: BoundingBox;
  category: string;
}

export interface SceneDetection {
  name: string;
  confidence: number;
  category: 'indoor' | 'outdoor' | 'nature' | 'urban' | 'event' | 'activity';
}

export interface ColorAnalysis {
  dominantColors: string[];
  colorPalette: string[];
  brightness: number;
  contrast: number;
  saturation: number;
}

export interface LocationData {
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  country?: string;
  landmark?: string;
}

export interface QualityAnalysis {
  sharpness: number;
  brightness: number;
  composition: number;
  overall: number;
  issues?: string[];
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AgeRange {
  min: number;
  max: number;
}

export interface EmotionAnalysis {
  emotion: string;
  confidence: number;
}

export interface FaceLandmark {
  type: string;
  x: number;
  y: number;
}

export interface SmartAlbum {
  id: string;
  name: string;
  description: string;
  coverPhotoId: string;
  photoIds: string[];
  criteria: AlbumCriteria;
  createdAt: Date;
  updatedAt: Date;
  type: 'auto' | 'manual' | 'hybrid';
}

export interface AlbumCriteria {
  dateRange?: { start: Date; end: Date };
  tags?: string[];
  faces?: string[];
  locations?: string[];
  scenes?: string[];
  colors?: string[];
  minPhotos?: number;
}

export interface DuplicateGroup {
  id: string;
  photoIds: string[];
  similarity: number;
  type: 'exact' | 'near' | 'similar';
  suggestedAction: 'keep_best' | 'keep_all' | 'review';
  bestPhotoId?: string;
}

export interface PhotoSearchQuery {
  text?: string;
  tags?: string[];
  faces?: string[];
  dateRange?: { start: Date; end: Date };
  location?: string;
  colors?: string[];
  quality?: 'high' | 'medium' | 'low';
  type?: 'selfie' | 'group' | 'landscape' | 'portrait' | 'document';
}

export class PhotoIntelligence {
  private tagCategories: Record<string, string[]> = {};
  private sceneClassifier: Record<string, string[]> = {};
  private objectCategories: Record<string, string[]> = {};
  private personDatabase: Record<string, { name: string; photos: string[] }> = {};

  constructor() {
    this.initializeTagCategories();
    this.initializeSceneClassifier();
    this.initializeObjectCategories();
  }

  private initializeTagCategories(): void {
    this.tagCategories = {
      'People': [
        'person', 'people', 'family', 'friends', 'child', 'baby', 'adult',
        'man', 'woman', 'boy', 'girl', 'couple', 'group', 'crowd',
        'selfie', 'portrait', 'face', 'smile', 'wedding', 'party'
      ],
      'Events': [
        'birthday', 'wedding', 'graduation', 'holiday', 'christmas', 'easter',
        'vacation', 'travel', 'party', 'celebration', 'anniversary',
        'festival', 'concert', 'meeting', 'conference', 'ceremony'
      ],
      'Places': [
        'home', 'office', 'school', 'restaurant', 'park', 'beach', 'mountain',
        'city', 'building', 'street', 'room', 'kitchen', 'bedroom',
        'garden', 'forest', 'lake', 'river', 'bridge', 'church', 'museum'
      ],
      'Activities': [
        'eating', 'drinking', 'cooking', 'reading', 'working', 'playing',
        'sports', 'exercise', 'running', 'swimming', 'dancing', 'singing',
        'driving', 'walking', 'shopping', 'traveling', 'studying'
      ],
      'Objects': [
        'car', 'bike', 'phone', 'computer', 'book', 'food', 'drink',
        'clothes', 'furniture', 'plant', 'flower', 'animal', 'dog', 'cat',
        'bird', 'tree', 'building', 'house', 'boat', 'plane'
      ],
      'Nature': [
        'sky', 'cloud', 'sun', 'moon', 'star', 'sunset', 'sunrise',
        'rainbow', 'rain', 'snow', 'flower', 'tree', 'grass', 'water',
        'mountain', 'hill', 'valley', 'forest', 'desert', 'ocean'
      ],
      'Time': [
        'morning', 'afternoon', 'evening', 'night', 'day', 'dawn', 'dusk',
        'spring', 'summer', 'autumn', 'winter', 'weekend', 'weekday'
      ]
    };
  }

  private initializeSceneClassifier(): void {
    this.sceneClassifier = {
      'indoor': [
        'room', 'kitchen', 'bedroom', 'bathroom', 'office', 'restaurant',
        'store', 'museum', 'library', 'hospital', 'school', 'home'
      ],
      'outdoor': [
        'street', 'park', 'garden', 'beach', 'mountain', 'forest',
        'field', 'sky', 'road', 'bridge', 'building exterior'
      ],
      'nature': [
        'forest', 'mountain', 'beach', 'lake', 'river', 'desert',
        'field', 'flower', 'tree', 'sunset', 'sunrise', 'wildlife'
      ],
      'urban': [
        'city', 'street', 'building', 'car', 'traffic', 'sidewalk',
        'store', 'restaurant', 'office building', 'apartment'
      ],
      'event': [
        'wedding', 'party', 'concert', 'festival', 'graduation',
        'birthday', 'meeting', 'conference', 'ceremony'
      ],
      'activity': [
        'sports', 'cooking', 'eating', 'playing', 'working',
        'exercise', 'dancing', 'singing', 'reading'
      ]
    };
  }

  private initializeObjectCategories(): void {
    this.objectCategories = {
      'Vehicles': ['car', 'truck', 'bus', 'motorcycle', 'bicycle', 'boat', 'plane'],
      'Electronics': ['phone', 'computer', 'laptop', 'tablet', 'camera', 'tv', 'radio'],
      'Furniture': ['chair', 'table', 'bed', 'sofa', 'desk', 'cabinet', 'shelf'],
      'Clothing': ['shirt', 'pants', 'dress', 'hat', 'shoes', 'jacket', 'bag'],
      'Food': ['pizza', 'burger', 'salad', 'fruit', 'cake', 'bread', 'coffee'],
      'Animals': ['dog', 'cat', 'bird', 'fish', 'horse', 'cow', 'sheep'],
      'Sports': ['ball', 'bat', 'racket', 'bike', 'skateboard', 'surfboard'],
      'Nature': ['flower', 'tree', 'plant', 'mountain', 'beach', 'sky', 'water']
    };
  }

  // Main photo analysis method
  async analyzePhoto(photoUrl: string, metadata: Partial<PhotoMetadata>): Promise<PhotoMetadata> {
    try {
      // In a real implementation, this would call computer vision APIs like:
      // - Google Cloud Vision API
      // - Amazon Rekognition
      // - Azure Computer Vision
      // - OpenAI CLIP
      
      // For now, simulate AI analysis
      const analysis = await this.simulateAIAnalysis(photoUrl, metadata);
      
      return {
        ...metadata,
        ...analysis,
        processedAt: new Date(),
        aiConfidence: analysis.aiConfidence || 0.85
      } as PhotoMetadata;
    } catch (error) {
      console.error('Error analyzing photo:', error);
      throw error;
    }
  }

  private async simulateAIAnalysis(photoUrl: string, metadata: Partial<PhotoMetadata>): Promise<Partial<PhotoMetadata>> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const filename = metadata.name?.toLowerCase() || '';
    
    // Generate tags based on filename and simulated analysis
    const aiTags = this.generateSmartTags(filename);
    
    // Simulate object detection
    const objects = this.simulateObjectDetection(filename);
    
    // Simulate scene detection
    const scenes = this.simulateSceneDetection(filename);
    
    // Simulate face detection
    const faces = this.simulateFaceDetection(filename);
    
    // Generate color analysis
    const colors = this.simulateColorAnalysis();
    
    // Quality analysis
    const quality = this.simulateQualityAnalysis();
    
    // Generate searchable text
    const searchableText = this.generateSearchableText(aiTags, objects, scenes);
    
    // Suggest albums
    const albumSuggestions = this.suggestAlbums(aiTags, scenes, metadata.createdTime);

    return {
      aiTags,
      objects,
      scenes,
      faces,
      colors,
      quality,
      searchableText,
      albumSuggestions,
      aiConfidence: 0.82 + Math.random() * 0.15 // 82-97% confidence
    };
  }

  private generateSmartTags(filename: string): string[] {
    const tags: string[] = [];
    
    // Check filename for patterns
    if (filename.includes('selfie') || filename.includes('self')) tags.push('selfie', 'portrait');
    if (filename.includes('group') || filename.includes('team')) tags.push('group', 'people');
    if (filename.includes('family')) tags.push('family', 'people');
    if (filename.includes('wedding')) tags.push('wedding', 'event', 'celebration');
    if (filename.includes('vacation') || filename.includes('travel')) tags.push('vacation', 'travel');
    if (filename.includes('birthday')) tags.push('birthday', 'party', 'celebration');
    if (filename.includes('food') || filename.includes('meal')) tags.push('food', 'eating');
    if (filename.includes('nature') || filename.includes('outdoor')) tags.push('nature', 'outdoor');
    if (filename.includes('sunset') || filename.includes('sunrise')) tags.push('sunset', 'nature', 'sky');
    if (filename.includes('beach')) tags.push('beach', 'water', 'vacation');
    if (filename.includes('mountain')) tags.push('mountain', 'nature', 'landscape');
    if (filename.includes('city')) tags.push('city', 'urban', 'building');
    if (filename.includes('pet') || filename.includes('dog') || filename.includes('cat')) tags.push('pet', 'animal');
    
    // Add some random common tags for simulation
    const commonTags = ['photo', 'memory', 'moment', 'life'];
    const randomTag = commonTags[Math.floor(Math.random() * commonTags.length)];
    if (!tags.includes(randomTag)) tags.push(randomTag);
    
    // Add time-based tags
    const now = new Date();
    const hour = now.getHours();
    if (hour >= 6 && hour < 12) tags.push('morning');
    else if (hour >= 12 && hour < 17) tags.push('afternoon');
    else if (hour >= 17 && hour < 21) tags.push('evening');
    else tags.push('night');
    
    // Add season
    const month = now.getMonth();
    if (month >= 2 && month <= 4) tags.push('spring');
    else if (month >= 5 && month <= 7) tags.push('summer');
    else if (month >= 8 && month <= 10) tags.push('autumn');
    else tags.push('winter');

    return tags;
  }

  private simulateObjectDetection(filename: string): ObjectDetection[] {
    const objects: ObjectDetection[] = [];
    
    // Simulate common objects based on filename
    const objectMappings = [
      { keywords: ['food', 'meal', 'restaurant'], objects: ['food', 'plate', 'cup'] },
      { keywords: ['car', 'drive', 'road'], objects: ['car', 'street', 'traffic'] },
      { keywords: ['home', 'house', 'room'], objects: ['furniture', 'table', 'chair'] },
      { keywords: ['beach', 'vacation'], objects: ['water', 'sand', 'sun'] },
      { keywords: ['party', 'celebration'], objects: ['people', 'cake', 'decorations'] },
      { keywords: ['nature', 'outdoor'], objects: ['tree', 'sky', 'grass'] },
      { keywords: ['pet', 'dog', 'cat'], objects: ['animal', 'pet', 'fur'] }
    ];

    for (const mapping of objectMappings) {
      if (mapping.keywords.some(keyword => filename.includes(keyword))) {
        mapping.objects.forEach(obj => {
          objects.push({
            name: obj,
            confidence: 0.75 + Math.random() * 0.2,
            boundingBox: {
              x: Math.random() * 0.5,
              y: Math.random() * 0.5,
              width: 0.2 + Math.random() * 0.3,
              height: 0.2 + Math.random() * 0.3
            },
            category: this.getObjectCategory(obj)
          });
        });
        break;
      }
    }

    // Add some default objects if none found
    if (objects.length === 0) {
      objects.push({
        name: 'object',
        confidence: 0.65,
        boundingBox: { x: 0.3, y: 0.3, width: 0.4, height: 0.4 },
        category: 'General'
      });
    }

    return objects;
  }

  private simulateSceneDetection(filename: string): SceneDetection[] {
    const scenes: SceneDetection[] = [];
    
    // Determine scene based on filename
    if (filename.includes('indoor') || filename.includes('room') || filename.includes('home')) {
      scenes.push({ name: 'indoor', confidence: 0.9, category: 'indoor' });
    } else if (filename.includes('outdoor') || filename.includes('park') || filename.includes('street')) {
      scenes.push({ name: 'outdoor', confidence: 0.85, category: 'outdoor' });
    } else if (filename.includes('nature') || filename.includes('forest') || filename.includes('mountain')) {
      scenes.push({ name: 'nature', confidence: 0.88, category: 'nature' });
    } else if (filename.includes('city') || filename.includes('urban') || filename.includes('building')) {
      scenes.push({ name: 'urban', confidence: 0.82, category: 'urban' });
    } else if (filename.includes('party') || filename.includes('event') || filename.includes('wedding')) {
      scenes.push({ name: 'event', confidence: 0.8, category: 'event' });
    } else {
      // Default scene
      scenes.push({ name: 'general', confidence: 0.7, category: 'outdoor' });
    }

    return scenes;
  }

  private simulateFaceDetection(filename: string): FaceDetection[] {
    const faces: FaceDetection[] = [];
    
    // Simulate face detection based on filename
    if (filename.includes('selfie') || filename.includes('portrait') || filename.includes('face')) {
      faces.push({
        confidence: 0.92,
        boundingBox: { x: 0.3, y: 0.2, width: 0.4, height: 0.5 },
        age: { min: 25, max: 35 },
        gender: 'unknown',
        emotion: { emotion: 'happy', confidence: 0.8 }
      });
    } else if (filename.includes('group') || filename.includes('family') || filename.includes('people')) {
      // Multiple faces
      for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
        faces.push({
          confidence: 0.85 + Math.random() * 0.1,
          boundingBox: {
            x: Math.random() * 0.6,
            y: 0.1 + Math.random() * 0.3,
            width: 0.15 + Math.random() * 0.1,
            height: 0.2 + Math.random() * 0.15
          },
          age: { min: 20 + Math.floor(Math.random() * 40), max: 30 + Math.floor(Math.random() * 40) },
          emotion: { emotion: ['happy', 'neutral', 'surprised'][Math.floor(Math.random() * 3)], confidence: 0.7 + Math.random() * 0.2 }
        });
      }
    }

    return faces;
  }

  private simulateColorAnalysis(): ColorAnalysis {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    
    return {
      dominantColors: colors.slice(0, 3),
      colorPalette: colors.slice(0, 5),
      brightness: 0.3 + Math.random() * 0.7,
      contrast: 0.4 + Math.random() * 0.6,
      saturation: 0.2 + Math.random() * 0.8
    };
  }

  private simulateQualityAnalysis(): QualityAnalysis {
    const sharpness = 0.6 + Math.random() * 0.4;
    const brightness = 0.4 + Math.random() * 0.6;
    const composition = 0.5 + Math.random() * 0.5;
    const overall = (sharpness + brightness + composition) / 3;
    
    const issues: string[] = [];
    if (sharpness < 0.7) issues.push('Slightly blurry');
    if (brightness < 0.3) issues.push('Too dark');
    if (brightness > 0.9) issues.push('Overexposed');
    if (composition < 0.6) issues.push('Poor composition');

    return {
      sharpness,
      brightness,
      composition,
      overall,
      issues
    };
  }

  private generateSearchableText(tags: string[], objects: ObjectDetection[], scenes: SceneDetection[]): string {
    const searchTerms = [
      ...tags,
      ...objects.map(obj => obj.name),
      ...scenes.map(scene => scene.name)
    ];
    
    return searchTerms.join(' ').toLowerCase();
  }

  private suggestAlbums(tags: string[], scenes: SceneDetection[], createdTime?: Date): string[] {
    const suggestions: string[] = [];
    
    // Event-based albums
    if (tags.includes('wedding')) suggestions.push('Wedding Memories');
    if (tags.includes('birthday')) suggestions.push('Birthday Celebrations');
    if (tags.includes('vacation') || tags.includes('travel')) suggestions.push('Travel Adventures');
    if (tags.includes('family')) suggestions.push('Family Moments');
    if (tags.includes('pet')) suggestions.push('Pet Photos');
    
    // Scene-based albums
    const sceneNames = scenes.map(s => s.name);
    if (sceneNames.includes('nature')) suggestions.push('Nature Collection');
    if (sceneNames.includes('urban')) suggestions.push('City Life');
    if (sceneNames.includes('event')) suggestions.push('Special Events');
    
    // Time-based albums
    if (createdTime) {
      const year = createdTime.getFullYear();
      const month = createdTime.getMonth();
      
      suggestions.push(`${year} Memories`);
      
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
      suggestions.push(`${monthNames[month]} ${year}`);
      
      // Season albums
      if (month >= 2 && month <= 4) suggestions.push(`Spring ${year}`);
      else if (month >= 5 && month <= 7) suggestions.push(`Summer ${year}`);
      else if (month >= 8 && month <= 10) suggestions.push(`Autumn ${year}`);
      else suggestions.push(`Winter ${year}`);
    }
    
    return [...new Set(suggestions)]; // Remove duplicates
  }

  private getObjectCategory(objectName: string): string {
    for (const [category, objects] of Object.entries(this.objectCategories)) {
      if (objects.includes(objectName)) {
        return category;
      }
    }
    return 'General';
  }

  // Voice search functionality
  searchPhotosByVoice(query: string, photos: PhotoMetadata[]): PhotoMetadata[] {
    const searchTerms = this.parseVoiceQuery(query);
    return this.searchPhotos(searchTerms, photos);
  }

  private parseVoiceQuery(query: string): PhotoSearchQuery {
    const lowerQuery = query.toLowerCase();
    const searchQuery: PhotoSearchQuery = {};

    // Parse date ranges
    if (lowerQuery.includes('last week')) {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      searchQuery.dateRange = { start: weekAgo, end: new Date() };
    } else if (lowerQuery.includes('last month')) {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      searchQuery.dateRange = { start: monthAgo, end: new Date() };
    } else if (lowerQuery.includes('last year')) {
      const yearAgo = new Date();
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      searchQuery.dateRange = { start: yearAgo, end: new Date() };
    }

    // Parse specific dates
    const yearMatch = lowerQuery.match(/\b(20\d{2})\b/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1]);
      searchQuery.dateRange = {
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31)
      };
    }

    // Parse locations
    const locationKeywords = ['from', 'at', 'in', 'near'];
    for (const keyword of locationKeywords) {
      const regex = new RegExp(`${keyword}\\s+(\\w+(?:\\s+\\w+)*)`, 'i');
      const match = lowerQuery.match(regex);
      if (match) {
        searchQuery.location = match[1];
        break;
      }
    }

    // Parse tags and content
    const tags: string[] = [];
    
    // Common search patterns
    if (lowerQuery.includes('selfie') || lowerQuery.includes('self')) tags.push('selfie');
    if (lowerQuery.includes('family')) tags.push('family');
    if (lowerQuery.includes('vacation') || lowerQuery.includes('trip')) tags.push('vacation', 'travel');
    if (lowerQuery.includes('food')) tags.push('food');
    if (lowerQuery.includes('pet') || lowerQuery.includes('dog') || lowerQuery.includes('cat')) tags.push('pet', 'animal');
    if (lowerQuery.includes('wedding')) tags.push('wedding');
    if (lowerQuery.includes('birthday')) tags.push('birthday');
    if (lowerQuery.includes('nature')) tags.push('nature');
    if (lowerQuery.includes('beach')) tags.push('beach');
    if (lowerQuery.includes('mountain')) tags.push('mountain');
    if (lowerQuery.includes('city')) tags.push('city', 'urban');
    if (lowerQuery.includes('sunset') || lowerQuery.includes('sunrise')) tags.push('sunset', 'sunrise');
    
    // Parse faces
    if (lowerQuery.includes('with') || lowerQuery.includes('of')) {
      const faces: string[] = [];
      // Simple name extraction (in real implementation, use NER)
      const namePattern = /\b[A-Z][a-z]+\b/g;
      const names = lowerQuery.match(namePattern);
      if (names) {
        faces.push(...names);
      }
      searchQuery.faces = faces;
    }

    // Parse photo types
    if (lowerQuery.includes('group')) searchQuery.type = 'group';
    if (lowerQuery.includes('landscape')) searchQuery.type = 'landscape';
    if (lowerQuery.includes('portrait')) searchQuery.type = 'portrait';
    
    searchQuery.tags = tags.length > 0 ? tags : undefined;
    searchQuery.text = query; // Full text for fallback search

    return searchQuery;
  }

  searchPhotos(query: PhotoSearchQuery, photos: PhotoMetadata[]): PhotoMetadata[] {
    return photos.filter(photo => {
      // Date range filter
      if (query.dateRange) {
        const photoDate = new Date(photo.createdTime);
        if (photoDate < query.dateRange.start || photoDate > query.dateRange.end) {
          return false;
        }
      }

      // Tag filter
      if (query.tags && query.tags.length > 0) {
        const hasTag = query.tags.some(tag => 
          photo.aiTags?.some(photoTag => 
            photoTag.toLowerCase().includes(tag.toLowerCase())
          )
        );
        if (!hasTag) return false;
      }

      // Location filter
      if (query.location) {
        const hasLocation = photo.location?.address?.toLowerCase().includes(query.location.toLowerCase()) ||
                           photo.location?.city?.toLowerCase().includes(query.location.toLowerCase()) ||
                           photo.aiTags?.some(tag => tag.toLowerCase().includes(query.location!.toLowerCase()));
        if (!hasLocation) return false;
      }

      // Face filter
      if (query.faces && query.faces.length > 0) {
        const hasFace = query.faces.some(face => 
          photo.faces?.some(photoFace => 
            photoFace.personName?.toLowerCase().includes(face.toLowerCase())
          )
        );
        if (!hasFace) return false;
      }

      // Text search (fallback)
      if (query.text) {
        const searchText = query.text.toLowerCase();
        const photoText = (photo.searchableText || '').toLowerCase();
        const nameMatch = photo.name.toLowerCase().includes(searchText);
        const contentMatch = photoText.includes(searchText);
        if (!nameMatch && !contentMatch) return false;
      }

      // Type filter
      if (query.type) {
        const hasType = photo.aiTags?.includes(query.type) ||
                       (query.type === 'selfie' && photo.faces?.length === 1) ||
                       (query.type === 'group' && photo.faces && photo.faces.length > 1);
        if (!hasType) return false;
      }

      return true;
    });
  }

  // Smart album creation
  createSmartAlbums(photos: PhotoMetadata[]): SmartAlbum[] {
    const albums: SmartAlbum[] = [];
    
    // Group by events
    const eventAlbums = this.createEventAlbums(photos);
    albums.push(...eventAlbums);
    
    // Group by time periods
    const timeAlbums = this.createTimeBasedAlbums(photos);
    albums.push(...timeAlbums);
    
    // Group by faces/people
    const peopleAlbums = this.createPeopleAlbums(photos);
    albums.push(...peopleAlbums);
    
    // Group by locations
    const locationAlbums = this.createLocationAlbums(photos);
    albums.push(...locationAlbums);
    
    // Group by themes
    const themeAlbums = this.createThemeAlbums(photos);
    albums.push(...themeAlbums);

    return albums;
  }

  private createEventAlbums(photos: PhotoMetadata[]): SmartAlbum[] {
    const albums: SmartAlbum[] = [];
    const eventTypes = ['wedding', 'birthday', 'vacation', 'party', 'graduation'];
    
    for (const eventType of eventTypes) {
      const eventPhotos = photos.filter(photo => 
        photo.aiTags?.includes(eventType)
      );
      
      if (eventPhotos.length >= 5) {
        albums.push({
          id: `event_${eventType}_${Date.now()}`,
          name: `${eventType.charAt(0).toUpperCase() + eventType.slice(1)} Memories`,
          description: `Photos from ${eventType} events`,
          coverPhotoId: eventPhotos[0].id,
          photoIds: eventPhotos.map(p => p.id),
          criteria: { tags: [eventType], minPhotos: 5 },
          createdAt: new Date(),
          updatedAt: new Date(),
          type: 'auto'
        });
      }
    }
    
    return albums;
  }

  private createTimeBasedAlbums(photos: PhotoMetadata[]): SmartAlbum[] {
    const albums: SmartAlbum[] = [];
    const photosByYear = new Map<number, PhotoMetadata[]>();
    
    // Group by year
    photos.forEach(photo => {
      const year = new Date(photo.createdTime).getFullYear();
      if (!photosByYear.has(year)) {
        photosByYear.set(year, []);
      }
      photosByYear.get(year)!.push(photo);
    });
    
    // Create yearly albums for years with enough photos
    photosByYear.forEach((yearPhotos, year) => {
      if (yearPhotos.length >= 10) {
        albums.push({
          id: `year_${year}`,
          name: `${year} Memories`,
          description: `All photos from ${year}`,
          coverPhotoId: yearPhotos[0].id,
          photoIds: yearPhotos.map(p => p.id),
          criteria: {
            dateRange: {
              start: new Date(year, 0, 1),
              end: new Date(year, 11, 31)
            },
            minPhotos: 10
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          type: 'auto'
        });
      }
    });
    
    return albums;
  }

  private createPeopleAlbums(photos: PhotoMetadata[]): SmartAlbum[] {
    const albums: SmartAlbum[] = [];
    const peopleMap = new Map<string, PhotoMetadata[]>();
    
    // Group by people (simplified - in real implementation, use face recognition)
    photos.forEach(photo => {
      if (photo.faces && photo.faces.length > 0) {
        photo.faces.forEach(face => {
          if (face.personName) {
            if (!peopleMap.has(face.personName)) {
              peopleMap.set(face.personName, []);
            }
            peopleMap.get(face.personName)!.push(photo);
          }
        });
      }
    });
    
    peopleMap.forEach((personPhotos, personName) => {
      if (personPhotos.length >= 3) {
        albums.push({
          id: `person_${personName.replace(/\s+/g, '_').toLowerCase()}`,
          name: `Photos with ${personName}`,
          description: `All photos featuring ${personName}`,
          coverPhotoId: personPhotos[0].id,
          photoIds: personPhotos.map(p => p.id),
          criteria: { faces: [personName], minPhotos: 3 },
          createdAt: new Date(),
          updatedAt: new Date(),
          type: 'auto'
        });
      }
    });
    
    return albums;
  }

  private createLocationAlbums(photos: PhotoMetadata[]): SmartAlbum[] {
    const albums: SmartAlbum[] = [];
    const locationMap = new Map<string, PhotoMetadata[]>();
    
    photos.forEach(photo => {
      if (photo.location?.city) {
        const city = photo.location.city;
        if (!locationMap.has(city)) {
          locationMap.set(city, []);
        }
        locationMap.get(city)!.push(photo);
      }
    });
    
    locationMap.forEach((locationPhotos, location) => {
      if (locationPhotos.length >= 5) {
        albums.push({
          id: `location_${location.replace(/\s+/g, '_').toLowerCase()}`,
          name: `${location} Adventures`,
          description: `Photos taken in ${location}`,
          coverPhotoId: locationPhotos[0].id,
          photoIds: locationPhotos.map(p => p.id),
          criteria: { locations: [location], minPhotos: 5 },
          createdAt: new Date(),
          updatedAt: new Date(),
          type: 'auto'
        });
      }
    });
    
    return albums;
  }

  private createThemeAlbums(photos: PhotoMetadata[]): SmartAlbum[] {
    const albums: SmartAlbum[] = [];
    const themes = [
      { name: 'Nature & Landscapes', tags: ['nature', 'landscape', 'mountain', 'beach', 'sunset'] },
      { name: 'Food & Dining', tags: ['food', 'restaurant', 'cooking', 'meal'] },
      { name: 'Pets & Animals', tags: ['pet', 'animal', 'dog', 'cat'] },
      { name: 'Self Portraits', tags: ['selfie', 'portrait'] },
      { name: 'City Life', tags: ['city', 'urban', 'street', 'building'] }
    ];
    
    for (const theme of themes) {
      const themePhotos = photos.filter(photo =>
        theme.tags.some(tag => photo.aiTags?.includes(tag))
      );
      
      if (themePhotos.length >= 8) {
        albums.push({
          id: `theme_${theme.name.replace(/\s+/g, '_').toLowerCase()}`,
          name: theme.name,
          description: `Collection of ${theme.name.toLowerCase()} photos`,
          coverPhotoId: themePhotos[0].id,
          photoIds: themePhotos.map(p => p.id),
          criteria: { tags: theme.tags, minPhotos: 8 },
          createdAt: new Date(),
          updatedAt: new Date(),
          type: 'auto'
        });
      }
    }
    
    return albums;
  }

  // Duplicate detection
  detectDuplicates(photos: PhotoMetadata[]): DuplicateGroup[] {
    const duplicateGroups: DuplicateGroup[] = [];
    const processed = new Set<string>();
    
    for (let i = 0; i < photos.length; i++) {
      if (processed.has(photos[i].id)) continue;
      
      const currentPhoto = photos[i];
      const similars: PhotoMetadata[] = [currentPhoto];
      
      for (let j = i + 1; j < photos.length; j++) {
        if (processed.has(photos[j].id)) continue;
        
        const similarity = this.calculateSimilarity(currentPhoto, photos[j]);
        
        if (similarity > 0.9) {
          similars.push(photos[j]);
          processed.add(photos[j].id);
        }
      }
      
      processed.add(currentPhoto.id);
      
      if (similars.length > 1) {
        const bestPhoto = this.selectBestPhoto(similars);
        
        duplicateGroups.push({
          id: `dup_${Date.now()}_${i}`,
          photoIds: similars.map(p => p.id),
          similarity: 0.95, // Average similarity
          type: 'similar',
          suggestedAction: 'keep_best',
          bestPhotoId: bestPhoto.id
        });
      }
    }
    
    return duplicateGroups;
  }

  private calculateSimilarity(photo1: PhotoMetadata, photo2: PhotoMetadata): number {
    let similarity = 0;
    let factors = 0;
    
    // Name similarity
    if (photo1.name && photo2.name) {
      const nameSim = this.stringSimilarity(photo1.name, photo2.name);
      similarity += nameSim * 0.3;
      factors += 0.3;
    }
    
    // Size similarity
    if (photo1.size && photo2.size) {
      const sizeDiff = Math.abs(photo1.size - photo2.size) / Math.max(photo1.size, photo2.size);
      const sizeSim = 1 - sizeDiff;
      similarity += sizeSim * 0.2;
      factors += 0.2;
    }
    
    // Time similarity (taken within minutes)
    const timeDiff = Math.abs(new Date(photo1.createdTime).getTime() - new Date(photo2.createdTime).getTime());
    if (timeDiff < 60000) { // If taken within 1 minute
      similarity += 1 * 0.2;
      factors += 0.2;
    } else if (timeDiff < 300000) { // If taken within 5 minutes
      similarity += 0.8 * 0.2;
      factors += 0.2;
    }
    
    // Tag similarity
    if (photo1.aiTags?.length && photo2.aiTags?.length) {
      const commonTags = photo1.aiTags.filter(tag => photo2.aiTags?.includes(tag)).length;
      const totalTags = new Set([...photo1.aiTags, ...photo2.aiTags]).size;
      const tagSim = totalTags > 0 ? commonTags / totalTags : 0;
      similarity += tagSim * 0.2;
      factors += 0.2;
    }
    
    // Final score
    return factors > 0 ? similarity / factors : 0;
  }

  private stringSimilarity(str1: string, str2: string): number {
    const distance = this.calculateLevenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength > 0 ? 1 - (distance / maxLength) : 1;
  }
  
  private calculateLevenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    // Correctly initialize the matrix with the proper type
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    // Fill the rest of the matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        const cost = str1[j - 1] === str2[i - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,       // Deletion
          matrix[i][j - 1] + 1,       // Insertion
          matrix[i - 1][j - 1] + cost // Substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private selectBestPhoto(photos: PhotoMetadata[]): PhotoMetadata {
    // Select the photo with the highest overall quality score
    return photos.reduce((best, current) => {
      if (!best.quality || !current.quality) {
        // If quality data is missing, just return the current one.
        return best;
      }
      return current.quality.overall > best.quality.overall ? current : best;
    }, photos[0]);
  }
}