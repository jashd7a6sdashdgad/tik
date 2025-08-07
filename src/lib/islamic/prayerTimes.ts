// Prayer Times Calculator with Location-Based Adhan Notifications

// Interfaces for data structures
export interface PrayerTime {
  name: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
  displayName: string;
  time: string; // HH:MM format
  timestamp: number;
  isNext: boolean;
  timeRemaining?: string;
}

export interface PrayerTimesData {
  date: string;
  location: {
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  prayers: PrayerTime[];
  sunrise: string;
  sunset: string;
  qiblaDirection: number;
  calculationMethod: string;
}

export interface PrayerSettings {
  calculationMethod: 'MWL' | 'ISNA' | 'Egypt' | 'Makkah' | 'Karachi' | 'Tehran' | 'Jafari';
  madhab: 'Shafi' | 'Hanafi';
  adjustments: {
    fajr: number;
    dhuhr: number;
    asr: number;
    maghrib: number;
    isha: number;
  };
  notifications: {
    enabled: boolean;
    adhanSound: boolean;
    reminderMinutes: number[];
    muteDuringMeetings: boolean;
  };
  location: {
    useAutoLocation: boolean;
    manualLocation?: {
      city: string;
      country: string;
      latitude: number;
      longitude: number;
    };
  };
}

export interface SmartSchedulingRule {
  id: string;
  name: string;
  enabled: boolean;
  condition: {
    type: 'avoid_prayer_time' | 'after_prayer' | 'before_prayer' | 'between_prayers';
    prayer?: PrayerTime['name'];
    bufferMinutes: number;
  };
  action: {
    type: 'block_meetings' | 'suggest_alternative' | 'add_buffer' | 'postpone';
    duration?: number; // minutes
  };
  priority: 'high' | 'medium' | 'low';
}

// New interfaces to fix type errors in the scheduling recommendations
export interface TimeSlot {
  startTime: string;
  endTime: string;
  hasConflict: boolean;
  conflictingPrayers: PrayerTime[];
}

export interface AvoidTime {
  startTime: string;
  endTime: string;
  reason: string;
}

export interface BestTime extends AvoidTime {
  confidence: number;
}

class PrayerTimesService {
  private prayerSettings: PrayerSettings;
  private schedulingRules: SmartSchedulingRule[] = [];
  private currentLocation: GeolocationPosition | null = null;

  constructor() {
    this.prayerSettings = this.loadSettings();
    this.initializeDefaultRules();

    if (this.prayerSettings.location.useAutoLocation) {
      this.updateLocation();
    }
  }

  // Get prayer times for a specific date
  async getPrayerTimes(date?: Date): Promise<PrayerTimesData> {
    const targetDate = date || new Date();
    const location = await this.getLocation();

    try {
      // Use Aladhan API for accurate prayer times
      const dateString = targetDate.toISOString().split('T')[0];
      const response = await fetch(
        `https://api.aladhan.com/v1/timings/${dateString}?latitude=${location.latitude}&longitude=${location.longitude}&method=${this.getCalculationMethodCode()}&madhab=${this.prayerSettings.madhab === 'Hanafi' ? '1' : '0'}`
      );

      const data = await response.json();

      if (data.code === 200) {
        return this.formatPrayerTimesResponse(data.data, location);
      }
    } catch (error) {
      console.warn('Failed to fetch prayer times from API, using offline calculation:', error);
    }

    // Fallback to offline calculation
    return this.calculatePrayerTimesOffline(targetDate, location);
  }

  // Get next prayer time
  async getNextPrayer(): Promise<PrayerTime | null> {
    const prayerTimes = await this.getPrayerTimes();
    const now = new Date();

    const nextPrayer = prayerTimes.prayers.find(prayer => {
      const prayerTime = new Date();
      const [hours, minutes] = prayer.time.split(':').map(Number);
      prayerTime.setHours(hours, minutes, 0, 0);
      return prayerTime > now;
    });

    // If no prayer today, get first prayer of tomorrow
    if (!nextPrayer) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowPrayers = await this.getPrayerTimes(tomorrow);
      return tomorrowPrayers.prayers[0] || null;
    }

    return nextPrayer;
  }

  // Check if current time conflicts with prayer time
  async checkPrayerConflict(startTime: Date, endTime: Date): Promise<{
    hasConflict: boolean;
    conflictingPrayers: PrayerTime[];
    suggestions: string[];
  }> {
    const prayerTimes = await this.getPrayerTimes(startTime);
    const conflictingPrayers: PrayerTime[] = [];
    const suggestions: string[] = [];

    prayerTimes.prayers.forEach(prayer => {
      const prayerTime = new Date(startTime);
      const [hours, minutes] = prayer.time.split(':').map(Number);
      prayerTime.setHours(hours, minutes, 0, 0);

      // Check if prayer time falls within the scheduled time
      if (prayerTime >= startTime && prayerTime <= endTime) {
        conflictingPrayers.push(prayer);
      }

      // Check buffer time
      const bufferStart = new Date(prayerTime.getTime() - (this.prayerSettings.notifications.reminderMinutes[0] || 15) * 60000);
      const bufferEnd = new Date(prayerTime.getTime() + 30 * 60000); // 30 min for prayer

      if ((bufferStart >= startTime && bufferStart <= endTime) ||
        (bufferEnd >= startTime && bufferEnd <= endTime)) {
        if (!conflictingPrayers.includes(prayer)) {
          conflictingPrayers.push(prayer);
        }
      }
    });

    // Generate suggestions
    if (conflictingPrayers.length > 0) {
      const firstConflict = conflictingPrayers[0];
      const prayerTime = new Date(startTime);
      const [hours, minutes] = firstConflict.time.split(':').map(Number);
      prayerTime.setHours(hours, minutes, 0, 0);

      // Suggest time before prayer
      const beforePrayer = new Date(prayerTime.getTime() - 45 * 60000);
      suggestions.push(`Schedule before ${firstConflict.displayName}: ${beforePrayer.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);

      // Suggest time after prayer
      const afterPrayer = new Date(prayerTime.getTime() + 30 * 60000);
      suggestions.push(`Schedule after ${firstConflict.displayName}: ${afterPrayer.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    }

    return {
      hasConflict: conflictingPrayers.length > 0,
      conflictingPrayers,
      suggestions
    };
  }

  // Get smart scheduling recommendations
  async getSchedulingRecommendations(
    duration: number, // in minutes
    preferredTimes?: string[], // array of HH:MM times
    date?: Date
  ): Promise<{
    bestTimes: BestTime[];
    avoidTimes: AvoidTime[];
  }> {
    const targetDate = date || new Date();
    const prayerTimes = await this.getPrayerTimes(targetDate);
    const bestTimes: BestTime[] = [];
    const avoidTimes: AvoidTime[] = [];

    // Generate time slots throughout the day
    const dayStart = new Date(targetDate);
    dayStart.setHours(6, 0, 0, 0); // Start from 6 AM

    const dayEnd = new Date(targetDate);
    dayEnd.setHours(22, 0, 0, 0); // End at 10 PM

    const current = new Date(dayStart);

    while (current <= dayEnd) {
      const endTime = new Date(current.getTime() + duration * 60000);

      const conflict = await this.checkPrayerConflict(current, endTime);

      const timeSlot: TimeSlot = {
        startTime: current.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        endTime: endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        hasConflict: conflict.hasConflict,
        conflictingPrayers: conflict.conflictingPrayers
      };

      if (conflict.hasConflict) {
        avoidTimes.push({
          startTime: timeSlot.startTime,
          endTime: timeSlot.endTime,
          reason: `Conflicts with ${conflict.conflictingPrayers.map(p => p.displayName).join(', ')}`
        });
      } else {
        // Calculate confidence based on various factors
        let confidence = 80;

        // Higher confidence for preferred times
        if (preferredTimes && preferredTimes.some(pref =>
          Math.abs(this.timeToMinutes(pref) - this.timeToMinutes(timeSlot.startTime)) <= 30
        )) {
          confidence += 15;
        }

        // Lower confidence for very early or very late times
        const hour = current.getHours();
        if (hour < 8 || hour > 18) {
          confidence -= 10;
        }

        // Higher confidence for times between prayers
        const nextPrayer = prayerTimes.prayers.find(prayer => {
          const prayerMinutes = this.timeToMinutes(prayer.time);
          const slotMinutes = this.timeToMinutes(timeSlot.startTime);
          return prayerMinutes > slotMinutes;
        });

        if (nextPrayer) {
          const timeToPrayer = this.timeToMinutes(nextPrayer.time) - this.timeToMinutes(timeSlot.endTime);
          if (timeToPrayer > 30) {
            confidence += 10;
            bestTimes.push({
              ...timeSlot,
              reason: `Good time slot before ${nextPrayer.displayName}`,
              confidence
            });
          }
        } else {
          bestTimes.push({
            ...timeSlot,
            reason: 'No prayer conflicts',
            confidence
          });
        }
      }

      current.setMinutes(current.getMinutes() + 30); // Check every 30 minutes
    }

    return {
      bestTimes: bestTimes
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5),
      avoidTimes: avoidTimes.slice(0, 10)
    };
  }

  // Get Qibla direction
  async getQiblaDirection(): Promise<number> {
    const location = await this.getLocation();

    // Kaaba coordinates
    const kaabaLat = 21.4225;
    const kaabaLng = 39.8262;

    // Calculate bearing to Kaaba
    const lat1 = location.latitude * Math.PI / 180;
    const lat2 = kaabaLat * Math.PI / 180;
    const deltaLng = (kaabaLng - location.longitude) * Math.PI / 180;

    const x = Math.sin(deltaLng) * Math.cos(lat2);
    const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

    let bearing = Math.atan2(x, y) * 180 / Math.PI;
    bearing = (bearing + 360) % 360;

    return bearing;
  }

  // Update prayer settings
  getSettings(): PrayerSettings {
    return { ...this.prayerSettings };
  }

  updateSettings(newSettings: Partial<PrayerSettings>): void {
    this.prayerSettings = { ...this.prayerSettings, ...newSettings };
    this.saveSettings();
  }

  // Add smart scheduling rule
  addSchedulingRule(rule: Omit<SmartSchedulingRule, 'id'>): string {
    const newRule: SmartSchedulingRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.schedulingRules.push(newRule);
    this.saveSchedulingRules();
    return newRule.id;
  }

  // Get all scheduling rules
  getSchedulingRules(): SmartSchedulingRule[] {
    return [...this.schedulingRules];
  }

  // Enable/disable scheduling rule
  toggleSchedulingRule(ruleId: string, enabled: boolean): void {
    const rule = this.schedulingRules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
      this.saveSchedulingRules();
    }
  }

  private async getLocation(): Promise<{ latitude: number; longitude: number }> {
    if (this.prayerSettings.location.manualLocation) {
      return {
        latitude: this.prayerSettings.location.manualLocation.latitude,
        longitude: this.prayerSettings.location.manualLocation.longitude
      };
    }

    if (this.currentLocation) {
      return {
        latitude: this.currentLocation.coords.latitude,
        longitude: this.currentLocation.coords.longitude
      };
    }

    // Default to Muscat, Oman
    return { latitude: 23.6100, longitude: 58.5922 };
  }

  private updateLocation(): void {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.currentLocation = position;
        },
        (error) => {
          console.warn('Failed to get location:', error);
        },
        { timeout: 10000, maximumAge: 600000 } // 10 minute cache
      );
    }
  }

  private formatPrayerTimesResponse(data: any, location: any): PrayerTimesData {
    const timings = data.timings;
    const prayers: PrayerTime[] = [
      {
        name: 'fajr',
        displayName: 'Fajr',
        time: timings.Fajr.split(' ')[0],
        timestamp: this.timeToTimestamp(timings.Fajr.split(' ')[0]),
        isNext: false
      },
      {
        name: 'dhuhr',
        displayName: 'Dhuhr',
        time: timings.Dhuhr.split(' ')[0],
        timestamp: this.timeToTimestamp(timings.Dhuhr.split(' ')[0]),
        isNext: false
      },
      {
        name: 'asr',
        displayName: 'Asr',
        time: timings.Asr.split(' ')[0],
        timestamp: this.timeToTimestamp(timings.Asr.split(' ')[0]),
        isNext: false
      },
      {
        name: 'maghrib',
        displayName: 'Maghrib',
        time: timings.Maghrib.split(' ')[0],
        timestamp: this.timeToTimestamp(timings.Maghrib.split(' ')[0]),
        isNext: false
      },
      {
        name: 'isha',
        displayName: 'Isha',
        time: timings.Isha.split(' ')[0],
        timestamp: this.timeToTimestamp(timings.Isha.split(' ')[0]),
        isNext: false
      }
    ];

    // Mark next prayer
    const now = Date.now();
    const nextPrayer = prayers.find(p => p.timestamp > now);
    if (nextPrayer) {
      nextPrayer.isNext = true;
      nextPrayer.timeRemaining = this.calculateTimeRemaining(nextPrayer.timestamp);
    }

    return {
      date: data.date.readable,
      location,
      prayers,
      sunrise: timings.Sunrise.split(' ')[0],
      sunset: timings.Sunset.split(' ')[0],
      qiblaDirection: data.meta.qibla_direction,
      calculationMethod: data.meta.method.name
    };
  }

  private calculatePrayerTimesOffline(date: Date, location: any): PrayerTimesData {
    // Simplified offline calculation - in a real app, you'd use a proper astronomical calculation library
    const prayers: PrayerTime[] = [
      { name: 'fajr', displayName: 'Fajr', time: '05:30', timestamp: 0, isNext: false },
      { name: 'dhuhr', displayName: 'Dhuhr', time: '12:15', timestamp: 0, isNext: false },
      { name: 'asr', displayName: 'Asr', time: '15:45', timestamp: 0, isNext: false },
      { name: 'maghrib', displayName: 'Maghrib', time: '18:30', timestamp: 0, isNext: false },
      { name: 'isha', displayName: 'Isha', time: '20:00', timestamp: 0, isNext: false }
    ];

    prayers.forEach(prayer => {
      prayer.timestamp = this.timeToTimestamp(prayer.time);
    });

    return {
      date: date.toDateString(),
      location,
      prayers,
      sunrise: '06:15',
      sunset: '18:15',
      qiblaDirection: 270, // Default to west
      calculationMethod: 'Offline Calculation'
    };
  }

  private timeToTimestamp(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    const today = new Date();
    today.setHours(hours, minutes, 0, 0);
    return today.getTime();
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private calculateTimeRemaining(timestamp: number): string {
    const now = Date.now();
    const diff = timestamp - now;

    if (diff <= 0) return '0m';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  private getCalculationMethodCode(): string {
    const methods = {
      'MWL': '3',
      'ISNA': '2',
      'Egypt': '5',
      'Makkah': '4',
      'Karachi': '1',
      'Tehran': '7',
      'Jafari': '0'
    };
    return methods[this.prayerSettings.calculationMethod] || '3';
  }

  private initializeDefaultRules(): void {
    this.schedulingRules = [
      {
        id: 'avoid-jummah',
        name: 'Avoid Friday Prayer Time',
        enabled: true,
        condition: {
          type: 'avoid_prayer_time',
          prayer: 'dhuhr',
          bufferMinutes: 60
        },
        action: {
          type: 'block_meetings',
          duration: 90
        },
        priority: 'high'
      },
      {
        id: 'maghrib-buffer',
        name: 'Maghrib Prayer Buffer',
        enabled: true,
        condition: {
          type: 'avoid_prayer_time',
          prayer: 'maghrib',
          bufferMinutes: 30
        },
        action: {
          type: 'suggest_alternative'
        },
        priority: 'medium'
      }
    ];
  }

  private loadSettings(): PrayerSettings {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('prayerSettings');
        if (stored) {
          return { ...this.getDefaultSettings(), ...JSON.parse(stored) };
        }
      }
    } catch (error) {
      console.warn('Failed to load prayer settings:', error);
    }

    return this.getDefaultSettings();
  }

  private getDefaultSettings(): PrayerSettings {
    return {
      calculationMethod: 'MWL',
      madhab: 'Shafi',
      adjustments: {
        fajr: 0,
        dhuhr: 0,
        asr: 0,
        maghrib: 0,
        isha: 0
      },
      notifications: {
        enabled: true,
        adhanSound: false,
        reminderMinutes: [15, 5],
        muteDuringMeetings: true
      },
      location: {
        useAutoLocation: true
      }
    };
  }

  private saveSettings(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('prayerSettings', JSON.stringify(this.prayerSettings));
      }
    } catch (error) {
      console.warn('Failed to save prayer settings:', error);
    }
  }

  private saveSchedulingRules(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('prayerSchedulingRules', JSON.stringify(this.schedulingRules));
      }
    } catch (error) {
      console.warn('Failed to save scheduling rules:', error);
    }
  }
}

export const prayerTimesService = new PrayerTimesService();