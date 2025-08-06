// Location Services and Travel Time Calculation
// Enhanced location intelligence for smart calendar integration

export interface LocationData {
  address: string;
  coordinates: { lat: number; lng: number };
  name?: string;
  type: 'office' | 'home' | 'restaurant' | 'gym' | 'hospital' | 'school' | 'other';
  parking?: boolean;
  accessibility?: string[];
  businessHours?: {
    open: string;
    close: string;
    days: number[];
  };
}

export interface TravelTimeResult {
  duration: number; // minutes
  distance: number; // kilometers
  mode: 'driving' | 'walking' | 'transit' | 'cycling';
  departureTime: Date;
  arrivalTime: Date;
  route: RouteInfo;
  trafficDelay?: number;
  alternatives?: TravelTimeResult[];
}

export interface RouteInfo {
  summary: string;
  instructions: string[];
  waypoints?: string[];
  trafficConditions: 'light' | 'moderate' | 'heavy';
  estimatedCost?: number;
}

export interface LocationSuggestion {
  address: string;
  name: string;
  type: string;
  rating?: number;
  distance?: number;
  matchScore: number;
}

export class LocationServices {
  private locationCache = new Map<string, LocationData>();
  private travelTimeCache = new Map<string, TravelTimeResult>();
  private cacheExpiry = 30 * 60 * 1000; // 30 minutes
  
  // Common location patterns for auto-detection
  private locationPatterns = new Map([
    ['gym', ['gym', 'fitness', 'crossfit', 'yoga', 'pilates', 'workout']],
    ['office', ['office', 'work', 'workplace', 'company', 'building', 'headquarters']],
    ['restaurant', ['restaurant', 'cafe', 'diner', 'bistro', 'eatery', 'food']],
    ['hospital', ['hospital', 'clinic', 'medical', 'doctor', 'dentist', 'urgent care']],
    ['school', ['school', 'university', 'college', 'campus', 'library', 'education']],
    ['home', ['home', 'house', 'apartment', 'residence']],
    ['other', []]
  ]);

  async resolveLocation(locationInput: string): Promise<LocationData> {
    // Check cache first
    const cacheKey = `location_${locationInput.toLowerCase()}`;
    if (this.locationCache.has(cacheKey)) {
      const cached = this.locationCache.get(cacheKey)!;
      return cached;
    }

    try {
      // Try to resolve using various methods
      let locationData = await this.tryGeocodingAPI(locationInput);
      
      if (!locationData) {
        locationData = this.tryCommonLocations(locationInput);
      }
      
      if (!locationData) {
        locationData = this.createFallbackLocation(locationInput);
      }

      // Enhance with additional details
      locationData = await this.enhanceLocationData(locationData);
      
      // Cache the result
      this.locationCache.set(cacheKey, locationData);
      
      return locationData;

    } catch (error) {
      console.error('Location resolution error:', error);
      return this.createFallbackLocation(locationInput);
    }
  }

  async calculateTravelTime(
    origin: string | LocationData,
    destination: string | LocationData,
    mode: 'driving' | 'walking' | 'transit' | 'cycling' = 'driving',
    departureTime?: Date
  ): Promise<TravelTimeResult> {
    
    const originStr = typeof origin === 'string' ? origin : origin.address;
    const destStr = typeof destination === 'string' ? destination : destination.address;
    const depTime = departureTime || new Date();
    
    const cacheKey = `travel_${originStr}_${destStr}_${mode}_${depTime.toISOString().split('T')[0]}`;
    
    // Check cache
    if (this.travelTimeCache.has(cacheKey)) {
      const cached = this.travelTimeCache.get(cacheKey)!;
      if (Date.now() - cached.departureTime.getTime() < this.cacheExpiry) {
        return cached;
      }
    }

    try {
      // Resolve locations if needed
      const originLocation = typeof origin === 'string' ? await this.resolveLocation(origin) : origin;
      const destLocation = typeof destination === 'string' ? await this.resolveLocation(destination) : destination;

      // Calculate travel time using various methods
      let travelResult = await this.tryDistanceMatrixAPI(originLocation, destLocation, mode, depTime);
      
      if (!travelResult) {
        travelResult = this.estimateTravelTime(originLocation, destLocation, mode, depTime);
      }

      // Cache the result
      this.travelTimeCache.set(cacheKey, travelResult);
      
      return travelResult;

    } catch (error) {
      console.error('Travel time calculation error:', error);
      return this.createFallbackTravelTime(originStr, destStr, mode, depTime);
    }
  }

  async suggestLocations(query: string, type?: string, radius?: number): Promise<LocationSuggestion[]> {
    try {
      const suggestions: LocationSuggestion[] = [];
      
      // Try various suggestion methods
      const apiSuggestions = await this.tryPlacesAPI(query, type, radius);
      const commonSuggestions = this.getCommonLocationSuggestions(query, type);
      
      suggestions.push(...apiSuggestions, ...commonSuggestions);
      
      // Sort by match score and remove duplicates
      return suggestions
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 10);

    } catch (error) {
      console.error('Location suggestions error:', error);
      return this.getCommonLocationSuggestions(query, type);
    }
  }

  // Smart auto-location detection based on event context
  autoDetectLocationType(eventTitle: string, eventType: string): string {
    const titleLower = eventTitle.toLowerCase();
    
    for (const [type, keywords] of this.locationPatterns) {
      if (keywords.some(keyword => titleLower.includes(keyword))) {
        return type;
      }
    }
    
    // Context-based detection
    if (eventType === 'meeting' || eventType === 'appointment') {
      if (titleLower.includes('doctor') || titleLower.includes('dentist')) return 'hospital';
      if (titleLower.includes('lunch') || titleLower.includes('dinner')) return 'restaurant';
      return 'office';
    }
    
    if (eventType === 'task') {
      if (titleLower.includes('workout') || titleLower.includes('gym')) return 'gym';
      return 'other';
    }
    
    return 'other';
  }

  // Private helper methods

  private async tryGeocodingAPI(locationInput: string): Promise<LocationData | null> {
    // This would integrate with Google Maps Geocoding API, OpenStreetMap, or similar
    // For now, return null to fall back to other methods
    console.log('Geocoding API integration would be implemented here');
    return null;
  }

  private async tryDistanceMatrixAPI(
    origin: LocationData,
    destination: LocationData,
    mode: string,
    departureTime: Date
  ): Promise<TravelTimeResult | null> {
    // This would integrate with Google Maps Distance Matrix API or similar
    console.log('Distance Matrix API integration would be implemented here');
    return null;
  }

  private async tryPlacesAPI(query: string, type?: string, radius?: number): Promise<LocationSuggestion[]> {
    // This would integrate with Google Places API or similar
    console.log('Places API integration would be implemented here');
    return [];
  }

  private tryCommonLocations(locationInput: string): LocationData | null {
    const inputLower = locationInput.toLowerCase();
    
    // Common workplace locations
    if (inputLower.includes('office') || inputLower.includes('work')) {
      return {
        address: 'Office Building, Business District',
        coordinates: { lat: 0, lng: 0 }, // Would be configured per user
        name: 'Office',
        type: 'office',
        parking: true,
        businessHours: {
          open: '09:00',
          close: '17:00',
          days: [1, 2, 3, 4, 5] // Monday to Friday
        }
      };
    }
    
    // Common gym locations
    if (inputLower.includes('gym') || inputLower.includes('fitness')) {
      return {
        address: 'Local Fitness Center',
        coordinates: { lat: 0, lng: 0 },
        name: 'Gym',
        type: 'gym',
        parking: true,
        businessHours: {
          open: '05:00',
          close: '23:00',
          days: [1, 2, 3, 4, 5, 6, 7] // All week
        }
      };
    }
    
    // Home location
    if (inputLower.includes('home') || inputLower.includes('house')) {
      return {
        address: 'Home',
        coordinates: { lat: 0, lng: 0 },
        name: 'Home',
        type: 'home',
        parking: true
      };
    }
    
    return null;
  }

  private createFallbackLocation(locationInput: string): LocationData {
    const detectedType = this.detectLocationTypeFromInput(locationInput);
    
    return {
      address: locationInput,
      coordinates: { lat: 0, lng: 0 },
      name: locationInput,
      type: detectedType,
      parking: false
    };
  }

  private detectLocationTypeFromInput(input: string): LocationData['type'] {
    const inputLower = input.toLowerCase();
    
    for (const [type, keywords] of this.locationPatterns) {
      if (keywords.some(keyword => inputLower.includes(keyword))) {
        return type as LocationData['type'];
      }
    }
    
    return 'other';
  }

  private estimateTravelTime(
    origin: LocationData,
    destination: LocationData,
    mode: string,
    departureTime: Date
  ): TravelTimeResult {
    // Simple distance-based estimation
    const distance = this.calculateDistance(origin.coordinates, destination.coordinates);
    
    // Speed estimates by mode (km/h)
    const speeds = {
      driving: 50,
      walking: 5,
      cycling: 20,
      transit: 30
    };
    
    const speed = speeds[mode as keyof typeof speeds] || speeds.driving;
    const durationMinutes = Math.round((distance / speed) * 60);
    
    // Add traffic delay for driving
    let trafficDelay = 0;
    if (mode === 'driving') {
      const hour = departureTime.getHours();
      if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
        trafficDelay = Math.round(durationMinutes * 0.3); // 30% delay during rush hour
      }
    }
    
    const totalDuration = durationMinutes + trafficDelay;
    const arrivalTime = new Date(departureTime.getTime() + totalDuration * 60 * 1000);
    
    return {
      duration: totalDuration,
      distance,
      mode: mode as any,
      departureTime,
      arrivalTime,
      trafficDelay,
      route: {
        summary: `${mode} route from ${origin.name || origin.address} to ${destination.name || destination.address}`,
        instructions: [
          `Start at ${origin.name || origin.address}`,
          `Travel ${distance.toFixed(1)} km via ${mode}`,
          `Arrive at ${destination.name || destination.address}`
        ],
        trafficConditions: trafficDelay > 0 ? 'moderate' : 'light'
      }
    };
  }

  private calculateDistance(coord1: { lat: number; lng: number }, coord2: { lat: number; lng: number }): number {
    // Haversine formula for calculating distance between two points
    if (coord1.lat === 0 && coord1.lng === 0) return 10; // Default 10km if no coordinates
    if (coord2.lat === 0 && coord2.lng === 0) return 10;
    
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(coord2.lat - coord1.lat);
    const dLng = this.toRadians(coord2.lng - coord1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(coord1.lat)) * Math.cos(this.toRadians(coord2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private createFallbackTravelTime(
    origin: string,
    destination: string,
    mode: string,
    departureTime: Date
  ): TravelTimeResult {
    // Default travel time estimates
    const defaultDurations = {
      driving: 20,
      walking: 60,
      cycling: 30,
      transit: 35
    };
    
    const duration = defaultDurations[mode as keyof typeof defaultDurations] || 20;
    const arrivalTime = new Date(departureTime.getTime() + duration * 60 * 1000);
    
    return {
      duration,
      distance: 10, // Default 10km
      mode: mode as any,
      departureTime,
      arrivalTime,
      route: {
        summary: `Estimated ${mode} route`,
        instructions: [`Travel from ${origin} to ${destination}`],
        trafficConditions: 'light'
      }
    };
  }

  private async enhanceLocationData(locationData: LocationData): Promise<LocationData> {
    // Add business hours based on type
    if (!locationData.businessHours) {
      locationData.businessHours = this.getDefaultBusinessHours(locationData.type);
    }
    
    // Add parking information
    if (locationData.parking === undefined) {
      locationData.parking = ['office', 'gym', 'restaurant', 'hospital'].includes(locationData.type);
    }
    
    // Add accessibility information
    if (!locationData.accessibility) {
      locationData.accessibility = ['wheelchair_accessible', 'elevator_access'];
    }
    
    return locationData;
  }

  private getDefaultBusinessHours(type: string): { open: string; close: string; days: number[] } {
    const businessHours = {
      office: { open: '09:00', close: '17:00', days: [1, 2, 3, 4, 5] },
      gym: { open: '05:00', close: '23:00', days: [1, 2, 3, 4, 5, 6, 7] },
      restaurant: { open: '11:00', close: '22:00', days: [1, 2, 3, 4, 5, 6, 7] },
      hospital: { open: '00:00', close: '23:59', days: [1, 2, 3, 4, 5, 6, 7] },
      school: { open: '08:00', close: '16:00', days: [1, 2, 3, 4, 5] },
      home: { open: '00:00', close: '23:59', days: [1, 2, 3, 4, 5, 6, 7] },
      other: { open: '09:00', close: '17:00', days: [1, 2, 3, 4, 5, 6, 7] }
    };
    
    return businessHours[type as keyof typeof businessHours] || businessHours.other;
  }

  private getCommonLocationSuggestions(query: string, type?: string): LocationSuggestion[] {
    const suggestions: LocationSuggestion[] = [];
    const queryLower = query.toLowerCase();
    
    // Common location suggestions based on query
    const commonLocations = [
      { name: 'Home Office', type: 'office', keywords: ['office', 'work', 'home'] },
      { name: 'Local Gym', type: 'gym', keywords: ['gym', 'fitness', 'workout'] },
      { name: 'Coffee Shop', type: 'restaurant', keywords: ['coffee', 'cafe', 'meet'] },
      { name: 'Conference Room A', type: 'office', keywords: ['meeting', 'conference', 'room'] },
      { name: 'Downtown Library', type: 'other', keywords: ['library', 'study', 'book'] },
      { name: 'City Hospital', type: 'hospital', keywords: ['hospital', 'doctor', 'medical'] }
    ];
    
    for (const location of commonLocations) {
      if (type && location.type !== type) continue;
      
      const matchScore = location.keywords.reduce((score, keyword) => {
        if (queryLower.includes(keyword)) score += 0.3;
        return score;
      }, 0.1);
      
      if (matchScore > 0.1) {
        suggestions.push({
          address: location.name,
          name: location.name,
          type: location.type,
          matchScore
        });
      }
    }
    
    return suggestions;
  }
}

// Create singleton instance
export const locationServices = new LocationServices();